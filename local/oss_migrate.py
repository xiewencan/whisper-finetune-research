"""
OSS 迁移脚本 v2（边下边传，不落盘）
直接从源 OSS 流式复制到新 OSS，避免本地临时文件
"""

import os, sys
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv
load_dotenv('.env')

sys.path.insert(0, 'local')
import alibabacloud_oss_v2 as oss

# ─── 凭证 ─────────────────────────────────────────────────
src_ak = os.environ['ALIBABA_CLOUD_ACCESS_KEY_ID']
src_sk = os.environ['ALIBABA_CLOUD_ACCESS_KEY_SECRET']
dst_ak = os.environ['ALIBABA_CLOUD_ACCESS_KEY_ID_NEW']
dst_sk = os.environ['ALIBABA_CLOUD_ACCESS_KEY_SECRET_NEW']

SRC_BUCKET = "visdrone-1"
SRC_REGION = "cn-shanghai"
DST_BUCKET = "oss-pai-0v5klw2jol8a8ycxmg-cn-hangzhou"
DST_REGION = "cn-hangzhou"
PREFIX = "corpus"
DEFAULT_DIRS = ["hengdong_asr_trainset", "remote", "prepared_data"]


def make_client(ak, sk, region):
    cred = oss.credentials.StaticCredentialsProvider(access_key_id=ak, access_key_secret=sk)
    cfg = oss.config.load_default()
    cfg.credentials_provider = cred
    cfg.region = region
    return oss.Client(cfg)


def list_all_keys(client, bucket, prefix_filter=None, max_keys=200):
    marker = None
    keys = []
    while True:
        kwargs = {'bucket': bucket, 'prefix': PREFIX + '/', 'max_keys': max_keys}
        if marker:
            kwargs['marker'] = marker
        result = client.list_objects(oss.ListObjectsRequest(**kwargs))
        for obj in result.contents:
            key = obj.key
            if key == PREFIX + '/':
                continue
            rel = key[len(PREFIX) + 1:]
            top_dir = rel.split('/')[0]
            if prefix_filter is None or top_dir in prefix_filter:
                keys.append((key, obj.size))
        if result.is_truncated:
            marker = result.next_marker
        else:
            break
    return keys


def stream_copy(src_client, dst_client, key, size, progress_cb=None):
    """从源下载内容块，直接上传到目标（不落盘）"""
    try:
        result = src_client.get_object(oss.GetObjectRequest(
            bucket=SRC_BUCKET, key=key))
        content = result.body.content
        dst_client.put_object(oss.PutObjectRequest(
            bucket=DST_BUCKET, key=key, body=content))
        return True
    except Exception as e:
        return False


def migrate(dirs, dry_run=False):
    src_client = make_client(src_ak, src_sk, SRC_REGION)
    dst_client = make_client(dst_ak, dst_sk, DST_REGION)

    print(f"源: {SRC_BUCKET} ({SRC_REGION})")
    print(f"目标: {DST_BUCKET} ({DST_REGION})")
    print(f"迁移目录: {dirs}")
    print()

    print("扫描源 OSS...")
    keys = list_all_keys(src_client, SRC_BUCKET, prefix_filter=set(dirs))
    total_size = sum(s for _, s in keys)
    print(f"待迁移: {len(keys)} 个文件, {total_size / 1024 / 1024:.2f} MB\n")

    if dry_run:
        print("[DRY RUN]")
        return

    print("开始流式迁移（边下边传，不落盘）...")
    start = time.time()
    success = 0
    failed = []
    lock_ok = [0]  # 用列表包装以便内部修改
    lock_fail = [0]

    def do_one(item):
        key, size = item
        ok = stream_copy(src_client, dst_client, key, size)
        if ok:
            lock_ok[0] += 1
        else:
            lock_fail[0] += 1
        n = lock_ok[0] + lock_fail[0]
        if n % 500 == 0:
            print(f"  进度: {n}/{len(keys)}")
        return ok, key

    max_workers = 4
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futs = {pool.submit(do_one, k): k for k in keys}
        for fut in as_completed(futs):
            ok, key = fut.result()
            if not ok:
                failed.append(key)

    elapsed = time.time() - start
    print(f"\n迁移完成!")
    print(f"  成功: {success}/{len(keys)}")
    print(f"  失败: {len(failed)}")
    if failed:
        print(f"  失败文件（前10）: {failed[:10]}")
    print(f"  总耗时: {elapsed:.1f}s  ({(total_size / 1024 / 1024) / elapsed:.2f} MB/s)")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--dirs', nargs='+')
    parser.add_argument('--all', action='store_true')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    if args.all:
        dirs = None
    elif args.dirs:
        dirs = args.dirs
    else:
        dirs = DEFAULT_DIRS

    migrate(dirs, dry_run=args.dry_run)