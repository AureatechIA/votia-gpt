# media-ingest

Microsserviço de scraping/extração pra votia-gpt. Roda yt-dlp (YouTube/X) e instaloader (Instagram) com áudio sendo retornado pronto pro Whisper.

## Endpoints

Todos exigem header `X-API-Key: <chave>` se `API_KEY` estiver setada.

- `GET /health` — health check (sem auth)
- `POST /ingest/youtube` — body `{ "url": "..." }`
  → `{ kind: "audio", audio_b64, content_type, title, description, duration_s, ... }`
- `POST /ingest/instagram` — body `{ "url": "..." }`
  → vídeo/reel: `{ kind: "audio", audio_b64, caption, owner, ... }`
  → imagem: `{ kind: "image", image_b64, caption, owner, ... }`
- `POST /ingest/x` — body `{ "url": "..." }`
  → tweet com vídeo: `{ kind: "audio", audio_b64, ... }`
  → tweet sem vídeo: `{ kind: "text", text, title, description, ... }`

## Rodar local

```bash
cp .env.example .env
# edite API_KEY
docker compose up --build
```

Smoke test:
```bash
curl -X POST http://localhost:8000/ingest/youtube \
  -H "x-api-key: $API_KEY" \
  -H "content-type: application/json" \
  -d '{"url":"https://www.youtube.com/watch?v=2V-ZW1vCVKg"}' | jq '.title, .duration_s'
```

## Deploy no DigitalOcean Droplet

Pré-requisitos no droplet: Docker + docker compose plugin (`apt install docker.io docker-compose-plugin`).

1. Copie o folder pro droplet:
   ```bash
   rsync -avz services/media-ingest/ root@SEU_DROPLET:/opt/media-ingest/
   ```
2. No droplet, em `/opt/media-ingest/`:
   ```bash
   cp .env.example .env
   # edite API_KEY pra algo aleatório e forte (openssl rand -hex 32)
   docker compose up -d --build
   ```
3. Verifique:
   ```bash
   curl -s http://localhost:8000/health
   ```
4. Exponha pra internet — recomendo via Nginx + Let's Encrypt num domínio próprio (ex: `media-ingest.suaempresa.com`), ou abra a porta 8000 no firewall do droplet pra um IP específico (o IP do Vercel não é fixo, então fica liberado-pra-tudo com auth por API key).

5. No votia-gpt (Vercel ou local), setar env:
   ```
   MEDIA_INGEST_URL=https://media-ingest.suaempresa.com
   MEDIA_INGEST_KEY=<mesma chave do .env do serviço>
   ```

## Limites e tradeoffs

- **YouTube está desabilitado por padrão (retorna 503).** Desde Q1/2026 o YouTube exige PO Token pra entregar formatos de áudio/vídeo reais; sem provider de PO Token, mesmo com cookies + JS runtime o yt-dlp só recebe storyboards. O app cai automaticamente no fallback de legenda automática (`youtube-transcript`), que cobre ~95% dos vídeos públicos com voz (incluindo todo canal político/podcast relevante).
  - Pra ativar yt-dlp pro YouTube no futuro: subir um PO Token provider (ex: `bgutil-ytdlp-pot-provider`) e setar `YT_POT_PROVIDER_URL` nas envs do compose.
- **Instagram sem login** funciona pra posts/reels públicos básicos. Posts privados, contas com restrição, ou volume alto vão falhar com erro 502 — o votia-gpt cai pro fallback de meta tags. Pra robustez total, criar conta IG dedicada e mapear sessão (`instaloader -l USERNAME` gera arquivo em `~/.config/instaloader/`, montar como volume no docker).
- **Áudio limitado a 24MB** (Whisper aceita 25MB). Vídeos longos (>40min em qualidade média) podem estourar — pra esses, cortar em chunks no futuro.
- **X**: yt-dlp resolve tweets com vídeo. Tweets só-texto retornam title/description do og tag — análise feita só com isso (sem o "tom" da fala).
