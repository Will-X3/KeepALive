import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Header.css";

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <div className="page header__inner">
        <Link to="/" className="header__brand">
          <img src="/logo-32.png" alt="" className="header__mark" width={48} height={48} />
          <span className="header__wordmark">KeepALive</span>
        </Link>

        <nav className="header__nav">
          {user ? (
            <>
              <Link to="/dashboard" className="header__link">
                Dashboard
              </Link>
              <button type="button" className="header__link header__link--button" onClick={logout}>
                Log out
              </button>
            </>
          ) : (
            <Link to="/login" className="header__link">
              Business login
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
