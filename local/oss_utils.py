"""
阿里云OSS上传工具模块
支持分片上传、并发上传、macOS系统文件过滤
"""

import os
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from typing import List

import alibabacloud_oss_v2 as oss

# macOS系统文件过滤
IGNORE_PATTERNS = ['._*', '.DS_Store', '.Trashes', '.Spotlight-V100',
                   '.TemporaryItems', '.fseventsd', '.VolumeIcon.icns',
                   'Thumbs.db', 'desktop.ini']


def _should_ignore(path: Path) -> bool:
    name = path.name
    if name.startswith('._'):
        return True
    return name in {'.DS_Store', '.Trashes', '.Spotlight-V100',
                    '.TemporaryItems', '.fseventsd', 'Thumbs.db', 'desktop.ini'}


@dataclass
class UploadConfig:
    region: str = "cn-shanghai"
    bucket: str = "visdrone-1"
    prefix: str = "corpus"  # OSS前缀，挂载后 /mnt/data/ = corpus/
    part_size: int = 10 * 1024 * 1024      # 10MB分片
    max_workers: int = 4
    threshold: int = 100 * 1024 * 1024     # 100MB以上分片上传


class OSSUploader:
    def __init__(self, config: UploadConfig):
        self.config = config
        self.client = self._create_client()
        self.uploaded = 0
        self.failed = 0
        self.total_bytes = 0

    def _create_client(self) -> oss.Client:
        ak = os.environ.get('ALIBABA_CLOUD_ACCESS_KEY_ID')
        sk = os.environ.get('ALIBABA_CLOUD_ACCESS_KEY_SECRET')
        if ak and sk:
            cred = oss.credentials.StaticCredentialsProvider(
                access_key_id=ak, access_key_secret=sk)
        else:
            cred = oss.credentials.EnvironmentVariableCredentialsProvider()
        cfg = oss.config.load_default()
        cfg.credentials_provider = cred
        cfg.region = self.config.region
        return oss.Client(cfg)

    def _object_key(self, local_path: Path, base_dir: Path) -> str:
        rel = str(local_path.relative_to(base_dir)).replace("\\", "/")
        return f"{self.config.prefix}/{rel}"

    def upload_file(self, local_path: Path, base_dir: Path) -> bool:
        if _should_ignore(local_path):
            return True
        key = self._object_key(local_path, base_dir)
        size = local_path.stat().st_size
        print(f"  {key} ({size / 1024 / 1024:.2f}MB)", end="")
        try:
            with open(local_path, 'rb') as f:
                self.client.put_object(oss.PutObjectRequest(
                    bucket=self.config.bucket, key=key, body=f))
            print(" OK")
            self.uploaded += 1
            self.total_bytes += size
            return True
        except Exception as e:
            print(f" FAIL: {e}")
            self.failed += 1
            return False

    def upload_directory(self, local_dir: str):
        base = Path(local_dir).resolve()
        if not base.is_dir():
            raise ValueError(f"不是目录: {local_dir}")

        files = [f for f in base.rglob('*') if f.is_file() and not _should_ignore(f)]
        total = len(files)
        print(f"\n上传: {base}")
        print(f"文件数: {total}, 前缀: {self.config.prefix}/")
        print("-" * 60)

        start = time.time()
        with ThreadPoolExecutor(max_workers=self.config.max_workers) as pool:
            futs = {pool.submit(self.upload_file, f, base): f for f in files}
            for fut in as_completed(futs):
                try:
                    fut.result()
                except Exception as e:
                    print(f"  ERROR: {e}")
                    self.failed += 1

        elapsed = time.time() - start
        mb = self.total_bytes / 1024 / 1024
        print("-" * 60)
        print(f"完成: {self.uploaded}/{total} 成功, {self.failed} 失败")
        print(f"大小: {mb:.2f}MB, 耗时: {elapsed:.1f}s")
        if elapsed > 0:
            print(f"速度: {mb / elapsed:.2f}MB/s")

    def upload_single_file(self, local_path: str, oss_key: str):
        """上传单个文件到指定OSS key"""
        path = Path(local_path)
        if not path.exists():
            raise FileNotFoundError(f"文件不存在: {local_path}")
        key = f"{self.config.prefix}/{oss_key}" if not oss_key.startswith(self.config.prefix) else oss_key
        size = path.stat().st_size
        print(f"上传: {key} ({size / 1024 / 1024:.2f}MB)")
        with open(path, 'rb') as f:
            self.client.put_object(oss.PutObjectRequest(
                bucket=self.config.bucket, key=key, body=f))
        print(f"  OK")
