# Whisper Fine-tuning Research

语音识别(ASR)模型微调研究项目，对比 FunASR nano 和 OpenAI Whisper 在不同数据集和训练策略下的表现。

## 项目结构

```
├── local/          # 本地实验数据和分析
│   ├── *.ipynb     # 实验 notebook
│   └── oss_utils.py
├── remote/         # 远程服务器训练脚本
│   ├── *.ipynb     # 训练 notebook
│   └── train_nano.sh
├── model/          # 微调后的模型 checkpoints
├── prepared_data/ # 预处理数据
│   ├── sensevoice/
│   └── funasr_nano/
└── docs/           # 文档
```

## 主要实验

| 文件 | 内容 |
|------|------|
| `local/01_full_compare.ipynb` | FunASR vs Whisper baseline 对比 |
| `local/03_analysis.ipynb` | 详细分析与可视化 |
| `local/06_sv_ablation_eval.ipynb` | 数据消融实验 |
| `remote/05_finetune_whisper.ipynb` | Whisper LoRA 微调 |
| `remote/06_data_ablation.ipynb` | 数据量影响分析 |

## 依赖

```bash
uv sync
```

训练依赖 (remote):
```bash
cd remote
pip install -r requirements_whisper.txt
```