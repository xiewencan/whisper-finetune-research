#!/usr/bin/env python3
"""
上传预处理数据和远程notebook到OSS
所有上传使用 corpus/ 前缀 → 服务器 /mnt/data/
"""

import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

# 添加 local 目录到路径
sys.path.insert(0, str(Path(__file__).parent))
from oss_utils import OSSUploader, UploadConfig

PROJECT_ROOT = Path(__file__).parent.parent

print("=" * 60)
print("上传到OSS (corpus/ → /mnt/data/)")
print("=" * 60)

config = UploadConfig(prefix="corpus")
uploader = OSSUploader(config)

# 1. 上传 SenseVoice 预处理数据
data_dir = PROJECT_ROOT / "prepared_data" / "sensevoice"
if data_dir.exists():
    print("\n[1/3] 上传 SenseVoice 数据 (prepared_data/sensevoice/)")
    config.prefix = "corpus/prepared_data/sensevoice"
    uploader.config = config
    uploader.upload_directory(str(data_dir))
else:
    print("\n[!] SenseVoice 数据不存在，请先运行: uv run python local/prepare_data.py")

# 2. 上传 Fun-ASR-Nano 预处理数据
data_dir = PROJECT_ROOT / "prepared_data" / "funasr_nano"
if data_dir.exists():
    print("\n[2/3] 上传 Fun-ASR-Nano 数据 (prepared_data/funasr_nano/)")
    config.prefix = "corpus/prepared_data/funasr_nano"
    uploader.config = config
    uploader.upload_directory(str(data_dir))
else:
    print("\n[!] Fun-ASR-Nano 数据不存在")

# 3. 上传远程notebook
remote_dir = PROJECT_ROOT / "remote"
if remote_dir.exists():
    print("\n[3/3] 上传远程notebook (remote/)")
    config.prefix = "corpus/remote"
    uploader2 = OSSUploader(config)
    uploader2.upload_directory(str(remote_dir))
else:
    print("\n[!] remote/ 目录不存在")

print("\n" + "=" * 60)
print("上传完成！")
print()
print("服务器路径:")
print("  SenseVoice 数据: /mnt/data/prepared_data/sensevoice/")
print("  Fun-ASR-Nano 数据: /mnt/data/prepared_data/funasr_nano/")
print("  音频文件: /mnt/data/hengdong_asr_trainset/audio/...")
print("  Notebook: /mnt/data/remote/")
print("=" * 60)
