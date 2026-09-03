import "./StateMessage.css";

export default function StateMessage({ title, body, action }) {
  return (
    <div className="state-message">
      <h2 className="state-message__title">{title}</h2>
      {body && <p className="state-message__body">{body}</p>}
      {action && <div className="state-message__actions">{action}</div>}
    </div>
  );
}
