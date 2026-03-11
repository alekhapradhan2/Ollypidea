import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { API } from "../api/api";

function SafeImg({ src, alt, style, className }) {
  const [broken, setBroken] = React.useState(false);
  if (!src || broken) return null;
  return <img src={src} alt={alt} style={style} className={className} onError={() => setBroken(true)} />;
}

const verdictClass = (v) => {
  if (!v) return "verdict-upcoming";
  const l = v.toLowerCase();
  if (["hit","super hit","blockbuster"].includes(l)) return "verdict-hit";
  if (["flop","disaster"].includes(l)) return "verdict-flop";
  if (l === "average") return "verdict-average";
  return "verdict-upcoming";
};

const ROLE_ICON = { Director:"🎬", Producer:"🎥", "Music Director":"🎵", Cinematographer:"📷", Choreographer:"💃", Lyricist:"✍️", Actor:"🎭", Actress:"🎭" };

export default function CastProfile({ portalMode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [person,  setPerson]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    setLoading(true);
    API.getCastMember(id)
      .then(setPerson)
      .catch(e => setError(typeof e === "string" ? e : "Not found"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="page">
      <div style={{ display:"flex", gap:36, alignItems:"flex-start", flexWrap:"wrap" }}>
        <div className="skeleton" style={{ width:180, height:220, borderRadius:8, flexShrink:0 }} />
        <div style={{ flex:1, minWidth:200 }}>
          <div className="skeleton" style={{ height:36, width:"50%", marginBottom:12 }} />
          <div className="skeleton" style={{ height:16, width:"30%", marginBottom:8 }} />
          <div className="skeleton" style={{ height:14, width:"100%", marginBottom:6 }} />
          <div className="skeleton" style={{ height:14, width:"80%" }} />
        </div>
      </div>
    </div>
  );

  if (error || !person) return (
    <div className="page empty-state">
      <h3>Person not found</h3>
      <button className="btn btn-outline" style={{ marginTop:16 }} onClick={() => navigate(-1)}>← Go Back</button>
    </div>
  );

  const icon = ROLE_ICON[person.type] || "🎭";
  const movies = person.moviesList || [];

  return (
    <div className="page">
      <button className="btn btn-ghost btn-sm" style={{ marginBottom:24, display:"inline-flex" }} onClick={() => navigate(-1)}>
        ← Back
      </button>

      {/* ── Profile Header ── */}
      <div className="cast-profile-hero">
        <div className="cast-profile-photo">
          {person.photo
            ? <SafeImg src={person.photo} alt={person.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
            : <span className="cast-profile-photo-icon">{icon}</span>
          }
        </div>

        <div className="cast-profile-info">
          <div className="cast-profile-type">
            <span>{icon}</span> {person.type}
          </div>
          <h1 className="cast-profile-name">{person.name}</h1>

          <div className="cast-profile-stats">
            <div className="cast-stat">
              <div className="cast-stat-val">{movies.length}</div>
              <div className="cast-stat-label">Films</div>
            </div>
            {movies.filter(m => m.verdict && m.verdict !== "Upcoming").length > 0 && (
              <div className="cast-stat">
                <div className="cast-stat-val">
                  {movies.filter(m => ["Hit","Super Hit","Blockbuster"].includes(m.verdict)).length}
                </div>
                <div className="cast-stat-label">Hits</div>
              </div>
            )}
          </div>

          {person.bio && <p className="cast-profile-bio">{person.bio}</p>}
        </div>
      </div>

      {/* ── Filmography ── */}
      {movies.length > 0 ? (
        <div className="section">
          <div className="section-header">
            <span className="section-title">Filmography</span>
          </div>
          <div className="filmography-list">
            {movies.map(m => {
              // find role in this movie
              const castEntry = (m.cast || []).find(c => String(c.castId) === String(person._id));
              return (
                <div key={m._id} className="filmography-item" onClick={() => navigate(portalMode ? `/portal/movie/${m._id}` : `/movie/${m._id}`)}>
                  <div className="filmography-poster">
                    {m.posterUrl
                      ? <SafeImg src={m.posterUrl} alt={m.title} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                      : <span style={{ fontSize:"1.5rem" }}>🎬</span>
                    }
                  </div>
                  <div className="filmography-info">
                    <div className="filmography-title">{m.title}</div>
                    {castEntry?.role && <div className="filmography-role">as {castEntry.role}</div>}
                    <div className="filmography-meta">
                      {m.productionId?.name && <span>{m.productionId.name}</span>}
                      {m.releaseDate && <span> · {m.releaseDate}</span>}
                      {m.genre?.length > 0 && <span> · {m.genre.slice(0,2).join(", ")}</span>}
                    </div>
                  </div>
                  <div style={{ marginLeft:"auto", paddingLeft:12 }}>
                    <span className={`movie-card-verdict ${verdictClass(m.verdict)}`}
                      style={{ fontSize:"0.65rem", padding:"3px 10px", borderRadius:3 }}>
                      {m.verdict || "Upcoming"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <p style={{ color:"var(--muted)" }}>No films found for this person yet.</p>
        </div>
      )}
    </div>
  );
}