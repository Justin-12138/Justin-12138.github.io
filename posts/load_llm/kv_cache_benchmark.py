"""
KV Cache 性能对比脚本
====================
对比 LLM 在使用/不使用 KV Cache 时的生成速度差异。

Author: Justin
"""

import torch
import time
import psutil
from transformers import Qwen3ForCausalLM, AutoTokenizer
from typing import List, Tuple


def print_banner(text: str, char: str = "=", width: int = 60):
    print(f"\n{char * width}")
    print(f"{text}")
    print(f"{char * width}")


def format_number(n: int) -> str:
    if n >= 1e9:
        return f"{n/1e9:.2f}B"
    elif n >= 1e6:
        return f"{n/1e6:.2f}M"
    elif n >= 1e3:
        return f"{n/1e3:.2f}K"
    return str(n)


def measure_generation_speed(
    model,
    tokenizer,
    prompt: str,
    max_new_tokens: int,
    use_cache: bool,
    device: str = "cpu",
    num_runs: int = 3
) -> Tuple[float, float, List[str]]:
    """
    测量生成速度

    Returns:
        (平均延迟(秒), 平均tokens/秒, 生成的token列表)
    """
    latencies = []
    all_tokens = []

    for run in range(num_runs):
        input_ids = tokenizer(prompt, return_tensors="pt").input_ids.to(device)

        torch.cuda.synchronize() if torch.cuda.is_available() else None
        start_time = time.perf_counter()

        with torch.no_grad():
            outputs = model.generate(
                input_ids,
                max_new_tokens=max_new_tokens,
                use_cache=use_cache,
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id,
            )

        torch.cuda.synchronize() if torch.cuda.is_available() else None
        end_time = time.perf_counter()

        latency = end_time - start_time
        latencies.append(latency)

        generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        num_generated = outputs.shape[1] - input_ids.shape[1]
        all_tokens.append(generated_text)

        print(f"  Run {run + 1}: {latency:.3f}s, {num_generated} tokens")

    avg_latency = sum(latencies) / len(latencies)
    tokens_per_sec = (max_new_tokens * num_runs) / sum(latencies)  # 粗略估算

    return avg_latency, avg_latency / max_new_tokens, all_tokens[0]


def main():
    MODEL_PATH = "/home/lz/models/Qwen3-0.6B"
    DEVICE = "cpu"  # 可改为 "cuda" 如果有GPU

    TEST_PROMPTS = [
        "写一首关于春天的诗：",
        # "解释量子计算的基本原理：",
        # "用Python实现快速排序：",
    ]

    MAX_NEW_TOKENS = 30
    NUM_RUNS = 3

    print_banner("🚀 KV Cache 性能对比测试", "=")
    print(f"模型: {MODEL_PATH}")
    print(f"设备: {DEVICE}")
    print(f"测试提示数: {len(TEST_PROMPTS)}")
    print(f"每提示运行次数: {NUM_RUNS}")
    print(f"最大生成Token数: {MAX_NEW_TOKENS}")

    # 加载模型和Tokenizer
    print("\n加载模型...")
    tokenizer = AutoTokenizer.from_pretrained(
        MODEL_PATH, trust_remote_code=True, use_fast=True
    )

    # 不使用 cache
    print("\n加载模型 (use_cache=False)...")
    model_no_cache = Qwen3ForCausalLM.from_pretrained(
        MODEL_PATH, trust_remote_code=True, attn_implementation="eager"
    ).to(DEVICE)
    model_no_cache.eval()

    # 使用 cache
    print("加载模型 (use_cache=True)...")
    model_with_cache = Qwen3ForCausalLM.from_pretrained(
        MODEL_PATH, trust_remote_code=True, attn_implementation="eager"
    ).to(DEVICE)
    model_with_cache.eval()

    print_memory("加载完成")

    # 预热
    print("\n预热...")
    dummy_input = tokenizer("预热", return_tensors="pt").input_ids.to(DEVICE)
    with torch.no_grad():
        model_no_cache.generate(dummy_input, max_new_tokens=5, use_cache=False)
        model_with_cache.generate(dummy_input, max_new_tokens=5, use_cache=True)

    results = []

    for i, prompt in enumerate(TEST_PROMPTS):
        print_banner(f"测试 {i + 1}: {prompt[:30]}...", "-")

        # 不使用 KV Cache
        print("\n[不使用 KV Cache]")
        avg_lat_no_cache, time_per_token_no_cache, text_no_cache = measure_generation_speed(
            model_no_cache, tokenizer, prompt, MAX_NEW_TOKENS,
            use_cache=False, device=DEVICE, num_runs=NUM_RUNS
        )

        # 使用 KV Cache
        print("\n[使用 KV Cache]")
        avg_lat_with_cache, time_per_token_with_cache, text_with_cache = measure_generation_speed(
            model_with_cache, tokenizer, prompt, MAX_NEW_TOKENS,
            use_cache=True, device=DEVICE, num_runs=NUM_RUNS
        )

        speedup = avg_lat_no_cache / avg_lat_with_cache if avg_lat_with_cache > 0 else 0

        print(f"\n  === 结果 ===")
        print(f"  不使用 KV Cache: {avg_lat_no_cache:.3f}s, {time_per_token_no_cache*1000:.2f}ms/token")
        print(f"  使用 KV Cache:   {avg_lat_with_cache:.3f}s, {time_per_token_with_cache*1000:.2f}ms/token")
        print(f"  加速比:          {speedup:.2f}x")

        results.append({
            "prompt": prompt,
            "no_cache": {"latency": avg_lat_no_cache, "tpt": time_per_token_no_cache},
            "with_cache": {"latency": avg_lat_with_cache, "tpt": time_per_token_with_cache},
            "speedup": speedup,
        })

    # 总结
    print_banner("📊 测试总结", "=")

    avg_speedup = sum(r["speedup"] for r in results) / len(results)

    print(f"\n{'Prompt':<40} {'无Cache':<15} {'有Cache':<15} {'加速比'}")
    print("-" * 85)
    for r in results:
        prompt_short = r["prompt"][:37] + "..." if len(r["prompt"]) > 37 else r["prompt"]
        print(f"{prompt_short:<40} {r['no_cache']['latency']:.3f}s{'':<8} {r['with_cache']['latency']:.3f}s{'':<8} {r['speedup']:.2f}x")

    print("-" * 85)
    print(f"{'平均加速比':<40} {'':>8} {'':>8} {avg_speedup:.2f}x")

    print("\n💡 说明:")
    print("  - KV Cache 通过缓存已计算的 K/V 向量，避免重复计算")
    print("  - 在长序列生成时效果更明显 (序列越长，节省越多)")
    print("  - 首次生成时开销相同，后续token生成会更快")


def print_memory(stage: str = ""):
    mem = psutil.virtual_memory()
    print(f"\n📊 内存状态 [{stage}]")
    print(f"   总内存: {mem.total / (1024 ** 3):.2f} GB")
    print(f"   可用:   {mem.available / (1024 ** 3):.2f} GB")
    print(f"   使用率: {mem.percent}%")


if __name__ == "__main__":
    main()