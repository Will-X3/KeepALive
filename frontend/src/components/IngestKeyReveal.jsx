import { useState } from "react";
import "./IngestKeyReveal.css";

export default function IngestKeyReveal({ ingestKey, note, onDismiss }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(ingestKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be blocked (permissions, non-HTTPS context) —
      // the key is still selectable/visible in the box below, so this
      // isn't a dead end, just a lost convenience.
    }
  }

  return (
    <div className="ingest-key-reveal">
      <div className="ingest-key-reveal__header">
        <strong>New ingest key generated</strong>
        <button type="button" className="ingest-key-reveal__dismiss" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
      <p className="state-message__note" style={{ marginTop: 0 }}>
        {note || "This won't be shown again. Paste it into your camera worker's config now."}
      </p>
      <div className="ingest-key-reveal__box">
        <code>{ingestKey}</code>
        <button type="button" className="btn btn--ghost" onClick={handleCopy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
