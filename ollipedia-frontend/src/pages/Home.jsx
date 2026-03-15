import SEO, { homeSEO } from "../components/SEO";
import React, {
  useEffect, useState, useRef, useMemo, useCallback, lazy, Suspense
} from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../api/api";

// ─── Helpers (pure functions, defined once at module level) ──────
const extractYtId = input => {
  if (!input) return null;
  const s = String(input).trim();
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : (/^[A-Za-z0-9_-]{11}$/.test(s) ? s : null);
};
const ytThumb   = id => { const i = extractYtId(id); return i ? `https://img.youtube.com/vi/${i}/mqdefault.jpg` : null; };
// mqdefault (320×180) instead of hqdefault (480×360) — 60% smaller files
const heroImage = m => m.thumbnailUrl || ytThumb(m.media?.trailer?.ytId) || m.posterUrl || null;
const fmtDate   = d => d ? new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "";

// Date helpers — computed once
const _now = new Date();
const RECENT_CUTOFF = new Date(_now.getFullYear()-3, _now.getMonth(), _now.getDate());
const withinDays = (d,p,f) => { if(!d) return false; const diff=(new Date(d)-_now)/86400000; return diff>=-p&&diff<=f; };
const isThisWeek  = d => withinDays(d,7,14);
const isThisMonth = d => { if(!d) return false; const dt=new Date(d); return dt.getMonth()===_now.getMonth()&&dt.getFullYear()===_now.getFullYear(); };
const isLastMonth = d => { if(!d) return false; const dt=new Date(d); const lm=new Date(_now.getFullYear(),_now.getMonth()-1,1); return dt.getMonth()===lm.getMonth()&&dt.getFullYear()===lm.getFullYear(); };
const isLastWeek  = d => withinDays(d,14,0);

const VS = {
  "Blockbuster":"#95e5b8","Super Hit":"#95e5b8","Hit":"#a3e8a0",
  "Average":"#e8c87a","Flop":"#e59595","Disaster":"#e59595","Upcoming":"#7aaae8",
};

// ─── Shared IntersectionObserver (one IO for ALL images) ─────────
// Instead of 900 separate IOs, one shared observer handles everything
const imgObserver = (() => {
  if (typeof window === "undefined") return null;
  const callbacks = new WeakMap();
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const cb = callbacks.get(entry.target);
        if (cb) { cb(); callbacks.delete(entry.target); io.unobserve(entry.target); }
      }
    });
  }, { rootMargin: "500px" }); // pre-load 500px ahead
  io._callbacks = callbacks;
  return io;
})();

function observeImg(el, cb) {
  if (!imgObserver || !el) return;
  imgObserver._callbacks.set(el, cb);
  imgObserver.observe(el);
  return () => { imgObserver.unobserve(el); imgObserver._callbacks.delete(el); };
}

// ─── Lazy image (uses shared observer) ───────────────────────────
function LImg({ src, alt, style, eager }) {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!src || eager) return;
    const el = ref.current;
    if (!el) return;
    return observeImg(el, () => { el.src = src; });
  }, [src, eager]);

  if (!src) return null;
  return (
    <img
      ref={ref}
      src={eager ? src : undefined}
      alt={alt || ""}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      style={{ ...style, opacity: loaded ? 1 : 0, transition: "opacity .3s" }}
      onLoad={() => setLoaded(true)}
      onError={() => setLoaded(true)}
    />
  );
}

// ─── CSS hover via className (avoids 900 useState hooks) ─────────
const cardCss = `
  .hcard { flex-shrink:0; width:155px; cursor:pointer; transition:transform .3s cubic-bezier(.34,1.56,.64,1); }
  .hcard:hover { transform:translateY(-8px) scale(1.03); }
  .hcard:hover .hcard-img { box-shadow:0 22px 52px rgba(0,0,0,.75); border-color:rgba(201,151,58,.5); }
  .hcard:hover .hcard-grad { opacity:1; }
  .hcard:hover .hcard-play { opacity:1; }
  .hcard:hover .hcard-title { color:var(--gold); }
  .hcard-img { position:relative; border-radius:10px; overflow:hidden; aspect-ratio:2/3; background:var(--bg3);
    box-shadow:0 4px 16px rgba(0,0,0,.4); border:1px solid rgba(255,255,255,.06);
    transition:box-shadow .3s,border .3s; }
  .hcard-grad { position:absolute; inset:0; background:linear-gradient(to top,rgba(0,0,0,.88) 0%,rgba(0,0,0,.1) 55%,transparent 100%); opacity:.5; transition:opacity .3s; }
  .hcard-play { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; opacity:0; transition:opacity .2s; }
  .hcard-title { margin:0; font-weight:700; font-size:.8rem; line-height:1.3; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text); transition:color .2s; }
  .tcard { flex-shrink:0; width:272px; cursor:pointer; transition:transform .25s; }
  .tcard:hover { transform:translateY(-5px); }
  .tcard:hover .tcard-img { box-shadow:0 18px 44px rgba(0,0,0,.65); border-color:rgba(220,50,50,.4); }
  .tcard:hover .tcard-play { background:rgba(220,30,30,.9); }
  .tcard:hover .tcard-title { color:var(--gold); }
  .tcard-img { position:relative; border-radius:10px; overflow:hidden; aspect-ratio:16/9; background:var(--bg3);
    box-shadow:0 4px 14px rgba(0,0,0,.35); border:1px solid rgba(255,255,255,.06); transition:box-shadow .25s,border .25s; }
  .tcard-play { width:46px; height:46px; border-radius:50%; background:rgba(0,0,0,.6); border:2px solid rgba(255,255,255,.7);
    display:flex; align-items:center; justify-content:center; padding-left:4px; font-size:1.15rem; transition:background .2s; }
  .tcard-title { margin:0; font-weight:700; font-size:.82rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text); transition:color .2s; }
  .scard { flex-shrink:0; width:155px; cursor:pointer; transition:transform .25s; }
  .scard:hover { transform:translateY(-5px); }
  .scard:hover .scard-img { box-shadow:0 14px 36px rgba(0,0,0,.6); border-color:rgba(201,151,58,.4); }
  .scard:hover .scard-title { color:var(--gold); }
  .scard-img { position:relative; border-radius:10px; overflow:hidden; aspect-ratio:1/1; background:var(--bg3);
    box-shadow:0 4px 12px rgba(0,0,0,.35); border:1px solid rgba(255,255,255,.06); transition:box-shadow .25s,border .25s; }
  .scard-title { margin:0; font-weight:700; font-size:.78rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text); transition:color .2s; }
  .ncard { flex-shrink:0; width:255px; cursor:pointer; background:var(--bg2); border-radius:10px; overflow:hidden;
    border:1px solid var(--border); transition:all .2s; }
  .ncard:hover { transform:translateY(-4px); box-shadow:0 12px 32px rgba(0,0,0,.45); border-color:rgba(201,151,58,.35); }
  .ncard:hover .ncard-img img { transform:scale(1.06); }
  .ncard-img { height:136px; overflow:hidden; background:var(--bg3); }
  .ncard-img img { width:100%; height:100%; object-fit:cover; display:block; transition:transform .35s; }
`;

// ─── Movie Card (no useState — uses CSS) ─────────────────────────
const MovieCard = React.memo(function MovieCard({ movie, onClick }) {
  const v = movie.verdict || "Upcoming";
  const c = VS[v] || "#7aaae8";
  const img = movie.posterUrl || movie.thumbnailUrl || ytThumb(movie.media?.trailer?.ytId);
  return (
    <div className="hcard" onClick={onClick}>
      <div className="hcard-img">
        {img
          ? <LImg src={img} alt={movie.title} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"top",display:"block"}} />
          : <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2.5rem"}}>🎬</div>}
        <div className="hcard-grad" />
        <div style={{position:"absolute",top:8,left:8,background:`${c}20`,border:`1px solid ${c}88`,color:c,
          fontSize:".57rem",fontWeight:800,padding:"2px 6px",borderRadius:3,letterSpacing:".07em",textTransform:"uppercase"}}>{v}</div>
        {movie.genre?.[0] && <div style={{position:"absolute",bottom:8,left:8,fontSize:".58rem",color:"rgba(255,255,255,.65)",fontWeight:600}}>{movie.genre[0]}</div>}
        <div className="hcard-play">
          <div style={{width:40,height:40,borderRadius:"50%",background:"rgba(201,151,58,.9)",display:"flex",alignItems:"center",justifyContent:"center",paddingLeft:3}}>▶</div>
        </div>
      </div>
      <div style={{padding:"9px 2px 0"}}>
        <p className="hcard-title">{movie.title}</p>
        <p style={{margin:"3px 0 0",fontSize:".67rem",color:"var(--muted)"}}>{movie.releaseDate?.slice(0,4)||"TBA"}</p>
      </div>
    </div>
  );
});

// ─── Trailer Card ─────────────────────────────────────────────────
const TrailerCard = React.memo(function TrailerCard({ movie, onClick }) {
  const thumb = ytThumb(movie.media?.trailer?.ytId);
  return (
    <div className="tcard" onClick={onClick}>
      <div className="tcard-img">
        {thumb && <LImg src={thumb} alt={movie.title} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} />}
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.25)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div className="tcard-play">▶</div>
        </div>
        <div style={{position:"absolute",bottom:8,right:8,background:"rgba(0,0,0,.75)",color:"#fff",fontSize:".58rem",fontWeight:700,padding:"2px 6px",borderRadius:3}}>TRAILER</div>
      </div>
      <div style={{padding:"9px 2px 0"}}>
        <p className="tcard-title">{movie.title}</p>
        {movie.releaseDate && <p style={{margin:"3px 0 0",fontSize:".67rem",color:"var(--muted)"}}>{fmtDate(movie.releaseDate)}</p>}
      </div>
    </div>
  );
});

// ─── Song Card ────────────────────────────────────────────────────
const SongCard = React.memo(function SongCard({ s, onClick }) {
  const thumb = s.thumbnailUrl || ytThumb(s.ytId) || s.posterUrl;
  return (
    <div className="scard" onClick={onClick}>
      <div className="scard-img">
        {thumb && <LImg src={thumb} alt={s.title} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} />}
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.2)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{width:36,height:36,borderRadius:"50%",background:"rgba(201,151,58,.85)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem"}}>♪</div>
        </div>
      </div>
      <div style={{padding:"9px 2px 0"}}>
        <p className="scard-title">{s.title}</p>
        {s.singer && <p style={{margin:"2px 0 0",fontSize:".63rem",color:"var(--muted)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>🎤 {s.singer}</p>}
        <p style={{margin:"1px 0 0",fontSize:".62rem",color:"rgba(255,255,255,.3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.movieTitle}</p>
      </div>
    </div>
  );
});

// ─── News Card ────────────────────────────────────────────────────
const NewsCard = React.memo(function NewsCard({ n, onClick }) {
  return (
    <div className="ncard" onClick={onClick}>
      {n.imageUrl && (
        <div className="ncard-img">
          <LImg src={n.imageUrl} alt={n.title} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} />
        </div>
      )}
      <div style={{padding:"12px 14px"}}>
        {n.category && <span style={{fontSize:".58rem",fontWeight:800,color:"var(--gold)",letterSpacing:".08em",textTransform:"uppercase"}}>{n.category}</span>}
        <p style={{margin:"5px 0 4px",fontWeight:700,fontSize:".8rem",lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{n.title}</p>
        {n.movieTitle && <p style={{margin:0,fontSize:".67rem",color:"var(--muted)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>🎬 {n.movieTitle}</p>}
      </div>
    </div>
  );
});

// ─── Row (virtualized — only renders visible + nearby children) ──
// Uses a sentinel div to detect when row scrolls into view before rendering cards
function Row({ title, badge, badgeColor="#c9973a", viewAll, children, gap=14 }) {
  const navigate = useNavigate();
  const rowRef   = useRef(null);
  const sentRef  = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sentRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); io.disconnect(); }
    }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const slide = n => rowRef.current?.scrollBy({ left: n, behavior: "smooth" });

  return (
    <section className="home-section" style={{ marginBottom: 0 }} ref={sentRef}>
      <div className="home-section-header">
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <h2 className="home-section-title">{title}</h2>
          {badge && <span style={{background:`${badgeColor}20`,border:`1px solid ${badgeColor}50`,color:badgeColor,
            fontSize:".58rem",fontWeight:800,padding:"2px 8px",borderRadius:3,letterSpacing:".08em",textTransform:"uppercase"}}>{badge}</span>}
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          {viewAll && <button className="home-view-all" onClick={()=>navigate(viewAll)}>View All</button>}
          <button className="home-arrow" onClick={()=>slide(-640)}>‹</button>
          <button className="home-arrow" onClick={()=>slide(640)}>›</button>
        </div>
      </div>
      <div ref={rowRef} className="home-row" style={{ gap }}>
        {/* Render skeleton placeholders until visible, then real cards */}
        {visible ? children : (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              flexShrink:0, width:155, aspectRatio:"2/3", borderRadius:10,
              background:"var(--bg3)", animation:`homepulse 1.5s ease-in-out ${i*0.1}s infinite`,
            }} />
          ))
        )}
      </div>
    </section>
  );
}

// ─── Hero Slide (unchanged) ───────────────────────────────────────
function HeroSlide({ movie, active, eager }) {
  const navigate = useNavigate();
  const img = heroImage(movie);
  return (
    <div className={`home-hero-slide ${active?"active":""}`} style={{ backgroundImage: img?`url(${img})`:"none" }}>
      <div className="home-hero-overlay" />
      <div className="home-hero-content">
        <div className="home-hero-meta">
          {movie.category && <span className="home-tag">{movie.category}</span>}
          {movie.genre?.[0] && <span className="home-tag-outline">{movie.genre[0]}</span>}
          {movie.language  && <span className="home-tag-outline">{movie.language}</span>}
        </div>
        <h1 className="home-hero-title">{movie.title}</h1>
        <div className="home-hero-info">
          {movie.releaseDate && <span>🗓 {new Date(movie.releaseDate).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}</span>}
          {movie.director && <span>Dir. {movie.director}</span>}
          {movie.verdict && movie.verdict!=="Upcoming" && <span className="home-hero-verdict-badge">{movie.verdict}</span>}
        </div>
        {movie.synopsis && <p className="home-hero-synopsis">{movie.synopsis.slice(0,160)}{movie.synopsis.length>160?"…":""}</p>}
        <div className="home-hero-actions">
          {movie.media?.trailer?.ytId && (
            <button className="btn-hero-play" onClick={()=>navigate(`/movie/${movie._id}`,{state:{scrollTo:"trailer"}})}>▶ Watch Trailer</button>
          )}
          <button className="btn-hero-info" onClick={()=>navigate(`/movie/${movie._id}`)}>More Info</button>
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton shimmer ─────────────────────────────────────────────
function HeroSkeleton() {
  return (
    <div style={{ minHeight: 480, background: "var(--bg2)",
      animation: "homepulse 1.5s ease-in-out infinite" }} />
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════
export default function Home({ production }) {
  const navigate  = useNavigate();

  // Phase 1: movies (critical path — show hero ASAP)
  const [movies,  setMovies]  = useState([]);
  const [moviesReady, setMoviesReady] = useState(false);

  // Phase 2: news (non-critical — load after movies)
  const [news,    setNews]    = useState([]);

  const [heroIdx, setHeroIdx] = useState(0);
  const timerRef = useRef(null);

  // PHASE 1 — load movies first, render immediately
  useEffect(() => {
    API.getMovies()
      .then(m => { setMovies(m); setMoviesReady(true); })
      .catch(() => setMoviesReady(true));
  }, []);

  // PHASE 2 — load news after movies are ready (deferred)
  useEffect(() => {
    if (!moviesReady) return;
    // Defer news to next idle period so hero renders first
    const id = requestIdleCallback
      ? requestIdleCallback(() => API.getNews().then(n => setNews(n.slice(0,12))).catch(()=>{}))
      : setTimeout(() => API.getNews().then(n => setNews(n.slice(0,12))).catch(()=>{}), 100);
    return () => (requestIdleCallback ? cancelIdleCallback(id) : clearTimeout(id));
  }, [moviesReady]);

  // Sort helper (stable, memoized)
  const srt = useCallback(arr => [...arr].sort((a,b) => {
    if (!a.releaseDate && !b.releaseDate) return 0;
    if (!a.releaseDate) return 1;
    if (!b.releaseDate) return -1;
    return new Date(b.releaseDate) - new Date(a.releaseDate);
  }), []);

  // Hero movies
  const heroMovies = useMemo(() => movies
    .filter(m => {
      const h = m.thumbnailUrl || m.media?.trailer?.ytId || m.posterUrl;
      if (!h) return false;
      if (!m.verdict || m.verdict === "Upcoming") return true;
      if (m.releaseDate && withinDays(m.releaseDate, 60, 0)) return true;
      return isThisMonth(m.releaseDate) || isLastMonth(m.releaseDate);
    })
    .sort((a,b) => new Date(b.releaseDate||0) - new Date(a.releaseDate||0))
    .slice(0, 8),
  [movies]);

  // Hero auto-advance
  useEffect(() => {
    if (!heroMovies.length) return;
    timerRef.current = setInterval(() => setHeroIdx(i => (i+1) % heroMovies.length), 5500);
    return () => clearInterval(timerRef.current);
  }, [heroMovies.length]);

  const goHero = i => { setHeroIdx(i); clearInterval(timerRef.current); };

  // All derived lists — computed from movies once
  const allMovies  = useMemo(() => srt(movies), [movies, srt]);

  // Each section sliced to prevent rendering hundreds of cards
  const MAX = 20; // max cards per section

  const thisWeek   = useMemo(() => srt(movies.filter(m => isThisWeek(m.releaseDate) && !m.releaseTBA)).slice(0,MAX), [movies,srt]);
  const thisMonth  = useMemo(() => srt(movies.filter(m => isThisMonth(m.releaseDate))).slice(0,MAX), [movies,srt]);
  const lastWeek   = useMemo(() => srt(movies.filter(m => isLastWeek(m.releaseDate) && !isThisWeek(m.releaseDate))).slice(0,MAX), [movies,srt]);
  const lastMonth  = useMemo(() => srt(movies.filter(m => isLastMonth(m.releaseDate))).slice(0,MAX), [movies,srt]);
  const inTheatres = useMemo(() => srt(movies.filter(m => m.releaseDate && withinDays(m.releaseDate,10,10))).slice(0,MAX), [movies,srt]);
  const upcoming   = useMemo(() => srt(movies.filter(m => !m.verdict || m.verdict==="Upcoming")).slice(0,MAX), [movies,srt]);
  const highRated  = useMemo(() => movies
    .filter(m => m.reviews?.length>=1 && m.releaseDate && new Date(m.releaseDate)>=RECENT_CUTOFF)
    .map(m => ({ ...m, avg: m.reviews.reduce((s,r) => s+(r.rating||0), 0) / m.reviews.length }))
    .filter(m => m.avg>=3.5)
    .sort((a,b) => b.avg-a.avg)
    .slice(0,MAX),
  [movies]);
  const withTrailer = useMemo(() => allMovies.filter(m => m.media?.trailer?.ytId).slice(0,15), [allMovies]);

  // All films limited to 40 in the row (link to /movies for rest)
  const allFilmsRow = useMemo(() => allMovies.slice(0, 40), [allMovies]);

  const trendingSongs = useMemo(() => {
    const songs = [];
    allMovies
      .filter(m => (!m.verdict || m.verdict==="Upcoming") || withinDays(m.releaseDate,90,60))
      .forEach(m => (m.media?.songs||[]).forEach((s,idx) => {
        if (s.ytId) songs.push({ ...s, songIndex:idx, movieTitle:m.title, movieId:m._id, posterUrl:m.posterUrl });
      }));
    if (songs.length < 6) {
      allMovies.forEach(m => (m.media?.songs||[]).forEach((s,idx) => {
        if (s.ytId && !songs.find(t => t.movieId===m._id && t.songIndex===idx))
          songs.push({ ...s, songIndex:idx, movieTitle:m.title, movieId:m._id, posterUrl:m.posterUrl });
      }));
    }
    return songs.slice(0, 15);
  }, [allMovies]);

  // Show hero skeleton until movies load
  if (!moviesReady) return (
    <>
      <style>{`@keyframes homepulse{0%,100%{opacity:1}50%{opacity:.35}}${cardCss}`}</style>
      <HeroSkeleton />
    </>
  );

  return (
    <div className="home-root">
      <SEO {...homeSEO()} />
      <style>{`@keyframes homepulse{0%,100%{opacity:1}50%{opacity:.35}}${cardCss}`}</style>

      {/* ══ HERO ══ */}
      {heroMovies.length > 0 && (
        <div className="home-hero">
          {heroMovies.map((m,i) => (
            // Only render active + adjacent slides (not all 8 at once)
            (i === heroIdx || i === (heroIdx+1)%heroMovies.length || i === (heroIdx-1+heroMovies.length)%heroMovies.length)
              ? <HeroSlide key={m._id} movie={m} active={i===heroIdx} eager={i===heroIdx} />
              : <div key={m._id} className={`home-hero-slide ${i===heroIdx?"active":""}`} />
          ))}
          <div className="home-hero-dots">
            {heroMovies.map((_,i) => (
              <button key={i} className={`home-hero-dot ${i===heroIdx?"active":""}`} onClick={()=>goHero(i)} />
            ))}
          </div>
          <div className="home-hero-strip">
            {heroMovies.map((m,i) => {
              const img = heroImage(m);
              return (
                <div key={m._id} className={`home-hero-strip-item ${i===heroIdx?"active":""}`} onClick={()=>goHero(i)}>
                  {img ? <img src={img} alt={m.title} loading="lazy" decoding="async" onError={e=>e.target.style.display="none"} /> : <div className="home-strip-fallback">🎬</div>}
                  {m.media?.trailer?.ytId && <div className="home-strip-play">▶</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {production && (
        <div className="home-cta-bar">
          <span>Welcome back, <strong>{production.name}</strong></span>
          <button className="btn btn-gold btn-sm" onClick={()=>navigate("/dashboard/add-movie")}>+ Add Movie</button>
        </div>
      )}

      {/* ══ SECTIONS — rows virtualize themselves ══ */}
      <div className="home-sections">

        {thisWeek.length>0   && <Row title="🔥 Releasing This Week" badge="New" badgeColor="#e59595">{thisWeek.map(m=><MovieCard key={m._id} movie={m} onClick={()=>navigate(`/movie/${m._id}`)}/>)}</Row>}
        {thisMonth.length>0  && <Row title="🗓 This Month" badge="New">{thisMonth.map(m=><MovieCard key={m._id} movie={m} onClick={()=>navigate(`/movie/${m._id}`)}/>)}</Row>}
        {inTheatres.length>0 && <Row title="🎭 Now in Theatres" badge="Live" badgeColor="#95e5b8">{inTheatres.map(m=><MovieCard key={m._id} movie={m} onClick={()=>navigate(`/movie/${m._id}`)}/>)}</Row>}
        {lastWeek.length>0   && <Row title="📅 Last Week">{lastWeek.map(m=><MovieCard key={m._id} movie={m} onClick={()=>navigate(`/movie/${m._id}`)}/>)}</Row>}
        {lastMonth.length>0  && <Row title="📆 Last Month">{lastMonth.map(m=><MovieCard key={m._id} movie={m} onClick={()=>navigate(`/movie/${m._id}`)}/>)}</Row>}

        {withTrailer.length>0 && (
          <Row title="🎬 Latest Trailers" gap={16}>
            {withTrailer.map(m=><TrailerCard key={m._id} movie={m} onClick={()=>navigate(`/movie/${m._id}`,{state:{scrollTo:"trailer"}})}/>)}
          </Row>
        )}

        {/* News deferred — shows empty row with skeleton until loaded */}
        {news.length>0 && (
          <Row title="📰 Latest News" viewAll="/news" gap={14}>
            {news.map(n=><NewsCard key={n._id} n={n} onClick={()=>navigate(`/news/${n._id}`)}/>)}
          </Row>
        )}

        {trendingSongs.length>0 && (
          <Row title="🎵 Trending Songs" viewAll="/songs" gap={14}>
            {trendingSongs.map((s,i)=><SongCard key={i} s={s} onClick={()=>navigate(`/song/${s.movieId}/${s.songIndex}`)}/>)}
          </Row>
        )}

        {highRated.length>0 && <Row title="⭐ Top Rated" badge="Critic Pick" badgeColor="#e8c87a">{highRated.map(m=><MovieCard key={m._id} movie={m} onClick={()=>navigate(`/movie/${m._id}`)}/>)}</Row>}
        {upcoming.length>0  && <Row title="🚀 Upcoming" viewAll="/movies">{upcoming.map(m=><MovieCard key={m._id} movie={m} onClick={()=>navigate(`/movie/${m._id}`)}/>)}</Row>}

        <Row title="🎬 All Films" viewAll="/movies">
          {allFilmsRow.map(m=><MovieCard key={m._id} movie={m} onClick={()=>navigate(`/movie/${m._id}`)}/>)}
        </Row>

        {movies.length===0 && (
          <div className="home-empty">
            <div style={{fontSize:"4rem",marginBottom:16}}>🎬</div>
            <h2>No movies yet</h2>
            <p style={{color:"var(--muted)"}}>Be the first to add a film to Ollipedia</p>
            {production && <button className="btn btn-gold" onClick={()=>navigate("/dashboard/add-movie")}>+ Add Movie</button>}
          </div>
        )}
      </div>
    </div>
  );
}