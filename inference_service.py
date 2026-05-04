#!/usr/bin/env python3
"""
ASR 推理服务 - 在 Agent local 环境下运行
Usage: /Users/fanhua/Projects/Agent/local/.venv/bin/python inference_service.py
"""
import os
import re
import time
import gc
import json
import uuid
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
import torch

# 模型路径
SV_CKPT = os.path.expanduser('~/Projects/Agent/model/sensevoice_lora/model.pt.best')
NANO_CKPT = os.path.expanduser('~/Projects/Agent/model/funasr_nano_v3/model.pt.best')

print(f"[Inference] SV_CKPT: {SV_CKPT}")
print(f"[Inference] NANO_CKPT: {NANO_CKPT}")
print(f"[Inference] Device: {'mps' if torch.backends.mps.is_available() else 'cpu'}")

app = Flask(__name__)
CORS(app)

def clean_sensevoice_text(text):
    """去除 SenseVoice 特殊标记"""
    return re.sub(r'<\|[^|]*\|>', '', text).strip()

def free_memory():
    """释放 GPU/MPS 内存"""
    gc.collect()
    if torch.backends.mps.is_available():
        torch.mps.empty_cache()

def convert_to_wav(input_path, output_path):
    """将音频转换为 16kHz 单声道 WAV"""
    try:
        import subprocess
        subprocess.run([
            'ffmpeg', '-y', '-i', input_path,
            '-ar', '16000', '-ac', '1',
            '-acodec', 'pcm_s16le', output_path
        ], capture_output=True, check=True)
        return True
    except Exception as e:
        print(f"[Inference] ffmpeg error: {e}")
        import shutil
        shutil.copy(input_path, output_path)
        return False

@app.route('/infer', methods=['POST'])
def infer():
    """四模型对比推理"""
    if 'audio' not in request.files:
        return jsonify({"status": "error", "message": "No audio file provided"}), 400

    audio_file = request.files['audio']
    if not audio_file.filename:
        return jsonify({"status": "error", "message": "Empty filename"}), 400

    # 保存临时文件
    temp_dir = tempfile.mkdtemp(prefix='asr_infer_')
    input_path = os.path.join(temp_dir, 'input')
    output_path = os.path.join(temp_dir, 'input.wav')

    try:
        audio_file.save(input_path)
        convert_to_wav(input_path, output_path)

        device = 'mps' if torch.backends.mps.is_available() else 'cpu'
        results = {}

        from funasr import AutoModel

        # 1. SenseVoice-base
        print("[Inference] Running SenseVoice-base...")
        start = time.time()
        model = AutoModel(model='iic/SenseVoiceSmall', disable_update=True, device=device)
        res = model.generate(input=output_path, language='auto', use_itn=True)
        text = clean_sensevoice_text(res[0]['text']) if res else ''
        elapsed = time.time() - start
        results['sv_base'] = {'text': text, 'time': round(elapsed, 2)}
        del model
        free_memory()
        print(f"[Inference] SV-base done: {elapsed:.2f}s")

        # 2. SenseVoice-ft
        print("[Inference] Running SenseVoice-ft...")
        start = time.time()
        model = AutoModel(model='iic/SenseVoiceSmall', lora_only=True, disable_update=True, device=device)
        ckpt = torch.load(SV_CKPT, map_location='cpu', weights_only=False)
        model.model.load_state_dict(ckpt['state_dict'], strict=False)
        del ckpt
        res = model.generate(input=output_path, language='auto', use_itn=True)
        text = clean_sensevoice_text(res[0]['text']) if res else ''
        elapsed = time.time() - start
        results['sv_ft'] = {'text': text, 'time': round(elapsed, 2)}
        del model
        free_memory()
        print(f"[Inference] SV-ft done: {elapsed:.2f}s")

        # 3. Nano-base
        print("[Inference] Running Nano-base...")
        start = time.time()
        model = AutoModel(model='FunAudioLLM/Fun-ASR-Nano-2512', hub='ms', device=device, disable_update=True)
        res = model.generate(input=output_path, language='中文', itn=True)
        text = res[0]['text'] if res else ''
        elapsed = time.time() - start
        results['nano_base'] = {'text': text, 'time': round(elapsed, 2)}
        del model
        free_memory()
        print(f"[Inference] Nano-base done: {elapsed:.2f}s")

        # 4. Nano-ft
        print("[Inference] Running Nano-ft...")
        start = time.time()
        model = AutoModel(
            model='FunAudioLLM/Fun-ASR-Nano-2512',
            hub='ms', device=device, disable_update=True,
            init_param=NANO_CKPT,
        )
        res = model.generate(input=output_path, language='中文', itn=True)
        text = res[0]['text'] if res else ''
        elapsed = time.time() - start
        results['nano_ft'] = {'text': text, 'time': round(elapsed, 2)}
        del model
        free_memory()
        print(f"[Inference] Nano-ft done: {elapsed:.2f}s")

        return jsonify({"status": "success", "data": results})

    except Exception as e:
        import traceback
        print(f"[Inference] Error: {e}")
        traceback.print_exc()
        return jsonify({"status": "error", "message": str(e)}), 500

    finally:
        import shutil
        try:
            shutil.rmtree(temp_dir)
        except:
            pass

if __name__ == '__main__':
    print("[Inference] Server starting on http://127.0.0.1:5002")
    app.run(host='127.0.0.1', port=5002, debug=False, threaded=True)
