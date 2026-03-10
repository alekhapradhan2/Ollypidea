import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getToken, setToken } from "../api/api";

export default function Navbar({ currentMovie, onLoginClick, onRefresh }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isLoggedIn = !!getToken();

  const handleLogout = () => {
    setToken(null);
    onRefresh && onRefresh();
    navigate("/");
  };

  const active = (path) =>
    location.pathname === path ? "nav-link active" : "nav-link";

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        OLLI<span>PEDIA</span>
      </Link>

      <Link to="/" className={active("/")}>Home</Link>
      <Link to="/movies" className={active("/movies")}>Movies</Link>
      <Link to="/cast" className={active("/cast")}>Cast</Link>
      <Link to="/news" className={active("/news")}>News</Link>

      <div className="nav-actions">
        {isLoggedIn && currentMovie ? (
          <>
            <Link to={`/movie/${currentMovie._id}`} className="btn btn-outline btn-sm">
              My Movie
            </Link>
            <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-outline btn-sm" onClick={() => onLoginClick && onLoginClick("login")}>
              Login
            </button>
            <Link to="/register" className="btn btn-gold btn-sm">
              Register Movie
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}