# KV Cache 原理与量化详解 —— 以 Qwen3-0.6B 为例

在 LLM 推理过程中，KV Cache 是一个核心优化技术，它通过缓存已计算的 Key-Value 向量来避免重复计算，从而显著提升生成速度。本文以 Qwen3-0.6B 为例，深入剖析 KV Cache 的工作原理、大小计算以及量化技术。

---

## 1. 什么是 KV Cache？

### 1.1 自回归生成的问题

LLM 的生成是**自回归**的 —— 每个新 token 的生成依赖于之前所有的 token：

```
输入: "写一首关于春天的诗："

Step 1: 生成 "春" → 需要计算 Attention(prompt + "春")
Step 2: 生成 "天" → 需要计算 Attention(prompt + "春" + "天")
Step 3: 生成 "的" → 需要计算 Attention(prompt + "春" + "天" + "的")
...
```

**问题**：每个 step 都需要重新计算整个序列的 Attention，包括之前已经计算过的 tokens！

### 1.2 KV Cache 的解决方案

KV Cache 的核心思想是**缓存已计算的 K 和 V 向量**，每个 step 只计算新 token 的 Q、K、V，然后从 cache 中读取之前的 K、V。

```
无 KV Cache:
  Step t: Attention(all_tokens) → O(n²) 复杂度

有 KV Cache:
  Step t: Attention(new_token, cached_K, cached_V) → O(n) 复杂度
```

---

## 2. KV Cache 工作原理

### 2.1 Qwen3-0.6B 配置

```
模型配置:
  隐藏层维度 (hidden_size): 1024
  注意力头数 (num_attention_heads): 16
  KV 头数 (num_key_value_heads): 8      ← GQA 关键参数
  头维度 (head_dim): 128
  层数 (num_hidden_layers): 28

关键: num_key_value_heads < num_attention_heads
这意味着 K/V 矩阵比 Q 矩阵小，节省缓存空间
```

### 2.2 KV Cache 大小计算公式

```
每层 KV Cache 元素数 = 2 × num_kv_heads × head_dim × seq_len
                     = 2 × 8 × 128 × seq_len
                     = 2048 × seq_len

总 KV Cache 元素数 = num_layers × 每层元素数
                   = 28 × 2048 × seq_len
                   = 57344 × seq_len

总字节数 = 总元素数 × 数据类型字节数
         = 57344 × seq_len × 4 (FP32)
         = 229376 × seq_len bytes
```

### 2.3 手动控制 KV Cache

```python
from transformers import Qwen3ForCausalLM, AutoTokenizer
import torch

model = Qwen3ForCausalLM.from_pretrained(
    "/home/lz/models/Qwen3-0.6B",
    attn_implementation="eager"
)
tokenizer = AutoTokenizer.from_pretrained("/home/lz/models/Qwen3-0.6B")

# 初始输入
input_ids = tokenizer("写一首关于春天的诗：", return_tensors="pt")["input_ids"]
current_cache = None

# 逐步生成，手动控制 cache
for step in range(20):
    outputs = model(
        input_ids,                    # 初始传入完整序列
        past_key_values=current_cache, # 传入 cache
        use_cache=True
    )

    # 获取新的 cache
    current_cache = outputs.past_key_values

    # 下一个 token
    next_token = outputs.logits[0, -1].argmax()
    input_ids = next_token.unsqueeze(0)  # 后续只传单个 token

# 最终 cache 大小
print(f"Cache 层数: {len(current_cache)}")           # 28
print(f"每层 K shape: {current_cache[0][0].shape}")  # [1, 8, seq_len, 128]
```

---

## 3. KV Cache 大小验证

以 Qwen3-0.6B 为例，生成 20 个 tokens：

```
理论计算:
  序列长度 = 7 (prompt) + 20 (生成) = 27
  每层元素数 = 2 × 8 × 128 × 27 = 55,296
  总元素数 = 28 × 55,296 = 1,548,288
  FP32 大小 = 1,548,288 × 4 = 6,193,152 bytes ≈ 0.0058 GB

实际测量:
  每层 K shape: [1, 8, 26, 128]  ← 注意 seq_len 差 1
  实际元素数: 1,490,944
  实际大小: 0.0056 GB
```

**差异来源**：cache 存储的是 `prompt长度 + 已生成token数`，不包含当前正在生成的位置，所以是 26 而不是 27。

---

## 4. KV Cache 量化

### 4.1 量化原理

FP32 每个元素 4 字节，INT8 每个元素 1 字节：

```
原始 FP32:  [0.123, -0.456, 0.789, ...]  → 4 bytes × N
量化 INT8:  [12, -46, 78, ...]            → 1 byte × N
           + scale: [0.01, 0.01, 0.01]   → 4 bytes × N (per-token)

压缩比: ~4x (含 scale 开销后约 3-4x)
```

### 4.2 Per-token INT8 量化实现

```python
def quantize_tensor_int8(x):
    """Per-token 量化：每个 token 独立 scale"""
    # x: [batch, heads, seq, dim]
    scale = x.abs().max(dim=-1, keepdim=True)[0] / 127.0
    scale = scale.clamp(min=1e-8)
    quantized = (x / scale).round().clamp(-128, 127).to(torch.int8)
    return quantized, scale

def dequantize_tensor_int8(quantized, scale):
    """反量化"""
    return quantized.float() * scale.float()
```

### 4.3 量化效果实测

| 指标 | FP32 | INT8 | 改善 |
|------|------|------|------|
| Cache 大小 | 0.0058 GB | 0.0014 GB | **减少 75%** |
| 生成速度 | 2.372s | 2.340s | 基本持平 |
| 反量化误差 | - | MAE ≈ 0.001 | 可接受 |

---

## 5. 量化不是银弹 —— 关键限制

### 5.1 速度不一定更快

```
无硬件加速的 CPU 推理:
  FP32: 读取 4 bytes → 直接计算
  INT8: 读取 1 byte → 反量化回 4 bytes → 计算

结论: 没有 INT8 硬件支持时，量化反而增加开销！
```

### 5.2 量化加速的必要条件

1. **硬件支持**：NVIDIA Tensor Core、CPU VNNI、ARMv8.2+ 等
2. **算子融合**：quantize → 计算 → dequantize 在一个 kernel 内完成
3. **内存带宽瓶颈**：IO 开销 > 计算开销时，量化才有效

### 5.3 量化的真正价值

| 场景 | 量化效果 |
|------|---------|
| GPU 批量推理 | ✓ 省显存，支持更大 batch |
| 多卡分布式推理 | ✓ 减少卡间 KV Cache 传输量 |
| 边缘设备部署 | ✓ 省内存，支持更长上下文 |
| CPU 单卡低并发 | ✗ 无加速，甚至更慢 |

---

## 6. KV Cache 优化的技术生态

```
┌─────────────────────────────────────────────────────┐
│                   KV Cache 优化                      │
├──────────────┬──────────────┬──────────────────────┤
│   量化 (Quantization)    │  Paged Attention     │  投机解码       │
├──────────────┼──────────────┼──────────────────────┤
│ FP32 → INT8  │  分块管理     │  多 token 预测      │
│ 省 75% 内存  │  避免碎片化   │  加速生成           │
└──────────────┴──────────────┴──────────────────────┘
```

- **PagedAttention** (vLLM)：像操作系统分页一样管理 KV Cache，避免内存碎片
- **投机解码** (Speculative Decoding)：用小模型预测多个 token，大模型验证
- **FlashAttention**：IO-aware 的注意力计算，减少 HBM 访问

---

## 7. 总结

| 问题 | 答案 |
|------|------|
| KV Cache 是什么？ | 缓存已计算的 K/V 向量，避免重复计算 |
| 为什么能加速？ | 每个 step 只需计算新 token，无需重新计算整个序列 |
| 大小怎么算？ | `2 × num_layers × num_kv_heads × head_dim × seq_len × bytes_per_element` |
| 量化有什么用？ | 省内存 + 省带宽，但不直接加速计算 |
| 量化何时有效？ | 有硬件支持、或内存带宽是瓶颈时 |
| 量化的代价？ | 精度损失 (INT8 约 0.1% MAE)，需权衡 |

**核心结论**：KV Cache 是 LLM 推理优化的基石，量化是锦上添花。理解底层原理，才能在实践中做出正确选择。

---

## 参考代码

- [test_kv_cache.py](load_llm/test_kv_cache.py) - KV Cache 大小验证
- [kv_cache_benchmark.py](load_llm/kv_cache_benchmark.py) - Cache 性能对比
- [kv_cache_quant.py](load_llm/kv_cache_quant.py) - KV Cache 量化实现