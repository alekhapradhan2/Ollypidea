import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API } from "../api/api";
import { MovieCard, SafeImg } from "../components/UI";

function NewsImg({ src, alt }) {
  const [broken, setBroken] = React.useState(false);
  if (broken) return null;
  return <div className="news-card-img"><img src={src} alt={alt} onError={() => setBroken(true)} /></div>;
}

export default function Home() {
  const [movies, setMovies] = useState([]);
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([API.getMovies(), API.getNews()])
      .then(([m, n]) => { setMovies(m); setNews(n.slice(0, 3)); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const upcoming = movies.filter(m => m.status === "Upcoming" || m.verdict === "Upcoming");
  const released = movies.filter(m => m.status !== "Upcoming" && m.verdict !== "Upcoming");

  return (
    <>
      {/* Hero */}
      <div className="home-hero">
        <div className="home-hero-eyebrow">The Ollywood Film Database</div>
        <h1>Every Odia Film.<br />One Place.</h1>
        <p>Track box office, explore cast, read the latest news from the world of Ollywood cinema.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/movies" className="btn btn-gold">Browse All Films</Link>
          <Link to="/register" className="btn btn-outline">Register Your Movie</Link>
        </div>

        <div className="home-stats">
          <div>
            <div className="home-stat-value">{movies.length}</div>
            <div className="home-stat-label">Films</div>
          </div>
          <div>
            <div className="home-stat-value">{upcoming.length}</div>
            <div className="home-stat-label">Upcoming</div>
          </div>
          <div>
            <div className="home-stat-value">{news.length > 0 ? news.length + "+" : "—"}</div>
            <div className="home-stat-label">News Stories</div>
          </div>
        </div>
      </div>

      <div className="page">
        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div className="section">
            <div className="section-header">
              <span className="section-title">Upcoming Releases</span>
              <Link to="/movies" className="btn btn-ghost btn-sm">View All →</Link>
            </div>
            {loading ? (
              <div className="loading-grid">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="skeleton" style={{ aspectRatio: "2/3", borderRadius: 6 }} />
                ))}
              </div>
            ) : (
              <div className="movie-grid">
                {upcoming.slice(0, 8).map(m => <MovieCard key={m._id} movie={m} />)}
              </div>
            )}
          </div>
        )}

        {/* Released */}
        {released.length > 0 && (
          <div className="section">
            <div className="section-header">
              <span className="section-title">Recently Released</span>
              <Link to="/movies" className="btn btn-ghost btn-sm">View All →</Link>
            </div>
            <div className="movie-grid">
              {released.slice(0, 8).map(m => <MovieCard key={m._id} movie={m} />)}
            </div>
          </div>
        )}

        {/* Latest News */}
        {news.length > 0 && (
          <div className="section">
            <div className="section-header">
              <span className="section-title">Latest News</span>
              <Link to="/news" className="btn btn-ghost btn-sm">All News →</Link>
            </div>
            <div className="news-grid">
              {news.map(n => (
                <div key={n._id} className="news-card">
                  {n.imageUrl && <NewsImg src={n.imageUrl} alt={n.title} />}
                  <div className="news-card-body">
                    <div className="news-card-category">{n.category || "Update"}</div>
                    <div className="news-card-title">{n.title}</div>
                    <div className="news-card-content">{n.content?.slice(0, 120)}{n.content?.length > 120 ? "…" : ""}</div>
                    {n.movieTitle && <div className="news-card-meta">🎬 {n.movieTitle}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && movies.length === 0 && (
          <div className="empty-state">
            <h3>No movies yet</h3>
            <p>Be the first to register your film on Ollipedia.</p>
            <br />
            <Link to="/register" className="btn btn-gold">Register a Movie</Link>
          </div>
        )}
      </div>
    </>
  );
}