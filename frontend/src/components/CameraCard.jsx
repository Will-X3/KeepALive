import "./CameraCard.css";
import VideoPlayer from "./VideoPlayer";

const CAMERA_STATUS_LABEL = {
  connected: "Connected",
  pending: "Pending",
  disconnected: "Disconnected",
  error: "Error",
};

const STREAM_STATE_LABEL = {
  live: "Live",
  offline: "Offline",
  starting: "Starting",
  degraded: "Degraded",
  fail_closed: "Fail-closed",
};

export default function CameraCard({
  camera,
  contextLabel,
  onRotateKey,
  onDelete,
  rotating,
  deleting,
  showPreview = true,
}) {
  const latestStream = camera.streams?.[0];

  return (
    <div className="camera-card">
      {showPreview && latestStream?.playbackUrl && (
        <div className="camera-card__preview">
          <VideoPlayer src={latestStream.playbackUrl} />
          <p className="camera-card__preview-note">
            Private preview — blurred at the source regardless of live status. This is what you see
            as the owner; the public only sees it once the stream reports "Live."
          </p>
        </div>
      )}

      <div className="camera-card__top">
        <div>
          {contextLabel && <p className="camera-card__context">{contextLabel}</p>}
          <p className="camera-card__id">Camera {camera._id.slice(-6)}</p>
          <div className="camera-card__badges">
            <span className={`camera-badge camera-badge--${camera.status}`}>
              {CAMERA_STATUS_LABEL[camera.status] || camera.status}
            </span>
            {latestStream && (
              <span className={`camera-badge camera-badge--stream-${latestStream.publicState}`}>
                {STREAM_STATE_LABEL[latestStream.publicState] || latestStream.publicState}
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="state-message__note" style={{ marginTop: "var(--space-3)" }}>
        {camera.lastSeenAt
          ? `Last seen ${new Date(camera.lastSeenAt).toLocaleString()}`
          : "Never connected yet — point your camera worker at this camera's ingest key."}
      </p>

      {(onRotateKey || onDelete) && (
        <div className="camera-card__actions">
          {onRotateKey && (
            <button type="button" className="btn btn--ghost" onClick={onRotateKey} disabled={rotating}>
              {rotating ? "Rotating…" : "Rotate ingest key"}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="btn btn--ghost camera-card__delete"
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting ? "Removing…" : "Remove camera"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
