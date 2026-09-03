import "./StatusPill.css";

export default function StatusPill({ status }) {
  const isLive = status === "live";
  return (
    <span className={`status-pill ${isLive ? "status-pill--live" : "status-pill--offline"}`}>
      <span className="status-pill__dot" aria-hidden="true" />
      {isLive ? "Live" : "Not live now"}
    </span>
  );
}
