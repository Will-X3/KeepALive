const KEY = "keepalive_session_id";

// Anonymous, persisted per-browser identifier. Used only for the
// one-review-per-location soft limit — not tied to any account, and
// trivially reset by clearing storage. See the note in the backend's
// Review model for what this does and doesn't protect against.
export function getSessionId() {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
