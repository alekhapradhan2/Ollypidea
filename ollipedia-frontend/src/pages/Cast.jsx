import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../api/api";

// ── Cast Card — uses .home-card classes ───────────────────
function CastCard({ person, onClick }) {
  const [broken, setBroken] = useState(false);
  const filmCount = person.movies?.length || 0;

  return (
    <div className="home-card" style={{ width: 160 }} onClick={onClick}>
      <div className="home-card-img" style={{ height: 200 }}>
        {person.photo && !broken
          ? <img src={person.photo} alt={person.name}
              style={{ width:"100%", height:"100%", objectFit:"cover" }}
              onError={() => setBroken(true)} />
          : <div className="home-card-fallback">👤</div>
        }
        <div className="home-card-play">▶</div>
        <div className="home-card-overlay">
          <span className="home-card-genre">{person.type || "Actor"}</span>
          {filmCount > 0 && (
            <span className="home-card-verdict" style={{ color: "var(--gold)" }}>
              {filmCount} film{filmCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
      <div className="home-card-info">
        <p className="home-card-title">{person.name}</p>
        <p className="home-card-date" style={{ color: "var(--gold)", fontSize: "0.7rem" }}>
          {person.type || "Actor"}
        </p>
      </div>
    </div>
  );
}

// ── Horizontal scroll row — uses .home-section classes ────
function CastRow({ title, people, tag }) {
  const navigate = useNavigate();
  const ref = useRef(null);
  const slide = (n) => ref.current?.scrollBy({ left: n, behavior: "smooth" });
  if (!people.length) return null;

  return (
    <section className="home-section">
      <div className="home-section-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 className="home-section-title">{title}</h2>
          {tag && <span className="home-tag">{tag}</span>}
          <span style={{
            background: "rgba(201,151,58,0.15)", color: "var(--gold)",
            fontSize: "0.68rem", fontWeight: 700,
            padding: "2px 9px", borderRadius: 10,
          }}>{people.length}</span>
        </div>
        <div className="home-section-arrows">
          <button className="home-arrow" onClick={() => slide(-400)}>‹</button>
          <button className="home-arrow" onClick={() => slide(400)}>›</button>
        </div>
      </div>
      <div className="home-row" ref={ref} style={{ padding: "6px 24px 14px" }}>
        {people.map(p => (
          <CastCard key={p._id} person={p} onClick={() => navigate(`/cast/${p._id}`)} />
        ))}
      </div>
    </section>
  );
}

// ── Skeleton ──────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="home-section">
      <div className="home-section-header" style={{ padding: "0 24px" }}>
        <div className="skeleton" style={{ height: 18, width: 200 }} />
      </div>
      <div className="home-row" style={{ padding: "6px 24px 14px" }}>
        {[...Array(7)].map((_, i) => (
          <div key={i} className="skeleton"
            style={{ flexShrink: 0, width: 160, height: 240, borderRadius: 8 }} />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════
export default function Cast() {
  const navigate = useNavigate();
  const [cast,    setCast]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [view,    setView]    = useState("trending"); // "trending" | "all"
  const [typeFilter, setTypeFilter] = useState("All");

  useEffect(() => {
    API.getCast()
      .then(data => {
        // sort by most films first
        const sorted = [...data].sort((a, b) => (b.movies?.length || 0) - (a.movies?.length || 0));
        setCast(sorted);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const isFiltering = search || typeFilter !== "All";

  // ── Filtered list ─────────────────────────────────────
  const filtered = cast.filter(c => {
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase());
    const matchType   = typeFilter === "All" || c.type === typeFilter;
    return matchSearch && matchType;
  });

  // ── Trending sections ─────────────────────────────────
  const stars      = cast.filter(c => c.type === "Actor" || c.type === "Actress");
  const directors  = cast.filter(c => c.type === "Director");
  const musicians  = cast.filter(c => ["Music Director","Singer","Lyricist"].includes(c.type));
  const crew       = cast.filter(c => ["Producer","Cinematographer","Choreographer","Editor"].includes(c.type));
  const topStars   = [...stars].slice(0, 20);   // already sorted by film count
  const risingNew  = cast.filter(c => (c.movies?.length || 0) === 1).slice(0, 20);
  const veterans   = cast.filter(c => (c.movies?.length || 0) >= 5).slice(0, 20);

  // unique types for filter dropdown
  const types = ["All", ...Array.from(new Set(cast.map(c => c.type).filter(Boolean))).sort()];

  return (
    <div className="home-root" style={{ paddingTop: 60 }}>

      {/* ── Page header ── */}
      <div style={{
        padding: "32px 24px 0",
        background: "linear-gradient(to bottom, rgba(201,151,58,0.06), transparent)",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 20 }}>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(1.6rem,3vw,2.4rem)",
              fontWeight: 900, margin: 0,
            }}>Cast & Crew</h1>
            <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
              {cast.length} people
            </span>
          </div>

          {/* View tabs */}
          <div className="tabs" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <button className={`tab ${view === "trending" ? "active" : ""}`} onClick={() => setView("trending")}>
              🔥 Trending
            </button>
            <button className={`tab ${view === "all" ? "active" : ""}`} onClick={() => setView("all")}>
              👥 Browse All
            </button>
          </div>
        </div>
      </div>

      {/* ── Filter bar — Browse All or searching ── */}
      {(view === "all" || isFiltering) && (
        <div style={{
          padding: "12px 24px",
          background: "var(--bg2)",
          borderBottom: "1px solid var(--border)",
          display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
        }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 300 }}>
            <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"var(--muted)", fontSize:"0.85rem" }}>🔍</span>
            <input
              className="form-input"
              style={{ paddingLeft: 34, width: "100%" }}
              placeholder="Search by name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="form-select" style={{ width: "auto" }}
            value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            {types.map(t => <option key={t}>{t}</option>)}
          </select>
          {isFiltering && (
            <button className="btn btn-ghost btn-sm"
              onClick={() => { setSearch(""); setTypeFilter("All"); }}
              style={{ color: "var(--gold)", border: "1px solid rgba(201,151,58,0.3)", borderRadius: 4 }}>
              ✕ Clear
            </button>
          )}
          {isFiltering && (
            <span style={{ fontSize: "0.78rem", color: "var(--muted)", marginLeft: "auto" }}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="home-sections" style={{ paddingTop: 32 }}>
          <SkeletonRow /><SkeletonRow /><SkeletonRow />
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          TRENDING VIEW
      ══════════════════════════════════════════════════ */}
      {!loading && view === "trending" && !isFiltering && (
        <div className="home-sections" style={{ paddingTop: 32 }}>

          {/* Top Stars — most films */}
          {topStars.length > 0 && (
            <CastRow title="⭐ Top Stars" people={topStars} tag="Popular" />
          )}

          {/* Directors */}
          {directors.length > 0 && (
            <CastRow title="🎬 Directors" people={directors} />
          )}

          {/* Veterans — 5+ films */}
          {veterans.length > 0 && (
            <CastRow title="🏆 Veteran Artists" people={veterans} tag="5+ Films" />
          )}

          {/* Music */}
          {musicians.length > 0 && (
            <CastRow title="🎵 Music & Songs" people={musicians} />
          )}

          {/* Rising — only 1 film */}
          {risingNew.length > 0 && (
            <CastRow title="🌟 Rising Talents" people={risingNew} tag="New" />
          )}

          {/* Crew */}
          {crew.length > 0 && (
            <CastRow title="🎥 Crew & Production" people={crew} />
          )}

          {/* All actors (remaining) */}
          {stars.length > 20 && (
            <CastRow title="👥 All Actors & Actresses" people={stars} />
          )}

          {cast.length === 0 && (
            <div className="home-empty" style={{ padding: "80px 24px" }}>
              <div style={{ fontSize: "3rem", marginBottom: 12 }}>👤</div>
              <p style={{ color: "var(--muted)" }}>No cast members yet.</p>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          BROWSE ALL VIEW — flat grid with search/filter
      ══════════════════════════════════════════════════ */}
      {!loading && (view === "all" || isFiltering) && (
        <div className="home-sections" style={{ paddingTop: 32 }}>
          {filtered.length === 0 ? (
            <div className="home-empty" style={{ padding: "80px 24px" }}>
              <div style={{ fontSize: "3rem", marginBottom: 12 }}>👤</div>
              <p style={{ color: "var(--muted)" }}>No results found.</p>
              <button className="btn btn-outline btn-sm" style={{ marginTop: 16 }}
                onClick={() => { setSearch(""); setTypeFilter("All"); }}>
                Clear Filters
              </button>
            </div>
          ) : (
            /* Group by type when not searching */
            search ? (
              <section className="home-section">
                <div className="home-section-header" style={{ padding: "0 24px" }}>
                  <h2 className="home-section-title">Results</h2>
                  <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>{filtered.length} people</span>
                </div>
                <div style={{ padding: "8px 24px 24px", display: "flex", flexWrap: "wrap", gap: 14 }}>
                  {filtered.map(p => (
                    <CastCard key={p._id} person={p} onClick={() => navigate(`/cast/${p._id}`)} />
                  ))}
                </div>
              </section>
            ) : (
              // group by type
              types.filter(t => t !== "All").map(t => {
                const group = filtered.filter(c => c.type === t);
                if (!group.length) return null;
                return <CastRow key={t} title={t + "s"} people={group} />;
              })
            )
          )}
        </div>
      )}

    </div>
  );
}