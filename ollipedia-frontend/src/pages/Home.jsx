import SEO, { homeSEO } from "../components/SEO";
import { moviePath } from "../utils/slugs";
import React, {
  useEffect, useState, useRef, useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../api/api";

// ─── Helpers ──────────────────────────────────────────────────────
const extractYtId = input => {
  if (!input) return null;
  const s = String(input).trim();
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : (/^[A-Za-z0-9_-]{11}$/.test(s) ? s : null);
};
// mqdefault (320×180) — smallest thumbnail that still looks good
const ytThumb   = id => { const i = extractYtId(id); return i ? `https://img.youtube.com/vi/${i}/mqdefault.jpg` : null; };
const heroImage = m  => m.thumbnailUrl || ytThumb(m.media?.trailer?.ytId) || m.posterUrl || null;
const fmtDate   = d  => d ? new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "";

// Date helpers — computed once at module level (not per render)
const _now = new Date();
const RECENT_CUTOFF = new Date(_now.getFullYear()-3, _now.getMonth(), _now.getDate());
const withinDays = (d,p,f) => { if(!d) return false; const diff=(new Date(d)-_now)/86400000; return diff>=-p&&diff<=f; };
const isThisWeek  = d => withinDays(d,7,14);
const isThisMonth = d => { if(!d) return false; const dt=new Date(d); return dt.getMonth()===_now.getMonth()&&dt.getFullYear()===_now.getFullYear(); };
const isLastMonth = d => { if(!d) return false; const dt=new Date(d); const lm=new Date(_now.getFullYear(),_now.getMonth()-1,1); return dt.getMonth()===lm.getMonth()&&dt.getFullYear()===lm.getFullYear(); };
const isLastWeek  = d => withinDays(d,14,0);

// Verdict colours
const VS = {
  "Blockbuster":"#95e5b8","Super Hit":"#95e5b8","Hit":"#a3e8a0",
  "Average":"#e8c87a","Flop":"#e59595","Disaster":"#e59595","Upcoming":"#7aaae8",
};

// ─── ONE shared IntersectionObserver for ALL images ───────────────
// Avoids creating hundreds of individual observers
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
  }, { rootMargin: "400px" }); // pre-load 400px ahead of viewport
  io._callbacks = callbacks;
  return io;
})();

function observeImg(el, cb) {
  if (!imgObserver || !el) return;
  imgObserver._callbacks.set(el, cb);
  imgObserver.observe(el);
  return () => { imgObserver.unobserve(el); imgObserver._callbacks.delete(el); };
}

// ─── Lazy image — uses shared observer ───────────────────────────
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

// ─── CSS-only hover — zero per-card useState hooks ────────────────
const cardCss = `
  .hcard{flex-shrink:0;width:150px;cursor:pointer;transition:transform .28s cubic-bezier(.34,1.56,.64,1);contain:layout style;}
  .hcard:hover{transform:translateY(-8px) scale(1.03);}
  .hcard:hover .hcard-img{box-shadow:0 22px 52px rgba(0,0,0,.75);border-color:rgba(201,151,58,.5);}
  .hcard:hover .hcard-grad{opacity:1;}
  .hcard:hover .hcard-play{opacity:1;}
  .hcard:hover .hcard-title{color:var(--gold);}
  .hcard-img{position:relative;border-radius:10px;overflow:hidden;aspect-ratio:2/3;background:var(--bg3);
    box-shadow:0 4px 16px rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.06);transition:box-shadow .3s,border .3s;}
  .hcard-grad{position:absolute;inset:0;background:linear-gradient(to top,rgba(0,0,0,.88) 0%,rgba(0,0,0,.1) 55%,transparent 100%);opacity:.5;transition:opacity .3s;}
  .hcard-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s;}
  .hcard-title{margin:0;font-weight:700;font-size:.8rem;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text);transition:color .2s;}
  .tcard{flex-shrink:0;width:265px;cursor:pointer;transition:transform .25s;contain:layout style;}
  .tcard:hover{transform:translateY(-5px);}
  .tcard:hover .tcard-img{box-shadow:0 18px 44px rgba(0,0,0,.65);border-color:rgba(220,50,50,.4);}
  .tcard:hover .tcard-play{background:rgba(220,30,30,.9);}
  .tcard:hover .tcard-title{color:var(--gold);}
  .tcard-img{position:relative;border-radius:10px;overflow:hidden;aspect-ratio:16/9;background:var(--bg3);
    box-shadow:0 4px 14px rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.06);transition:box-shadow .25s,border .25s;}
  .tcard-play{width:46px;height:46px;border-radius:50%;background:rgba(0,0,0,.6);border:2px solid rgba(255,255,255,.7);
    display:flex;align-items:center;justify-content:center;padding-left:4px;font-size:1.15rem;transition:background .2s;}
  .tcard-title{margin:0;font-weight:700;font-size:.82rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text);transition:color .2s;}
  .scard{flex-shrink:0;width:150px;cursor:pointer;transition:transform .25s;contain:layout style;}
  .scard:hover{transform:translateY(-5px);}
  .scard:hover .scard-img{box-shadow:0 14px 36px rgba(0,0,0,.6);border-color:rgba(201,151,58,.4);}
  .scard:hover .scard-title{color:var(--gold);}
  .scard-img{position:relative;border-radius:10px;overflow:hidden;aspect-ratio:1/1;background:var(--bg3);
    box-shadow:0 4px 12px rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.06);transition:box-shadow .25s,border .25s;}
  .scard-title{margin:0;font-weight:700;font-size:.78rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text);transition:color .2s;}
  .ncard{flex-shrink:0;width:250px;cursor:pointer;background:var(--bg2);border-radius:10px;overflow:hidden;
    border:1px solid var(--border);transition:all .2s;contain:layout style;}
  .ncard:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(0,0,0,.45);border-color:rgba(201,151,58,.35);}
  .ncard:hover .ncard-img img{transform:scale(1.06);}
  .ncard-img{height:130px;overflow:hidden;background:var(--bg3);}
  .ncard-img img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .35s;}
`;

// ─── Movie Card ───────────────────────────────────────────────────
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

// ─── Skeleton placeholder card ────────────────────────────────────
function CardSkeleton({ ratio = "2/3", width = 150 }) {
  return (
    <div style={{
      flexShrink: 0, width, aspectRatio: ratio, borderRadius: 10,
      background: "var(--bg3)", animation: "homepulse 1.5s ease-in-out infinite",
    }} />
  );
}

// ─── Row ──────────────────────────────────────────────────────────
// Props:
//   loading     — show skeleton cards (data fetch in-flight)
//   sentinelRef — ref from useLazySection; Row attaches it to the
//                 section element so the IO fires before scroll arrival
//   hide        — completely unmount this row (empty data, not loading)
function Row({ title, badge, badgeColor = "#c9973a", viewAll, children,
               gap = 14, cardRatio, cardWidth,
               loading = false, sentinelRef = null, hide = false }) {
  const navigate = useNavigate();
  const rowRef   = useRef(null);
  const ownRef   = useRef(null);

  // For above-fold rows that don't use useLazySection, we still want
  // to skip rendering card children until the row is in view.
  const [ownVisible, setOwnVisible] = useState(!!sentinelRef);
  useEffect(() => {
    if (sentinelRef) return; // external hook manages visibility
    const el = ownRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setOwnVisible(true); io.disconnect(); }
    }, { rootMargin: "250px" });
    io.observe(el);
    return () => io.disconnect();
  }, [sentinelRef]);

  const slide = n => rowRef.current?.scrollBy({ left: n, behavior: "smooth" });
  const count = React.Children.count(children);

  if (hide) return null;

  const showSkeletons = loading || (!sentinelRef && !ownVisible);

  return (
    <section className="home-section" ref={sentinelRef || ownRef}>
      <div className="home-section-header">
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {loading
            ? <div style={{ width:160, height:18, borderRadius:4, background:"var(--bg3)", animation:"homepulse 1.5s ease-in-out infinite" }} />
            : <h2 className="home-section-title">{title}</h2>
          }
          {!loading && badge && (
            <span style={{
              background:`${badgeColor}20`,border:`1px solid ${badgeColor}50`,color:badgeColor,
              fontSize:".58rem",fontWeight:800,padding:"2px 8px",borderRadius:3,
              letterSpacing:".08em",textTransform:"uppercase",
            }}>{badge}</span>
          )}
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          {!loading && viewAll && <button className="home-view-all" onClick={()=>navigate(viewAll)}>View All</button>}
          <button className="home-arrow" onClick={()=>slide(-640)}>‹</button>
          <button className="home-arrow" onClick={()=>slide(640)}>›</button>
        </div>
      </div>
      <div ref={rowRef} className="home-row" style={{ gap }}>
        {showSkeletons
          ? Array.from({ length: Math.min(count || 8, 8) }).map((_, i) => (
              <CardSkeleton key={i} ratio={cardRatio} width={cardWidth} />
            ))
          : children}
      </div>
    </section>
  );
}

// ─── Hero CSS — 100% self-contained, zero external class deps ────
const heroCss = `
/* ── Outer wrapper — sits right below the fixed 58px navbar ── */
.hh-wrap {
  position: relative;
  width: 100%;
  background: #0a0a0a;
  overflow: hidden;
}

/* ── Each slide — all absolutely stacked, same size as wrapper ── */
.hh-slide {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center 25%;
  opacity: 0;
  transition: opacity .7s ease;
  pointer-events: none;
}
/* Active slide is relative — drives the wrapper's height */
.hh-slide.active {
  position: relative;
  opacity: 1;
  pointer-events: auto;
}

/* ── Inner — sets the height responsively, contains ALL overlays ── */
.hh-inner {
  position: relative;
  min-height: clamp(300px, 56vw, 580px);
  overflow: hidden;
}

/* ── Gradient overlay ── */
.hh-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to top,
      rgba(0,0,0,.96) 0%,
      rgba(0,0,0,.65) 35%,
      rgba(0,0,0,.15) 65%,
      transparent    100%
    ),
    linear-gradient(to right,
      rgba(0,0,0,.80) 0%,
      rgba(0,0,0,.40) 50%,
      transparent    80%
    );
}

/* ── Text content — bottom-left, above overlay ── */
.hh-content {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 16px 16px 52px;
  z-index: 3;
  max-width: 680px;
}
@media(min-width:480px)  { .hh-content { padding: 20px 24px 58px; } }
@media(min-width:768px)  { .hh-content { padding: 28px 36px 70px; } }
@media(min-width:1100px) { .hh-content { padding: 32px 52px 78px; } }

/* Tags row */
.hh-tags { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:9px; }
.hh-tag {
  font-size:.6rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em;
  padding:3px 9px; border-radius:20px;
  background:rgba(201,151,58,.18); border:1px solid rgba(201,151,58,.5); color:#c9973a;
}
.hh-tag-gl {
  font-size:.6rem; font-weight:600;
  padding:3px 9px; border-radius:20px;
  background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.22);
  color:rgba(255,255,255,.82);
}

/* Title */
.hh-title {
  font-family: 'Playfair Display', serif;
  font-size: clamp(1.4rem, 5.5vw, 3rem);
  font-weight: 900;
  line-height: 1.08;
  color: #fff;
  margin: 0 0 7px;
  text-shadow: 0 2px 20px rgba(0,0,0,.7);
}

/* Meta row — director / date / verdict */
.hh-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px 12px;
  margin-bottom: 8px;
  font-size: clamp(.68rem, 2vw, .79rem);
  color: rgba(255,255,255,.58);
}
.hh-badge {
  font-size: .58rem; font-weight: 800; text-transform: uppercase; letter-spacing: .07em;
  padding: 2px 9px; border-radius: 3px;
}

/* Synopsis — hidden on tiny screens, clamped on larger */
.hh-synopsis {
  font-size: clamp(.78rem, 2.2vw, .86rem);
  color: rgba(255,255,255,.62);
  line-height: 1.6;
  margin: 0 0 14px;
  display: none;
}
@media(min-width:420px) {
  .hh-synopsis {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}
@media(min-width:768px) { .hh-synopsis { -webkit-line-clamp: 3; } }

/* Buttons */
.hh-btns { display:flex; gap:8px; flex-wrap:wrap; }
.hh-btn-play {
  display: inline-flex; align-items: center; gap: 7px;
  background: #c9973a; color: #000; border: none;
  padding: clamp(9px,2vw,12px) clamp(14px,3vw,24px);
  border-radius: 8px;
  font-size: clamp(.76rem, 2vw, .88rem); font-weight: 800;
  cursor: pointer; transition: opacity .18s; white-space: nowrap;
}
.hh-btn-play:hover { opacity: .85; }
.hh-btn-info {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,.1); color: #f1f1f1;
  border: 1px solid rgba(255,255,255,.28);
  padding: clamp(9px,2vw,12px) clamp(12px,2.5vw,20px);
  border-radius: 8px;
  font-size: clamp(.74rem, 2vw, .86rem); font-weight: 600;
  cursor: pointer; transition: background .18s; white-space: nowrap;
  backdrop-filter: blur(6px);
}
.hh-btn-info:hover { background: rgba(255,255,255,.18); }

/* ── Dots — inside hh-inner, bottom-left ── */
.hh-dots {
  position: absolute;
  bottom: 16px; left: 16px;
  display: flex; gap: 6px; z-index: 4;
}
@media(min-width:480px)  { .hh-dots { bottom: 18px; left: 24px; } }
@media(min-width:768px)  { .hh-dots { bottom: 22px; left: 36px; } }
@media(min-width:1100px) { .hh-dots { left: 52px; } }
.hh-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: rgba(255,255,255,.3); border: none;
  cursor: pointer; padding: 0; transition: all .25s;
}
.hh-dot.active { width: 24px; border-radius: 4px; background: #c9973a; }

/* ── Thumbnail strip — inside hh-inner, bottom-right, desktop only ── */
.hh-strip {
  position: absolute;
  bottom: 14px; right: 16px;
  display: none;
  gap: 5px; z-index: 4;
}
@media(min-width:900px) { .hh-strip { display: flex; bottom: 18px; right: 24px; } }
.hh-strip-item {
  width: 72px; height: 48px;
  border-radius: 5px; overflow: hidden;
  cursor: pointer; flex-shrink: 0;
  border: 2px solid rgba(255,255,255,.15);
  background: #1c1c1c;
  position: relative; transition: border-color .2s;
}
.hh-strip-item.active { border-color: #c9973a; }
.hh-strip-item img { width:100%; height:100%; object-fit:cover; display:block; }
.hh-strip-play {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,.28); font-size: .55rem; color: #fff;
}

/* ── Skeleton ── */
.hh-skel {
  width: 100%;
  min-height: clamp(300px, 56vw, 580px);
  background: #141414;
  animation: homepulse 1.5s ease-in-out infinite;
}
`;

// ─── Hero Slide — dots and strip live inside so they're within hh-inner ──
function HeroSlide({ movie, active, dots, strip }) {
  const navigate = useNavigate();
  const img = heroImage(movie);
  const vc  = VS[movie.verdict] || "#7aaae8";

  return (
    <div
      className={`hh-slide${active ? " active" : ""}`}
      style={{ backgroundImage: img ? `url(${img})` : "none" }}
    >
      <div className="hh-inner">
        <div className="hh-overlay" />

        <div className="hh-content">
          {/* Category / genre / language tags */}
          <div className="hh-tags">
            {movie.category   && <span className="hh-tag">{movie.category}</span>}
            {movie.genre?.[0] && <span className="hh-tag-gl">{movie.genre[0]}</span>}
            {movie.language   && <span className="hh-tag-gl">{movie.language}</span>}
          </div>

          {/* Title */}
          <h2 className="hh-title">{movie.title}</h2>

          {/* Meta */}
          <div className="hh-meta">
            {movie.releaseDate && <span>🗓 {fmtDate(movie.releaseDate)}</span>}
            {movie.director   && <span>🎬 {movie.director}</span>}
            {movie.verdict && movie.verdict !== "Upcoming" && (
              <span className="hh-badge" style={{
                background:`${vc}22`, border:`1px solid ${vc}`, color:vc,
              }}>{movie.verdict}</span>
            )}
          </div>

          {/* Synopsis */}
          {movie.synopsis && (
            <p className="hh-synopsis">
              {movie.synopsis.slice(0, 180)}{movie.synopsis.length > 180 ? "…" : ""}
            </p>
          )}

          {/* Buttons */}
          <div className="hh-btns">
            {movie.media?.trailer?.ytId && (
              <button className="hh-btn-play"
                onClick={() => navigate(`/movie/${movie._id}`, { state:{ scrollTo:"trailer" } })}>
                ▶ Watch Trailer
              </button>
            )}
            <button className="hh-btn-info"
              onClick={() => navigate(moviePath(movie))}>
              More Info
            </button>
          </div>
        </div>

        {/* Dots — rendered only on active slide, positioned inside hh-inner */}
        {active && dots}

        {/* Thumbnail strip — rendered only on active slide */}
        {active && strip}
      </div>
    </div>
  );
}

// ─── Hero skeleton ────────────────────────────────────────────────
function HeroSkeleton() {
  return <div className="hh-skel" />;
}

// ═══════════════════════════════════════════════════════════════════
//  SHARED MOVIES PROMISE
//  API.getMovies() fires at most ONCE per CACHE_TTL window.
//  Every section fetcher awaits this same promise and filters
//  client-side — no duplicate network calls.
// ═══════════════════════════════════════════════════════════════════
const CACHE_TTL = 5 * 60 * 1000;
let _moviesPromise = null;
let _moviesTs      = 0;

function getMoviesOnce() {
  const now = Date.now();
  if (_moviesPromise && (now - _moviesTs) < CACHE_TTL) return _moviesPromise;
  _moviesTs      = now;
  _moviesPromise = API.getMovies().catch(() => []);
  return _moviesPromise;
}

// Per-section result cache — avoids re-filtering on back-navigation
const _sectionCache = {};
function getCached(key) {
  const hit = _sectionCache[key];
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;
  return null;
}
function setCached(key, data) {
  _sectionCache[key] = { data, ts: Date.now() };
}

// ─── useLazySection ──────────────────────────────────────────────
// Attaches an IntersectionObserver to `ref`. When the element enters
// the viewport (rootMargin: 300px ahead), calls `fetcher()` once and
// stores the result in state. A module-level cache key prevents
// redundant network calls on back-navigation.
//
// Returns { ref, data, loading }
// • data    — null until fetched, then the resolved value
// • loading — true while the fetch is in-flight
// ─────────────────────────────────────────────────────────────────
// useLazySection(cacheKey, fetcher, immediate)
// • immediate=true  → fires fetcher on mount (above-fold / hero)
// • immediate=false → fires when ref scrolls within 300 px (default)
function useLazySection(cacheKey, fetcher, immediate = false) {
  const ref        = useRef(null);
  const fetchedRef = useRef(false);
  const cached     = getCached(cacheKey);
  const [data,    setData]    = useState(cached);
  const [loading, setLoading] = useState(() => immediate && cached === null);

  useEffect(() => {
    if (getCached(cacheKey) !== null) {
      fetchedRef.current = true;
      setData(getCached(cacheKey));
      return;
    }
    const run = () => {
      if (fetchedRef.current) return;
      fetchedRef.current = true;
      setLoading(true);
      fetcher()
        .then(result => { setCached(cacheKey, result); setData(result); })
        .catch(() => setData([]))
        .finally(() => setLoading(false));
    };
    if (immediate) { run(); return; }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { io.disconnect(); run(); }
    }, { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return { ref, data, loading };
}

// ─── Sort helper (module-level, no hook needed) ───────────────────
const srtByDate = arr => [...arr].sort((a, b) => {
  if (!a.releaseDate && !b.releaseDate) return 0;
  if (!a.releaseDate) return 1;
  if (!b.releaseDate) return -1;
  return new Date(b.releaseDate) - new Date(a.releaseDate);
});

// ═══════════════════════════════════════════════════════════════════
//  MAIN HOME — scroll-triggered lazy loading
//
//  • ONE network call: API.getMovies() fires on mount (shared promise).
//  • Each section's useLazySection awaits that same promise and
//    filters client-side — zero duplicate requests.
//  • Sections the user never scrolls to are never filtered/rendered.
//  • Back-navigation is instant: _sectionCache holds filtered results.
// ═══════════════════════════════════════════════════════════════════
export default function Home({ production }) {
  const navigate  = useNavigate();
  const [heroIdx, setHeroIdx] = useState(0);
  const timerRef  = useRef(null);
  const MAX = 18;

  // ── ABOVE-FOLD: hero + thisWeek + thisMonth + inTheatres ─────────
  // Kicks off getMoviesOnce() immediately on mount. All other sections
  // await the same in-flight promise, so no extra network call happens.
  const aboveFold = useLazySection("aboveFold", () =>
    getMoviesOnce().then(all => all.filter(m => {
      const h = m.thumbnailUrl || m.media?.trailer?.ytId || m.posterUrl;
      if (!h) return false;
      if (!m.verdict || m.verdict === "Upcoming") return true;
      if (m.releaseDate && withinDays(m.releaseDate, 60, 14)) return true;
      return isThisMonth(m.releaseDate) || isLastMonth(m.releaseDate);
    })),
    true  // immediate — fires on mount, no scroll needed
  );

  const aboveMovies = aboveFold.data || [];

  const heroMovies = useMemo(() => aboveMovies
    .filter(m => {
      const h = m.thumbnailUrl || m.media?.trailer?.ytId || m.posterUrl;
      if (!h) return false;
      if (!m.verdict || m.verdict === "Upcoming") return true;
      if (m.releaseDate && withinDays(m.releaseDate, 60, 0)) return true;
      return isThisMonth(m.releaseDate) || isLastMonth(m.releaseDate);
    })
    .sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0))
    .slice(0, 8),
  [aboveMovies]);

  const thisWeek   = useMemo(() => srtByDate(aboveMovies.filter(m => isThisWeek(m.releaseDate) && !m.releaseTBA)).slice(0, MAX), [aboveMovies]);
  const thisMonth  = useMemo(() => srtByDate(aboveMovies.filter(m => isThisMonth(m.releaseDate))).slice(0, MAX),                  [aboveMovies]);
  const inTheatres = useMemo(() => srtByDate(aboveMovies.filter(m => m.releaseDate && withinDays(m.releaseDate, 10, 10))).slice(0, MAX), [aboveMovies]);

  // Hero auto-advance
  useEffect(() => {
    if (!heroMovies.length) return;
    timerRef.current = setInterval(() => setHeroIdx(i => (i + 1) % heroMovies.length), 5500);
    return () => clearInterval(timerRef.current);
  }, [heroMovies.length]);

  const goHero = i => { setHeroIdx(i); clearInterval(timerRef.current); };

  // ── BELOW-FOLD: each section fetches only when scrolled near ─────
  // getMoviesOnce() returns the cached promise — no new network call.

  const trailers = useLazySection("trailers", () =>
    getMoviesOnce().then(all =>
      all.filter(m => m.media?.trailer?.ytId).slice(0, 12)
    )
  );

  const lastWeekSec = useLazySection("lastWeek", () =>
    getMoviesOnce().then(all =>
      srtByDate(all.filter(m => isLastWeek(m.releaseDate) && !isThisWeek(m.releaseDate))).slice(0, MAX)
    )
  );

  const lastMonthSec = useLazySection("lastMonth", () =>
    getMoviesOnce().then(all =>
      srtByDate(all.filter(m => isLastMonth(m.releaseDate))).slice(0, MAX)
    )
  );

  const newsSec = useLazySection("news", () =>
    API.getNews().then(n => n.slice(0, 12)).catch(() => [])
  );

  const songsSec = useLazySection("songs", () =>
    getMoviesOnce().then(allMovies => {
      const songs = [];
      allMovies
        .filter(m => (!m.verdict || m.verdict === "Upcoming") || withinDays(m.releaseDate, 90, 60))
        .forEach(m => (m.media?.songs || []).forEach((s, idx) => {
          if (s.ytId) songs.push({ ...s, songIndex: idx, movieTitle: m.title, movieId: m._id, posterUrl: m.posterUrl });
        }));
      if (songs.length < 6) {
        allMovies.forEach(m => (m.media?.songs || []).forEach((s, idx) => {
          if (s.ytId && !songs.find(t => t.movieId === m._id && t.songIndex === idx))
            songs.push({ ...s, songIndex: idx, movieTitle: m.title, movieId: m._id, posterUrl: m.posterUrl });
        }));
      }
      return songs.slice(0, 12);
    })
  );

  const topRatedSec = useLazySection("topRated", () =>
    getMoviesOnce().then(all =>
      all
        .filter(m => m.reviews?.length >= 1 && m.releaseDate && new Date(m.releaseDate) >= RECENT_CUTOFF)
        .map(m => ({ ...m, avg: m.reviews.reduce((s, r) => s + (r.rating || 0), 0) / m.reviews.length }))
        .filter(m => m.avg >= 3.5)
        .sort((a, b) => b.avg - a.avg)
        .slice(0, MAX)
    )
  );

  const upcomingSec = useLazySection("upcoming", () =>
    getMoviesOnce().then(all =>
      srtByDate(all.filter(m => !m.verdict || m.verdict === "Upcoming")).slice(0, MAX)
    )
  );

  const allFilmsSec = useLazySection("allFilms", () =>
    getMoviesOnce().then(all => srtByDate(all).slice(0, 30))
  );

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="home-root">
      <SEO {...homeSEO()} />
      <style>{`@keyframes homepulse{0%,100%{opacity:1}50%{opacity:.35}}${cardCss}${heroCss}`}</style>

      {/* ══ HERO ══ */}
      {aboveFold.loading
        ? <HeroSkeleton />
        : heroMovies.length > 0 && (
          <div className="hh-wrap">
            {heroMovies.map((m, i) => {
              const isAdjacentOrActive =
                i === heroIdx ||
                i === (heroIdx + 1) % heroMovies.length ||
                i === (heroIdx - 1 + heroMovies.length) % heroMovies.length;

              const dotsEl = (
                <div className="hh-dots">
                  {heroMovies.map((_, di) => (
                    <button key={di}
                      className={`hh-dot${di === heroIdx ? " active" : ""}`}
                      onClick={() => goHero(di)} />
                  ))}
                </div>
              );

              const stripEl = (
                <div className="hh-strip">
                  {heroMovies.map((sm, si) => {
                    const simg = heroImage(sm);
                    return (
                      <div key={sm._id}
                        className={`hh-strip-item${si === heroIdx ? " active" : ""}`}
                        onClick={() => goHero(si)}>
                        {simg
                          ? <img src={simg} alt={sm.title} loading="lazy" decoding="async"
                              onError={e => e.target.style.display="none"} />
                          : <div style={{ width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".9rem" }}>🎬</div>}
                        {sm.media?.trailer?.ytId && <div className="hh-strip-play">▶</div>}
                      </div>
                    );
                  })}
                </div>
              );

              return isAdjacentOrActive
                ? <HeroSlide key={m._id} movie={m} active={i === heroIdx} dots={dotsEl} strip={stripEl} />
                : <div key={m._id} className="hh-slide" />;
            })}
          </div>
        )
      }

      {production && (
        <div className="home-cta-bar">
          <span>Welcome back, <strong>{production.name}</strong></span>
          <button className="btn btn-gold btn-sm" onClick={() => navigate("/dashboard/add-movie")}>+ Add Movie</button>
        </div>
      )}

      <div className="home-sections">

        {/* Above-fold rows — from the same aboveFold fetch */}
        {(aboveFold.loading || thisWeek.length > 0) && (
          <Row title="🔥 Releasing This Week" badge="New" badgeColor="#e59595" loading={aboveFold.loading}>
            {thisWeek.map(m => <MovieCard key={m._id} movie={m} onClick={() => navigate(moviePath(m))} />)}
          </Row>
        )}
        {(aboveFold.loading || thisMonth.length > 0) && (
          <Row title="🗓 This Month" badge="New" loading={aboveFold.loading}>
            {thisMonth.map(m => <MovieCard key={m._id} movie={m} onClick={() => navigate(moviePath(m))} />)}
          </Row>
        )}
        {(aboveFold.loading || inTheatres.length > 0) && (
          <Row title="🎭 Now in Theatres" badge="Live" badgeColor="#95e5b8" loading={aboveFold.loading}>
            {inTheatres.map(m => <MovieCard key={m._id} movie={m} onClick={() => navigate(moviePath(m))} />)}
          </Row>
        )}

        {/* Below-fold rows — each lazy-fetches when scrolled near */}
        <Row title="🎬 Latest Trailers" gap={16} cardRatio="16/9" cardWidth={265}
             sentinelRef={trailers.ref} loading={trailers.loading}>
          {(trailers.data || []).map(m =>
            <TrailerCard key={m._id} movie={m}
              onClick={() => navigate(`/movie/${m._id}`, { state:{ scrollTo:"trailer" } })} />
          )}
        </Row>

        <Row title="📅 Last Week" sentinelRef={lastWeekSec.ref} loading={lastWeekSec.loading}
             hide={!lastWeekSec.loading && !(lastWeekSec.data?.length)}>
          {(lastWeekSec.data || []).map(m =>
            <MovieCard key={m._id} movie={m} onClick={() => navigate(moviePath(m))} />
          )}
        </Row>

        <Row title="📆 Last Month" sentinelRef={lastMonthSec.ref} loading={lastMonthSec.loading}
             hide={!lastMonthSec.loading && !(lastMonthSec.data?.length)}>
          {(lastMonthSec.data || []).map(m =>
            <MovieCard key={m._id} movie={m} onClick={() => navigate(moviePath(m))} />
          )}
        </Row>

        <Row title="📰 Latest News" viewAll="/news" gap={14} cardRatio="136/250" cardWidth={250}
             sentinelRef={newsSec.ref} loading={newsSec.loading}>
          {(newsSec.data || []).map(n =>
            <NewsCard key={n._id} n={n} onClick={() => navigate(`/news/${n._id}`)} />
          )}
        </Row>

        <Row title="🎵 Trending Songs" viewAll="/songs" gap={14} cardRatio="1/1" cardWidth={150}
             sentinelRef={songsSec.ref} loading={songsSec.loading}>
          {(songsSec.data || []).map((s, i) =>
            <SongCard key={i} s={s}
              onClick={() => navigate(
                s._movieSlug
                  ? s._movieSlug.replace("/movie/", "/song/") + "/" + s.songIndex
                  : `/song/${s.movieId}/${s.songIndex}`
              )} />
          )}
        </Row>

        <Row title="⭐ Top Rated" badge="Critic Pick" badgeColor="#e8c87a"
             sentinelRef={topRatedSec.ref} loading={topRatedSec.loading}
             hide={!topRatedSec.loading && !(topRatedSec.data?.length)}>
          {(topRatedSec.data || []).map(m =>
            <MovieCard key={m._id} movie={m} onClick={() => navigate(moviePath(m))} />
          )}
        </Row>

        <Row title="🚀 Upcoming" viewAll="/movies"
             sentinelRef={upcomingSec.ref} loading={upcomingSec.loading}
             hide={!upcomingSec.loading && !(upcomingSec.data?.length)}>
          {(upcomingSec.data || []).map(m =>
            <MovieCard key={m._id} movie={m} onClick={() => navigate(moviePath(m))} />
          )}
        </Row>

        <Row title="🎬 All Films" viewAll="/movies"
             sentinelRef={allFilmsSec.ref} loading={allFilmsSec.loading}>
          {(allFilmsSec.data || []).map(m =>
            <MovieCard key={m._id} movie={m} onClick={() => navigate(moviePath(m))} />
          )}
        </Row>

        {!aboveFold.loading && aboveMovies.length === 0 && (
          <div className="home-empty">
            <div style={{ fontSize: "4rem", marginBottom: 16 }}>🎬</div>
            <h2>No movies yet</h2>
            <p style={{ color: "var(--muted)" }}>Be the first to add a film to Ollipedia</p>
            {production && (
              <button className="btn btn-gold" onClick={() => navigate("/dashboard/add-movie")}>+ Add Movie</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}