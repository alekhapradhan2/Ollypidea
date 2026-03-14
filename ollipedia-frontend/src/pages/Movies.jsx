import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../api/api";

// ── Constants ─────────────────────────────────────────────
const GENRES   = ["All","Action","Drama","Romance","Comedy","Thriller","Family","Historical","Musical","Biographical"];
const VERDICTS = ["All","Upcoming","Blockbuster","Super Hit","Hit","Average","Flop","Disaster"];
const YEARS    = ["All", "2025","2024","2023","2022","2021","2020","2019","2018"];

const VERDICT_COLOR = {
  "Blockbuster": "#95e5b8", "Super Hit": "#95e5b8", "Hit": "#95e5b8",
  "Average":     "#e8c87a",
  "Flop":        "#e59595", "Disaster": "#e59595",
  "Upcoming":    "#7aaae8",
};

// ── Horizontal scroll row ─────────────────────────────────
function HomeRow({ title, tag, children, count }) {
  const ref = useRef(null);
  const slide = (n) => ref.current?.scrollBy({ left: n, behavior: "smooth" });

  return (
    <div className="home-section">
      <div className="home-section-header" style={{ padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 className="home-section-title">{title}</h2>
          {tag  && <span className="home-tag">{tag}</span>}
          {count != null && (
            <span style={{
              background: "rgba(201,151,58,0.15)", color: "var(--gold)",
              fontSize: "0.68rem", fontWeight: 700,
              padding: "2px 9px", borderRadius: 10,
            }}>{count}</span>
          )}
        </div>
        <div className="home-section-arrows">
          <button className="home-arrow" onClick={() => slide(-400)}>‹</button>
          <button className="home-arrow" onClick={() => slide(400)}>›</button>
        </div>
      </div>
      <div className="home-row" ref={ref} style={{ padding: "6px 24px 14px" }}>
        {children}
      </div>
    </div>
  );
}

// ── Single movie card — exact .home-card classes ──────────
function Card({ movie, onClick }) {
  const verdict = movie.verdict || "Upcoming";
  const color   = VERDICT_COLOR[verdict] || "#7aaae8";

  return (
    <div className="home-card" onClick={onClick}>
      <div className="home-card-img">
        {movie.posterUrl || movie.thumbnailUrl
          ? <img
              src={movie.posterUrl || movie.thumbnailUrl}
              alt={movie.title}
              onError={e => { e.target.style.display = "none"; }}
            />
          : <div className="home-card-fallback">🎬</div>
        }
        <div className="home-card-play">▶</div>
        <div className="home-card-overlay">
          <span className="home-card-verdict" style={{ color }}>{verdict}</span>
          <span className="home-card-genre">{movie.genre?.[0] || ""}</span>
        </div>
      </div>
      <div className="home-card-info">
        <p className="home-card-title">{movie.title}</p>
        <p className="home-card-date">{movie.releaseDate?.slice(0, 4) || "TBA"}</p>
      </div>
    </div>
  );
}

// ── Skeleton row ──────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="home-section">
      <div className="home-section-header" style={{ padding: "0 24px" }}>
        <div className="skeleton" style={{ height: 18, width: 200 }} />
      </div>
      <div className="home-row" style={{ padding: "6px 24px 14px" }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton" style={{ flexShrink: 0, width: 180, height: 310, borderRadius: 8 }} />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════
export default function Movies() {
  const navigate = useNavigate();
  const [movies,  setMovies]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [genre,   setGenre]   = useState("All");
  const [verdict, setVerdict] = useState("All");
  const [year,    setYear]    = useState("All");
  const [view,    setView]    = useState("trending"); // "trending" | "all"

  useEffect(() => {
    API.getMovies()
      .then(data => {
        // Sort: newest first (by releaseDate desc, then by createdAt desc)
        const sorted = [...data].sort((a, b) => {
          const da = a.releaseDate || "0000";
          const db = b.releaseDate || "0000";
          return db.localeCompare(da);
        });
        setMovies(sorted);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const goMovie = (id) => navigate(`/movie/${id}`);

  // ── filter ───────────────────────────────────────────────
  const filtered = movies.filter(m => {
    const q            = search.toLowerCase();
    const matchSearch  = !q || m.title?.toLowerCase().includes(q) || m.director?.toLowerCase().includes(q);
    const matchGenre   = genre   === "All" || m.genre?.includes(genre);
    const matchVerdict = verdict === "All" || (m.verdict || "Upcoming").toLowerCase() === verdict.toLowerCase();
    const matchYear    = year    === "All" || (m.releaseDate || "").startsWith(year);
    return matchSearch && matchGenre && matchVerdict && matchYear;
  });

  const isFiltering = search || genre !== "All" || verdict !== "All" || year !== "All";

  // ── grouped sections (for trending view) ────────────────
  const sortNew      = (arr) => [...arr].sort((a,b) => new Date(b.releaseDate||0) - new Date(a.releaseDate||0));
  const upcoming     = sortNew(movies.filter(m => !m.verdict || m.verdict === "Upcoming")).slice(0, 20);
  const blockbusters = sortNew(movies.filter(m => ["Blockbuster","Super Hit"].includes(m.verdict))).slice(0, 20);
  const hits         = sortNew(movies.filter(m => m.verdict === "Hit")).slice(0, 20);
  const latest       = movies.slice(0, 20); // already sorted new→old on load

  // Derive year list from actual data — newest year first, top 5
  const allYears = [...new Set(
    movies.map(m => m.releaseDate?.slice(0,4)).filter(Boolean)
  )].sort((a,b) => b.localeCompare(a)).slice(0, 5);

  // group by year for "All" view
  const byYear = {};
  filtered.forEach(m => {
    const y = m.releaseDate?.slice(0, 4) || "Unknown";
    if (!byYear[y]) byYear[y] = [];
    byYear[y].push(m);
  });
  const yearGroups = Object.entries(byYear).sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <div className="home-root" style={{ paddingTop: 60 }}>

      {/* ── Page header banner ── */}
      <div style={{
        padding: "32px 24px 0",
        background: "linear-gradient(to bottom, rgba(201,151,58,0.06), transparent)",
        borderBottom: "1px solid var(--border)",
        marginBottom: 0,
      }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          {/* Title + count */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 20 }}>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(1.6rem, 3vw, 2.4rem)",
              fontWeight: 900, margin: 0,
            }}>All Films</h1>
            <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
              {movies.length} films
            </span>
          </div>

          {/* View toggle */}
          <div className="tabs" style={{ marginBottom: 0, borderColor: "rgba(255,255,255,0.08)" }}>
            <button className={`tab ${view === "trending" ? "active" : ""}`} onClick={() => setView("trending")}>
              🔥 Trending
            </button>
            <button className={`tab ${view === "all" ? "active" : ""}`} onClick={() => setView("all")}>
              🎬 Browse All
            </button>
          </div>
        </div>
      </div>

      {/* ── Filters bar — shown in Browse All mode or when searching ── */}
      {(view === "all" || isFiltering) && (
        <div style={{
          padding: "14px 24px",
          background: "var(--bg2)",
          borderBottom: "1px solid var(--border)",
          display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
        }}>
          {/* Search */}
          <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 300 }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", fontSize: "0.85rem" }}>🔍</span>
            <input
              className="form-input"
              style={{ paddingLeft: 34, width: "100%" }}
              placeholder="Title or director…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Genre */}
          <select className="form-select" style={{ width: "auto" }} value={genre} onChange={e => setGenre(e.target.value)}>
            {GENRES.map(g => <option key={g}>{g}</option>)}
          </select>

          {/* Verdict */}
          <select className="form-select" style={{ width: "auto" }} value={verdict} onChange={e => setVerdict(e.target.value)}>
            {VERDICTS.map(v => <option key={v}>{v}</option>)}
          </select>

          {/* Year */}
          <select className="form-select" style={{ width: "auto" }} value={year} onChange={e => setYear(e.target.value)}>
            {YEARS.map(y => <option key={y}>{y}</option>)}
          </select>

          {/* Clear */}
          {isFiltering && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setSearch(""); setGenre("All"); setVerdict("All"); setYear("All"); }}
              style={{ color: "var(--gold)", border: "1px solid rgba(201,151,58,0.3)", borderRadius: 4 }}
            >✕ Clear</button>
          )}

          {isFiltering && (
            <span style={{ fontSize: "0.78rem", color: "var(--muted)", marginLeft: "auto" }}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          LOADING
      ════════════════════════════════════════════════════ */}
      {loading && (
        <div className="home-sections" style={{ paddingTop: 32 }}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          TRENDING VIEW — categorised rows
      ════════════════════════════════════════════════════ */}
      {!loading && view === "trending" && !isFiltering && (
        <div className="home-sections" style={{ paddingTop: 32 }}>

          {/* Latest releases */}
          {latest.length > 0 && (
            <HomeRow title="Latest Releases" tag="New" count={latest.length}>
              {latest.map(m => <Card key={m._id} movie={m} onClick={() => goMovie(m._id)} />)}
            </HomeRow>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <HomeRow title="Upcoming Films" tag="Soon" count={upcoming.length}>
              {upcoming.map(m => <Card key={m._id} movie={m} onClick={() => goMovie(m._id)} />)}
            </HomeRow>
          )}

          {/* Blockbusters */}
          {blockbusters.length > 0 && (
            <HomeRow title="Blockbusters & Super Hits" count={blockbusters.length}>
              {blockbusters.map(m => <Card key={m._id} movie={m} onClick={() => goMovie(m._id)} />)}
            </HomeRow>
          )}

          {/* Hits */}
          {hits.length > 0 && (
            <HomeRow title="Hit Films" count={hits.length}>
              {hits.map(m => <Card key={m._id} movie={m} onClick={() => goMovie(m._id)} />)}
            </HomeRow>
          )}

          {/* By year — derived from actual data, newest first */}
          {allYears.map(y => {
            const yMovies = sortNew(movies.filter(m => (m.releaseDate || "").startsWith(y)));
            if (!yMovies.length) return null;
            return (
              <HomeRow key={y} title={`${y} Films`} count={yMovies.length}>
                {yMovies.map(m => <Card key={m._id} movie={m} onClick={() => goMovie(m._id)} />)}
              </HomeRow>
            );
          })}

        </div>
      )}

      {/* ════════════════════════════════════════════════════
          BROWSE ALL VIEW — grouped by year
      ════════════════════════════════════════════════════ */}
      {!loading && (view === "all" || isFiltering) && (
        <div className="home-sections" style={{ paddingTop: 32 }}>

          {filtered.length === 0 ? (
            <div className="home-empty" style={{ padding: "80px 24px" }}>
              <div style={{ fontSize: "3rem", marginBottom: 12 }}>🎬</div>
              <p style={{ color: "var(--muted)" }}>No films match your filters.</p>
              <button
                className="btn btn-outline btn-sm"
                style={{ marginTop: 16 }}
                onClick={() => { setSearch(""); setGenre("All"); setVerdict("All"); setYear("All"); }}
              >Clear Filters</button>
            </div>
          ) : yearGroups.length > 0 ? (
            /* Grouped by year */
            yearGroups.map(([y, yMovies]) => (
              <HomeRow key={y} title={`${y} Films`} count={yMovies.length}>
                {yMovies.map(m => <Card key={m._id} movie={m} onClick={() => goMovie(m._id)} />)}
              </HomeRow>
            ))
          ) : (
            /* Flat list when all same year */
            <HomeRow title="Results" count={filtered.length}>
              {filtered.map(m => <Card key={m._id} movie={m} onClick={() => goMovie(m._id)} />)}
            </HomeRow>
          )}
        </div>
      )}

    </div>
  );
}