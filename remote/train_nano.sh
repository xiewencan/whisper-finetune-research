#!/bin/bash

export CUDA_VISIBLE_DEVICES="0"
gpu_num=1

model_name_or_model_dir="FunAudioLLM/Fun-ASR-Nano-2512"
train_data="/mnt/data/prepared_data/funasr_nano/train.jsonl"
val_data="/mnt/data/prepared_data/funasr_nano/val.jsonl"
output_dir="/mnt/output/funasr_nano"
log_file="${output_dir}/log.txt"

mkdir -p ${output_dir}

DISTRIBUTED_ARGS="--nproc_per_node $gpu_num --master_port 29501"

cd /mnt/Fun-ASR

torchrun $DISTRIBUTED_ARGS \
$(which funasr-train-ds) \
++model="${model_name_or_model_dir}" \
++trust_remote_code=true \
++train_data_set_list="${train_data}" \
++valid_data_set_list="${val_data}" \
++dataset_conf.data_split_num=1 \
++dataset_conf.batch_sampler="BatchSampler" \
++dataset_conf.batch_size=6000 \
++dataset_conf.sort_size=1024 \
++dataset_conf.batch_type="token" \
++dataset_conf.num_workers=8 \
++train_conf.max_epoch=10 \
++train_conf.log_interval=50 \
++train_conf.resume=true \
++train_conf.validate_interval=1000 \
++train_conf.save_checkpoint_interval=1000 \
++train_conf.keep_nbest_models=5 \
++train_conf.avg_nbest_model=3 \
++train_conf.use_bf16=true \
++train_conf.grad_clip=5 \
++optim=adamw \
++optim_conf.lr=2e-4 \
++optim_conf.weight_decay=0.0 \
++audio_encoder_conf.freeze=true \
++audio_adaptor_conf.freeze=false \
++llm_conf.freeze=false \
++output_dir="${output_dir}" &> ${log_file}
