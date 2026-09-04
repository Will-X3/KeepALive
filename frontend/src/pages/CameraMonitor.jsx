import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMyCameras } from "../api/cameras";
import StateMessage from "../components/StateMessage";
import CameraCard from "../components/CameraCard";
import "./Dashboard.css";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "issue", label: "Needs attention" },
];

export default function CameraMonitor() {
  const [cameras, setCameras] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchMyCameras()
      .then(setCameras)
      .catch(() => setError("Couldn't load your cameras."));
  }, []);

  const filtered = (cameras || []).filter((camera) => {
    const publicState = camera.streams?.[0]?.publicState;
    if (filter === "live") return publicState === "live";
    if (filter === "issue") {
      return camera.status === "error" || camera.status === "disconnected" || publicState === "fail_closed";
    }
    return true;
  });

  const liveCount = (cameras || []).filter((c) => c.streams?.[0]?.publicState === "live").length;
  const issueCount = (cameras || []).filter(
    (c) => c.status === "error" || c.status === "disconnected" || c.streams?.[0]?.publicState === "fail_closed"
  ).length;

  return (
    <main className="page">
      <Link to="/dashboard" className="detail__back">
        Your businesses
      </Link>

      <div className="dashboard__header">
        <div>
          <h1>Camera monitor</h1>
          <p className="state-message__body">Every camera across every location, in one view.</p>
        </div>
      </div>

      {cameras && cameras.length > 0 && (
        <div className="dashboard-stats">
          <div className="dashboard-stat">
            <span className="dashboard-stat__value">{cameras.length}</span>
            <span className="dashboard-stat__label">Total cameras</span>
          </div>
          <div className="dashboard-stat">
            <span className="dashboard-stat__value">{liveCount}</span>
            <span className="dashboard-stat__label">Live now</span>
          </div>
          <div className="dashboard-stat">
            <span className="dashboard-stat__value">{issueCount}</span>
            <span className="dashboard-stat__label">Needs attention</span>
          </div>
        </div>
      )}

      {error && <StateMessage title="Something went wrong" body={error} />}

      {cameras === null && !error && <StateMessage title="Loading…" />}

      {cameras?.length === 0 && (
        <StateMessage
          title="No cameras yet"
          body="Connect a camera from one of your locations to see it here."
        />
      )}

      {cameras?.length > 0 && (
        <>
          <div className="category-filter" style={{ marginTop: "var(--space-6)" }}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`category-filter__chip ${filter === f.key ? "category-filter__chip--active" : ""}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: "var(--space-5)" }}>
            {filtered.length === 0 && (
              <StateMessage title="Nothing matches this filter" body="Try a different filter above." />
            )}
            {filtered.map((camera) => (
              <Link
                key={camera._id}
                to={`/dashboard/locations/${camera.locationId?._id}/cameras`}
                className="camera-monitor-link"
              >
                <CameraCard
                  camera={camera}
                  showPreview={false}
                  contextLabel={`${camera.locationId?.businessId?.name || "Unknown business"} - ${
                    camera.locationId?.name || "Unknown location"
                  }`}
                />
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
