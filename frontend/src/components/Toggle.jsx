import "./Toggle.css";

export default function Toggle({ id, checked, onChange, disabled, label, description }) {
  return (
    <label className="toggle-row" htmlFor={id}>
      <div className="toggle-row__text">
        <span className="toggle-row__label">{label}</span>
        {description && <span className="toggle-row__description">{description}</span>}
      </div>
      <span className={`toggle ${checked ? "toggle--on" : ""}`}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="toggle__input"
        />
        <span className="toggle__track">
          <span className="toggle__thumb" />
        </span>
      </span>
    </label>
  );
}
