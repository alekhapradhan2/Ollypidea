import SEO, { castSEO } from "../components/SEO";
import { Helmet } from "react-helmet-async";
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { API } from "../api/api";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function SafeImg({ src, alt, style, fallback }) {
  const [err, setErr] = useState(false);
  if (!src || err) return fallback ?? null;
  return <img src={src} alt={alt} style={style} onError={() => setErr(true)} />;
}

const verdictClass = (v) => {
  if (!v || v === "Upcoming") return "verdict-upcoming";
  const l = v.toLowerCase();
  if (["hit","super hit","blockbuster"].includes(l)) return "verdict-hit";
  if (["flop","disaster"].includes(l))               return "verdict-flop";
  if (l === "average")                               return "verdict-average";
  return "verdict-upcoming";
};

const ROLE_ICON = {
  Director:"🎬", Producer:"🎥", "Music Director":"🎵",
  Cinematographer:"📷", Choreographer:"💃", Lyricist:"✍️",
  Actor:"🎭", Actress:"🎭", Singer:"🎤", Editor:"✂️",
};

const VERDICT_META = [
  { label:"Blockbuster", bg:"#1a3d28", txt:"#95e5b8" },
  { label:"Super Hit",   bg:"#1a3d28", txt:"#95e5b8" },
  { label:"Hit",         bg:"#2d6a4f", txt:"#95e5b8" },
  { label:"Average",     bg:"#5a4a1a", txt:"#e8c87a" },
  { label:"Flop",        bg:"#6a2d2d", txt:"#e59595" },
  { label:"Disaster",    bg:"#4a1a1a", txt:"#e59595" },
];

const fmtDate = (d) => {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" }); }
  catch { return d; }
};

// ─────────────────────────────────────────────────────────────
// HomeRow — uses exact .home-row + .home-arrow classes
// ─────────────────────────────────────────────────────────────
function HomeRow({ title, count, children }) {
  const ref = useRef(null);
  const slide = (n) => ref.current?.scrollBy({ left: n, behavior: "smooth" });

  return (
    <div className="home-section">
      {/* Header — exact .home-section-header structure */}
      <div className="home-section-header" style={{ padding: "0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <h2 className="home-section-title">{title}</h2>
          {count > 0 && (
            <span style={{
              background: "rgba(201,151,58,0.15)", color: "var(--gold)",
              fontSize: "0.68rem", fontWeight: 700,
              padding: "2px 9px", borderRadius: 10, letterSpacing: "0.05em",
            }}>{count}</span>
          )}
        </div>
        <div className="home-section-arrows">
          <button className="home-arrow" onClick={() => slide(-360)}>‹</button>
          <button className="home-arrow" onClick={() => slide(360)}>›</button>
        </div>
      </div>

      {/* Row — exact .home-row */}
      <div className="home-row" ref={ref} style={{ padding: "4px 24px 12px" }}>
        {children}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MovieCard — exact .home-card structure
// ─────────────────────────────────────────────────────────────
function MovieCard({ movie, role, onClick }) {
  return (
    <div className="home-card" onClick={onClick}>
      <div className="home-card-img">
        {movie.posterUrl
          ? <img src={movie.posterUrl} alt={movie.title} loading="lazy" decoding="async" onError={e => e.target.style.display = "none"} />
          : <div className="home-card-fallback">🎬</div>
        }
        <div className="home-card-play">▶</div>
        <div className="home-card-overlay">
          <span className="home-card-verdict">{movie.verdict || "Upcoming"}</span>
          <span className="home-card-genre">{movie.genre?.[0] || ""}</span>
        </div>
      </div>
      <div className="home-card-info">
        <p className="home-card-title">{movie.title}</p>
        <p className="home-card-date">
          {role ? `as ${role}` : (movie.releaseDate || "Upcoming")}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SongCard — exact .home-song-card structure
// ─────────────────────────────────────────────────────────────
function SongCard({ song }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="home-song-card" style={{ flexShrink: 0, width: 180 }} onClick={() => song.ytId && setPlaying(true)}>
      {playing && song.ytId ? (
        <div style={{ position: "relative", paddingBottom: "56.25%", background: "#000" }}>
          <iframe
            src={`https://www.youtube.com/embed/${song.ytId}?autoplay=1`}
            allow="autoplay; encrypted-media" allowFullScreen title={song.title}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
          />
        </div>
      ) : (
        <div className="home-song-thumb">
          {song.thumbnailUrl
            ? <img src={song.thumbnailUrl} alt={song.title} loading="lazy" decoding="async" onError={e => e.target.style.display = "none"} />
            : <div style={{ width:"100%", height:"100%", background:"linear-gradient(135deg,#111,#222)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.8rem" }}>🎵</div>
          }
          <div className="home-song-play">▶</div>
        </div>
      )}
      <div className="home-song-info">
        <p className="home-song-title">{song.title}</p>
        {song.singer && <p className="home-song-singer">{song.singer}</p>}
        <p className="home-song-movie">{song.movieTitle}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TrailerCard — exact .home-trailer-card structure
// ─────────────────────────────────────────────────────────────
function TrailerCard({ trailer }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="home-trailer-card" style={{ flexShrink: 0, width: 300 }} onClick={() => setPlaying(p => !p)}>
      {playing ? (
        <div style={{ position: "relative", paddingBottom: "56.25%", background: "#000" }}>
          <iframe
            src={`https://www.youtube.com/embed/${trailer.ytId}?autoplay=1`}
            allow="autoplay; encrypted-media" allowFullScreen title={trailer.movieTitle}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
          />
        </div>
      ) : (
        <div className="home-trailer-thumb">
          <img src={`https://img.youtube.com/vi/${trailer.ytId}/mqdefault.jpg`} loading="lazy" decoding="async" alt={trailer.movieTitle} />
          <div className="home-trailer-play">▶</div>
          <div className="home-trailer-duration">Trailer</div>
        </div>
      )}
      <div className="home-trailer-info">
        <p className="home-trailer-title">{trailer.movieTitle}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// NewsCard — exact .home-news-card structure
// ─────────────────────────────────────────────────────────────
function NewsCard({ news, onClick }) {
  return (
    <div className="home-news-card" style={{ flexShrink: 0, width: 260 }} onClick={onClick}>
      <div className="home-news-img">
        {news.imageUrl
          ? <img src={news.imageUrl} alt={news.title} loading="lazy" decoding="async" onError={e => e.target.style.display = "none"} />
          : <div style={{ width:"100%", height:"100%", background:"linear-gradient(135deg,#111,#1a1a1a)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"2rem" }}>📰</div>
        }
      </div>
      <div className="home-news-body">
        <span className="home-news-cat">{news.category || "Update"}</span>
        <p className="home-news-title">{news.title}</p>
        {news.movieTitle && <p className="home-news-movie">{news.movieTitle}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="home-root" style={{ paddingTop: 60 }}>
      {/* hero skeleton */}
      <div className="skeleton" style={{ width: "100%", height: 480 }} />
      {/* rows */}
      <div style={{ padding: "40px 0" }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="home-section">
            <div className="home-section-header" style={{ padding: "0 24px" }}>
              <div className="skeleton" style={{ height: 20, width: 200 }} />
            </div>
            <div className="home-row" style={{ padding: "8px 24px 12px" }}>
              {[1,2,3,4,5].map(j => (
                <div key={j} className="skeleton" style={{ flexShrink: 0, width: 180, height: 270, borderRadius: 8 }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════
export default function CastProfile({ portalMode }) {
  const { id }        = useParams();
  const navigate      = useNavigate();
  const [person,  setPerson]  = useState(null);
  const [allNews, setAllNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [tab,     setTab]     = useState("all"); // "all" | "hits" | "upcoming"

  useEffect(() => {
    setLoading(true);
    setError(null);
    // Load person first — show hero immediately
    API.getCastMember(id)
      .then(p => {
        setPerson(p);
        setLoading(false);
        // Defer news load — non-critical, load after person renders
        const id2 = typeof requestIdleCallback !== "undefined"
          ? requestIdleCallback(() => API.getNews().catch(()=>[]).then(n => setAllNews(n)))
          : setTimeout(() => API.getNews().catch(()=>[]).then(n => setAllNews(n)), 150);
        return () => typeof requestIdleCallback !== "undefined" ? cancelIdleCallback(id2) : clearTimeout(id2);
      })
      .catch(e => { setError(e?.message || "Not found"); setLoading(false); });
  }, [id]);

  if (loading) return <Skeleton />;
  if (error || !person) return (
    <div className="page empty-state">
      <div style={{ fontSize: "3.5rem", marginBottom: 16 }}>🎭</div>
      <h3>Person not found</h3>
      <button className="btn btn-outline" style={{ marginTop: 20 }} onClick={() => navigate(-1)}>← Go Back</button>
    </div>
  );

  // ── derived ──────────────────────────────────────────────
  const movies   = person.moviesList || [];
  const icon     = ROLE_ICON[person.type] || "🎭";
  const hits     = movies.filter(m => ["Hit","Super Hit","Blockbuster"].includes(m.verdict));
  const flops    = movies.filter(m => ["Flop","Disaster"].includes(m.verdict));
  const upcoming = movies.filter(m => !m.verdict || m.verdict === "Upcoming");
  const released = movies.filter(m => m.verdict && m.verdict !== "Upcoming");
  const hitRate  = released.length ? Math.round((hits.length / released.length) * 100) : null;

  // tab filter
  const tabMovies = tab === "hits" ? hits : tab === "upcoming" ? upcoming : movies;

  // songs
  const songs = movies.flatMap(m =>
    (m.media?.songs || []).map(s => ({ ...s, movieTitle: m.title }))
  );

  // trailers
  const trailers = movies
    .filter(m => m.media?.trailer?.ytId)
    .map(m => ({ ...m.media.trailer, movieTitle: m.title, movieId: m._id }));

  // news
  const movieIds   = new Set(movies.map(m => String(m._id)));
  const personNews = allNews.filter(n => n.movieId && movieIds.has(String(n.movieId)));

  // co-stars
  const coMap = {};
  movies.forEach(m => {
    (m.cast || []).forEach(c => {
      if (String(c.castId) === String(person._id) || !c.name) return;
      const k = String(c.castId);
      if (!coMap[k]) coMap[k] = { ...c, count: 0 };
      coMap[k].count++;
    });
  });
  const costars = Object.values(coMap).sort((a,b) => b.count - a.count).slice(0, 8);

  // genre breakdown
  const gMap = {};
  movies.forEach(m => (m.genre || []).forEach(g => { gMap[g] = (gMap[g] || 0) + 1; }));
  const genres = Object.entries(gMap).sort((a,b) => b[1] - a[1]).slice(0, 5);
  const gMax   = genres[0]?.[1] || 1;

  // verdict pills
  const verdictPills = VERDICT_META
    .map(v => ({ ...v, count: movies.filter(m => m.verdict === v.label).length }))
    .filter(v => v.count > 0);

  // backdrop
  const backdrop = movies.find(m => m.thumbnailUrl)?.thumbnailUrl
                || movies.find(m => m.posterUrl)?.posterUrl
                || null;

  const goMovie = (mId) => navigate(portalMode ? `/portal/movie/${mId}` : `/movie/${mId}`);

  return (
    <div className="home-root">
      <SEO {...castSEO(person)} />
      <Helmet>
        {person && <script type="application/ld+json">{JSON.stringify({"@context":"https://schema.org","@type":"Person","name":person.name,"image":person.photo,"description":person.bio,"jobTitle":person.type,"nationality":{"@type":"Country","name":"India"}})}</script>}
      </Helmet>

      {/* ════════════════════════════════════════════════════
          HERO — compact banner, no full-viewport height
      ════════════════════════════════════════════════════ */}
      <div style={{ position: "relative", overflow: "hidden", paddingTop: 60 }}>

        {/* Blurred backdrop — fixed 220px tall */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          {backdrop
            ? <img src={backdrop} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", filter:"blur(40px) brightness(0.22)", transform:"scale(1.1)" }} />
            : <div style={{ width:"100%", height:"100%", background:"linear-gradient(135deg,#0f0f0f,#1a1200)" }} />
          }
          {/* bottom fade into page bg */}
          <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(10,10,10,0.75) 60%, #0a0a0a 100%)" }} />
        </div>

        {/* Content — constrained width, sits over backdrop */}
        <div style={{ position:"relative", zIndex:1, maxWidth:1400, margin:"0 auto", padding:"24px 24px 32px" }}>

          {/* Back button */}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate(-1)}
            style={{ marginBottom: 20, background:"rgba(0,0,0,0.5)", border:"1px solid rgba(255,255,255,0.18)", borderRadius:4 }}
          >← Back</button>

          {/* ── Profile row: photo | info | stats strip ── */}
          <div style={{ display:"flex", gap:28, alignItems:"center", flexWrap:"wrap" }}>

            {/* Portrait — modest size, no overlap */}
            <div style={{
              width: 110, height: 140, flexShrink: 0,
              borderRadius: 8, overflow:"hidden",
              border:"2px solid rgba(201,151,58,0.55)",
              background:"var(--bg2)",
              boxShadow:"0 8px 32px rgba(0,0,0,0.8)",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <SafeImg
                src={person.photo} alt={person.name}
                style={{ width:"100%", height:"100%", objectFit:"cover" }}
                fallback={<span style={{ fontSize:"3rem" }}>{icon}</span>}
              />
            </div>

            {/* Main info */}
            <div style={{ flex:1, minWidth:200 }}>

              {/* Tags row */}
              <div className="home-hero-meta" style={{ marginBottom:8 }}>
                <span className="home-tag">{icon} {person.type}</span>
                {hitRate !== null && (
                  <span className="home-tag-outline">{hitRate}% Hit Rate</span>
                )}
              </div>

              {/* Name */}
              <h1 style={{
                fontFamily:"'Playfair Display',serif",
                fontSize:"clamp(1.6rem,4vw,2.6rem)",
                fontWeight:900, lineHeight:1.1,
                margin:"0 0 10px",
                textShadow:"0 2px 16px rgba(0,0,0,0.8)",
              }}>
                {person.name}
              </h1>

              {/* Quick stats inline */}
              <div className="home-hero-info" style={{ marginBottom: person.bio ? 10 : 0 }}>
                <span>{movies.length} Films</span>
                <span>{hits.length} Hits</span>
                {flops.length > 0   && <span>{flops.length} Flops</span>}
                {upcoming.length > 0 && <span>{upcoming.length} Upcoming</span>}
              </div>

              {/* Bio — max 2 lines */}
              {person.bio && (
                <p style={{
                  fontSize:"0.84rem", color:"rgba(255,255,255,0.6)",
                  lineHeight:1.55, margin:0,
                  display:"-webkit-box", WebkitLineClamp:2,
                  WebkitBoxOrient:"vertical", overflow:"hidden",
                  maxWidth:520,
                }}>
                  {person.bio}
                </p>
              )}

              {/* Verdict pills — compact */}
              {verdictPills.length > 0 && (
                <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:10 }}>
                  {verdictPills.map(v => (
                    <div key={v.label} style={{
                      display:"flex", alignItems:"center", gap:4,
                      background:v.bg, borderRadius:3, padding:"3px 9px",
                      fontSize:"0.68rem", fontWeight:700,
                    }}>
                      <span style={{ color:v.txt }}>{v.label}</span>
                      <span style={{ background:"rgba(255,255,255,0.15)", color:"#fff", padding:"0 5px", borderRadius:8, fontSize:"0.62rem" }}>{v.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CTA buttons — stacked vertically on the right */}
            <div style={{ display:"flex", flexDirection:"column", gap:8, flexShrink:0 }}>
              {movies.length > 0 && (
                <button className="btn-hero-play" style={{ fontSize:"0.8rem", padding:"10px 20px" }} onClick={() => goMovie(movies[0]._id)}>
                  ▶ Latest Film
                </button>
              )}
              <button className="btn-hero-info" style={{ fontSize:"0.78rem", padding:"10px 18px" }}
                onClick={() => document.getElementById("cast-filmography")?.scrollIntoView({ behavior:"smooth" })}>
                Filmography
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          SECTIONS — Netflix-style rows
      ════════════════════════════════════════════════════ */}
      <div className="home-sections" style={{ paddingTop: 24 }}>

        {/* ── TABS for filmography filter ── */}
        {movies.length > 0 && (
          <div id="cast-filmography" style={{ padding:"0 24px", marginBottom: 8 }}>
            <div className="tabs" style={{ borderColor:"rgba(255,255,255,0.1)" }}>
              {[["all","All Films"], ["hits","Hits Only"], ["upcoming","Upcoming"]].map(([k,lbl]) => (
                <button
                  key={k}
                  className={`tab ${tab===k?"active":""}`}
                  onClick={() => setTab(k)}
                  style={{ fontSize:"0.8rem" }}
                >
                  {lbl}
                  {k==="hits" && hits.length > 0 && (
                    <span style={{ marginLeft:6, background:"rgba(201,151,58,0.2)", color:"var(--gold)", fontSize:"0.65rem", padding:"1px 6px", borderRadius:8 }}>{hits.length}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── FILMOGRAPHY ROW — movie cards ── */}
        {tabMovies.length > 0 && (
          <HomeRow title="Filmography" count={tabMovies.length}>
            {tabMovies.map(m => {
              const entry = (m.cast || []).find(c => String(c.castId) === String(person._id));
              return (
                <MovieCard
                  key={m._id}
                  movie={m}
                  role={entry?.role}
                  onClick={() => goMovie(m._id)}
                />
              );
            })}
          </HomeRow>
        )}

        {tabMovies.length === 0 && tab !== "all" && (
          <div style={{ padding:"24px 24px 0", color:"var(--muted)", fontSize:"0.88rem" }}>
            No {tab === "hits" ? "hit" : "upcoming"} films found.
          </div>
        )}

        {/* ── CO-STARS ROW ── */}
        {costars.length > 0 && (
          <HomeRow title="Frequent Co-stars" count={costars.length}>
            {costars.map((c, i) => (
              <div
                key={i}
                className="home-card"
                style={{ width: 150, cursor: c.castId ? "pointer" : "default" }}
                onClick={() => c.castId && navigate(`/cast/${c.castId}`)}
              >
                <div className="home-card-img" style={{ height: 150 }}>
                  <SafeImg
                    src={c.photo} alt={c.name}
                    style={{ width:"100%", height:"100%", objectFit:"cover" }}
                    fallback={<div className="home-card-fallback">🎭</div>}
                  />
                  <div className="home-card-play">▶</div>
                  <div className="home-card-overlay">
                    <span className="home-card-genre">{c.type}</span>
                  </div>
                </div>
                <div className="home-card-info">
                  <p className="home-card-title">{c.name}</p>
                  <p className="home-card-date">{c.count} film{c.count !== 1 ? "s" : ""} together</p>
                </div>
              </div>
            ))}
          </HomeRow>
        )}

        {/* ── SONGS ROW ── */}
        {songs.length > 0 && (
          <HomeRow title="Songs" count={songs.length}>
            {songs.map((s, i) => <SongCard key={i} song={s} />)}
          </HomeRow>
        )}

        {/* ── TRAILERS ROW ── */}
        {trailers.length > 0 && (
          <HomeRow title="Trailers" count={trailers.length}>
            {trailers.map((t, i) => <TrailerCard key={i} trailer={t} />)}
          </HomeRow>
        )}

        {/* ── NEWS ROW ── */}
        {personNews.length > 0 && (
          <HomeRow title="Related News" count={personNews.length}>
            {personNews.map(n => (
              <NewsCard key={n._id} news={n} onClick={() => navigate(`/news/${n._id}`)} />
            ))}
          </HomeRow>
        )}

        {/* ── EMPTY ── */}
        {movies.length === 0 && (
          <div className="home-empty">
            <div style={{ fontSize:"3rem", marginBottom:12 }}>🎬</div>
            <p>No films linked to {person.name} yet.</p>
          </div>
        )}

      </div>{/* end home-sections */}
    </div>
  );
}