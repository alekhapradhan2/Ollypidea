import SEO, { songDetailSEO } from "../components/SEO";
import { extractId, moviePath, songPath } from "../utils/slugs";
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { API } from "../api/api";
import { Cache } from "../api/cache";

const extractYtId = (input) => {
  if (!input) return null;
  const s = String(input).trim();
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return null;
};
const ytThumb = (id) => id ? `https://img.youtube.com/vi/${extractYtId(id)||id}/mqdefault.jpg` : null;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "";
const firstToken = (str) => (str||"").split(/[,&\/]/)[0].trim().toLowerCase();

const CSS = `
/* ─ Song detail page ─ */
.sd-root { min-height:100vh; background:var(--bg); padding-top:58px; }
.sd-hero {
  position:relative; background:#0a0a0a; overflow:hidden;
  padding: 16px 0 0;
}
.sd-hero-bg {
  position:absolute; inset:0; background-size:cover; background-position:center;
  filter:blur(22px) brightness(.16); transform:scale(1.06);
}
.sd-hero-overlay {
  position:absolute; inset:0;
  background:linear-gradient(to bottom, rgba(0,0,0,.5) 0%, rgba(10,10,10,.98) 100%);
}
.sd-back {
  position:relative; z-index:3; padding:0 16px 8px;
}
@media(min-width:480px){ .sd-back { padding:0 24px 10px; } }
@media(min-width:768px){ .sd-back { padding:0 40px 10px; } }
.sd-back button {
  background:none; border:none; color:rgba(255,255,255,.55); cursor:pointer;
  font-size:.8rem; font-weight:600; padding:6px 0; display:flex; align-items:center; gap:5px;
  transition:color .18s;
}
.sd-back button:hover { color:var(--gold); }
/* Main grid: single col mobile, 2-col desktop */
.sd-grid {
  position:relative; z-index:3;
  display:grid;
  grid-template-columns:1fr;
  gap:16px;
  padding:0 16px 32px;
  max-width:1380px;
}
@media(min-width:480px){ .sd-grid { padding:0 20px 36px; gap:18px; } }
@media(min-width:900px){
  .sd-grid {
    grid-template-columns:1fr 290px;
    gap:24px;
    padding:0 32px 48px;
  }
}
@media(min-width:1100px){
  .sd-grid { grid-template-columns:1fr 310px; padding:0 44px 52px; }
}
/* Player */
.sd-player {
  border-radius:10px; overflow:hidden;
  box-shadow:0 16px 50px rgba(0,0,0,.7);
  background:#000; aspect-ratio:16/9; margin-bottom:16px;
}
.sd-player iframe { width:100%; height:100%; border:none; display:block; }
/* Info card */
.sd-info-card {
  background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);
  border-radius:12px; padding:16px; margin-bottom:16px;
}
@media(min-width:480px){ .sd-info-card { padding:18px 20px; } }
.sd-badges { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px; }
.sd-song-title {
  font-family:'Playfair Display',serif;
  font-size:clamp(1.2rem,4vw,1.9rem); font-weight:900; margin:0 0 12px; line-height:1.15;
}
.sd-meta-row {
  display:flex; gap:8px; padding:6px 0; border-bottom:1px solid rgba(255,255,255,.05);
  align-items:center;
}
.sd-meta-label {
  font-size:.64rem; font-weight:700; color:var(--muted); text-transform:uppercase;
  letter-spacing:.08em; width:82px; flex-shrink:0;
}
.sd-meta-val { font-size:.84rem; flex:1; min-width:0; }
/* Playlist box */
.sd-playlist-box {
  background:rgba(255,255,255,.03); border:1px solid rgba(255,255,255,.07);
  border-radius:10px; overflow:hidden;
}
.sd-playlist-header {
  padding:10px 14px; border-bottom:1px solid rgba(255,255,255,.07);
  font-size:.62rem; font-weight:800; letter-spacing:.11em; text-transform:uppercase; color:var(--muted);
}
/* Sidebar — sticky on desktop */
.sd-sidebar {
  background:rgba(0,0,0,.4); border:1px solid rgba(255,255,255,.07);
  border-radius:12px; overflow:hidden;
  /* On mobile: not sticky */
}
@media(min-width:900px){
  .sd-sidebar {
    position:sticky; top:70px; align-self:start;
    max-height:calc(100vh - 90px);
    display:flex; flex-direction:column;
  }
}
.sd-sidebar-head {
  padding:12px 14px 10px; border-bottom:1px solid rgba(255,255,255,.07); flex-shrink:0;
}
.sd-sidebar-list { overflow-y:auto; flex:1; padding:6px; }
.sd-sidebar-footer { padding:10px 14px; border-top:1px solid rgba(255,255,255,.07); flex-shrink:0; }
/* Song item */
.sd-song-item {
  display:flex; gap:8px; align-items:center; padding:8px 10px;
  border-radius:7px; cursor:pointer; border:1px solid transparent;
  transition:background .14s;
}
.sd-song-item.active { background:rgba(201,151,58,.1); border-color:rgba(201,151,58,.28); }
.sd-song-item:not(.active):hover { background:rgba(255,255,255,.05); }
.sd-song-thumb {
  flex-shrink:0; width:50px; height:34px; border-radius:4px;
  overflow:hidden; background:var(--bg3); position:relative;
}
.sd-song-thumb img { width:100%; height:100%; object-fit:cover; }
.sd-song-icon {
  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  font-size:.75rem; font-weight:700;
}
.sd-song-name { font-weight:600; font-size:.78rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.sd-song-singer { font-size:.66rem; color:var(--muted); margin-top:1px; }
/* Sections below */
.sd-sections { padding:28px 0 60px; background:var(--bg); }
.sd-section { margin-bottom:8px; }
.sd-sec-head { display:flex; align-items:center; justify-content:space-between; padding:0 16px; margin-bottom:10px; }
@media(min-width:480px){ .sd-sec-head { padding:0 20px; } }
@media(min-width:768px){ .sd-sec-head { padding:0 28px; } }
.sd-sec-title { margin:0; font-size:.88rem; font-weight:800; }
@media(min-width:480px){ .sd-sec-title { font-size:.96rem; } }
.sd-hrow { display:flex; gap:10px; overflow-x:auto; padding:4px 16px 10px; scrollbar-width:none; }
@media(min-width:480px){ .sd-hrow { gap:12px; padding:4px 20px 12px; } }
@media(min-width:768px){ .sd-hrow { gap:14px; padding:4px 28px 14px; } }
.sd-hrow::-webkit-scrollbar { display:none; }
.sd-sc { flex-shrink:0; width:128px; cursor:pointer; transition:transform .22s; }
@media(min-width:480px){ .sd-sc { width:142px; } }
.sd-sc:hover { transform:translateY(-4px); }
.sd-sc:hover .sd-sc-img { box-shadow:0 12px 30px rgba(0,0,0,.6); border-color:rgba(201,151,58,.4); }
.sd-sc:hover .sd-sc-title { color:var(--gold); }
.sd-sc-img { position:relative; border-radius:9px; overflow:hidden; aspect-ratio:1/1; background:var(--bg3); box-shadow:0 3px 10px rgba(0,0,0,.35); border:1px solid rgba(255,255,255,.06); transition:box-shadow .22s; }
.sd-sc-img img { width:100%; height:100%; object-fit:cover; display:block; }
.sd-sc-title { margin:0; font-weight:700; font-size:.72rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text); transition:color .2s; margin-top:6px; }
.sd-sc-sub { margin:2px 0 0; font-size:.6rem; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.sd-arr { width:26px; height:26px; border-radius:50%; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.05); color:var(--text); cursor:pointer; font-size:.95rem; display:flex; align-items:center; justify-content:center; transition:all .2s; flex-shrink:0; }
.sd-arr:hover { border-color:rgba(201,151,58,.4); color:var(--gold); }
@media(max-width:400px){ .sd-arr { display:none; } }
/* Movie cards in sd */
.sd-mc { flex-shrink:0; width:120px; cursor:pointer; transition:transform .22s; }
@media(min-width:480px){ .sd-mc { width:134px; } }
.sd-mc:hover { transform:translateY(-5px); }
.sd-mc-box { position:relative; border-radius:9px; overflow:hidden; aspect-ratio:2/3; background:var(--bg3); box-shadow:0 3px 12px rgba(0,0,0,.4); border:1px solid rgba(255,255,255,.06); }
.sd-mc-box img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; }
.sd-mc-title { margin:6px 0 0; font-weight:700; font-size:.7rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text); }
`;

function SongItem({ song, active, onClick }) {
  const thumb = song.ytId ? ytThumb(song.ytId) : null;
  return (
    <div className={`sd-song-item${active?" active":""}`} onClick={onClick}>
      <div className="sd-song-thumb">
        {thumb && <img src={thumb} alt={song.title} onError={e=>e.target.style.opacity="0.2"}/>}
        <div className="sd-song-icon" style={{ background:active?"rgba(201,151,58,.45)":"rgba(0,0,0,.4)", color:active?"var(--gold)":"rgba(255,255,255,.7)" }}>
          {active?"▶":"♪"}
        </div>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div className="sd-song-name" style={{color:active?"var(--gold)":"var(--text)"}}>{song.title}</div>
        {song.singer && <div className="sd-song-singer">🎤 {song.singer}</div>}
      </div>
      {song.ytId && (
        <a href={`https://www.youtube.com/watch?v=${song.ytId}`} target="_blank" rel="noreferrer"
          onClick={e=>e.stopPropagation()}
          style={{flexShrink:0,color:"var(--gold)",fontSize:".6rem",fontWeight:700,opacity:.65,padding:"3px 5px"}}>
          YT↗
        </a>
      )}
    </div>
  );
}

function SongScrollRow({ title, songs, onSongClick }) {
  const ref = useRef(null);
  const slide = n => ref.current?.scrollBy({left:n,behavior:"smooth"});
  if (!songs.length) return null;
  return (
    <section className="sd-section">
      <div className="sd-sec-head">
        <h2 className="sd-sec-title">{title}</h2>
        <div style={{display:"flex",gap:5}}>
          <button className="sd-arr" onClick={()=>slide(-400)}>‹</button>
          <button className="sd-arr" onClick={()=>slide(400)}>›</button>
        </div>
      </div>
      <div className="sd-hrow" ref={ref}>
        {songs.map((s,i)=>{
          const thumb=s.thumbnailUrl||(s.ytId?ytThumb(s.ytId):null)||s.moviePoster;
          return (
            <div key={i} className="sd-sc" onClick={()=>onSongClick(s)}>
              <div className="sd-sc-img">
                {thumb&&<img src={thumb} alt={s.title} onError={e=>e.target.style.opacity="0.2"}/>}
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.25)"}}>
                  <div style={{width:26,height:26,borderRadius:"50%",background:"rgba(201,151,58,.85)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".75rem"}}>▶</div>
                </div>
              </div>
              <p className="sd-sc-title">{s.title}</p>
              {s.singer&&<p className="sd-sc-sub">🎤 {s.singer}</p>}
              {s.movieTitle&&<p className="sd-sc-sub" style={{color:"var(--gold)"}}>{s.movieTitle}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function SongDetail() {
  const { movieSlug:_rawMovieSlug, songIndex:urlSongIdx } = useParams();
  const urlMovieId = extractId(_rawMovieSlug);
  const navigate = useNavigate();

  // Pre-populate from cache so related songs show instantly
  const [allMovies,  setAllMovies]  = useState(() => Cache.peek("movies") || []);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [currentMovieId,  setCurrentMovieId]  = useState(urlMovieId);
  const [currentSongIdx,  setCurrentSongIdx]  = useState(urlSongIdx!=null?Number(urlSongIdx):0);

  const movie = allMovies.find(m=>String(m._id)===currentMovieId)||null;

  useEffect(()=>{
    // If we already have this movie in cache, skip individual fetch
    const cached = Cache.peek("movies");
    if (cached) {
      const found = cached.find(m => String(m._id) === urlMovieId);
      if (found) { setLoading(false); return; }
    }
    API.getMovie(urlMovieId)
      .then(m=>{
        setAllMovies(prev=>[m,...prev.filter(x=>String(x._id)!==String(m._id))]);
        setLoading(false);
        // Deferred: load all movies via cache for related songs
        const tid=typeof requestIdleCallback!=="undefined"
          ?requestIdleCallback(()=>Cache.getMovies().catch(()=>[]).then(all=>setAllMovies(all)))
          :setTimeout(()=>Cache.getMovies().catch(()=>[]).then(all=>setAllMovies(all)),200);
        return()=>typeof requestIdleCallback!=="undefined"?cancelIdleCallback(tid):clearTimeout(tid);
      })
      .catch(e=>{ setError(typeof e==="string"?e:"Failed to load"); setLoading(false); });
  },[urlMovieId]);

  useEffect(()=>{
    setCurrentMovieId(urlMovieId);
    setCurrentSongIdx(urlSongIdx!=null?Number(urlSongIdx):0);
  },[urlMovieId,urlSongIdx]);

  const changeActiveSong = (idx) => {
    setCurrentSongIdx(idx);
    navigate(movie?songPath(movie,idx):`/song/${currentMovieId}/${idx}`,{replace:true});
  };
  const handleRelatedSongClick = (s) => {
    setCurrentMovieId(s.movieId); setCurrentSongIdx(s.songIdx);
    const relM=allMovies.find(x=>String(x._id)===s.movieId);
    navigate(relM?songPath(relM,s.songIdx):`/song/${s.movieId}/${s.songIdx}`,{replace:false});
    window.scrollTo({top:0,behavior:"smooth"});
  };

  if (loading) return <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:10,color:"var(--muted)"}}><div style={{fontSize:"2rem"}}>🎵</div><p style={{fontSize:".8rem"}}>Loading…</p></div>;
  if (error)   return <div className="page empty-state"><h3>Song not found</h3><p>{error}</p><button className="btn btn-outline" style={{marginTop:16}} onClick={()=>navigate(-1)}>← Go Back</button></div>;
  if (!movie)  return <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--muted)"}}><p>Loading movie…</p></div>;

  const songs      = movie.media?.songs||[];
  const activeSong = songs[currentSongIdx]||songs[0];
  if (!activeSong) return <div className="page empty-state"><h3>No songs for this movie</h3><button className="btn btn-outline" style={{marginTop:16}} onClick={()=>navigate(movie?moviePath(movie):`/movie/${movie?._id}`)}>← Back to Movie</button></div>;

  const ytId     = activeSong.ytId?extractYtId(activeSong.ytId):null;
  const bannerImg= movie.thumbnailUrl||ytThumb(movie.media?.trailer?.ytId)||movie.posterUrl;

  const allSongs=[];
  allMovies.forEach(m=>(m.media?.songs||[]).forEach((s,i)=>allSongs.push({...s,movieId:String(m._id),movieTitle:m.title,moviePoster:m.posterUrl,songIdx:i,isCurrent:String(m._id)===currentMovieId&&i===currentSongIdx})));

  const bySinger        = activeSong.singer?allSongs.filter(s=>!s.isCurrent&&s.ytId&&s.singer&&firstToken(s.singer)===firstToken(activeSong.singer)):[];
  const byMusicDirector = activeSong.musicDirector?allSongs.filter(s=>!s.isCurrent&&s.ytId&&s.musicDirector&&firstToken(s.musicDirector)===firstToken(activeSong.musicDirector)):[];
  const byLyricist      = activeSong.lyricist?allSongs.filter(s=>!s.isCurrent&&s.ytId&&s.lyricist&&firstToken(s.lyricist)===firstToken(activeSong.lyricist)):[];

  return (
    <div className="sd-root">
      <style>{CSS}</style>
      <SEO {...songDetailSEO({...activeSong,songIndex:currentSongIdx},movie)}/>

      <div className="sd-hero">
        {bannerImg && <div className="sd-hero-bg" style={{backgroundImage:`url(${bannerImg})`}}/>}
        <div className="sd-hero-overlay"/>

        <div className="sd-back">
          <button onClick={()=>navigate(movie?moviePath(movie):`/movie/${movie?._id}`)}>
            ← {movie.title}
          </button>
        </div>

        <div className="sd-grid">
          {/* ── Left: Player + Info + Playlist ── */}
          <div style={{minWidth:0}}>
            <div className="sd-player">
              {ytId
                ? <iframe key={ytId} src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen title={activeSong.title}/>
                : <div style={{width:"100%",height:"100%",minHeight:220,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,background:"var(--bg3)"}}>
                    <div style={{fontSize:"2.5rem"}}>🎵</div>
                    <p style={{color:"var(--muted)",fontSize:".82rem"}}>No YouTube link available</p>
                  </div>
              }
            </div>

            <div className="sd-info-card">
              <div className="sd-badges">
                <span className="home-tag">🎵 Song</span>
                {activeSong.singer        && <span className="home-tag-outline">🎤 {activeSong.singer}</span>}
                {activeSong.musicDirector && <span className="home-tag-outline">🎼 {activeSong.musicDirector}</span>}
                {activeSong.lyricist      && <span className="home-tag-outline">✍️ {activeSong.lyricist}</span>}
              </div>
              <h1 className="sd-song-title">{activeSong.title}</h1>

              {[
                activeSong.singer        && ["Singer",     "🎤", activeSong.singer,       "var(--gold)"],
                activeSong.musicDirector && ["Music Dir.", "🎼", activeSong.musicDirector, "var(--text)"],
                activeSong.lyricist      && ["Lyricist",   "✍️", activeSong.lyricist,      "var(--text)"],
              ].filter(Boolean).map(([label,icon,val,color])=>(
                <div key={label} className="sd-meta-row">
                  <span className="sd-meta-label">{label}</span>
                  <span className="sd-meta-val" style={{color,fontWeight:label==="Singer"?600:400}}>{icon} {val}</span>
                </div>
              ))}
              <div className="sd-meta-row">
                <span className="sd-meta-label">From Film</span>
                <span className="sd-meta-val" style={{color:"var(--gold)",fontWeight:600,cursor:"pointer",textDecoration:"underline"}}
                  onClick={()=>navigate(movie?moviePath(movie):`/movie/${movie?._id}`)}>🎬 {movie.title}</span>
              </div>
              {movie.director&&<div className="sd-meta-row"><span className="sd-meta-label">Director</span><span className="sd-meta-val">{movie.director}</span></div>}
              {movie.releaseDate&&<div className="sd-meta-row"><span className="sd-meta-label">Release</span><span className="sd-meta-val">{fmtDate(movie.releaseDate)}</span></div>}

              {ytId&&(
                <a href={`https://www.youtube.com/watch?v=${ytId}`} target="_blank" rel="noreferrer"
                  className="btn-hero-play" style={{display:"inline-flex",marginTop:14,fontSize:".8rem",padding:"9px 18px"}}>
                  ▶ Open on YouTube
                </a>
              )}
            </div>

            {/* Full playlist — inline on mobile */}
            {songs.length>1&&(
              <div className="sd-playlist-box">
                <div className="sd-playlist-header">🎵 Full Album — {movie.title} ({songs.length} songs)</div>
                <div style={{padding:"5px"}}>
                  {songs.map((s,i)=><SongItem key={i} song={s} active={i===currentSongIdx} onClick={()=>changeActiveSong(i)}/>)}
                </div>
              </div>
            )}
          </div>

          {/* ── Right sidebar ── */}
          <div className="sd-sidebar">
            <div className="sd-sidebar-head">
              <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:8}}>
                {movie.posterUrl&&(
                  <img src={movie.posterUrl} alt={movie.title}
                    style={{width:42,height:58,objectFit:"cover",borderRadius:4,border:"1px solid var(--border)",flexShrink:0,cursor:"pointer"}}
                    onClick={()=>navigate(movie?moviePath(movie):`/movie/${movie?._id}`)}
                    onError={e=>e.target.style.display="none"}/>
                )}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:".82rem",lineHeight:1.3,cursor:"pointer",color:"var(--gold)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}
                    onClick={()=>navigate(movie?moviePath(movie):`/movie/${movie?._id}`)}>{movie.title}</div>
                  {movie.releaseDate&&<div style={{fontSize:".64rem",color:"var(--muted)",marginTop:2}}>{fmtDate(movie.releaseDate)}</div>}
                </div>
              </div>
              <div style={{fontSize:".58rem",fontWeight:800,letterSpacing:".1em",textTransform:"uppercase",color:"var(--muted)"}}>
                🎵 {songs.length} song{songs.length!==1?"s":""}
              </div>
            </div>
            <div className="sd-sidebar-list">
              {songs.length===0
                ? <div style={{padding:"16px",color:"var(--muted)",fontSize:".8rem",textAlign:"center"}}>No songs</div>
                : songs.map((s,i)=><SongItem key={i} song={s} active={i===currentSongIdx} onClick={()=>changeActiveSong(i)}/>)
              }
            </div>
            <div className="sd-sidebar-footer">
              <button className="btn btn-outline btn-sm" style={{width:"100%",justifyContent:"center",fontSize:".74rem"}}
                onClick={()=>navigate(movie?moviePath(movie):`/movie/${movie?._id}`)}>
                🎬 View Full Movie Page
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Below: related rows */}
      <div className="sd-sections">
        {bySinger.length>0&&<SongScrollRow title={`🎤 More by ${activeSong.singer?.split(/[,&]/)[0]?.trim()}`} songs={bySinger.slice(0,15)} onSongClick={handleRelatedSongClick}/>}
        {byMusicDirector.length>0&&<SongScrollRow title={`🎼 More by ${activeSong.musicDirector?.split(/[,&]/)[0]?.trim()}`} songs={byMusicDirector.slice(0,15)} onSongClick={handleRelatedSongClick}/>}
        {byLyricist.length>0&&<SongScrollRow title={`✍️ More by ${activeSong.lyricist?.split(/[,&]/)[0]?.trim()}`} songs={byLyricist.slice(0,15)} onSongClick={handleRelatedSongClick}/>}

        {movie.cast?.length>0&&(
          <section className="sd-section">
            <div className="sd-sec-head"><h2 className="sd-sec-title">🎭 Cast of {movie.title}</h2></div>
            <div className="sd-hrow">
              {movie.cast.map((c,i)=>{
                const castId=c.castId?._id||c.castId;
                return (
                  <div key={i} style={{flexShrink:0,width:120,cursor:castId?"pointer":"default"}} onClick={()=>castId&&navigate(`/cast/${castId}`)}>
                    <div style={{position:"relative",borderRadius:9,overflow:"hidden",aspectRatio:"2/3",background:"var(--bg3)"}}>
                      {c.photo?<img src={c.photo} alt={c.name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>
                        :<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2rem"}}>👤</div>}
                      <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"3px 6px",background:"linear-gradient(to top,rgba(0,0,0,.75),transparent)"}}>
                        <span style={{fontSize:".55rem",color:"rgba(255,255,255,.7)",fontWeight:600}}>{c.type||"Actor"}</span>
                      </div>
                    </div>
                    <p style={{margin:"5px 0 0",fontWeight:700,fontSize:".7rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"var(--text)"}}>{c.name}</p>
                    {c.role&&<p style={{margin:"1px 0 0",fontSize:".62rem",color:"var(--gold)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.role}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {(()=>{
          const related=allMovies.filter(m=>String(m._id)!==currentMovieId&&movie.genre?.length&&m.genre?.some(g=>movie.genre.includes(g))).sort((a,b)=>new Date(b.releaseDate||0)-new Date(a.releaseDate||0)).slice(0,15);
          if(!related.length)return null;
          return(
            <section className="sd-section">
              <div className="sd-sec-head"><h2 className="sd-sec-title">🎬 Related Films</h2></div>
              <div className="sd-hrow">
                {related.map(m=>(
                  <div key={m._id} className="sd-mc" onClick={()=>navigate(moviePath(m))}>
                    <div className="sd-mc-box">
                      {(m.posterUrl||m.thumbnailUrl)&&<img src={m.posterUrl||m.thumbnailUrl} alt={m.title} loading="lazy" onError={e=>e.target.style.display="none"}/>}
                      {!m.posterUrl&&!m.thumbnailUrl&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.5rem"}}>🎬</div>}
                    </div>
                    <p className="sd-mc-title">{m.title}</p>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}
      </div>
    </div>
  );
}