"""
Talks to the Node backend's /api/ingest/* endpoints using the camera's
ingestKey. All calls are best-effort: if the backend is briefly
unreachable, we log it and keep running rather than crashing the worker —
but we never treat a failed report as success, and we never let backend
unreachability be mistaken for "everything's fine."
"""
import logging
import requests
from config import BACKEND_URL, INGEST_KEY

logger = logging.getLogger("backend_client")

_session = requests.Session()
_session.headers.update({"X-Ingest-Key": INGEST_KEY})
TIMEOUT_SECONDS = 5


def _post(path, json_body):
    try:
        resp = _session.post(f"{BACKEND_URL}{path}", json=json_body, timeout=TIMEOUT_SECONDS)
        if resp.status_code >= 400:
            logger.warning("POST %s -> %s: %s", path, resp.status_code, resp.text[:200])
            return None
        return resp.json()
    except requests.RequestException as exc:
        logger.warning("POST %s failed: %s", path, exc)
        return None


def send_heartbeat(ingest_state="connected"):
    return _post("/api/ingest/heartbeat", {"ingestState": ingest_state})


def report_event(event_type, detail=None):
    logger.info("reporting event: %s (%s)", event_type, detail)
    return _post("/api/ingest/event", {"type": event_type, "detail": detail})


def report_blur_health(healthy):
    return _post("/api/ingest/blur-health", {"healthy": healthy})
