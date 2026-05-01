"""
LLM 基础运行原理完整演示脚本
=============================
本脚本以 Qwen3-0.6B 为例，完整展示 LLM 从输入到输出的全部计算过程：

1. Tokenization: 文本 → Token IDs
2. Embedding: Token IDs → 稠密向量
3. Position Encoding: RoPE 位置编码
4. Transformer Layers: 自注意力 + FFN
5. Output Layer: Hidden States → Logits → Probabilities
6. Generation: 自回归生成

Author: Justin
"""

import torch
import torch.nn.functional as F
import psutil
import numpy as np
from transformers import Qwen3ForCausalLM, AutoTokenizer
from typing import Optional
import math

# ============================================================================
# 工具函数
# ============================================================================

def print_banner(text: str, char: str = "=", width: int = 80):
    """打印分隔横幅"""
    print(f"\n{char * width}")
    print(f"{text}")
    print(f"{char * width}")


def print_section(text: str, char: str = "-", width: int = 60):
    """打印小节标题"""
    print(f"\n{char * width}")
    print(f"  {text}")
    print(f"{char * width}")


def print_memory(stage: str = ""):
    """打印内存使用情况"""
    mem = psutil.virtual_memory()
    print(f"\n📊 内存状态 [{stage}]")
    print(f"   总内存: {mem.total / (1024 ** 3):.2f} GB")
    print(f"   可用:   {mem.available / (1024 ** 3):.2f} GB")
    print(f"   使用率: {mem.percent}%")


def format_number(n: int) -> str:
    """格式化大数字"""
    if n >= 1e9:
        return f"{n/1e9:.2f}B"
    elif n >= 1e6:
        return f"{n/1e6:.2f}M"
    elif n >= 1e3:
        return f"{n/1e3:.2f}K"
    return str(n)


def visualize_attention(attention_weights: torch.Tensor, tokens: list, max_display: int = 8):
    """可视化注意力权重"""
    # attention_weights: [num_heads, seq_len, seq_len]
    avg_attn = attention_weights.mean(dim=0)  # 平均所有头
    seq_len = min(len(tokens), max_display)
    
    print(f"\n  注意力矩阵 (平均所有头, 前{seq_len}个token):")
    
    # 打印表头
    header = "      " + " ".join([f"{tokens[i][:6]:>6s}" for i in range(seq_len)])
    print(header)
    
    # 打印每行
    for i in range(seq_len):
        row = f"{tokens[i][:6]:>6s}"
        for j in range(seq_len):
            weight = avg_attn[i, j].item()
            row += f" {weight:6.3f}"
        print(row)


# ============================================================================
# 模型分析类
# ============================================================================

class LLMAnalyzer:
    """LLM 分析器 - 深入剖析模型推理过程"""
    
    def __init__(self, model_path: str, device: str = "cpu"):
        self.model_path = model_path
        self.device = device
        self.model = None
        self.tokenizer = None
        
    def load_model(self):
        """加载模型和tokenizer"""
        print_banner("🚀 模型加载", "=")
        print_memory("加载前")
        
        print(f"\n加载 Tokenizer...")
        self.tokenizer = AutoTokenizer.from_pretrained(
            self.model_path, 
            trust_remote_code=True, 
            use_fast=True
        )
        
        print(f"加载 Model (使用 eager attention 以支持 output_attentions)...")
        self.model = Qwen3ForCausalLM.from_pretrained(
            self.model_path,
            trust_remote_code=True,
            attn_implementation="eager"  # 为了输出attention weights
        ).to(self.device)
        self.model.eval()
        
        print(f"✅ 模型加载成功!")
        print_memory("加载后")
        
    def print_model_structure(self):
        """打印模型结构详情"""
        print_banner("🏗️ 模型结构详解", "=")
        
        config = self.model.config
        
        print("\n【基础配置】")
        print(f"  模型类型: {config.model_type}")
        print(f"  词表大小: {format_number(config.vocab_size)} ({config.vocab_size})")
        print(f"  隐藏层维度: {config.hidden_size}")
        print(f"  中间层维度: {config.intermediate_size}")
        print(f"  层数: {config.num_hidden_layers}")
        
        print("\n【注意力配置】")
        print(f"  注意力头数: {config.num_attention_heads}")
        print(f"  KV头数 (GQA): {config.num_key_value_heads}")
        print(f"  头维度: {config.head_dim}")
        print(f"  KV分组数: {config.num_attention_heads // config.num_key_value_heads}")
        
        print("\n【位置编码 (RoPE)】")
        print(f"  最大位置: {config.max_position_embeddings}")
        print(f"  RoPE theta: {config.rope_theta}")
        print(f"  RoPE scaling: {config.rope_scaling}")
        
        print("\n【其他配置】")
        print(f"  激活函数: {config.hidden_act}")
        print(f"  RMS Norm epsilon: {config.rms_norm_eps}")
        print(f"  权重共享 (tie_word_embeddings): {config.tie_word_embeddings}")
        
        # 参数量统计
        self._print_parameter_stats()
        
    def _print_parameter_stats(self):
        """统计模型参数量"""
        print_section("📊 参数量统计")
        
        total_params = 0
        param_groups = {}
        
        for name, param in self.model.named_parameters():
            num_params = param.numel()
            total_params += num_params
            
            # 分组统计
            if "embed" in name:
                group = "Embedding"
            elif "self_attn" in name:
                group = "Self-Attention"
            elif "mlp" in name:
                group = "MLP (FFN)"
            elif "norm" in name:
                group = "Normalization"
            elif "lm_head" in name:
                group = "LM Head"
            else:
                group = "Other"
                
            param_groups[group] = param_groups.get(group, 0) + num_params
        
        print(f"\n  总参数量: {format_number(total_params)} ({total_params:,})")
        print(f"  模型大小 (FP32): {total_params * 4 / (1024**3):.2f} GB")
        print(f"  模型大小 (FP16): {total_params * 2 / (1024**3):.2f} GB")
        print(f"\n  各组件参数量:")
        for group, count in sorted(param_groups.items(), key=lambda x: -x[1]):
            pct = count / total_params * 100
            print(f"    {group:20s}: {format_number(count):>8s} ({pct:5.2f}%)")
            
    def analyze_tokenization(self, text: str):
        """分析 Tokenization 过程"""
        print_banner("📝 STEP 1: TOKENIZATION (文本 → Token IDs)", "=")
        
        print(f"\n输入文本: '{text}'")
        
        # Tokenization
        inputs = self.tokenizer(text, return_tensors="pt")
        input_ids = inputs["input_ids"][0]
        tokens = self.tokenizer.convert_ids_to_tokens(input_ids)
        
        print(f"\n【Tokenization 过程】")
        print(f"  使用 BPE (Byte-Pair Encoding) 算法")
        print(f"  词表大小: {self.tokenizer.vocab_size}")
        print(f"\n  分词结果:")
        
        for i, (tid, token) in enumerate(zip(input_ids.tolist(), tokens)):
            decoded = self.tokenizer.decode([tid])
            # Ġ 表示空格前缀
            display_token = token.replace("Ġ", "▁")
            print(f"    位置 {i}: '{decoded:10s}' → Token: {display_token:12s} → ID: {tid}")
        
        print(f"\n  Token数量: {len(tokens)}")
        print(f"  Token IDs: {input_ids.tolist()}")
        
        return inputs, tokens
    
    def analyze_embedding(self, inputs: dict, tokens: list):
        """分析 Embedding 过程"""
        print_banner("🔢 STEP 2: EMBEDDING (Token IDs → 稠密向量)", "=")
        
        embed_layer = self.model.model.embed_tokens
        
        print(f"\n【Embedding 层配置】")
        print(f"  类型: {type(embed_layer).__name__}")
        print(f"  权重矩阵形状: {embed_layer.weight.shape}")
        print(f"    - 词表大小: {embed_layer.weight.shape[0]}")
        print(f"    - 嵌入维度: {embed_layer.weight.shape[1]}")
        
        with torch.no_grad():
            embeddings = embed_layer(inputs["input_ids"])
        
        print(f"\n【Embedding 计算过程】")
        print(f"  本质: 查表操作 (Table Lookup)")
        print(f"  输入: Token ID → 输出: 对应行的向量")
        print(f"\n  每个Token的嵌入向量:")
        
        for i, (tid, token) in enumerate(zip(inputs["input_ids"][0].tolist(), tokens)):
            emb_vector = embeddings[0, i]
            l2_norm = torch.norm(emb_vector).item()
            print(f"\n    Token {i}: '{token}' (ID: {tid})")
            print(f"      向量维度: {emb_vector.shape[0]}")
            print(f"      前5维: {emb_vector[:5].tolist()}")
            print(f"      L2范数: {l2_norm:.4f}")
            print(f"      均值: {emb_vector.mean().item():.4f}, 标准差: {emb_vector.std().item():.4f}")
        
        print(f"\n  Embedding 输出形状: {embeddings.shape}")
        print(f"    [batch_size=1, seq_len={embeddings.shape[1]}, hidden_size={embeddings.shape[2]}]")
        
        return embeddings
    
    def analyze_rope(self, seq_len: int):
        """分析 RoPE 位置编码"""
        print_banner("📐 STEP 3: POSITION ENCODING (RoPE 旋转位置编码)", "=")
        
        config = self.model.config
        
        print(f"\n【RoPE 原理】")
        print(f"  1. RoPE 不直接添加位置向量到 Embedding")
        print(f"  2. 而是在 Attention 中对 Q, K 向量进行旋转")
        print(f"  3. 旋转角度与位置相关，编码位置信息")
        
        print(f"\n【RoPE 配置】")
        print(f"  最大位置: {config.max_position_embeddings}")
        print(f"  Base (θ): {config.rope_theta}")
        
        print(f"\n【位置IDs】")
        position_ids = torch.arange(seq_len, dtype=torch.long)
        print(f"  当前序列位置: {position_ids.tolist()}")
        
        print(f"\n【旋转频率计算】")
        print(f"  频率公式: freq_i = 1 / (θ^(2i/d)), i = 0, 1, ..., d/2-1")
        print(f"  其中 d = head_dim = {config.head_dim}")
        
        # 计算示例频率
        head_dim = config.head_dim
        inv_freq = 1.0 / (config.rope_theta ** (torch.arange(0, head_dim, 2).float() / head_dim))
        print(f"\n  前8个频率值: {inv_freq[:8].tolist()}")
        
        print(f"\n【旋转矩阵示意】")
        print(f"  对于位置 p, 维度对 (2i, 2i+1):")
        print(f"  [cos(p·freq_i)  -sin(p·freq_i)] [q_2i  ]")
        print(f"  [sin(p·freq_i)   cos(p·freq_i)] [q_2i+1]")
        
    def analyze_transformer_layers(self, inputs: dict, tokens: list, num_display: int = 2):
        """分析 Transformer 层计算"""
        print_banner("🔄 STEP 4: TRANSFORMER LAYERS (核心计算)", "=")
        
        with torch.no_grad():
            outputs = self.model(
                **inputs, 
                output_hidden_states=True, 
                output_attentions=True
            )
        
        config = self.model.config
        num_layers = config.num_hidden_layers
        
        print(f"\n【Transformer 整体架构】")
        print(f"  层数: {num_layers}")
        print(f"  每层结构: RMSNorm → Self-Attention → RMSNorm → FFN (SwiGLU)")
        print(f"  残差连接: Pre-Norm 架构")
        
        # 详细分析前几层
        for layer_idx in range(min(num_display, num_layers)):
            self._analyze_single_layer(layer_idx, outputs, tokens, config)
        
        if num_layers > num_display:
            print(f"\n  ... (省略第 {num_display} 到 {num_layers-1} 层) ...")
        
        return outputs
    
    def _analyze_single_layer(self, layer_idx: int, outputs, tokens: list, config):
        """分析单个 Transformer 层"""
        print_section(f"Layer {layer_idx}")
        
        layer = self.model.model.layers[layer_idx]
        hidden_state = outputs.hidden_states[layer_idx]
        next_hidden = outputs.hidden_states[layer_idx + 1]
        attention = outputs.attentions[layer_idx][0]  # [num_heads, seq_len, seq_len]
        
        print(f"\n  输入形状: {hidden_state.shape}")
        
        # Self-Attention 分析
        print(f"\n  【A. Self-Attention (多头自注意力)】")
        print(f"    注意力头数: {config.num_attention_heads}")
        print(f"    KV头数 (GQA): {config.num_key_value_heads}")
        print(f"    头维度: {layer.self_attn.head_dim}")
        print(f"    Q投影: Linear({config.hidden_size}, {config.hidden_size})")
        print(f"    K投影: Linear({config.hidden_size}, {config.num_key_value_heads * config.head_dim})")
        print(f"    V投影: Linear({config.hidden_size}, {config.num_key_value_heads * config.head_dim})")
        print(f"    O投影: Linear({config.hidden_size}, {config.hidden_size})")
        
        # 可视化注意力
        visualize_attention(attention, tokens)
        
        # FFN 分析
        print(f"\n  【B. Feed-Forward Network (SwiGLU)】")
        print(f"    Gate Linear: Linear({config.hidden_size}, {config.intermediate_size})")
        print(f"    Up Linear:   Linear({config.hidden_size}, {config.intermediate_size})")
        print(f"    Down Linear: Linear({config.intermediate_size}, {config.hidden_size})")
        print(f"    激活函数: SiLU (Swish)")
        print(f"    公式: Down(SiLU(Gate(x)) * Up(x))")
        
        # 计算输入输出变化
        change = torch.norm(next_hidden - hidden_state).item()
        print(f"\n  输出形状: {next_hidden.shape}")
        print(f"  层输出变化 (L2 norm): {change:.4f}")
        
    def analyze_output_layer(self, outputs, tokens: list):
        """分析输出层 (Logits 计算)"""
        print_banner("📊 STEP 5: OUTPUT LAYER (Hidden → Logits → Probabilities)", "=")
        
        last_hidden = outputs.hidden_states[-1]
        logits = outputs.logits
        
        print(f"\n【最终隐藏状态】")
        print(f"  形状: {last_hidden.shape}")
        
        print(f"\n【RMSNorm (最终归一化)】")
        print(f"  类型: {type(self.model.model.norm).__name__}")
        print(f"  epsilon: {self.model.config.rms_norm_eps}")
        
        print(f"\n【LM Head (语言模型头)】")
        print(f"  类型: {type(self.model.lm_head).__name__}")
        print(f"  形状: Linear({self.model.config.hidden_size}, {self.model.config.vocab_size})")
        print(f"  权重共享: {self.model.config.tie_word_embeddings}")
        if self.model.config.tie_word_embeddings:
            print(f"  与 Embedding 层共享权重")
        
        print(f"\n【Logits 输出】")
        print(f"  形状: {logits.shape}")
        print(f"  [batch_size=1, seq_len={logits.shape[1]}, vocab_size={logits.shape[2]}]")
        
        print(f"\n【每个位置的预测】")
        for i, token in enumerate(tokens):
            position_logits = logits[0, i]
            position_probs = F.softmax(position_logits, dim=-1)
            
            top_k = 5
            top_probs, top_indices = torch.topk(position_probs, top_k)
            
            print(f"\n  位置 {i} (当前token: '{token}') → 预测下一个token:")
            for rank, (prob, idx) in enumerate(zip(top_probs, top_indices), 1):
                pred_token = self.tokenizer.decode([idx.item()])
                logit_val = position_logits[idx].item()
                bar_len = int(prob.item() * 40)
                bar = "█" * bar_len + "░" * (40 - bar_len)
                print(f"    {rank}. '{pred_token:10s}' {bar} {prob.item()*100:5.2f}% (logit: {logit_val:7.2f})")
        
        return logits
    
    def analyze_generation(self, input_text: str, max_new_tokens: int = 10):
        """分析自回归生成过程"""
        print_banner("🔮 STEP 6: AUTOREGRESSIVE GENERATION (逐Token生成)", "=")
        
        print(f"\n输入文本: '{input_text}'")
        print(f"最大新Token数: {max_new_tokens}")
        
        inputs = self.tokenizer(input_text, return_tensors="pt").to(self.device)
        current_ids = inputs["input_ids"].clone()
        
        print(f"\n【生成过程】")
        print(f"  采样策略: Greedy (选择概率最高的token)")
        print(f"  Temperature: 1.0 (不调整)")
        
        for step in range(max_new_tokens):
            with torch.no_grad():
                outputs = self.model(current_ids)
                next_token_logits = outputs.logits[0, -1, :]
            
            # Softmax 获取概率
            probs = F.softmax(next_token_logits, dim=-1)
            
            # Top-5 候选
            top_k = 5
            top_probs, top_indices = torch.topk(probs, top_k)
            
            # Greedy 选择
            next_token_id = top_indices[0].unsqueeze(0).unsqueeze(0)
            selected_token = self.tokenizer.decode([next_token_id.item()])
            
            print(f"\n  Step {step + 1}:")
            print(f"    当前序列: {self.tokenizer.decode(current_ids[0])}")
            print(f"    Top-{top_k} 候选:")
            for rank, (prob, idx) in enumerate(zip(top_probs, top_indices), 1):
                candidate = self.tokenizer.decode([idx.item()])
                bar_len = int(prob.item() * 30)
                bar = "█" * bar_len + "░" * (30 - bar_len)
                marker = " ← 选中" if rank == 1 else ""
                print(f"      {rank}. '{candidate:10s}' {bar} {prob.item()*100:5.2f}%{marker}")
            
            # 更新序列
            current_ids = torch.cat([current_ids, next_token_id], dim=-1)
            
            # 检查 EOS
            if next_token_id.item() == self.tokenizer.eos_token_id:
                print(f"    ⚠️ 检测到 EOS token，停止生成")
                break
        
        final_text = self.tokenizer.decode(current_ids[0], skip_special_tokens=True)
        
        print_section("✨ 生成完成")
        print(f"  输入:  {input_text}")
        print(f"  输出:  {final_text}")
        print(f"  Token数: {current_ids.shape[1]}")
        
        return final_text
    
    def analyze_sampling_strategies(self, input_text: str):
        """分析不同采样策略对输出一致性的影响"""
        print_banner("🎲 BONUS: 采样策略与输出一致性", "=")
        
        inputs = self.tokenizer(input_text, return_tensors="pt").to(self.device)
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits[0, -1, :]  # 最后一个位置的 logits
        
        print(f"\n输入: '{input_text}'")
        print(f"\n【影响输出一致性的因素】")
        
        print(f"\n  1. Temperature (温度)")
        print(f"     公式: P_i = softmax(logit_i / T)")
        print(f"     T=0: 退化为 argmax (确定性)")
        print(f"     T<1: 分布更尖锐，更确定")
        print(f"     T>1: 分布更平滑，更随机")
        
        for temp in [0.1, 0.5, 1.0, 1.5, 2.0]:
            probs = F.softmax(logits / temp, dim=-1)
            top_probs, top_indices = torch.topk(probs, 3)
            tokens = [self.tokenizer.decode([idx.item()]) for idx in top_indices]
            probs_str = ", ".join([f"'{t}': {p.item()*100:.1f}%" for t, p in zip(tokens, top_probs)])
            print(f"     T={temp:.1f}: Top-3 = [{probs_str}]")
        
        print(f"\n  2. Top-K Sampling")
        print(f"     只保留概率最高的 K 个token")
        print(f"     重新归一化后采样")
        
        print(f"\n  3. Top-P (Nucleus) Sampling")
        print(f"     保留累积概率达到 P 的最小token集合")
        print(f"     动态调整候选数量")
        
        probs = F.softmax(logits, dim=-1)
        sorted_probs, sorted_indices = torch.sort(probs, descending=True)
        cumsum = torch.cumsum(sorted_probs, dim=0)
        
        for p in [0.5, 0.8, 0.9, 0.95]:
            num_tokens = (cumsum <= p).sum().item() + 1
            print(f"     P={p}: 需要 {num_tokens} 个token")
        
        print(f"\n  4. 随机种子 (Random Seed)")
        print(f"     设置 torch.manual_seed() 可保证可复现性")
        print(f"     但跨设备/框架可能仍有差异")
        
        print(f"\n  5. 数值精度")
        print(f"     FP32 vs FP16 vs BF16 会有微小差异")
        print(f"     FlashAttention 等优化可能改变计算顺序")
        
        print(f"\n【如何获得一致输出】")
        print(f"  ✓ 使用 temperature=0 或 do_sample=False (Greedy)")
        print(f"  ✓ 设置固定随机种子")
        print(f"  ✓ 使用相同的数值精度")
        print(f"  ✓ 使用相同的推理框架和版本")
        
    def full_analysis(self, input_text: str):
        """完整分析流程"""
        print_banner("🔬 LLM 完整推理流程分析", "=", 80)
        print(f"模型: Qwen3-0.6B")
        print(f"输入: '{input_text}'")
        
        # Step 1: Tokenization
        inputs, tokens = self.analyze_tokenization(input_text)
        
        # Step 2: Embedding
        embeddings = self.analyze_embedding(inputs, tokens)
        
        # Step 3: Position Encoding
        self.analyze_rope(len(tokens))
        
        # Step 4: Transformer Layers
        outputs = self.analyze_transformer_layers(inputs, tokens, num_display=2)
        
        # Step 5: Output Layer
        logits = self.analyze_output_layer(outputs, tokens)
        
        # Step 6: Generation
        final_text = self.analyze_generation(input_text, max_new_tokens=10)
        
        # Bonus: Sampling Strategies
        self.analyze_sampling_strategies(input_text)
        
        print_banner("🎯 分析完成", "=", 80)
        return final_text


# ============================================================================
# 主程序
# ============================================================================

if __name__ == "__main__":
    # 模型路径
    MODEL_PATH = "/home/lz/models/Qwen3-0.6B"
    
    # 输入文本
    INPUT_TEXT = "你好，Qwen3！"
    
    # 创建分析器
    analyzer = LLMAnalyzer(MODEL_PATH, device="cpu")
    
    # 加载模型
    analyzer.load_model()
    
    # 打印模型结构
    analyzer.print_model_structure()
    
    # 完整分析
    analyzer.full_analysis(INPUT_TEXT)

