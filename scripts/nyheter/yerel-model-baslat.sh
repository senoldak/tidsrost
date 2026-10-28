#!/usr/bin/env bash
# Yerel model gölgesi (28 Ekim 2026, yerel-model.mjs): llama.cpp'yi ve modelleri indirir (önbellekte varsa indirmez),
# sunucuları arka planda açar ve hazır olmalarını bekler. İş akışında continue-on-error ile çalışır: bir şey
# düşerse bot sunucuya ulaşamaz, gölgeyi kendiliğinden atlar.
#   8091: EmbeddingGemma 2 (gömme)   8092: Gemma 4 E4B (evet/hayır)   8093: Granite Embedding 97M R2 (gömme)
# Granite için IBM resmi GGUF yayımlamıyor: resmi ağırlıklar sabit bir sürümden indirilip llama.cpp'nin kendi
# dönüştürücüsüyle GGUF'a çevrilir (yalnız ilk seferde; sonra önbellekte). Dönüşüm düşerse Granite atlanır, öbür iki
# model yine açılır. Sürüm ya da model değişirse iş akışındaki önbellek anahtarı da değişmeli.
set -euo pipefail

DIZIN="${YEREL_DIZIN:-$HOME/yerel-model}"
LLAMA=b11936
GOMME_URL=https://huggingface.co/ggml-org/embeddinggemma-2-GGUF/resolve/main/embeddinggemma-2-Q8_0.gguf
SOHBET_URL=https://huggingface.co/unsloth/gemma-4-E4B-it-qat-GGUF/resolve/main/gemma-4-E4B-it-qat-UD-Q4_K_XL.gguf
GRANITE_URL=https://huggingface.co/ibm-granite/granite-embedding-97m-multilingual-r2/resolve/835ad14087e140460703cf0fae09f97d469d65c2
mkdir -p "$DIZIN"
cd "$DIZIN"

if [ ! -x "llama-$LLAMA/llama-server" ]; then
  curl -fsSL --retry 3 -o llama.tgz "https://github.com/ggml-org/llama.cpp/releases/download/$LLAMA/llama-$LLAMA-bin-ubuntu-x64.tar.gz"
  tar -xzf llama.tgz
  rm llama.tgz
fi
[ -s gomme.gguf ] || curl -fsSL --retry 3 -o gomme.gguf "$GOMME_URL"
[ -s sohbet.gguf ] || curl -fsSL --retry 3 -o sohbet.gguf "$SOHBET_URL"

granite_donustur() {
  local hf="$RUNNER_TEMP/granite-hf" kod="$RUNNER_TEMP/llama-kaynak" py="$RUNNER_TEMP/donustur"
  mkdir -p "$hf/1_Pooling"
  for f in config.json model.safetensors tokenizer.json tokenizer_config.json special_tokens_map.json modules.json \
    sentence_bert_config.json config_sentence_transformers.json 1_Pooling/config.json; do
    curl -fsSL --retry 3 -o "$hf/$f" "$GRANITE_URL/$f" || return 1
  done
  git clone -q --depth 1 --branch "$LLAMA" https://github.com/ggml-org/llama.cpp "$kod" || return 1
  python3 -m venv "$py" || return 1
  "$py/bin/pip" install --quiet --disable-pip-version-check -r "$kod/requirements/requirements-convert_hf_to_gguf.txt" || return 1
  "$py/bin/python" "$kod/convert_hf_to_gguf.py" "$hf" --outfile granite.gguf.tmp --outtype f16 || return 1
  mv granite.gguf.tmp granite.gguf
}
# Dönüşüm düşerse işaret dosyası önbelleğe girer, sonraki turlar her seferinde yeniden denemez (yeniden denemek için
# iş akışındaki önbellek anahtarını değiştir).
if [ ! -s granite.gguf ] && [ ! -e granite.atla ]; then
  granite_donustur || { echo "::warning::yerel: Granite dönüştürülemedi; atlanıyor"; rm -f granite.gguf.tmp; touch granite.atla; }
fi
ls -la "$DIZIN"

SUNUCU="$DIZIN/llama-$LLAMA/llama-server"
export LD_LIBRARY_PATH="$DIZIN/llama-$LLAMA${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
CEKIRDEK="$(nproc)"
nohup "$SUNUCU" -m gomme.gguf --embeddings --host 127.0.0.1 --port 8091 -c 2048 -b 2048 -ub 2048 -np 1 -t "$CEKIRDEK" >"$RUNNER_TEMP/yerel-gomme.log" 2>&1 &
nohup "$SUNUCU" -m sohbet.gguf --host 127.0.0.1 --port 8092 -c 4096 -np 1 -t "$CEKIRDEK" --reasoning-budget 0 >"$RUNNER_TEMP/yerel-sohbet.log" 2>&1 &
PORTLAR="8091 8092"
if [ -s granite.gguf ]; then
  nohup "$SUNUCU" -m granite.gguf --embeddings --pooling cls --host 127.0.0.1 --port 8093 -c 2048 -b 2048 -ub 2048 -np 1 -t "$CEKIRDEK" >"$RUNNER_TEMP/yerel-granite.log" 2>&1 &
  PORTLAR="$PORTLAR 8093"
fi

for port in $PORTLAR; do
  for _ in $(seq 1 90); do
    if curl -fs "http://127.0.0.1:$port/health" >/dev/null; then
      echo "yerel: $port hazır"
      continue 2
    fi
    sleep 2
  done
  echo "::warning::yerel: $port 180 sn'de açılmadı"
  tail -20 "$RUNNER_TEMP"/yerel-*.log || true
  [ "$port" = 8093 ] || exit 1 # Granite açılmazsa öbür ikisi yine kullanılır
done
