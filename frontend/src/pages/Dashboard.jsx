import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchMyBusinesses, createBusiness } from "../api/businesses";
import { useAuth } from "../context/AuthContext";
import StateMessage from "../components/StateMessage";
import "./Dashboard.css";

const STATUS_LABEL = {
  active: "Active",
  pending: "Pending review",
  suspended: "Suspended",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState(null);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  function load() {
    fetchMyBusinesses()
      .then(setBusinesses)
      .catch(() => setError("Couldn't load your businesses."));
  }

  useEffect(load, []);

  const totalLocations = businesses?.reduce((sum, b) => sum + (b.locations?.length || 0), 0) || 0;
  const liveLocations =
    businesses?.reduce(
      (sum, b) => sum + (b.locations?.filter((l) => l.status === "live").length || 0),
      0
    ) || 0;

  return (
    <main className="page">
      <div className="dashboard__header">
        <div>
          <h1>Your businesses</h1>
          <p className="state-message__body">Signed in as {user?.email}</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ Add business"}
        </button>
      </div>

      {businesses?.length > 0 && (
        <>
          <div className="dashboard-stats">
            <div className="dashboard-stat">
              <span className="dashboard-stat__value">{businesses.length}</span>
              <span className="dashboard-stat__label">Business{businesses.length === 1 ? "" : "es"}</span>
            </div>
            <div className="dashboard-stat">
              <span className="dashboard-stat__value">{totalLocations}</span>
              <span className="dashboard-stat__label">Locations</span>
            </div>
            <div className="dashboard-stat">
              <span className="dashboard-stat__value">{liveLocations}</span>
              <span className="dashboard-stat__label">Live now</span>
            </div>
          </div>

          <div className="dashboard-quicklinks">
            <Link to="/dashboard/cameras" className="btn btn--ghost">
              Monitor all cameras
            </Link>
          </div>
        </>
      )}

      {showForm && (
        <NewBusinessForm
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      {error && <StateMessage title="Something went wrong" body={error} />}

      {businesses === null && !error && <StateMessage title="Loading…" />}

      {businesses?.length === 0 && (
        <StateMessage
          title="No businesses yet"
          body="Add your business, then add a location and connect a camera to go live."
        />
      )}

      {businesses?.length > 0 && (
        <div className="dashboard__list" style={{ marginTop: "var(--space-6)" }}>
          {businesses.map((b) => (
            <Link key={b._id} to={`/dashboard/businesses/${b._id}`} className="business-row">
              <div className={`business-row__edge business-row__edge--${b.status}`} />
              <div className="business-row__main">
                <div className="business-row__top">
                  <h3>{b.name}</h3>
                  <span className={`business-row__status business-row__status--${b.status}`}>
                    {STATUS_LABEL[b.status] || b.status}
                  </span>
                </div>
                <p className="state-message__body">
                  {b.locations?.length || 0} location{b.locations?.length === 1 ? "" : "s"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

function NewBusinessForm({ onCreated }) {
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await createBusiness({ name, website: website || undefined, phone: phone || undefined });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't create the business.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form dashboard__form" onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}

      <div className="form-field">
        <label htmlFor="biz-name">Business name</label>
        <input id="biz-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="form-field">
        <label htmlFor="biz-website">Website (optional)</label>
        <input
          id="biz-website"
          type="url"
          placeholder="https://"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div className="form-field">
        <label htmlFor="biz-phone">Phone (optional)</label>
        <input id="biz-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>

      <button type="submit" className="btn btn--primary" disabled={submitting}>
        {submitting ? "Creating…" : "Create business"}
      </button>
      <p className="state-message__note">
        New businesses start pending review before locations can go live publicly.
      </p>
    </form>
  );
}
