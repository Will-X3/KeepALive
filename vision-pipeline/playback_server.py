"""
Serves HLS_OUTPUT_DIR over plain HTTP so a browser can play the stream
directly. Two things a generic static file server gets wrong that matter
here, which is why this isn't just `python -m http.server`:

  1. MIME types — .m3u8 and .ts aren't in Python's default mimetypes map
     on every platform. Get this wrong and some browsers/hls.js refuse to
     play the manifest even though the bytes are fine.
  2. CORS — the dashboard runs on a different origin (different port at
     minimum) than this server, so every response needs
     Access-Control-Allow-Origin or the browser silently blocks it.

Runs in a background thread from worker.py; not meant to be run standalone.
"""
import http.server
import logging
import os
import socketserver
import threading

logger = logging.getLogger("playback_server")

MIME_TYPES = {
    ".m3u8": "application/vnd.apple.mpegurl",
    ".ts": "video/mp2t",
}


class HLSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Range, Content-Type")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_OPTIONS(self):
        # hls.js sometimes fetches segments with a Range header, which
        # isn't a CORS-safelisted header — the browser sends a preflight
        # OPTIONS request first, and BaseHTTPRequestHandler doesn't answer
        # OPTIONS at all by default (falls through to a 501). Without this,
        # every real browser player fails even though a plain curl/fetch
        # GET works fine — it did exactly that in testing before this fix.
        self.send_response(204)
        self.end_headers()

    def guess_type(self, path):
        ext = os.path.splitext(path)[1]
        if ext in MIME_TYPES:
            return MIME_TYPES[ext]
        return super().guess_type(path)

    def log_message(self, format, *args):
        # SimpleHTTPRequestHandler logs every request to stderr by default,
        # which is just noise here — the worker's own logger covers what
        # actually matters (connectivity, health, failures).
        pass


def start_playback_server(directory, bind_host, port):
    """Starts the server in a background thread and returns the server
    instance so the caller can shut it down on exit.

    bind_host should almost always be "0.0.0.0" (all interfaces) so other
    devices on the LAN can reach it — the *reported* playback URL (what
    the browser actually connects to) is a separate, deliberately distinct
    setting; see config.PLAYBACK_HOST and worker.py.
    """
    os.makedirs(directory, exist_ok=True)

    handler = lambda *args, **kwargs: HLSRequestHandler(*args, directory=directory, **kwargs)
    server = socketserver.ThreadingTCPServer((bind_host, port), handler)
    server.daemon_threads = True

    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()

    logger.info("Serving %s on port %s (bound to %s)", directory, port, bind_host)
    return server
