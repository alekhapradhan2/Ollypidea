import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

function SafeImg({ src, alt, className }) {
  const [broken, setBroken] = React.useState(false);
  if (!src || broken) return null;
  return <img src={src} alt={alt} className={className} onError={() => setBroken(true)} />;
}

export default function Navbar({ production, onLoginClick, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const active = (p) => location.pathname === p ? "nav-link active" : "nav-link";

  const handleLogout = () => { onLogout(); navigate("/"); };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">OLLI<span>PEDIA</span></Link>

      <Link to="/" className={active("/")}>Home</Link>
      <Link to="/movies" className={active("/movies")}>Movies</Link>
      <Link to="/cast" className={active("/cast")}>Cast</Link>
      <Link to="/news" className={active("/news")}>News</Link>

      <div className="nav-actions">
        {production ? (
          <>
            <Link to="/dashboard" className="nav-prod-btn">
              {production.logo
                ? <SafeImg src={production.logo} alt={production.name} className="nav-prod-logo" />
                : <span className="nav-prod-avatar">{production.name[0]}</span>
              }
              <span className="nav-prod-name">{production.name}</span>
            </Link>
            <Link to="/dashboard/add-movie" className="btn btn-gold btn-sm">+ Add Movie</Link>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <>
            <button className="btn btn-outline btn-sm" onClick={onLoginClick}>Login</button>
            <Link to="/register" className="btn btn-gold btn-sm">Join as Production</Link>
          </>
        )}
      </div>
    </nav>
  );
}