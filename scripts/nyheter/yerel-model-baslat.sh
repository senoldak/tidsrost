#!/usr/bin/env bash
# Yerel model gölgesi (28 Ekim 2026, yerel-model.mjs): llama.cpp'yi ve iki modeli indirir (önbellekte varsa indirmez),
# iki sunucuyu arka planda açar ve hazır olmalarını bekler. İş akışında continue-on-error ile çalışır: bir şey
# düşerse bot sunucuya ulaşamaz, gölgeyi kendiliğinden atlar.
#   8091: EmbeddingGemma 2 (gömme)   8092: Gemma 4 E4B (evet/hayır)
# Sürüm ya da model değişirse iş akışındaki önbellek anahtarı da değişmeli.
set -euo pipefail

DIZIN="${YEREL_DIZIN:-$HOME/yerel-model}"
LLAMA=b11936
GOMME_URL=https://huggingface.co/ggml-org/embeddinggemma-2-GGUF/resolve/main/embeddinggemma-2-Q8_0.gguf
SOHBET_URL=https://huggingface.co/unsloth/gemma-4-E4B-it-qat-GGUF/resolve/main/gemma-4-E4B-it-qat-UD-Q4_K_XL.gguf
mkdir -p "$DIZIN"
cd "$DIZIN"

if [ ! -x "llama-$LLAMA/llama-server" ]; then
  curl -fsSL --retry 3 -o llama.tgz "https://github.com/ggml-org/llama.cpp/releases/download/$LLAMA/llama-$LLAMA-bin-ubuntu-x64.tar.gz"
  tar -xzf llama.tgz
  rm llama.tgz
fi
[ -s gomme.gguf ] || curl -fsSL --retry 3 -o gomme.gguf "$GOMME_URL"
[ -s sohbet.gguf ] || curl -fsSL --retry 3 -o sohbet.gguf "$SOHBET_URL"
ls -la "$DIZIN"

SUNUCU="$DIZIN/llama-$LLAMA/llama-server"
export LD_LIBRARY_PATH="$DIZIN/llama-$LLAMA${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
CEKIRDEK="$(nproc)"
nohup "$SUNUCU" -m gomme.gguf --embeddings --host 127.0.0.1 --port 8091 -c 2048 -b 2048 -ub 2048 -np 1 -t "$CEKIRDEK" >"$RUNNER_TEMP/yerel-gomme.log" 2>&1 &
nohup "$SUNUCU" -m sohbet.gguf --host 127.0.0.1 --port 8092 -c 4096 -np 1 -t "$CEKIRDEK" --reasoning-budget 0 >"$RUNNER_TEMP/yerel-sohbet.log" 2>&1 &

for port in 8091 8092; do
  for _ in $(seq 1 90); do
    if curl -fs "http://127.0.0.1:$port/health" >/dev/null; then
      echo "yerel: $port hazır"
      continue 2
    fi
    sleep 2
  done
  echo "::warning::yerel: $port 180 sn'de açılmadı"
  tail -20 "$RUNNER_TEMP/yerel-gomme.log" "$RUNNER_TEMP/yerel-sohbet.log" || true
  exit 1
done
