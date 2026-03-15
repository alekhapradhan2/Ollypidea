import SEO, { newsItemSEO } from "../components/SEO";
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { API } from "../api/api";

function SafeImg({ src, alt, style, className }) {
  const [broken, setBroken] = React.useState(false);
  if (!src || broken) return null;
  return <img src={src} alt={alt} style={style} className={className} loading="lazy" decoding="async" onError={() => setBroken(true)} />;
}

const verdictClass = (v) => {
  if (!v) return "verdict-upcoming";
  const l = v.toLowerCase();
  if (["hit","super hit","blockbuster"].includes(l)) return "verdict-hit";
  if (["flop","disaster"].includes(l)) return "verdict-flop";
  if (l === "average") return "verdict-average";
  return "verdict-upcoming";
};

const CAT_COLORS = {
  Interview:  "#e07b39",
  Trailer:    "#3a86ff",
  Release:    "#2d6a4f",
  Song:       "#9b5de5",
  Award:      "#f7b731",
  Update:     "var(--gold)",
  Other:      "var(--muted)",
};

function NewsCard({ n, onClick }) {
  const [broken, setBroken] = React.useState(false);
  return (
    <div className="news-card news-card-clickable" onClick={() => onClick(n._id)}>
      <div className="news-card-img-fixed">
        {n.imageUrl && !broken
          ? <img src={n.imageUrl} alt={n.title} loading="lazy" decoding="async" onError={() => setBroken(true)} />
          : <div className="news-card-img-placeholder">📰</div>
        }
        <div className="news-card-cat-badge" style={{ background: CAT_COLORS[n.category] || "var(--gold)" }}>
          {n.category || "Update"}
        </div>
      </div>
      <div className="news-card-body news-card-body-fixed">
        <div className="news-card-title news-card-title-clamp">{n.title}</div>
        <div className="news-card-content news-card-content-clamp">{n.content}</div>
        <div className="news-card-meta" style={{ marginTop: "auto", paddingTop: 10 }}>
          {n.movieTitle && <span style={{ display:"flex", alignItems:"center", gap:4 }}>
            <span style={{ fontSize:"0.8rem" }}>🎬</span> {n.movieTitle}
          </span>}
          <span style={{ marginLeft: n.movieTitle ? 8 : 0 }}>
            {new Date(n.createdAt).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function NewsDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    setLoading(true);
    setData(null);
    API.getNewsItem(id)
      .then(setData)
      .catch(e => setError(typeof e === "string" ? e : "Article not found"))
      .finally(() => setLoading(false));
    window.scrollTo(0, 0);
  }, [id]);

  if (loading) return (
    <div className="page" style={{ maxWidth: 820, margin: "0 auto" }}>
      <div className="skeleton" style={{ height: 400, borderRadius: 8, marginBottom: 28 }} />
      <div className="skeleton" style={{ height: 32, width: "60%", marginBottom: 14 }} />
      <div className="skeleton" style={{ height: 16, width: "100%", marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 16, width: "90%", marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 16, width: "80%" }} />
    </div>
  );

  if (error || !data) return (
    <div className="page empty-state">
      <h3>Article not found</h3>
      <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => navigate("/news")}>← Back to News</button>
    </div>
  );

  const { related = [], movie } = data;
  const seoProps = newsItemSEO(data);
  const catColor = CAT_COLORS[data.category] || "var(--gold)";
  const dateStr  = new Date(data.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="page">
      <SEO {...seoProps} />
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 24 }} onClick={() => navigate("/news")}>
        ← All News
      </button>

      {/* ── Article ── */}
      <article className="news-article">

        {/* Hero image */}
        {data.imageUrl && (
          <div className="news-article-hero">
            <SafeImg src={data.imageUrl} alt={data.title} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
          </div>
        )}

        {/* Meta */}
        <div className="news-article-meta">
          <span className="news-article-cat" style={{ background: catColor }}>
            {data.category || "Update"}
          </span>
          {data.movieTitle && (
            <Link to={`/movie/${data.movieId}`} className="news-article-movie-link">
              🎬 {data.movieTitle}
            </Link>
          )}
          <span className="news-article-date">{dateStr}</span>
        </div>

        {/* Title */}
        <h1 className="news-article-title">{data.title}</h1>

        {/* Divider */}
        <div className="news-article-divider" />

        {/* Body */}
        <div className="news-article-body">
          {data.content.split("\n").filter(Boolean).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </article>

      {/* ── Related Movie ── */}
      {movie && (
        <section className="section" style={{ marginTop: 48 }}>
          <div className="section-header">
            <span className="section-title">About the Film</span>
          </div>
          <div className="news-related-movie" onClick={() => navigate(`/movie/${movie._id}`)}>
            <div className="news-related-movie-poster">
              {movie.posterUrl
                ? <SafeImg src={movie.posterUrl} alt={movie.title} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                : <span style={{ fontSize:"2rem" }}>🎬</span>
              }
            </div>
            <div className="news-related-movie-info">
              <div className="news-related-movie-title">{movie.title}</div>
              {movie.productionId?.name && (
                <div className="news-related-movie-prod">{movie.productionId.name}</div>
              )}
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:10 }}>
                {movie.genre?.map(g => <span key={g} className="badge">{g}</span>)}
                <span className={`movie-card-verdict ${verdictClass(movie.verdict)}`}
                  style={{ fontSize:"0.65rem", padding:"3px 10px", borderRadius:3 }}>
                  {movie.verdict || "Upcoming"}
                </span>
              </div>
              {movie.releaseDate && (
                <div style={{ fontSize:"0.8rem", color:"var(--muted)", marginTop:8 }}>
                  Released: {movie.releaseDate}
                </div>
              )}
            </div>
            <div className="news-related-movie-arrow">→</div>
          </div>
        </section>
      )}

      {/* ── Related News ── */}
      {related.length > 0 && (
        <section className="section" style={{ marginTop: 48 }}>
          <div className="section-header">
            <span className="section-title">Related News</span>
            <Link to="/news" className="btn btn-ghost btn-sm">All News →</Link>
          </div>
          <div className="news-grid">
            {related.map(n => (
              <NewsCard key={n._id} n={n} onClick={(nid) => navigate(`/news/${nid}`)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}