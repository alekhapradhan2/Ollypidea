import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API, getToken } from "../api/api";
import { MovieCard, SafeImg } from "../components/UI";

export default function Dashboard({ production, onToast }) {
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("movies");

  useEffect(() => {
    if (!production || !getToken()) { navigate("/"); return; }
    API.getProductionMovies(production._id)
      .then(setMovies)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [production]);

  if (!production) return (
    <div className="page empty-state">
      <h3>Not logged in</h3>
      <p>Please login to view your dashboard.</p>
      <Link to="/" className="btn btn-gold" style={{ marginTop: 16 }}>Go Home</Link>
    </div>
  );

  const myMovies = movies.filter(m => String(m.productionId?._id) === String(production._id));
  const collabMovies = movies.filter(m => String(m.productionId?._id) !== String(production._id));
  const allSongs = movies.flatMap(m => (m.media?.songs || []).map(s => ({ ...s, movieTitle: m.title })));
  const allCast = [...new Map(movies.flatMap(m => m.cast || []).map(c => [String(c.castId), c])).values()];

  return (
    <div className="page">
      {/* Production Header */}
      <div className="prod-hero">
        <div className="prod-hero-banner">
          <SafeImg src={production.banner} alt="Banner" className="prod-hero-banner-img" />
        </div>
        <div className="prod-hero-body">
          <div className="prod-logo-wrap">
            <SafeImg
              src={production.logo} alt={production.name}
              className="prod-logo"
              fallback={<div className="prod-logo-placeholder">{production.name[0]}</div>}
            />
          </div>
          <div className="prod-hero-info">
            <h1 className="prod-name">{production.name}</h1>
            <div className="prod-meta">
              {production.location && <span>📍 {production.location}</span>}
              {production.founded && <span>📅 Est. {production.founded}</span>}
              {production.website && <a href={production.website} target="_blank" rel="noreferrer">🌐 Website</a>}
            </div>
            {production.bio && <p className="prod-bio">{production.bio}</p>}
          </div>
          <div className="prod-hero-actions">
            <Link to="/dashboard/add-movie" className="btn btn-gold">+ Add Movie</Link>
            <Link to={`/production/${production._id}`} className="btn btn-outline btn-sm">Public Profile</Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="prod-stats">
        <div className="prod-stat">
          <div className="prod-stat-val">{myMovies.length}</div>
          <div className="prod-stat-label">My Films</div>
        </div>
        <div className="prod-stat">
          <div className="prod-stat-val">{collabMovies.length}</div>
          <div className="prod-stat-label">Collaborations</div>
        </div>
        <div className="prod-stat">
          <div className="prod-stat-val">{allCast.length}</div>
          <div className="prod-stat-label">Cast Members</div>
        </div>
        <div className="prod-stat">
          <div className="prod-stat-val">{allSongs.length}</div>
          <div className="prod-stat-label">Songs</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {["movies","collaborations","cast","songs"].map(t => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === "movies" && ` (${myMovies.length})`}
            {t === "collaborations" && ` (${collabMovies.length})`}
          </button>
        ))}
      </div>

      {/* My Movies */}
      {tab === "movies" && (
        <div className="section">
          {loading ? (
            <div className="movie-grid">
              {[...Array(4)].map((_,i) => <div key={i} className="skeleton" style={{aspectRatio:"2/3"}} />)}
            </div>
          ) : myMovies.length === 0 ? (
            <div className="empty-state">
              <h3>No movies yet</h3>
              <p>Start by adding your first film.</p>
              <Link to="/dashboard/add-movie" className="btn btn-gold" style={{ marginTop: 16 }}>+ Add Movie</Link>
            </div>
          ) : (
            <div className="movie-grid">
              {myMovies.map(m => <MovieCard key={m._id} movie={m} />)}
            </div>
          )}
        </div>
      )}

      {/* Collaborations */}
      {tab === "collaborations" && (
        <div className="section">
          {collabMovies.length === 0 ? (
            <div className="empty-state">
              <h3>No collaborations yet</h3>
              <p>When another production adds you as a collaborator, their movies appear here.</p>
            </div>
          ) : (
            <>
              <p style={{ color: "var(--muted)", marginBottom: 20, fontSize: "0.85rem" }}>
                Movies where {production.name} is a collaborating production.
              </p>
              <div className="movie-grid">
                {collabMovies.map(m => <MovieCard key={m._id} movie={m} />)}
              </div>
            </>
          )}
        </div>
      )}

      {/* Cast */}
      {tab === "cast" && (
        <div className="section">
          {allCast.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>No cast members added yet.</p>
          ) : (
            <div className="cast-grid">
              {allCast.map((c, i) => (
                <div key={i} className="cast-card">
                  <div className="cast-card-photo">
                    <SafeImg src={c.photo} alt={c.name} fallback={<span className="cast-card-photo-placeholder">👤</span>} />
                  </div>
                  <div className="cast-card-body">
                    <div className="cast-card-name">{c.name}</div>
                    {c.role && <div className="cast-card-role">{c.role}</div>}
                    <div className="cast-card-role" style={{ color: "var(--gold)" }}>{c.type}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Songs */}
      {tab === "songs" && (
        <div className="section">
          {allSongs.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>No songs added yet. Add media to your movies.</p>
          ) : (
            <div className="song-list">
              {allSongs.map((s, i) => (
                <div key={i} className="song-item">
                  <span className="song-num">{i + 1}</span>
                  <div className="song-info">
                    <div className="song-title">{s.title}</div>
                    <div className="song-singer">{s.singer} {s.movieTitle && `· ${s.movieTitle}`}</div>
                  </div>
                  {s.ytId && (
                    <a href={`https://youtube.com/watch?v=${s.ytId}`} target="_blank" rel="noreferrer">
                      <button className="song-play" style={{ opacity: 1 }}>▶</button>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
