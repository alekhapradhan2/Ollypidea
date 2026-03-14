import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../api/api";

const GENRES   = ["All","Action","Drama","Romance","Comedy","Thriller","Family","Historical","Musical","Biographical"];
const VERDICTS = ["All","Upcoming","Blockbuster","Super Hit","Hit","Average","Flop","Disaster"];

const VS = {
  "Blockbuster":{ c:"#95e5b8" }, "Super Hit":{ c:"#95e5b8" }, "Hit":{ c:"#a3e8a0" },
  "Average":{ c:"#e8c87a" }, "Flop":{ c:"#e59595" }, "Disaster":{ c:"#e59595" },
  "Upcoming":{ c:"#7aaae8" },
};

/* ─── Lazy image ─────────────────────────────────────────── */
function LImg({ src, alt, style }) {
  const [ok, setOk] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!src) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { ref.current?.setAttribute("src", src); io.disconnect(); }
    }, { rootMargin: "400px" });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, [src]);
  return <img ref={ref} alt={alt || ""} style={{ ...style, opacity: ok ? 1 : 0, transition: "opacity .4s" }} onLoad={() => setOk(true)} onError={() => setOk(true)} />;
}

/* ─── Card ────────────────────────────────────────────────── */
const Card = React.memo(({ movie, onClick }) => {
  const [hov, setHov] = useState(false);
  const v = movie.verdict || "Upcoming";
  const c = VS[v]?.c || "#7aaae8";
  const img = movie.posterUrl || movie.thumbnailUrl;
  return (
    <div onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ flexShrink: 0, width: 160, cursor: "pointer",
        transform: hov ? "translateY(-8px) scale(1.03)" : "none",
        transition: "transform .3s cubic-bezier(.34,1.56,.64,1)" }}>
      <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", aspectRatio: "2/3",
        background: "var(--bg3)",
        boxShadow: hov ? "0 24px 56px rgba(0,0,0,.75)" : "0 4px 18px rgba(0,0,0,.4)",
        border: `1px solid ${hov ? "rgba(201,151,58,.5)" : "rgba(255,255,255,.07)"}`,
        transition: "box-shadow .3s, border .3s" }}>
        {img
          ? <LImg src={img} alt={movie.title} style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"top", display:"block", position:"absolute", inset:0 }} />
          : <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"2.5rem" }}>🎬</div>}
        {/* gradient */}
        <div style={{ position:"absolute", inset:0,
          background:"linear-gradient(to top, rgba(0,0,0,.88) 0%, rgba(0,0,0,.1) 55%, transparent 100%)",
          opacity: hov ? 1 : .55, transition:"opacity .3s" }} />
        {/* verdict */}
        <div style={{ position:"absolute", top:8, left:8,
          background:`${c}20`, border:`1px solid ${c}99`, color:c,
          fontSize:".58rem", fontWeight:800, padding:"2px 7px", borderRadius:3,
          letterSpacing:".07em", textTransform:"uppercase" }}>{v}</div>
        {/* genre */}
        {movie.genre?.[0] && <div style={{ position:"absolute", bottom:8, left:8,
          fontSize:".6rem", color:"rgba(255,255,255,.7)", fontWeight:600 }}>{movie.genre[0]}</div>}
        {/* play */}
        {hov && <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ width:42, height:42, borderRadius:"50%", background:"rgba(201,151,58,.92)",
            display:"flex", alignItems:"center", justifyContent:"center", paddingLeft:3, fontSize:"1rem" }}>▶</div>
        </div>}
      </div>
      <div style={{ padding:"9px 2px 0" }}>
        <p style={{ margin:0, fontWeight:700, fontSize:".81rem", lineHeight:1.3,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
          color: hov ? "var(--gold)" : "var(--text)", transition:"color .2s" }}>{movie.title}</p>
        <p style={{ margin:"3px 0 0", fontSize:".68rem", color:"var(--muted)" }}>{movie.releaseDate?.slice(0,4) || "TBA"}</p>
      </div>
    </div>
  );
});

/* ─── Skeleton card ───────────────────────────────────────── */
function SkCard() {
  return (
    <div style={{ flexShrink:0, width:160 }}>
      <div style={{ borderRadius:10, aspectRatio:"2/3", background:"var(--bg3)",
        animation:"mdpulse 1.5s ease-in-out infinite" }} />
      <div style={{ height:12, background:"var(--bg3)", borderRadius:4, margin:"10px 2px 0",
        animation:"mdpulse 1.5s ease-in-out .1s infinite" }} />
    </div>
  );
}

/* ─── Row ─────────────────────────────────────────────────── */
function Row({ title, badge, badgeColor = "#c9973a", count, movies, onMovie, viewAll }) {
  const navigate = useNavigate();
  const ref = useRef(null);
  const slide = n => ref.current?.scrollBy({ left: n, behavior: "smooth" });
  if (!movies?.length) return null;
  return (
    <div style={{ marginBottom: 44 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
        marginBottom: 16, padding: "0 20px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <h2 style={{ margin:0, fontSize:"1.05rem", fontWeight:800, letterSpacing:".01em" }}>{title}</h2>
          {badge && <span style={{ background:`${badgeColor}20`, border:`1px solid ${badgeColor}50`,
            color:badgeColor, fontSize:".58rem", fontWeight:800,
            padding:"2px 8px", borderRadius:3, letterSpacing:".08em", textTransform:"uppercase" }}>{badge}</span>}
          {count != null && <span style={{ fontSize:".7rem", color:"var(--muted)" }}>{count}</span>}
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          {viewAll && <button className="home-view-all" onClick={() => navigate(viewAll)}>View All</button>}
          <button onClick={() => slide(-640)} style={arrowBtn}>‹</button>
          <button onClick={() => slide(640)}  style={arrowBtn}>›</button>
        </div>
      </div>
      <div ref={ref} style={{ display:"flex", gap:14, overflowX:"auto", paddingBottom:6,
        paddingLeft:20, paddingRight:20, scrollbarWidth:"none", msOverflowStyle:"none" }}>
        {movies.map(m => <Card key={m._id} movie={m} onClick={() => onMovie(m._id)} />)}
      </div>
    </div>
  );
}

const arrowBtn = {
  width:30, height:30, borderRadius:"50%",
  border:"1px solid rgba(255,255,255,.12)", background:"rgba(255,255,255,.05)",
  color:"var(--text)", cursor:"pointer", fontSize:"1rem",
  display:"flex", alignItems:"center", justifyContent:"center",
};

/* ═══════════════ MAIN ════════════════════════════════════ */
export default function Movies() {
  const navigate = useNavigate();
  const [movies,  setMovies]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [genre,   setGenre]   = useState("All");
  const [verdict, setVerdict] = useState("All");
  const [view,    setView]    = useState("browse");

  useEffect(() => {
    API.getMovies()
      .then(d => setMovies([...d].sort((a,b) => (b.releaseDate||"0").localeCompare(a.releaseDate||"0"))))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const go = useCallback(id => navigate(`/movie/${id}`), [navigate]);
  const srt = arr => [...arr].sort((a,b) => (b.releaseDate||"0").localeCompare(a.releaseDate||"0"));
  const isFiltering = search || genre !== "All" || verdict !== "All";

  const filtered = useMemo(() => movies.filter(m => {
    const q = search.toLowerCase();
    return (!q || m.title?.toLowerCase().includes(q) || m.director?.toLowerCase().includes(q))
      && (genre   === "All" || m.genre?.includes(genre))
      && (verdict === "All" || (m.verdict||"Upcoming").toLowerCase() === verdict.toLowerCase());
  }), [movies, search, genre, verdict]);

  const sections = useMemo(() => ({
    upcoming:     srt(movies.filter(m => !m.verdict || m.verdict === "Upcoming")),
    blockbusters: srt(movies.filter(m => ["Blockbuster","Super Hit"].includes(m.verdict))),
    hits:         srt(movies.filter(m => m.verdict === "Hit")),
    years:        [...new Set(movies.map(m => m.releaseDate?.slice(0,4)).filter(Boolean))].sort((a,b)=>b-a),
  }), [movies]);

  const byYear = useMemo(() => {
    const map = {};
    filtered.forEach(m => { const y = m.releaseDate?.slice(0,4)||"Unknown"; (map[y]=map[y]||[]).push(m); });
    return Object.entries(map).sort((a,b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", paddingTop:60 }}>
      <style>{`@keyframes mdpulse{0%,100%{opacity:1}50%{opacity:.35}}`}</style>

      {/* ── HEADER ── */}
      <div style={{ padding:"36px 20px 0", borderBottom:"1px solid var(--border)",
        background:"linear-gradient(to bottom, rgba(201,151,58,.05), transparent)" }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:14, marginBottom:24 }}>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:"clamp(1.8rem,4vw,2.8rem)",
            fontWeight:900, margin:0, letterSpacing:"-.02em" }}>Films</h1>
          {!loading && <span style={{ fontSize:".85rem", color:"var(--muted)" }}>{movies.length} total</span>}
        </div>
        {/* Tabs */}
        <div style={{ display:"flex" }}>
          {[["browse","🎬 Browse"],["search","🔍 Search & Filter"]].map(([v,label]) => (
            <button key={v} onClick={() => setView(v)} style={{
              padding:"10px 22px", background:"none", border:"none", cursor:"pointer",
              fontWeight:700, fontSize:".82rem",
              color: view===v ? "var(--gold)" : "var(--muted)",
              borderBottom: view===v ? "2px solid var(--gold)" : "2px solid transparent",
              letterSpacing:".03em", transition:"all .2s",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── FILTER BAR ── */}
      {view === "search" && (
        <div style={{ padding:"16px 20px", background:"var(--bg2)", borderBottom:"1px solid var(--border)",
          display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
          <div style={{ position:"relative", flex:1, minWidth:200 }}>
            <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:".85rem" }}>🔍</span>
            <input className="form-input" autoFocus style={{ paddingLeft:36, width:"100%" }}
              placeholder="Search title or director…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width:"auto" }} value={genre}   onChange={e => setGenre(e.target.value)}>
            {GENRES.map(g => <option key={g}>{g}</option>)}
          </select>
          <select className="form-select" style={{ width:"auto" }} value={verdict} onChange={e => setVerdict(e.target.value)}>
            {VERDICTS.map(v => <option key={v}>{v}</option>)}
          </select>
          {isFiltering && <>
            <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(""); setGenre("All"); setVerdict("All"); }}
              style={{ border:"1px solid var(--border)" }}>✕ Clear</button>
            <span style={{ fontSize:".78rem", color:"var(--muted)", marginLeft:"auto" }}>{filtered.length} results</span>
          </>}
        </div>
      )}

      {/* ── CONTENT ── */}
      <div style={{ paddingTop: 36, paddingBottom: 60 }}>

        {/* Loading */}
        {loading && (
          <div style={{ padding:"0 20px" }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ marginBottom:44 }}>
                <div style={{ width:220, height:18, background:"var(--bg3)", borderRadius:4,
                  marginBottom:16, animation:"mdpulse 1.5s infinite" }} />
                <div style={{ display:"flex", gap:14 }}>
                  {[...Array(8)].map((_,j) => <SkCard key={j} />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search results */}
        {!loading && view === "search" && (
          filtered.length === 0
            ? <div style={{ textAlign:"center", padding:"80px 20px", color:"var(--muted)" }}>
                <div style={{ fontSize:"3rem", marginBottom:12 }}>🎬</div>
                <p>No films match your filters.</p>
                <button className="btn btn-outline btn-sm" style={{ marginTop:16 }}
                  onClick={() => { setSearch(""); setGenre("All"); setVerdict("All"); }}>Clear Filters</button>
              </div>
            : byYear.map(([y, ym]) => (
                <Row key={y} title={y} badge={`${ym.length} films`} movies={ym} onMovie={go} />
              ))
        )}

        {/* Browse sections */}
        {!loading && view === "browse" && <>
          <Row title="🆕 Latest Releases" badge="New" badgeColor="#7aaae8"
            movies={movies.slice(0,40)} onMovie={go} viewAll="/movies" />
          <Row title="🚀 Upcoming" badge="Soon" badgeColor="#e8c87a"
            movies={sections.upcoming} onMovie={go} />
          <Row title="🏆 Blockbusters & Super Hits" badge="Hit" badgeColor="#95e5b8"
            movies={sections.blockbusters} onMovie={go} />
          {sections.hits.length > 0 &&
            <Row title="🎯 Hit Films" movies={sections.hits} onMovie={go} />}
          {sections.years.map(y => {
            const ym = srt(movies.filter(m => (m.releaseDate||"").startsWith(y)));
            return ym.length ? <Row key={y} title={`${y} Films`} count={ym.length} movies={ym} onMovie={go} /> : null;
          })}
        </>}
      </div>
    </div>
  );
}