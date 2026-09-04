import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchCamerasForLocation,
  connectCamera,
  rotateIngestKey,
  deleteCamera,
} from "../api/cameras";
import { setLocationVisibility } from "../api/locations";
import StateMessage from "../components/StateMessage";
import CameraCard from "../components/CameraCard";
import IngestKeyReveal from "../components/IngestKeyReveal";
import "./Dashboard.css";

export default function LocationCameras() {
  const { id } = useParams();
  const [cameras, setCameras] = useState(null);
  const [error, setError] = useState(null);
  const [revealedKey, setRevealedKey] = useState(null); // { ingestKey, note }
  const [connecting, setConnecting] = useState(false);
  const [rotatingId, setRotatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [visibilityError, setVisibilityError] = useState(null);
  const [visibilityBusy, setVisibilityBusy] = useState(false);

  function load() {
    fetchCamerasForLocation(id)
      .then(setCameras)
      .catch(() => setError("Couldn't load cameras for this location."));
  }

  useEffect(load, [id]);

  async function handleConnect() {
    setConnecting(true);
    setError(null);
    try {
      const result = await connectCamera(id);
      setRevealedKey({ ingestKey: result.ingestKey, note: result.note });
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't connect a new camera.");
    } finally {
      setConnecting(false);
    }
  }

  async function handleRotate(cameraId) {
    setRotatingId(cameraId);
    try {
      const result = await rotateIngestKey(cameraId);
      setRevealedKey({ ingestKey: result.ingestKey, note: result.note });
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't rotate the ingest key.");
    } finally {
      setRotatingId(null);
    }
  }

  async function handleDelete(cameraId) {
    if (!window.confirm("Remove this camera? Any worker still using its ingest key will stop working.")) {
      return;
    }
    setDeletingId(cameraId);
    try {
      await deleteCamera(cameraId);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't remove the camera.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleVisibility(nextStatus) {
    setVisibilityBusy(true);
    setVisibilityError(null);
    try {
      await setLocationVisibility(id, nextStatus);
    } catch (err) {
      setVisibilityError(
        err.response?.data?.error || "Couldn't change visibility. Check the camera's status below."
      );
    } finally {
      setVisibilityBusy(false);
    }
  }

  return (
    <main className="page">
      <Link to="/dashboard" className="detail__back">
        Your businesses
      </Link>

      <div className="dashboard__header">
        <div>
          <h1>Cameras</h1>
          <p className="state-message__body">
            Connect a camera worker to this location, then bring it live once it reports healthy.
          </p>
        </div>
        <button type="button" className="btn btn--primary" onClick={handleConnect} disabled={connecting}>
          {connecting ? "Connecting…" : "+ Connect a camera"}
        </button>
      </div>

      {revealedKey && (
        <IngestKeyReveal
          ingestKey={revealedKey.ingestKey}
          note={revealedKey.note}
          onDismiss={() => setRevealedKey(null)}
        />
      )}

      {error && <StateMessage title="Something went wrong" body={error} />}

      <div className="dashboard__section">
        <div className="dashboard__header" style={{ paddingTop: 0 }}>
          <h2>Visibility</h2>
          <div style={{ display: "flex", gap: "var(--space-3)" }}>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => handleToggleVisibility("paused")}
              disabled={visibilityBusy}
            >
              Pause
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => handleToggleVisibility("live")}
              disabled={visibilityBusy}
            >
              {visibilityBusy ? "Working…" : "Go live"}
            </button>
          </div>
        </div>
        {visibilityError && <div className="form-error">{visibilityError}</div>}
        <p className="state-message__note">
          Going live requires a camera whose stream is currently reporting healthy — connecting a
          camera alone isn't enough; the worker has to confirm the blur pipeline is running first.
        </p>
      </div>

      <div className="dashboard__section">
        <h2>Cameras</h2>

        {cameras === null && !error && <StateMessage title="Loading…" />}

        {cameras?.length === 0 && (
          <StateMessage
            title="No cameras connected"
            body="Connect a camera to get an ingest key, then point your camera worker at it."
          />
        )}

        {cameras?.length > 0 && (
          <div style={{ marginTop: "var(--space-5)" }}>
            {cameras.map((camera) => (
              <CameraCard
                key={camera._id}
                camera={camera}
                onRotateKey={() => handleRotate(camera._id)}
                onDelete={() => handleDelete(camera._id)}
                rotating={rotatingId === camera._id}
                deleting={deletingId === camera._id}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
