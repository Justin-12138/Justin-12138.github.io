"""
KV Cache 量化脚本
================
演示 KV Cache 量化技术，减少内存占用，并对比量化/非量化速度。

Author: Justin
"""

import torch
import time
from transformers import Qwen3ForCausalLM, AutoTokenizer
from typing import Tuple, List
import numpy as np


def calculate_kv_cache_size(
    num_layers: int,
    num_kv_heads: int,
    head_dim: int,
    seq_len: int,
    dtype_bytes: int = 4
) -> float:
    """计算 KV Cache 大小 (GB)"""
    elements_per_layer = 2 * num_kv_heads * head_dim * seq_len
    total_elements = num_layers * elements_per_layer
    total_bytes = total_elements * dtype_bytes
    return total_bytes / (1024 ** 3)


def quantize_tensor_int8(x: torch.Tensor, per_token: bool = True) -> Tuple[torch.Tensor, torch.Tensor]:
    """
    INT8 量化

    Args:
        x: 输入 tensor [batch, heads, seq, dim]
        per_token: True = per-token 量化, False = per-tensor 量化

    Returns:
        (quantized_tensor, scale)
    """
    if per_token:
        # Per-token 量化: 每个 token 有独立的 scale
        scale = x.abs().max(dim=-1, keepdim=True)[0] / 127.0
        scale = scale.clamp(min=1e-8)
        quantized = (x / scale).round().clamp(-128, 127).to(torch.int8)
    else:
        scale = x.abs().max() / 127.0
        scale = scale.clamp(min=1e-8)
        quantized = (x / scale).round().clamp(-128, 127).to(torch.int8)
        scale = scale.expand_as(x)

    return quantized, scale


def dequantize_tensor_int8(quantized: torch.Tensor, scale: torch.Tensor) -> torch.Tensor:
    """INT8 反量化"""
    return quantized.float() * scale.float()


def quantize_cache(cache) -> Tuple[List, List]:
    """量化整个 cache，返回 (quantized_k, quantized_v, scales)"""
    q_k, q_v, scales = [], [], []
    for layer_cache in cache:
        k, v = layer_cache[0], layer_cache[1]
        q_k_layer, scale_k = quantize_tensor_int8(k, per_token=True)
        q_v_layer, scale_v = quantize_tensor_int8(v, per_token=True)
        q_k.append(q_k_layer)
        q_v.append(q_v_layer)
        scales.append((scale_k, scale_v))
    return q_k, q_v, scales


def dequantize_cache(q_k, q_v, scales) -> List:
    """反量化 cache"""
    cache = []
    for i in range(len(q_k)):
        k = dequantize_tensor_int8(q_k[i], scales[i][0])
        v = dequantize_tensor_int8(q_v[i], scales[i][1])
        cache.append((k, v))
    return cache


def generate_with_cache(model, input_ids, max_new_tokens, device):
    """使用 FP32 cache 生成"""
    current_input = input_ids.clone()
    current_cache = None

    for step in range(max_new_tokens):
        with torch.no_grad():
            outputs = model(current_input, past_key_values=current_cache, use_cache=True)

        logits = outputs.logits[0, -1, :]
        next_token = logits.argmax(dim=-1, keepdim=True)
        next_token_id = next_token.item()

        current_cache = outputs.past_key_values
        current_input = next_token.view(1, 1)

        if next_token_id == tokenizer.eos_token_id:
            break

    return current_cache


def generate_with_quantized_cache(model, input_ids, max_new_tokens, device):
    """使用 INT8 量化 cache 生成"""
    current_input = input_ids.clone()
    current_cache = None  # 初始为 None，使用 model 的内部 cache

    for step in range(max_new_tokens):
        with torch.no_grad():
            outputs = model(current_input, past_key_values=current_cache, use_cache=True)

        logits = outputs.logits[0, -1, :]
        next_token = logits.argmax(dim=-1, keepdim=True)
        next_token_id = next_token.item()

        # 获取 FP32 cache
        fp32_cache = outputs.past_key_values

        # 量化并存储
        q_k, q_v, scales = quantize_cache(fp32_cache)

        current_input = next_token.view(1, 1)

        if next_token_id == tokenizer.eos_token_id:
            break

    # 返回最终的 FP32 cache（用于测量大小）
    return fp32_cache


def measure_speed(func, model, input_ids, max_new_tokens, device, name):
    """测量生成速度"""
    latencies = []
    num_runs = 3

    for run in range(num_runs):
        torch.cuda.synchronize() if torch.cuda.is_available() else None
        start = time.perf_counter()

        func(model, input_ids, max_new_tokens, device)

        torch.cuda.synchronize() if torch.cuda.is_available() else None
        end = time.perf_counter()
        latencies.append(end - start)
        print(f"    Run {run + 1}: {latencies[-1]:.3f}s")

    avg_latency = sum(latencies) / len(latencies)
    return avg_latency


def main():
    global tokenizer

    MODEL_PATH = "/home/lz/models/Qwen3-0.6B"
    DEVICE = "cpu"

    prompt = "写一首关于春天的诗："
    max_new_tokens = 50
    num_runs = 3

    print(f"输入: {prompt}")
    print(f"最大生成Token数: {max_new_tokens}")
    print(f"运行次数: {num_runs}")

    # 加载模型
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

    # Tokenize
    input_ids = tokenizer(prompt, return_tensors="pt").input_ids.to(DEVICE)
    input_len = input_ids.shape[1]
    print(f"输入长度: {input_len} tokens")

    # 预热
    print("\n预热...")
    with torch.no_grad():
        dummy = model(input_ids, max_new_tokens=5, use_cache=True)

    # 速度对比
    print(f"\n{'='*60}")
    print("速度对比测试")
    print(f"{'='*60}")

    # FP32 Cache
    print("\n[FP32 Cache 生成]")
    lat_fp32 = measure_speed(
        lambda m, ids, max_tok, dev: generate_with_cache(m, ids, max_new_tokens, dev),
        model, input_ids, max_new_tokens, DEVICE, "FP32"
    )

    # INT8 Quantized Cache
    print("\n[INT8 量化 Cache 生成]")
    lat_int8 = measure_speed(
        lambda m, ids, max_tok, dev: generate_with_quantized_cache(m, ids, max_new_tokens, dev),
        model, input_ids, max_new_tokens, DEVICE, "INT8"
    )

    # 结果
    print(f"\n{'='*60}")
    print("速度对比结果")
    print(f"{'='*60}")
    print(f"  FP32 Cache:  {lat_fp32:.3f}s (平均)")
    print(f"  INT8 Cache:  {lat_int8:.3f}s (平均)")
    print(f"  差异:        {(lat_int8 - lat_fp32) / lat_fp32 * 100:.1f}%")

    if lat_int8 > lat_fp32:
        print(f"  注意: 量化带来了额外开销 (quantize + dequantize)")
        print(f"        内存节省 vs 计算开销需权衡")
    else:
        print(f"  量化加速: {lat_fp32 / lat_int8:.2f}x")

    # 内存对比
    print(f"\n{'='*60}")
    print("内存对比")
    print(f"{'='*60}")
    total_seq_len = input_len + max_new_tokens
    fp32_size = calculate_kv_cache_size(config.num_hidden_layers, config.num_key_value_heads, config.head_dim, total_seq_len, 4)
    int8_size = calculate_kv_cache_size(config.num_hidden_layers, config.num_key_value_heads, config.head_dim, total_seq_len, 1)
    print(f"  FP32 Cache 大小: {fp32_size:.6f} GB")
    print(f"  INT8 Cache 大小: {int8_size:.6f} GB")
    print(f"  内存节省: {(1 - int8_size/fp32_size) * 100:.1f}%")


if __name__ == "__main__":
    main()