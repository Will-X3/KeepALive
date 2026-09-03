import "./Header.css";

export default function Header() {
  return (
    <header className="header">
      <div className="page header__inner">
        <div className="header__brand">
          <img src="/logo-32.png" alt="" className="header__mark" width={24} height={24} />
          <span className="header__wordmark">KeepALive</span>
        </div>
        <span className="header__tagline">Know before you go</span>
      </div>
    </header>
  );
}
