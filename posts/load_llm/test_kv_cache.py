"""
KV Cache 手动控制与大小验证脚本
===============================
手动控制 KV Cache，验证 cache 大小计算公式。

Author: Justin
"""

import torch
from transformers import Qwen3ForCausalLM, AutoTokenizer
from typing import Optional, Tuple


def calculate_kv_cache_size(
    num_layers: int,
    num_kv_heads: int,
    head_dim: int,
    seq_len: int,
    dtype_bytes: int = 4  # FP32 = 4 bytes
) -> dict:
    """计算 KV Cache 大小"""
    elements_per_layer = 2 * num_kv_heads * head_dim * seq_len  # K + V
    total_elements = num_layers * elements_per_layer
    total_bytes = total_elements * dtype_bytes

    return {
        "layers": num_layers,
        "kv_heads": num_kv_heads,
        "head_dim": head_dim,
        "seq_len": seq_len,
        "elements_per_layer": elements_per_layer,
        "total_elements": total_elements,
        "total_bytes": total_bytes,
        "size_gb": total_bytes / (1024 ** 3),
    }


def print_cache_size_info(info: dict):
    print(f"\n{'='*60}")
    print(f"KV Cache 大小计算")
    print(f"{'='*60}")
    print(f"层数:              {info['layers']}")
    print(f"KV头数:            {info['kv_heads']}")
    print(f"头维度:            {info['head_dim']}")
    print(f"序列长度:          {info['seq_len']}")
    print(f"每层元素数:        {info['elements_per_layer']:,}")
    print(f"总元素数:          {info['total_elements']:,}")
    print(f"总字节数:          {info['total_bytes']:,} bytes ({info['total_bytes']/1024:.2f} KB)")
    print(f"KV Cache 大小:     {info['size_gb']:.6f} GB")


def manual_generate(
    model,
    tokenizer,
    input_ids: torch.Tensor,
    max_new_tokens: int,
    past_key_values: Optional = None,
) -> Tuple[torch.Tensor, any]:
    """手动控制 KV Cache 的生成

    关键点：每次只将最后一个 token 传给模型，利用 cache 避免重复计算
    """
    # 只保留最后一个 token（初始 prompt 或已生成的部分）
    current_input = input_ids.clone()
    current_cache = past_key_values

    for step in range(max_new_tokens):
        with torch.no_grad():
            outputs = model(
                current_input,  # 只传最后一个 token
                past_key_values=current_cache,
                use_cache=True,
            )

        logits = outputs.logits[0, -1, :]
        next_token = logits.argmax(dim=-1, keepdim=True)
        next_token_id = next_token.item()

        token_text = tokenizer.decode([next_token_id])
        print(f"  Step {step + 1}: '{token_text}' (id={next_token_id})")

        # 更新 cache
        current_cache = outputs.past_key_values

        # 打印 cache 状态
        if step < 3 or step == max_new_tokens - 1:
            if current_cache is not None:
                k, v = current_cache[0][0], current_cache[0][1]
                print(f"    -> cache seq_len: {k.shape[2]}")

        # 只保留最后一个 token 用于下一步
        current_input = next_token.view(1, 1)

        if next_token_id == tokenizer.eos_token_id:
            break

    # 返回完整的生成序列
    return torch.cat([input_ids[0], current_input[0]]).unsqueeze(0), current_cache


def main():
    MODEL_PATH = "/home/lz/models/Qwen3-0.6B"
    DEVICE = "cpu"

    prompt = "写一首关于春天的诗："
    max_new_tokens = 20

    print(f"输入: {prompt}")
    print(f"最大生成Token数: {max_new_tokens}")

    # 加载模型和 tokenizer
    print("\n加载模型...")
    tokenizer = AutoTokenizer.from_pretrained(
        MODEL_PATH, trust_remote_code=True, use_fast=True
    )
    model = Qwen3ForCausalLM.from_pretrained(
        MODEL_PATH,
        trust_remote_code=True,
        attn_implementation="eager",
    ).to(DEVICE)
    model.eval()

    config = model.config
    print(f"\n模型配置:")
    print(f"  隐藏层维度: {config.hidden_size}")
    print(f"  注意力头数: {config.num_attention_heads}")
    print(f"  KV头数:     {config.num_key_value_heads}")
    print(f"  头维度:     {config.head_dim}")
    print(f"  层数:       {config.num_hidden_layers}")
    print(f"  词表大小:   {config.vocab_size}")

    # Tokenize
    input_ids = tokenizer(prompt, return_tensors="pt").input_ids.to(DEVICE)
    input_len = input_ids.shape[1]
    print(f"\n输入长度: {input_len} tokens")

    # ========== 手动 KV Cache 控制 ==========
    print(f"\n{'='*60}")
    print("手动 KV Cache 控制生成")
    print(f"{'='*60}")

    generated_ids, final_cache = manual_generate(
        model, tokenizer, input_ids, max_new_tokens
    )

    generated_text = tokenizer.decode(generated_ids[0], skip_special_tokens=True)
    print(f"\n生成结果: {generated_text}")

    # ========== 验证 Cache 大小 ==========
    print(f"\n{'='*60}")
    print("验证 KV Cache 大小")
    print(f"{'='*60}")

    # 理论计算 - 使用实际 config 的 head_dim
    total_seq_len = input_ids.shape[1] + max_new_tokens
    theory_info = calculate_kv_cache_size(
        num_layers=config.num_hidden_layers,
        num_kv_heads=config.num_key_value_heads,
        head_dim=config.head_dim,  # 使用实际 config 值
        seq_len=total_seq_len,
        dtype_bytes=4,
    )
    print_cache_size_info(theory_info)

    # 实际测量
    if final_cache is not None:
        print(f"\n实际 Cache 信息:")
        actual_elements = 0
        for i, layer_cache in enumerate(final_cache):
            k, v = layer_cache[0], layer_cache[1]
            print(f"  Layer {i}: K shape={k.shape}, V shape={v.shape}")
            layer_elements = k.numel() + v.numel()
            actual_elements += layer_elements

        print(f"\n实际总元素数: {actual_elements:,}")
        print(f"实际总字节数: {actual_elements * 4:,} bytes ({actual_elements * 4 / 1024:.2f} KB)")
        print(f"实际大小:     {actual_elements * 4 / (1024**3):.6f} GB")

        # 对比
        print(f"\n{'='*60}")
        print("理论 vs 实际 对比")
        print(f"{'='*60}")
        print(f"理论元素数: {theory_info['total_elements']:,}")
        print(f"实际元素数: {actual_elements:,}")
        diff = abs(theory_info['total_elements'] - actual_elements)
        if diff == 0:
            print("✅ 完全匹配!")
        else:
            print(f"差异: {diff} (差异率: {diff/theory_info['total_elements']*100:.2f}%)")

        # 分析差异来源
        print(f"\n差异分析:")
        actual_seq_len = final_cache[0][0].shape[2]
        print(f"  实际 K shape: [batch=1, kv_heads={config.num_key_value_heads}, seq_len={actual_seq_len}, head_dim={config.head_dim}]")
        print(f"  理论 K shape: [batch=1, kv_heads={config.num_key_value_heads}, seq_len={total_seq_len}, head_dim={config.head_dim}]")
        print(f"  seq_len 差异: 理论={total_seq_len}, 实际={actual_seq_len} (差{total_seq_len - actual_seq_len})")
        print(f"    原因: cache 存储的是 prompt 长度 ({input_len}) + 已生成 token 数 ({max_new_tokens - 1}) = {input_len + max_new_tokens - 1}, 不含当前正在生成的位置")

        # 最终 Cache 大小总结
        print(f"\n{'='*60}")
        print(f"✅ 最终 KV Cache 大小")
        print(f"{'='*60}")
        final_size_bytes = actual_elements * 4
        final_size_gb = final_size_bytes / (1024 ** 3)
        print(f"  总元素数: {actual_elements:,}")
        print(f"  总字节数: {final_size_bytes:,} bytes ({final_size_bytes / 1024:.2f} KB)")
        print(f"  Cache 大小: {final_size_gb:.6f} GB")
        print(f"  公式: {config.num_hidden_layers} layers × 2 × {config.num_key_value_heads} kv_heads × {actual_seq_len} seq_len × {config.head_dim} head_dim")
        print(f"      = {actual_elements:,} elements ✓")

    # ========== 使用不同数据类型的 Cache 大小 ==========
    print(f"\n{'='*60}")
    print("不同数据类型的 KV Cache 大小 (seq_len={})".format(total_seq_len))
    print(f"{'='*60}")
    for dtype_name, dtype_bytes in [("FP32", 4), ("FP16", 2), ("BF16", 2), ("INT8", 1)]:
        info = calculate_kv_cache_size(
            config.num_hidden_layers,
            config.num_key_value_heads,
            config.head_dim,
            total_seq_len,
            dtype_bytes,
        )
        print(f"  {dtype_name}: {info['size_gb']:.6f} GB")


if __name__ == "__main__":
    main()