import React, { useEffect, useState } from "react";
import { API } from "../api/api";

export default function News() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.getNews().then(setNews).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Film News</h1>
        <p>Latest updates from Ollywood</p>
      </div>

      {loading ? (
        <div className="news-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 280, borderRadius: 6 }} />
          ))}
        </div>
      ) : news.length === 0 ? (
        <div className="empty-state">
          <h3>No news yet</h3>
          <p>Movie owners can post news from their movie profile.</p>
        </div>
      ) : (
        <div className="news-grid">
          {news.map(n => (
            <div key={n._id} className="news-card">
              {n.imageUrl && (
                <div className="news-card-img"><img src={n.imageUrl} alt={n.title} /></div>
              )}
              <div className="news-card-body">
                <div className="news-card-category">{n.category || "Update"}</div>
                <div className="news-card-title">{n.title}</div>
                <div className="news-card-content">{n.content}</div>
                <div className="news-card-meta">
                  {n.movieTitle && <span>🎬 {n.movieTitle} · </span>}
                  {new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}