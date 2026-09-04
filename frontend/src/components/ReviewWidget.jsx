import { useEffect, useState } from "react";
import { fetchReviewTags, fetchReviewSummary, submitReview } from "../api/reviews";
import "./ReviewWidget.css";

function alreadyReviewedKey(locationId) {
  return `keepalive_reviewed_${locationId}`;
}

export default function ReviewWidget({ locationId }) {
  const [tags, setTags] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selected, setSelected] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [hasReviewed, setHasReviewed] = useState(
    () => localStorage.getItem(alreadyReviewedKey(locationId)) === "true"
  );

  useEffect(() => {
    fetchReviewTags(locationId).then(setTags).catch(() => {});
    fetchReviewSummary(locationId).then(setSummary).catch(() => {});
  }, [locationId]);

  function toggleTag(tag) {
    setSelected((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function handleSubmit() {
    if (selected.length === 0) {
      setError("Pick at least one.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitReview(locationId, selected);
      localStorage.setItem(alreadyReviewedKey(locationId), "true");
      setHasReviewed(true);
      fetchReviewSummary(locationId).then(setSummary).catch(() => {});
    } catch (err) {
      if (err.response?.status === 409) {
        localStorage.setItem(alreadyReviewedKey(locationId), "true");
        setHasReviewed(true);
      } else {
        setError(err.response?.data?.error || "Couldn't submit that.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="review-widget">
      <h2 className="review-widget__title">What's it like here?</h2>

      {summary && summary.totalReviews > 0 && (
        <div className="review-widget__summary">
          {Object.entries(summary.tagCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([tag, count]) => (
              <span key={tag} className="review-widget__summary-chip">
                {tag} <strong>{count}</strong>
              </span>
            ))}
        </div>
      )}

      {hasReviewed ? (
        <p className="state-message__note">Thanks — your feedback's in.</p>
      ) : (
        <>
          <div className="review-widget__chips">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`review-widget__chip ${
                  selected.includes(tag) ? "review-widget__chip--selected" : ""
                }`}
                onClick={() => toggleTag(tag)}
                aria-pressed={selected.includes(tag)}
              >
                {tag}
              </button>
            ))}
          </div>

          {error && (
            <div className="form-error" style={{ marginTop: "var(--space-3)" }}>
              {error}
            </div>
          )}

          <button
            type="button"
            className="btn btn--primary"
            style={{ marginTop: "var(--space-4)" }}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Submitting…" : "Submit"}
          </button>
        </>
      )}
    </div>
  );
}
