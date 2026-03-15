import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { API } from "../api/api";

// ── Helpers ───────────────────────────────────────────────
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

// ── Song row item ─────────────────────────────────────────
function SongItem({ song, movieTitle, active, onClick }) {
  const thumb = song.ytId ? ytThumb(song.ytId) : null;
  return (
    <div onClick={onClick} style={{
      display:"flex", gap:10, alignItems:"center",
      padding:"9px 12px", borderRadius:8, cursor:"pointer",
      background: active ? "rgba(201,151,58,0.12)" : "transparent",
      border: active ? "1px solid rgba(201,151,58,0.3)" : "1px solid transparent",
      transition:"background 0.15s",
    }}
    onMouseEnter={e=>{ if(!active) e.currentTarget.style.background="rgba(255,255,255,0.05)"; }}
    onMouseLeave={e=>{ if(!active) e.currentTarget.style.background="transparent"; }}>
      <div style={{flexShrink:0,width:54,height:38,borderRadius:5,overflow:"hidden",background:"var(--bg3)",position:"relative"}}>
        {thumb && <img src={thumb} alt={song.title} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.opacity="0.2"} />}
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",
          background:active?"rgba(201,151,58,0.45)":"rgba(0,0,0,0.35)",
          color:active?"var(--gold)":"rgba(255,255,255,0.7)",fontSize:"0.78rem",fontWeight:700}}>
          {active ? "▶" : "♪"}
        </div>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:600,fontSize:"0.8rem",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
          color:active?"var(--gold)":"var(--text)"}}>{song.title}</div>
        {song.singer && <div style={{fontSize:"0.68rem",color:"var(--muted)",marginTop:1}}>🎤 {song.singer}</div>}
        {movieTitle && <div style={{fontSize:"0.65rem",color:"var(--muted)",marginTop:1,opacity:0.7}}>🎬 {movieTitle}</div>}
      </div>
      {song.ytId && (
        <a href={`https://www.youtube.com/watch?v=${song.ytId}`} target="_blank" rel="noreferrer"
          onClick={e=>e.stopPropagation()}
          style={{flexShrink:0,color:"var(--gold)",fontSize:"0.65rem",fontWeight:700,opacity:0.65,padding:"3px 6px"}}>
          YT↗
        </a>
      )}
    </div>
  );
}

// ── Mini Movie Card ───────────────────────────────────────
function MiniMovieCard({ movie, onClick }) {
  const img = movie.posterUrl || movie.thumbnailUrl || ytThumb(movie.media?.trailer?.ytId);
  return (
    <div className="home-card" onClick={onClick} style={{cursor:"pointer"}}>
      <div className="home-card-img">
        {img ? <img src={img} alt={movie.title} loading="lazy" onError={e=>e.target.style.display="none"} /> : null}
        <div className="home-card-fallback" style={{display:img?"none":"flex"}}>🎬</div>
        <div className="home-card-overlay">
          <span className="home-card-verdict">{movie.verdict||"Upcoming"}</span>
        </div>
      </div>
      <div className="home-card-info">
        <p className="home-card-title">{movie.title}</p>
        {movie.releaseDate && <p className="home-card-date">{fmtDate(movie.releaseDate)}</p>}
      </div>
    </div>
  );
}

// ── Horizontal song scroll row ────────────────────────────
function SongScrollRow({ title, songs, onSongClick }) {
  const ref = useRef(null);
  const slide = (n) => ref.current?.scrollBy({left:n,behavior:"smooth"});
  if (!songs.length) return null;
  return (
    <section className="home-section">
      <div className="home-section-header">
        <h2 className="home-section-title">{title}</h2>
        <div style={{display:"flex",gap:8}}>
          <button className="home-arrow" onClick={()=>slide(-400)}>‹</button>
          <button className="home-arrow" onClick={()=>slide(400)}>›</button>
        </div>
      </div>
      <div className="home-row home-songs-row" ref={ref}>
        {songs.map((s,i) => {
          const thumb = s.thumbnailUrl || (s.ytId ? ytThumb(s.ytId) : null) || s.moviePoster;
          return (
            <div key={i} className="home-song-card" style={{cursor:"pointer"}} onClick={()=>onSongClick(s)}>
              <div className="home-song-thumb">
                {thumb && <img src={thumb} alt={s.title} onError={e=>e.target.style.opacity="0.2"} />}
                <div className="home-song-play">♪</div>
              </div>
              <div className="home-song-info">
                <p className="home-song-title">{s.title}</p>
                {s.singer        && <p className="home-song-singer">🎤 {s.singer}</p>}
                {s.musicDirector && <p className="home-song-singer" style={{color:"var(--muted)",fontSize:"0.65rem"}}>🎼 {s.musicDirector}</p>}
                <p className="home-song-movie">{s.movieTitle}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN — SongDetail
//  Route: /song/:movieId/:songIndex
// ═══════════════════════════════════════════════════════════
export default function SongDetail() {
  const { movieId: urlMovieId, songIndex: urlSongIdx } = useParams();
  const location = useLocation();
  const navigate  = useNavigate();

  const [allMovies,  setAllMovies]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  // currentMovieId / currentSongIdx drive everything — separate from URL params
  // so clicking a related song from a different movie works immediately
  const [currentMovieId,  setCurrentMovieId]  = useState(urlMovieId);
  const [currentSongIdx,  setCurrentSongIdx]  = useState(urlSongIdx != null ? Number(urlSongIdx) : 0);

  // Derived: current movie object from allMovies
  const movie = allMovies.find(m => String(m._id) === currentMovieId) || null;

  // Phase 1: load current movie only — shows player immediately
  // Phase 2: load all movies in background for related sections
  useEffect(() => {
    API.getMovie(urlMovieId)
      .then(m => {
        setAllMovies(prev => {
          // Inject the fetched movie so it's available immediately
          const without = prev.filter(x => String(x._id) !== String(m._id));
          return [m, ...without];
        });
        setLoading(false);
        // Defer loading all movies for related sections
        const tid = typeof requestIdleCallback !== "undefined"
          ? requestIdleCallback(() => API.getMovies().catch(()=>[]).then(all => setAllMovies(all)))
          : setTimeout(() => API.getMovies().catch(()=>[]).then(all => setAllMovies(all)), 200);
        return () => typeof requestIdleCallback !== "undefined" ? cancelIdleCallback(tid) : clearTimeout(tid);
      })
      .catch(e => { setError(typeof e==="string"?e:"Failed to load"); setLoading(false); });
  }, [urlMovieId]);

  // Sync URL params → current state when navigating via browser back/forward
  useEffect(() => {
    setCurrentMovieId(urlMovieId);
    setCurrentSongIdx(urlSongIdx != null ? Number(urlSongIdx) : 0);
  }, [urlMovieId, urlSongIdx]);

  // Play a song from the SAME movie
  const changeActiveSong = (idx) => {
    setCurrentSongIdx(idx);
    navigate(`/song/${currentMovieId}/${idx}`, { replace: true });
  };

  // Play a song from ANY movie (related sections) — updates state immediately
  const handleRelatedSongClick = (s) => {
    setCurrentMovieId(s.movieId);
    setCurrentSongIdx(s.songIdx);
    navigate(`/song/${s.movieId}/${s.songIdx}`, { replace: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) return (
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:12,color:"var(--muted)"}}>
      <div style={{fontSize:"2.5rem"}}>🎵</div><p>Loading…</p>
    </div>
  );
  if (error) return (
    <div className="page empty-state">
      <h3>Song not found</h3><p>{error}</p>
      <button className="btn btn-outline" style={{marginTop:16}} onClick={()=>navigate(-1)}>← Go Back</button>
    </div>
  );
  // Movie not yet found in allMovies — fetch individually
  if (!movie) return (
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--muted)"}}>
      <p>Loading movie…</p>
    </div>
  );

  const songs      = movie.media?.songs || [];
  const activeSong = songs[currentSongIdx] || songs[0];

  if (!activeSong) return (
    <div className="page empty-state">
      <h3>No songs for this movie</h3>
      <button className="btn btn-outline" style={{marginTop:16}} onClick={()=>navigate(`/movie/${movie._id}`)}>← Back to Movie</button>
    </div>
  );

  const ytId     = activeSong.ytId ? extractYtId(activeSong.ytId) : null;
  const bannerImg = movie.thumbnailUrl || ytThumb(movie.media?.trailer?.ytId) || movie.posterUrl;

  // Build flat song list from all movies for related sections
  // Uses currentMovieId + currentSongIdx so clicking related songs updates everything
  const allSongs = [];
  allMovies.forEach(m => {
    (m.media?.songs||[]).forEach((s,i) => {
      allSongs.push({
        ...s, movieId:String(m._id), movieTitle:m.title,
        moviePoster:m.posterUrl, songIdx:i,
        isCurrent: String(m._id)===currentMovieId && i===currentSongIdx,
      });
    });
  });

  // Related by role — exact first-token match on currently playing song
  const bySinger = activeSong.singer
    ? allSongs.filter(s=>!s.isCurrent && s.ytId && s.singer && firstToken(s.singer)===firstToken(activeSong.singer))
    : [];
  const byMusicDirector = activeSong.musicDirector
    ? allSongs.filter(s=>!s.isCurrent && s.ytId && s.musicDirector && firstToken(s.musicDirector)===firstToken(activeSong.musicDirector))
    : [];
  const byLyricist = activeSong.lyricist
    ? allSongs.filter(s=>!s.isCurrent && s.ytId && s.lyricist && firstToken(s.lyricist)===firstToken(activeSong.lyricist))
    : [];

  return (
    <div className="home-root" style={{minHeight:"100vh"}}>

      {/* ══════════ HERO ZONE ══════════ */}
      <div style={{position:"relative",background:"#0a0a0a",paddingTop:24,overflow:"hidden"}}>
        {/* Blurred banner */}
        {bannerImg && (
          <div style={{position:"absolute",inset:0,backgroundImage:`url(${bannerImg})`,
            backgroundSize:"cover",backgroundPosition:"center",
            filter:"blur(22px) brightness(0.18)",transform:"scale(1.06)"}} />
        )}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,rgba(0,0,0,0.55) 0%,rgba(10,10,10,0.98) 100%)"}} />

        {/* Back */}
        <div style={{position:"relative",zIndex:3,padding:"0 48px 8px"}}>
          <button className="btn btn-ghost btn-sm" style={{opacity:0.7}} onClick={()=>navigate(`/movie/${movie._id}`)}>
            ← {movie.title}
          </button>
        </div>

        {/* Main grid: Player + Sidebar */}
        <div style={{
          position:"relative",zIndex:3,
          display:"grid", gridTemplateColumns:"1fr 310px",
          gap:28, padding:"16px 48px 48px",
          maxWidth:1380, alignItems:"flex-start",
        }}>

          {/* ══ LEFT: Player + Song Info + Full Playlist ══ */}
          <div style={{minWidth:0}}>

            {/* YouTube embed */}
            <div style={{borderRadius:12,overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.7)",
              background:"#000",marginBottom:20,aspectRatio:"16/9"}}>
              {ytId ? (
                <iframe key={ytId}
                  src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen title={activeSong.title}
                  style={{width:"100%",height:"100%",border:"none",display:"block"}} />
              ) : (
                <div style={{width:"100%",height:"100%",minHeight:300,display:"flex",flexDirection:"column",
                  alignItems:"center",justifyContent:"center",gap:12,background:"var(--bg3)"}}>
                  <div style={{fontSize:"3rem"}}>🎵</div>
                  <p style={{color:"var(--muted)"}}>No YouTube link available</p>
                </div>
              )}
            </div>

            {/* Song info card */}
            <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",
              borderRadius:12,padding:"20px 24px",marginBottom:20}}>

              {/* Badges */}
              <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
                <span className="home-tag">🎵 Song</span>
                {activeSong.singer        && <span className="home-tag-outline">🎤 {activeSong.singer}</span>}
                {activeSong.musicDirector && <span className="home-tag-outline">🎼 {activeSong.musicDirector}</span>}
                {activeSong.lyricist      && <span className="home-tag-outline">✍️ {activeSong.lyricist}</span>}
              </div>

              {/* Title */}
              <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.4rem,3vw,2rem)",
                fontWeight:900,margin:"0 0 14px",lineHeight:1.15}}>{activeSong.title}</h1>

              {/* Meta rows */}
              {[
                activeSong.singer        && ["Singer",     "🎤",activeSong.singer,       "var(--gold)"],
                activeSong.musicDirector && ["Music Dir.", "🎼",activeSong.musicDirector, "var(--text)"],
                activeSong.lyricist      && ["Lyricist",   "✍️",activeSong.lyricist,      "var(--text)"],
              ].filter(Boolean).map(([label,icon,val,color]) => (
                <div key={label} style={{display:"flex",gap:10,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                  <span style={{fontSize:"0.68rem",fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.08em",width:90,flexShrink:0}}>{label}</span>
                  <span style={{fontSize:"0.88rem",color,fontWeight:label==="Singer"?600:400}}>{icon} {val}</span>
                </div>
              ))}
              <div style={{display:"flex",gap:10,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                <span style={{fontSize:"0.68rem",fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.08em",width:90,flexShrink:0}}>From Film</span>
                <span style={{fontSize:"0.88rem",color:"var(--gold)",fontWeight:600,cursor:"pointer",textDecoration:"underline"}}
                  onClick={()=>navigate(`/movie/${movie._id}`)}>🎬 {movie.title}</span>
              </div>
              {movie.director && (
                <div style={{display:"flex",gap:10,padding:"6px 0",borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                  <span style={{fontSize:"0.68rem",fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.08em",width:90,flexShrink:0}}>Director</span>
                  <span style={{fontSize:"0.88rem",color:"var(--text)"}}>{movie.director}</span>
                </div>
              )}
              {movie.releaseDate && (
                <div style={{display:"flex",gap:10,padding:"6px 0"}}>
                  <span style={{fontSize:"0.68rem",fontWeight:700,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.08em",width:90,flexShrink:0}}>Release</span>
                  <span style={{fontSize:"0.88rem",color:"var(--text)"}}>{fmtDate(movie.releaseDate)}</span>
                </div>
              )}

              {ytId && (
                <a href={`https://www.youtube.com/watch?v=${ytId}`} target="_blank" rel="noreferrer"
                  className="btn-hero-play" style={{display:"inline-flex",marginTop:16}}>
                  ▶ Open on YouTube
                </a>
              )}
            </div>

            {/* Full playlist from this movie */}
            {songs.length > 1 && (
              <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,overflow:"hidden"}}>
                <div style={{padding:"11px 16px",borderBottom:"1px solid rgba(255,255,255,0.07)",
                  fontSize:"0.65rem",fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:"var(--muted)"}}>
                  🎵 Full Album — {movie.title} ({songs.length} songs)
                </div>
                <div style={{padding:"6px"}}>
                  {songs.map((s,i) => (
                    <SongItem key={i} song={s} movieTitle={null}
                      active={i===currentSongIdx} onClick={()=>changeActiveSong(i)} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ══ RIGHT SIDEBAR: More from This Movie ══ */}
          <div style={{
            position:"sticky",top:80,
            background:"rgba(0,0,0,0.45)",
            border:"1px solid rgba(255,255,255,0.08)",
            borderRadius:12,overflow:"hidden",
            maxHeight:"calc(100vh - 100px)",
            display:"flex",flexDirection:"column",
          }}>
            {/* Movie info header — updates when related song from different movie plays */}
            <div style={{padding:"14px 14px 10px",borderBottom:"1px solid rgba(255,255,255,0.07)",flexShrink:0}}>
              <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
                {movie.posterUrl && (
                  <img src={movie.posterUrl} alt={movie.title}
                    style={{width:46,height:64,objectFit:"cover",borderRadius:5,border:"1px solid var(--border)",flexShrink:0,cursor:"pointer"}}
                    onClick={()=>navigate(`/movie/${movie._id}`)}
                    onError={e=>e.target.style.display="none"} />
                )}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:"0.86rem",lineHeight:1.3,cursor:"pointer",color:"var(--gold)"}}
                    onClick={()=>navigate(`/movie/${movie._id}`)}>{movie.title}</div>
                  {movie.releaseDate && <div style={{fontSize:"0.68rem",color:"var(--muted)",marginTop:3}}>{fmtDate(movie.releaseDate)}</div>}
                  {movie.language && <div style={{fontSize:"0.65rem",color:"rgba(201,151,58,0.7)",marginTop:2}}>{movie.language}</div>}
                </div>
              </div>
              <div style={{fontSize:"0.62rem",fontWeight:800,letterSpacing:"0.1em",textTransform:"uppercase",color:"var(--muted)"}}>
                🎵 {songs.length} song{songs.length!==1?"s":""} in this film
              </div>
            </div>

            {/* Scrollable song list */}
            <div style={{overflowY:"auto",flex:1,padding:"6px"}}>
              {songs.length === 0
                ? <div style={{padding:"20px 12px",color:"var(--muted)",fontSize:"0.82rem",textAlign:"center"}}>No songs</div>
                : songs.map((s,i) => (
                    <SongItem key={i} song={s} movieTitle={null}
                      active={i===currentSongIdx} onClick={()=>changeActiveSong(i)} />
                  ))
              }
            </div>

            {/* Footer CTA */}
            <div style={{padding:"10px 14px",borderTop:"1px solid rgba(255,255,255,0.07)",flexShrink:0}}>
              <button className="btn btn-outline btn-sm"
                style={{width:"100%",justifyContent:"center",fontSize:"0.76rem"}}
                onClick={()=>navigate(`/movie/${movie._id}`)}>
                🎬 View Full Movie Page
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════ BELOW: Artist sections ══════════ */}
      <div className="home-sections" style={{paddingTop:32,background:"var(--bg)"}}>

        {bySinger.length > 0 && (
          <SongScrollRow
            title={`🎤 More by ${activeSong.singer?.split(/[,&]/)[0]?.trim()}`}
            songs={bySinger.slice(0,15)}
            onSongClick={handleRelatedSongClick}
          />
        )}

        {byMusicDirector.length > 0 && (
          <SongScrollRow
            title={`🎼 More by ${activeSong.musicDirector?.split(/[,&]/)[0]?.trim()} (Music Director)`}
            songs={byMusicDirector.slice(0,15)}
            onSongClick={handleRelatedSongClick}
          />
        )}

        {byLyricist.length > 0 && (
          <SongScrollRow
            title={`✍️ More by ${activeSong.lyricist?.split(/[,&]/)[0]?.trim()} (Lyricist)`}
            songs={byLyricist.slice(0,15)}
            onSongClick={handleRelatedSongClick}
          />
        )}

        {/* Cast of this movie */}
        {movie.cast?.length > 0 && (
          <section className="home-section">
            <div className="home-section-header">
              <h2 className="home-section-title">🎭 Cast of {movie.title}</h2>
            </div>
            <div className="home-row">
              {movie.cast.map((c,i) => {
                const castId = c.castId?._id || c.castId;
                return (
                  <div key={i} className="home-card" style={{width:150,cursor:castId?"pointer":"default"}}
                    onClick={()=>castId&&navigate(`/cast/${castId}`)}>
                    <div className="home-card-img" style={{height:190}}>
                      {c.photo
                        ? <img src={c.photo} alt={c.name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"} />
                        : <div className="home-card-fallback">👤</div>}
                      <div className="home-card-overlay">
                        <span className="home-card-genre">{c.type||"Actor"}</span>
                      </div>
                    </div>
                    <div className="home-card-info">
                      <p className="home-card-title">{c.name}</p>
                      {c.role && <p className="home-card-date" style={{color:"var(--gold)"}}>{c.role}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Related movies */}
        {(() => {
          const related = allMovies
            .filter(m=>String(m._id)!==currentMovieId && movie.genre?.length && m.genre?.some(g=>movie.genre.includes(g)))
            .sort((a,b)=>new Date(b.releaseDate||0)-new Date(a.releaseDate||0))
            .slice(0,15);
          if (!related.length) return null;
          return (
            <section className="home-section">
              <div className="home-section-header">
                <h2 className="home-section-title">🎬 Related Films</h2>
              </div>
              <div className="home-row">
                {related.map(m=>(
                  <MiniMovieCard key={m._id} movie={m} onClick={()=>navigate(`/movie/${m._id}`)} />
                ))}
              </div>
            </section>
          );
        })()}

      </div>
    </div>
  );
}