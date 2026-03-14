import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../api/api";

/* ─── Unchanged helpers ─────────────────────────────────── */
const extractYtId = (input) => {
  if (!input) return null;
  const s = String(input).trim();
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return null;
};
const ytThumb  = id => { const i = extractYtId(id); return i ? `https://img.youtube.com/vi/${i}/hqdefault.jpg` : null; };
const heroImage = m => m.thumbnailUrl || ytThumb(m.media?.trailer?.ytId) || m.posterUrl || null;
const fmtDate   = d => d ? new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "";
const now = new Date();
const RECENT_CUTOFF = new Date(now.getFullYear()-3,now.getMonth(),now.getDate());
const withinDays = (d,p,f) => { if(!d) return false; const diff=(new Date(d)-now)/86400000; return diff>=-p&&diff<=f; };
const isThisWeek  = d => withinDays(d,7,14);
const isThisMonth = d => { if(!d) return false; const dt=new Date(d); return dt.getMonth()===now.getMonth()&&dt.getFullYear()===now.getFullYear(); };
const isLastMonth = d => { if(!d) return false; const dt=new Date(d); const lm=new Date(now.getFullYear(),now.getMonth()-1,1); return dt.getMonth()===lm.getMonth()&&dt.getFullYear()===lm.getFullYear(); };
const isLastWeek  = d => withinDays(d,14,0);

const VS = {
  "Blockbuster":{ c:"#95e5b8" },"Super Hit":{ c:"#95e5b8" },"Hit":{ c:"#a3e8a0" },
  "Average":{ c:"#e8c87a" },"Flop":{ c:"#e59595" },"Disaster":{ c:"#e59595" },"Upcoming":{ c:"#7aaae8" },
};

/* ─── HERO SLIDE — 100% UNCHANGED ──────────────────────── */
function HeroSlide({ movie, active }) {
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
            <button className="btn-hero-play" onClick={() => navigate(`/movie/${movie._id}`,{state:{scrollTo:"trailer"}})}>▶ Watch Trailer</button>
          )}
          <button className="btn-hero-info" onClick={() => navigate(`/movie/${movie._id}`)}>More Info</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Lazy image ────────────────────────────────────────── */
function LImg({ src, alt, style }) {
  const [ok, setOk] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!src) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { ref.current?.setAttribute("src", src); io.disconnect(); }
    },{ rootMargin:"400px" });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  },[src]);
  return <img ref={ref} alt={alt||""} style={{...style, opacity:ok?1:0, transition:"opacity .4s"}} onLoad={()=>setOk(true)} onError={()=>setOk(true)} />;
}

/* ─── Movie Card ────────────────────────────────────────── */
const MovieCard = React.memo(({ movie, onClick }) => {
  const [hov, setHov] = useState(false);
  const v = movie.verdict||"Upcoming"; const c = VS[v]?.c||"#7aaae8";
  const img = movie.posterUrl || movie.thumbnailUrl || ytThumb(movie.media?.trailer?.ytId);
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ flexShrink:0, width:155, cursor:"pointer",
        transform:hov?"translateY(-8px) scale(1.03)":"none",
        transition:"transform .3s cubic-bezier(.34,1.56,.64,1)" }}>
      <div style={{ position:"relative", borderRadius:10, overflow:"hidden", aspectRatio:"2/3", background:"var(--bg3)",
        boxShadow:hov?"0 22px 52px rgba(0,0,0,.75)":"0 4px 16px rgba(0,0,0,.4)",
        border:`1px solid ${hov?"rgba(201,151,58,.5)":"rgba(255,255,255,.06)"}`,
        transition:"box-shadow .3s,border .3s" }}>
        {img ? <LImg src={img} alt={movie.title} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",objectPosition:"top",display:"block"}} />
             : <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2.5rem"}}>🎬</div>}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,.88) 0%,rgba(0,0,0,.1) 55%,transparent 100%)",opacity:hov?1:.5,transition:"opacity .3s"}} />
        <div style={{position:"absolute",top:8,left:8,background:`${c}20`,border:`1px solid ${c}88`,color:c,
          fontSize:".57rem",fontWeight:800,padding:"2px 6px",borderRadius:3,letterSpacing:".07em",textTransform:"uppercase"}}>{v}</div>
        {movie.genre?.[0] && <div style={{position:"absolute",bottom:8,left:8,fontSize:".58rem",color:"rgba(255,255,255,.65)",fontWeight:600}}>{movie.genre[0]}</div>}
        {hov && <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{width:40,height:40,borderRadius:"50%",background:"rgba(201,151,58,.9)",display:"flex",alignItems:"center",justifyContent:"center",paddingLeft:3}}>▶</div>
        </div>}
      </div>
      <div style={{padding:"9px 2px 0"}}>
        <p style={{margin:0,fontWeight:700,fontSize:".8rem",lineHeight:1.3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:hov?"var(--gold)":"var(--text)",transition:"color .2s"}}>{movie.title}</p>
        <p style={{margin:"3px 0 0",fontSize:".67rem",color:"var(--muted)"}}>{movie.releaseDate?.slice(0,4)||"TBA"}</p>
      </div>
    </div>
  );
});

/* ─── Trailer Card ──────────────────────────────────────── */
const TrailerCard = React.memo(({ movie, onClick }) => {
  const [hov, setHov] = useState(false);
  const thumb = ytThumb(movie.media?.trailer?.ytId);
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{flexShrink:0,width:272,cursor:"pointer",transform:hov?"translateY(-5px)":"none",transition:"transform .25s"}}>
      <div style={{position:"relative",borderRadius:10,overflow:"hidden",aspectRatio:"16/9",background:"var(--bg3)",
        boxShadow:hov?"0 18px 44px rgba(0,0,0,.65)":"0 4px 14px rgba(0,0,0,.35)",
        border:`1px solid ${hov?"rgba(220,50,50,.4)":"rgba(255,255,255,.06)"}`,transition:"box-shadow .25s,border .25s"}}>
        {thumb && <LImg src={thumb} alt={movie.title} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} />}
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.25)",display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{width:46,height:46,borderRadius:"50%",background:hov?"rgba(220,30,30,.9)":"rgba(0,0,0,.6)",
            border:"2px solid rgba(255,255,255,.7)",display:"flex",alignItems:"center",justifyContent:"center",
            paddingLeft:4,fontSize:"1.15rem",transition:"background .2s"}}>▶</div>
        </div>
        <div style={{position:"absolute",bottom:8,right:8,background:"rgba(0,0,0,.75)",color:"#fff",fontSize:".58rem",fontWeight:700,padding:"2px 6px",borderRadius:3}}>TRAILER</div>
      </div>
      <div style={{padding:"9px 2px 0"}}>
        <p style={{margin:0,fontWeight:700,fontSize:".82rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:hov?"var(--gold)":"var(--text)",transition:"color .2s"}}>{movie.title}</p>
        {movie.releaseDate && <p style={{margin:"3px 0 0",fontSize:".67rem",color:"var(--muted)"}}>{fmtDate(movie.releaseDate)}</p>}
      </div>
    </div>
  );
});

/* ─── Song Card ─────────────────────────────────────────── */
const SongCard = React.memo(({ s, onClick }) => {
  const [hov,setHov]=useState(false);
  const thumb = s.thumbnailUrl||ytThumb(s.ytId)||s.posterUrl;
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{flexShrink:0,width:155,cursor:"pointer",transform:hov?"translateY(-5px)":"none",transition:"transform .25s"}}>
      <div style={{position:"relative",borderRadius:10,overflow:"hidden",aspectRatio:"1/1",background:"var(--bg3)",
        boxShadow:hov?"0 14px 36px rgba(0,0,0,.6)":"0 4px 12px rgba(0,0,0,.35)",
        border:`1px solid ${hov?"rgba(201,151,58,.4)":"rgba(255,255,255,.06)"}`,transition:"box-shadow .25s,border .25s"}}>
        {thumb && <LImg src={thumb} alt={s.title} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}} />}
        <div style={{position:"absolute",inset:0,background:hov?"rgba(0,0,0,.45)":"rgba(0,0,0,.2)",display:"flex",alignItems:"center",justifyContent:"center",transition:"background .2s"}}>
          <div style={{width:36,height:36,borderRadius:"50%",background:"rgba(201,151,58,.9)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem",opacity:hov?1:.7,transition:"opacity .2s"}}>♪</div>
        </div>
      </div>
      <div style={{padding:"9px 2px 0"}}>
        <p style={{margin:0,fontWeight:700,fontSize:".78rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:hov?"var(--gold)":"var(--text)",transition:"color .2s"}}>{s.title}</p>
        {s.singer&&<p style={{margin:"2px 0 0",fontSize:".63rem",color:"var(--muted)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>🎤 {s.singer}</p>}
        <p style={{margin:"1px 0 0",fontSize:".62rem",color:"rgba(255,255,255,.3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.movieTitle}</p>
      </div>
    </div>
  );
});

/* ─── News Card ─────────────────────────────────────────── */
const NewsCard = React.memo(({ n, onClick }) => {
  const [hov,setHov]=useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{flexShrink:0,width:255,cursor:"pointer",background:"var(--bg2)",borderRadius:10,overflow:"hidden",
        border:`1px solid ${hov?"rgba(201,151,58,.35)":"var(--border)"}`,
        transform:hov?"translateY(-4px)":"none",
        boxShadow:hov?"0 12px 32px rgba(0,0,0,.45)":"none",transition:"all .2s"}}>
      {n.imageUrl && (
        <div style={{height:136,overflow:"hidden",background:"var(--bg3)"}}>
          <LImg src={n.imageUrl} alt={n.title} style={{width:"100%",height:"100%",objectFit:"cover",display:"block",transform:hov?"scale(1.06)":"none",transition:"transform .35s"}} />
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

/* ─── Row wrapper ───────────────────────────────────────── */
function Row({ title, badge, badgeColor="#c9973a", viewAll, children, gap=14 }) {
  const navigate = useNavigate();
  const ref = useRef(null);
  const slide = n => ref.current?.scrollBy({ left:n, behavior:"smooth" });
  return (
    <section className="home-section" style={{ marginBottom:0 }}>
      <div className="home-section-header">
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <h2 className="home-section-title">{title}</h2>
          {badge && <span style={{background:`${badgeColor}20`,border:`1px solid ${badgeColor}50`,color:badgeColor,
            fontSize:".58rem",fontWeight:800,padding:"2px 8px",borderRadius:3,letterSpacing:".08em",textTransform:"uppercase"}}>{badge}</span>}
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {viewAll && <button className="home-view-all" onClick={()=>navigate(viewAll)}>View All</button>}
          <button className="home-arrow" onClick={()=>slide(-640)}>‹</button>
          <button className="home-arrow" onClick={()=>slide(640)}>›</button>
        </div>
      </div>
      <div ref={ref} className="home-row" style={{gap}}>
        {children}
      </div>
    </section>
  );
}

/* ═══════════════════ MAIN ══════════════════════════════ */
export default function Home({ production }) {
  const navigate = useNavigate();
  const [movies,  setMovies]  = useState([]);
  const [news,    setNews]    = useState([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  useEffect(() => {
    Promise.all([API.getMovies().catch(()=>[]), API.getNews().catch(()=>[])])
      .then(([m,n]) => { setMovies(m); setNews(n.slice(0,12)); setLoading(false); });
  },[]);

  const srt = useCallback(arr => [...arr].sort((a,b)=>{
    if(!a.releaseDate&&!b.releaseDate) return 0;
    if(!a.releaseDate) return 1; if(!b.releaseDate) return -1;
    return new Date(b.releaseDate)-new Date(a.releaseDate);
  }),[]);

  const heroMovies = useMemo(() => movies
    .filter(m=>{
      const h=m.thumbnailUrl||m.media?.trailer?.ytId||m.posterUrl; if(!h) return false;
      if(!m.verdict||m.verdict==="Upcoming") return true;
      if(m.releaseDate&&withinDays(m.releaseDate,60,0)) return true;
      return isThisMonth(m.releaseDate)||isLastMonth(m.releaseDate);
    }).sort((a,b)=>new Date(b.releaseDate||0)-new Date(a.releaseDate||0)).slice(0,8),[movies]);

  useEffect(() => {
    if (!heroMovies.length) return;
    timerRef.current = setInterval(()=>setHeroIdx(i=>(i+1)%heroMovies.length),5500);
    return ()=>clearInterval(timerRef.current);
  },[heroMovies.length]);

  const goHero = i => { setHeroIdx(i); clearInterval(timerRef.current); };

  const allMovies  = useMemo(()=>srt(movies),[movies,srt]);
  const thisWeek   = useMemo(()=>srt(movies.filter(m=>isThisWeek(m.releaseDate)&&!m.releaseTBA)),[movies,srt]);
  const thisMonth  = useMemo(()=>srt(movies.filter(m=>isThisMonth(m.releaseDate))),[movies,srt]);
  const lastWeek   = useMemo(()=>srt(movies.filter(m=>isLastWeek(m.releaseDate)&&!isThisWeek(m.releaseDate))),[movies,srt]);
  const lastMonth  = useMemo(()=>srt(movies.filter(m=>isLastMonth(m.releaseDate))),[movies,srt]);
  const inTheatres = useMemo(()=>srt(movies.filter(m=>m.releaseDate&&withinDays(m.releaseDate,10,10))),[movies,srt]);
  const upcoming   = useMemo(()=>srt(movies.filter(m=>!m.verdict||m.verdict==="Upcoming")),[movies,srt]);
  const highRated  = useMemo(()=>movies
    .filter(m=>m.reviews?.length>=1&&m.releaseDate&&new Date(m.releaseDate)>=RECENT_CUTOFF)
    .map(m=>({...m,avg:m.reviews.reduce((s,r)=>s+(r.rating||0),0)/m.reviews.length}))
    .filter(m=>m.avg>=3.5).sort((a,b)=>b.avg-a.avg),[movies]);
  const withTrailer = useMemo(()=>allMovies.filter(m=>m.media?.trailer?.ytId).slice(0,15),[allMovies]);
  const trendingSongs = useMemo(()=>{
    const songs=[];
    [...allMovies].filter(m=>(!m.verdict||m.verdict==="Upcoming")||withinDays(m.releaseDate,90,60))
      .forEach(m=>(m.media?.songs||[]).forEach((s,idx)=>{
        if(s.ytId) songs.push({...s,songIndex:idx,movieTitle:m.title,movieId:m._id,posterUrl:m.posterUrl});
      }));
    if(songs.length<6) allMovies.forEach(m=>(m.media?.songs||[]).forEach((s,idx)=>{
      if(s.ytId&&!songs.find(t=>t.movieId===m._id&&t.songIndex===idx))
        songs.push({...s,songIndex:idx,movieTitle:m.title,movieId:m._id,posterUrl:m.posterUrl});
    }));
    return songs.slice(0,15);
  },[allMovies]);

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"60vh",color:"var(--muted)"}}>
      Loading…
    </div>
  );

  return (
    <div className="home-root">

      {/* ══ HERO — UNCHANGED ══ */}
      {heroMovies.length > 0 && (
        <div className="home-hero">
          {heroMovies.map((m,i) => <HeroSlide key={m._id} movie={m} active={i===heroIdx} />)}
          <div className="home-hero-dots">
            {heroMovies.map((_,i) => (
              <button key={i} className={`home-hero-dot ${i===heroIdx?"active":""}`} onClick={()=>goHero(i)} />
            ))}
          </div>
          <div className="home-hero-strip">
            {heroMovies.map((m,i) => {
              const img=heroImage(m);
              return (
                <div key={m._id} className={`home-hero-strip-item ${i===heroIdx?"active":""}`} onClick={()=>goHero(i)}>
                  {img ? <img src={img} alt={m.title} onError={e=>e.target.style.display="none"} /> : <div className="home-strip-fallback">🎬</div>}
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

      {/* ══ SECTIONS ══ */}
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
          {allMovies.map(m=><MovieCard key={m._id} movie={m} onClick={()=>navigate(`/movie/${m._id}`)}/>)}
        </Row>

        {movies.length===0 && (
          <div className="home-empty">
            <div style={{fontSize:"4rem",marginBottom:16}}>🎬</div>
            <h2>No movies yet</h2>
            <p style={{color:"var(--muted)"}}>Be the first to add a film to Ollipedia</p>
            {production&&<button className="btn btn-gold" onClick={()=>navigate("/dashboard/add-movie")}>+ Add Movie</button>}
          </div>
        )}
      </div>
    </div>
  );
}