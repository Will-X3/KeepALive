import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchBusinessById, updateBusinessSettings } from "../api/businesses";
import { createLocation, fetchCategories } from "../api/locations";
import { useGeolocation } from "../hooks/useGeolocation";
import StateMessage from "../components/StateMessage";
import StatusPill from "../components/StatusPill";
import Toggle from "../components/Toggle";
import "./Dashboard.css";

const BUSINESS_STATUS_LABEL = {
  active: "Active",
  pending: "Pending review",
  suspended: "Suspended",
};

function FeatureSettings({ business, onUpdated }) {
  const [saving, setSaving] = useState(null); // which flag is currently saving
  const [error, setError] = useState(null);
  const settings = business.settings || {};

  async function handleToggle(key, value) {
    setSaving(key);
    setError(null);
    try {
      const updated = await updateBusinessSettings(business._id, { [key]: value });
      onUpdated(updated);
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't save that setting.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="dashboard__section">
      <h2>Features</h2>
      {error && <div className="form-error">{error}</div>}
      <div className="feature-settings">
        <Toggle
          id="feature-reviews"
          label="Allow customer reviews"
          description="Lets customers leave a rating and review on your location page. Off by default — this is a real change to how customers interact with your listing, not just a display setting. The review system itself is still being built, so this currently just saves your preference."
          checked={!!settings.allowReviews}
          disabled={saving === "allowReviews"}
          onChange={(v) => handleToggle("allowReviews", v)}
        />
        <Toggle
          id="feature-wait-times"
          label="Broadcast wait times"
          description="Shows an estimated current wait time on your location page, in addition to live/not-live status. Not built yet — enabling this reserves the setting for when it ships."
          checked={!!settings.broadcastWaitTimes}
          disabled={saving === "broadcastWaitTimes"}
          onChange={(v) => handleToggle("broadcastWaitTimes", v)}
        />
      </div>
    </div>
  );
}

export default function BusinessDetail() {
  const { id } = useParams();
  const [business, setBusiness] = useState(null);
  const [locations, setLocations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);

  function load() {
    fetchBusinessById(id)
      .then((b) => {
        setBusiness(b);
        setLocations(b.locations || []);
      })
      .catch(() => setError("Couldn't load this business."));
  }

  useEffect(load, [id]);
  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
  }, []);

  if (error) {
    return (
      <main className="page">
        <StateMessage title="Something went wrong" body={error} />
      </main>
    );
  }

  if (!business) {
    return (
      <main className="page">
        <StateMessage title="Loading…" />
      </main>
    );
  }

  return (
    <main className="page">
      <Link to="/dashboard" className="detail__back">
        Your businesses
      </Link>

      <div className="dashboard__header">
        <div>
          <h1>{business.name}</h1>
          <div className="business-detail__meta">
            <span className={`business-row__status business-row__status--${business.status}`}>
              {BUSINESS_STATUS_LABEL[business.status] || business.status}
            </span>
            {business.website && (
              <a href={business.website} target="_blank" rel="noreferrer">
                {business.website}
              </a>
            )}
          </div>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Cancel" : "+ Add location"}
        </button>
      </div>

      {showForm && (
        <NewLocationForm
          businessId={business._id}
          categories={categories}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
        />
      )}

      <FeatureSettings business={business} onUpdated={setBusiness} />

      <div className="dashboard__section">
        <h2>Locations</h2>

        {locations.length === 0 && (
          <StateMessage
            title="No locations yet"
            body="Add a location, then connect a camera to it to start streaming."
          />
        )}

        {locations.length > 0 && (
          <div className="dashboard__list">
            {locations.map((loc) => (
              <Link
                key={loc._id}
                to={`/dashboard/locations/${loc._id}/cameras`}
                className="business-row"
              >
                <div
                  className={`business-row__edge ${
                    loc.status === "live" ? "business-row__edge--active" : ""
                  }`}
                  style={loc.status !== "live" ? { background: "var(--color-line-strong)" } : undefined}
                />
                <div className="business-row__main">
                  <div className="business-row__top">
                    <h3>{loc.name}</h3>
                    <StatusPill status={loc.status} />
                  </div>
                  <p className="state-message__body">{loc.address}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function NewLocationForm({ businessId, categories, onCreated }) {
  const { coords, status, request } = useGeolocation();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!coords) {
      setError("Set the location's coordinates first (use the button below).");
      return;
    }
    if (!categoryId) {
      setError("Choose a category.");
      return;
    }

    setSubmitting(true);
    try {
      await createLocation({
        businessId,
        categoryId,
        name,
        address,
        lat: coords.lat,
        lng: coords.lng,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      onCreated();
    } catch (err) {
      setError(err.response?.data?.error || "Couldn't create the location.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form dashboard__form" onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}

      <div className="form-field">
        <label htmlFor="loc-name">Location name</label>
        <input id="loc-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="form-field">
        <label htmlFor="loc-address">Address</label>
        <input
          id="loc-address"
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      <div className="form-field">
        <label htmlFor="loc-category">Category</label>
        <select
          id="loc-category"
          required
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="dashboard-select"
        >
          <option value="">Choose one…</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label>Coordinates</label>
        {coords ? (
          <p className="state-message__note" style={{ marginTop: 0 }}>
            Using your current location ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}).
          </p>
        ) : (
          <button type="button" className="btn btn--ghost" onClick={request}>
            {status === "locating" ? "Locating…" : "Use my current location"}
          </button>
        )}
        {status === "denied" && (
          <p className="state-message__note">
            Location access was blocked — allow it in your browser settings to set coordinates.
          </p>
        )}
      </div>

      <button type="submit" className="btn btn--primary" disabled={submitting}>
        {submitting ? "Creating…" : "Create location"}
      </button>
    </form>
  );
}
