import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../api/api";

const CATS = ["All", "Update", "Release", "Trailer", "Song", "Award", "Interview", "Other"];
const CAT_COLORS = {
  Interview: "#e07b39", Trailer: "#3a86ff", Release: "#2d6a4f",
  Song: "#9b5de5", Award: "#f7b731", Update: "var(--gold)", Other: "var(--muted)",
};

function NewsCard({ n, onClick }) {
  const [broken, setBroken] = React.useState(false);
  return (
    <div className="news-card news-card-clickable" onClick={() => onClick(n._id)}>
      <div className="news-card-img-fixed">
        {n.imageUrl && !broken
          ? <img src={n.imageUrl} alt={n.title} onError={() => setBroken(true)} />
          : <div className="news-card-img-placeholder">📰</div>
        }
        <div className="news-card-cat-badge" style={{ background: CAT_COLORS[n.category] || "var(--gold)" }}>
          {n.category || "Update"}
        </div>
      </div>
      <div className="news-card-body news-card-body-fixed">
        <div className="news-card-title news-card-title-clamp">{n.title}</div>
        <div className="news-card-content news-card-content-clamp">{n.content}</div>
        <div className="news-card-footer">
          {n.movieTitle && <span className="news-card-movie">🎬 {n.movieTitle}</span>}
          <span className="news-card-date">
            {new Date(n.createdAt).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function News() {
  const navigate = useNavigate();
  const [news,    setNews]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("All");
  const [search,  setSearch]  = useState("");

  useEffect(() => {
    API.getNews().then(setNews).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = news.filter(n => {
    const matchCat    = filter === "All" || n.category === filter;
    const matchSearch = !search || n.title?.toLowerCase().includes(search.toLowerCase())
                                || n.movieTitle?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="page">
      <div className="page-header">
        <h1>Film News</h1>
        <p>Latest updates from Ollywood</p>
      </div>

      <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center", marginBottom:28 }}>
        <input className="form-input" style={{ maxWidth:260 }}
          placeholder="Search news or movie…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {CATS.map(c => (
            <button key={c} className={`btn btn-sm ${filter===c?"btn-gold":"btn-outline"}`} onClick={() => setFilter(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="news-grid">
          {[...Array(6)].map((_,i) => <div key={i} className="skeleton" style={{ height:340, borderRadius:6 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <h3>No news found</h3>
          <p>{news.length===0 ? "Movie owners can post news from their movie profile." : "Try a different filter."}</p>
        </div>
      ) : (
        <div className="news-grid">
          {filtered.map(n => <NewsCard key={n._id} n={n} onClick={id => navigate(`/news/${id}`)} />)}
        </div>
      )}
    </div>
  );
}