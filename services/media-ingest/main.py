import base64
import os
import re
import tempfile
from pathlib import Path
from typing import Any, Optional

import instaloader
import yt_dlp
from fastapi import Depends, FastAPI, HTTPException, Request, status
from pydantic import BaseModel

API_KEY = os.environ.get("API_KEY", "")
YT_COOKIES_FILE = os.environ.get("YT_COOKIES_FILE", "")
IG_SESSION_USERNAME = os.environ.get("IG_SESSION_USERNAME", "")
IG_COOKIES_FILE = os.environ.get("IG_COOKIES_FILE", "")
MAX_AUDIO_BYTES = 24 * 1024 * 1024  # 24MB (Whisper aceita 25MB)


def _load_ig_session_from_cookies_txt(
    L: "instaloader.Instaloader", cookies_file: str, username: str
) -> bool:
    """Importa sessão do IG de cookies.txt (formato Netscape exportado do browser)."""
    try:
        import http.cookiejar

        jar = http.cookiejar.MozillaCookieJar(cookies_file)
        jar.load(ignore_discard=True, ignore_expires=True)
        L.context._session.cookies.update(jar)
        if username:
            L.context.username = username
        # força um test_login pra confirmar que a sessão é válida
        L.context.test_login()
        return True
    except Exception as e:
        print(f"[ingest] IG cookies load failed: {e}")
        return False

YT_JS_RUNTIME = {"js_runtimes": {"node": {}}}

YT_BOT_BYPASS = {
    "extractor_args": {
        "youtube": {"player_client": ["tv", "ios", "mweb"]},
    },
}

YT_AUTH_CLIENTS = {
    "extractor_args": {
        "youtube": {"player_client": ["tv", "mweb", "web"]},
    },
}

app = FastAPI(title="votia-gpt media-ingest", version="0.1.0")


def require_key(request: Request) -> None:
    if not API_KEY:
        return
    provided = request.headers.get("x-api-key", "")
    if provided != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid API key",
        )


class UrlBody(BaseModel):
    url: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _download_audio_with_ytdlp(url: str) -> dict[str, Any]:
    """Baixa áudio via yt-dlp e devolve bytes + metadata."""
    has_cookies = bool(YT_COOKIES_FILE and Path(YT_COOKIES_FILE).is_file())
    with tempfile.TemporaryDirectory() as tmp:
        out_template = str(Path(tmp) / "%(id)s.%(ext)s")
        ydl_opts: dict[str, Any] = {
            "format": "bestaudio*/best",
            "outtmpl": out_template,
            "noplaylist": True,
            "quiet": True,
            "no_warnings": True,
            "postprocessors": [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "96",
                }
            ],
            "max_filesize": MAX_AUDIO_BYTES * 2,
        }
        ydl_opts.update(YT_JS_RUNTIME)
        if has_cookies:
            ydl_opts["cookiefile"] = YT_COOKIES_FILE
            ydl_opts.update(YT_AUTH_CLIENTS)
        else:
            ydl_opts.update(YT_BOT_BYPASS)
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
        if info is None:
            raise RuntimeError("yt-dlp não retornou info")

        files = list(Path(tmp).glob("*.mp3"))
        if not files:
            files = list(Path(tmp).iterdir())
        if not files:
            raise RuntimeError("yt-dlp não gerou arquivo de áudio")

        audio_path = files[0]
        data = audio_path.read_bytes()
        if len(data) > MAX_AUDIO_BYTES:
            raise RuntimeError(
                f"Áudio extraído tem {len(data)/1024/1024:.1f}MB — acima do limite Whisper (25MB)."
            )
        return {
            "audio_b64": base64.b64encode(data).decode("ascii"),
            "content_type": "audio/mpeg",
            "filename": audio_path.name,
            "title": info.get("title"),
            "description": info.get("description"),
            "duration_s": info.get("duration"),
            "uploader": info.get("uploader"),
        }


def _info_only_with_ytdlp(url: str) -> dict[str, Any]:
    has_cookies = bool(YT_COOKIES_FILE and Path(YT_COOKIES_FILE).is_file())
    ydl_opts: dict[str, Any] = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
    }
    ydl_opts.update(YT_JS_RUNTIME)
    if has_cookies:
        ydl_opts["cookiefile"] = YT_COOKIES_FILE
        ydl_opts.update(YT_AUTH_CLIENTS)
    else:
        ydl_opts.update(YT_BOT_BYPASS)
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(url, download=False)
    return {
        "title": info.get("title") if info else None,
        "description": info.get("description") if info else None,
        "uploader": info.get("uploader") if info else None,
        "raw_text": " ".join(
            filter(
                None,
                [
                    info.get("title") if info else None,
                    info.get("description") if info else None,
                ],
            )
        ),
    }


YT_POT_ENABLED = os.environ.get("YT_POT_PROVIDER_URL", "") != ""


@app.post("/ingest/youtube", dependencies=[Depends(require_key)])
def ingest_youtube(body: UrlBody) -> dict[str, Any]:
    # YouTube exige PO Token desde Q1/2026. Sem um provider de PO Token configurado,
    # retornamos 503 imediato pro app cair no fallback de legenda automática (estável).
    if not YT_POT_ENABLED:
        raise HTTPException(
            status_code=503,
            detail=(
                "YouTube via yt-dlp desabilitado: YouTube exige PO Token desde 2026. "
                "App vai cair no fallback de legenda automática."
            ),
        )
    try:
        result = _download_audio_with_ytdlp(body.url)
        return {"kind": "audio", "source": body.url, **result}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"yt-dlp falhou: {e}")


_INSTA_SHORTCODE_RE = re.compile(r"instagram\.com/(?:p|reel|tv)/([A-Za-z0-9_-]+)")


def _extract_instagram_shortcode(url: str) -> Optional[str]:
    m = _INSTA_SHORTCODE_RE.search(url)
    return m.group(1) if m else None


@app.post("/ingest/instagram", dependencies=[Depends(require_key)])
def ingest_instagram(body: UrlBody) -> dict[str, Any]:
    shortcode = _extract_instagram_shortcode(body.url)
    if not shortcode:
        raise HTTPException(status_code=400, detail="URL do Instagram inválida")

    L = instaloader.Instaloader(
        download_pictures=False,
        download_videos=False,
        download_video_thumbnails=False,
        download_geotags=False,
        download_comments=False,
        save_metadata=False,
        compress_json=False,
    )

    if IG_COOKIES_FILE and Path(IG_COOKIES_FILE).is_file():
        _load_ig_session_from_cookies_txt(L, IG_COOKIES_FILE, IG_SESSION_USERNAME)
    elif IG_SESSION_USERNAME:
        try:
            L.load_session_from_file(IG_SESSION_USERNAME)
        except FileNotFoundError:
            pass

    try:
        post = instaloader.Post.from_shortcode(L.context, shortcode)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=(
                "instaloader falhou (post privado, removido, ou IG bloqueando IP): "
                f"{e}"
            ),
        )

    caption = post.caption or ""
    owner = post.owner_username
    is_video = bool(post.is_video)
    media_url = post.video_url if is_video else post.url

    payload: dict[str, Any] = {
        "kind": "video" if is_video else "image",
        "source": body.url,
        "caption": caption,
        "owner": owner,
        "likes": post.likes,
        "media_url": media_url,
    }

    if is_video and media_url:
        try:
            import httpx

            r = httpx.get(media_url, follow_redirects=True, timeout=60.0)
            if r.status_code != 200:
                payload["audio_error"] = (
                    f"HTTP {r.status_code} ao baixar MP4 do Reel"
                )
            elif len(r.content) > MAX_AUDIO_BYTES:
                payload["audio_error"] = (
                    f"MP4 do Reel tem {len(r.content)/1024/1024:.1f}MB "
                    f"(>{MAX_AUDIO_BYTES/1024/1024:.0f}MB Whisper)"
                )
            else:
                payload.update(
                    {
                        "kind": "audio",
                        "audio_b64": base64.b64encode(r.content).decode("ascii"),
                        "content_type": r.headers.get(
                            "content-type", "video/mp4"
                        ),
                        "filename": f"ig-{shortcode}.mp4",
                    }
                )
        except Exception as e:
            payload["audio_error"] = f"falha ao baixar MP4 do Reel: {e}"
    elif not is_video and media_url:
        try:
            import httpx

            r = httpx.get(media_url, follow_redirects=True, timeout=15.0)
            if r.status_code == 200:
                payload["image_b64"] = base64.b64encode(r.content).decode("ascii")
                payload["content_type"] = r.headers.get(
                    "content-type", "image/jpeg"
                )
        except Exception as e:
            payload["image_error"] = str(e)

    return payload


@app.post("/ingest/x", dependencies=[Depends(require_key)])
def ingest_x(body: UrlBody) -> dict[str, Any]:
    try:
        try:
            audio = _download_audio_with_ytdlp(body.url)
            return {
                "kind": "audio",
                "source": body.url,
                **audio,
            }
        except Exception:
            info = _info_only_with_ytdlp(body.url)
            return {
                "kind": "text",
                "source": body.url,
                "text": info.get("raw_text") or "",
                "title": info.get("title"),
                "description": info.get("description"),
                "uploader": info.get("uploader"),
            }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"yt-dlp falhou no X: {e}")
