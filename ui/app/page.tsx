"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { API } from "../lib/api";
import MovieCard from "../components/MovieCard";

interface Movie {
  _id: string;
  title: string;
  director?: string;
  releaseDate?: string;
  posterUrl?: string;
  verdict?: string;
  status?: string;
}

interface NewsItem {
  _id: string;
  title: string;
  content?: string;
  category?: string;
  imageUrl?: string;
  movieTitle?: string;
}

export default function Home() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([API.getMovies(), API.getNews()])
      .then(([m, n]) => { 
        setMovies(m); 
        setNews(n.slice(0, 3)); 
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const upcoming = movies.filter(m => m.status === "Upcoming" || m.verdict === "Upcoming");
  const released = movies.filter(m => m.status !== "Upcoming" && m.verdict !== "Upcoming");

  return (
    <>
      <div className="home-hero">
        <div className="home-hero-eyebrow">The Ollywood Film Database</div>
        <h1>Every Odia Film.<br />One Place.</h1>
        <p>Track box office, explore cast, read the latest news from the world of Ollywood cinema.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/movies" className="btn btn-gold">Browse All Films</Link>
          <Link href="/register" className="btn btn-outline">Register Your Movie</Link>
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
        {upcoming.length > 0 && (
          <div className="section">
            <div className="section-header">
              <span className="section-title">Upcoming Releases</span>
              <Link href="/movies" className="btn btn-ghost btn-sm">View All →</Link>
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

        {released.length > 0 && (
          <div className="section">
            <div className="section-header">
              <span className="section-title">Recently Released</span>
              <Link href="/movies" className="btn btn-ghost btn-sm">View All →</Link>
            </div>
            <div className="movie-grid">
              {released.slice(0, 8).map(m => <MovieCard key={m._id} movie={m} />)}
            </div>
          </div>
        )}

        {news.length > 0 && (
          <div className="section">
            <div className="section-header">
              <span className="section-title">Latest News</span>
              <Link href="/news" className="btn btn-ghost btn-sm">All News →</Link>
            </div>
            <div className="news-grid">
              {news.map(n => (
                <div key={n._id} className="news-card">
                  {n.imageUrl && (
                    <div className="news-card-img"><img src={n.imageUrl} alt={n.title} /></div>
                  )}
                  <div className="news-card-body">
                    <div className="news-card-category">{n.category || "Update"}</div>
                    <div className="news-card-title">{n.title}</div>
                    <div className="news-card-content">{n.content?.slice(0, 120)}{n.content && n.content.length > 120 ? "…" : ""}</div>
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
            <Link href="/register" className="btn btn-gold">Register a Movie</Link>
          </div>
        )}
      </div>
    </>
  );
}