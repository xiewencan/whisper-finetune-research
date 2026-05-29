#!/usr/bin/env python3
"""
上传 remote/ 目录下的 notebook 到新的 OSS bucket
"""

import sys
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

sys.path.insert(0, str(Path(__file__).parent))
from oss_utils import OSSUploader, UploadConfig

PROJECT_ROOT = Path(__file__).parent.parent

config = UploadConfig(
    region="cn-hangzhou",
    bucket="oss-pai-0v5klw2jol8a8ycxmg-cn-hangzhou",
    prefix="corpus/remote",
)
uploader = OSSUploader(config)

remote_dir = PROJECT_ROOT / "remote"
if remote_dir.exists():
    print(f"上传 remote/ → {config.bucket}/{config.prefix}/")
    uploader.upload_directory(str(remote_dir))
else:
    print("remote/ 目录不存在")