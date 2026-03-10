import React, { useEffect, useState } from "react";
import { API } from "../api/api";

function CastPhoto({ src, alt }) {
  const [broken, setBroken] = React.useState(false);
  if (!src || broken) return <span className="cast-page-photo-placeholder">👤</span>;
  return <img src={src} alt={alt} onError={() => setBroken(true)} />;
}

export default function Cast() {
  const [cast, setCast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    API.getCast().then(setCast).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = cast.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Cast & Crew</h1>
        <p>{cast.length} people in the database</p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <input
          className="form-input" style={{ maxWidth: 300 }}
          placeholder="Search by name…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="cast-page-grid">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton" style={{ aspectRatio: "3/4", borderRadius: 6 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <h3>No cast members yet</h3>
          <p>Cast profiles are added when movies are registered.</p>
        </div>
      ) : (
        <div className="cast-page-grid">
          {filtered.map(c => (
            <div key={c._id} className="cast-page-card">
              <div className="cast-page-photo">
                <CastPhoto src={c.photo} alt={c.name} />
              </div>
              <div className="cast-page-body">
                <div className="cast-page-name">{c.name}</div>
                <div className="cast-page-type">{c.type || "Actor"}</div>
                {c.movies?.length > 0 && (
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 4 }}>
                    {c.movies.length} film{c.movies.length !== 1 ? "s" : ""}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}