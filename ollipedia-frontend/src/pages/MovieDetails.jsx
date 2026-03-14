import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { API, getToken } from "../api/api";

// ── Helpers ───────────────────────────────────────────────
function SafeImg({ src, alt, style }) {
  const [broken, setBroken] = React.useState(false);
  if (!src || broken) return null;
  return <img src={src} alt={alt} style={style} onError={() => setBroken(true)} />;
}
function SafeNewsImg({ src, alt }) {
  const [broken, setBroken] = React.useState(false);
  if (!src || broken) return null;
  return <div className="news-card-img"><img src={src} alt={alt} onError={() => setBroken(true)} /></div>;
}

const extractYtId = (input) => {
  if (!input) return null;
  const s = String(input).trim();
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return null;
};
const ytThumb = (id) => id ? `https://img.youtube.com/vi/${extractYtId(id)||id}/hqdefault.jpg` : null;

const VERDICT_COLOR = {
  "Blockbuster":"#95e5b8","Super Hit":"#95e5b8","Hit":"#95e5b8",
  "Average":"#e8c87a","Flop":"#e59595","Disaster":"#e59595","Upcoming":"#7aaae8",
};
const verdictClass = (v) => {
  if (!v) return "verdict-upcoming";
  const l = v.toLowerCase();
  if (["hit","super hit","blockbuster"].includes(l)) return "verdict-hit";
  if (["flop","disaster"].includes(l)) return "verdict-flop";
  if (l === "average") return "verdict-average";
  return "verdict-upcoming";
};
const stars = (n) => "★".repeat(Math.round(n||0)) + "☆".repeat(5-Math.round(n||0));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}) : "";

const GENRES = ["Action","Drama","Romance","Comedy","Thriller","Family","Historical","Devotional","Horror"];
const CATS   = ["Feature Film","Short Film","Web Series","Documentary"];
const VDICT  = ["Upcoming","Average","Hit","Super Hit","Blockbuster","Flop","Disaster"];
const NCATS  = ["Update","Release","Trailer","Song","Award","Interview","Other"];
const CTYPES = ["Actor","Actress","Director","Producer","Music Director","Cinematographer","Choreographer","Lyricist","Other"];

// ── Horizontal scroll row ─────────────────────────────────
function HomeRow({ title, tag, children }) {
  const ref = useRef(null);
  const slide = (n) => ref.current?.scrollBy({ left: n, behavior:"smooth" });
  return (
    <div className="home-section">
      <div className="home-section-header">
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <h2 className="home-section-title">{title}</h2>
          {tag && <span className="home-tag">{tag}</span>}
        </div>
        <div className="home-section-arrows">
          <button className="home-arrow" onClick={() => slide(-400)}>‹</button>
          <button className="home-arrow" onClick={() => slide(400)}>›</button>
        </div>
      </div>
      <div className="home-row" ref={ref}>{children}</div>
    </div>
  );
}

// ── Mini movie card ───────────────────────────────────────
function MiniMovieCard({ movie, onClick }) {
  const img = movie.posterUrl || movie.thumbnailUrl || ytThumb(movie.media?.trailer?.ytId);
  const verdict = movie.verdict || "Upcoming";
  const color = VERDICT_COLOR[verdict] || "#7aaae8";
  return (
    <div className="home-card" onClick={onClick}>
      <div className="home-card-img">
        {img ? <img src={img} alt={movie.title} loading="lazy" onError={e=>{e.target.style.display="none";}} /> : null}
        <div className="home-card-fallback" style={{display:img?"none":"flex"}}>🎬</div>
        <div className="home-card-play">▶</div>
        <div className="home-card-overlay">
          <span className="home-card-verdict" style={{color}}>{verdict}</span>
          {movie.genre?.[0] && <span className="home-card-genre">{movie.genre[0]}</span>}
        </div>
      </div>
      <div className="home-card-info">
        <p className="home-card-title">{movie.title}</p>
        <p className="home-card-date">{fmtDate(movie.releaseDate)}</p>
      </div>
    </div>
  );
}

// ── Mini cast card ────────────────────────────────────────
function MiniCastCard({ person, onClick }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="home-card" style={{width:150}} onClick={onClick}>
      <div className="home-card-img" style={{height:190}}>
        {person.photo && !broken
          ? <img src={person.photo} alt={person.name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={()=>setBroken(true)} />
          : <div className="home-card-fallback">👤</div>}
        <div className="home-card-overlay">
          <span className="home-card-genre">{person.type||"Actor"}</span>
        </div>
      </div>
      <div className="home-card-info">
        <p className="home-card-title">{person.name}</p>
        {person.role && <p className="home-card-date" style={{color:"var(--gold)"}}>{person.role}</p>}
      </div>
    </div>
  );
}

// ── News Modal ────────────────────────────────────────────
function NewsModal({ movieId, existing, onSave, onClose }) {
  const [form, setForm] = useState({ title:existing?.title||"", content:existing?.content||"", category:existing?.category||"Update", imageUrl:existing?.imageUrl||"" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const save = async () => {
    if (!form.title.trim()||!form.content.trim()) return setErr("Title and content required.");
    setSaving(true); setErr("");
    try { const r = existing ? await API.editNews(existing._id,form) : await API.addNews(movieId,form); onSave(r,!!existing); onClose(); }
    catch(e) { setErr(typeof e==="string"?e:"Failed"); } finally { setSaving(false); }
  };
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:540}}>
        <div className="modal-header"><span className="modal-title">{existing?"Edit News":"Add News"}</span><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={form.title} onChange={e=>set("title",e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Category</label><select className="form-select" value={form.category} onChange={e=>set("category",e.target.value)}>{NCATS.map(c=><option key={c}>{c}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Content *</label><textarea className="form-textarea" value={form.content} onChange={e=>set("content",e.target.value)} style={{minHeight:100}} /></div>
        <div className="form-group"><label className="form-label">Image URL</label><input className="form-input" value={form.imageUrl} onChange={e=>set("imageUrl",e.target.value)} placeholder="https://…" /></div>
        {err && <p style={{color:"var(--red)",fontSize:"0.82rem",marginBottom:8}}>{err}</p>}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-gold btn-sm" onClick={save} disabled={saving}>{saving?"Saving…":existing?"Save Changes":"Publish"}</button>
        </div>
      </div>
    </div>
  );
}

// ── Add Cast Modal ────────────────────────────────────────
function AddCastModal({ movieId, onAdded, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [mode, setMode] = useState("search");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newType, setNewType] = useState("Actor");
  const [newPhoto, setNewPhoto] = useState("");
  const [newBio, setNewBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const timer = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSearching(true);
      try { setResults(await API.searchCast(query)); } catch { setResults([]); } finally { setSearching(false); }
    }, 300);
  }, [query]);

  const addExisting = async (c) => {
    setSaving(true); setErr("");
    try { const up = await API.addCastToMovie(movieId,{castId:c._id,name:c.name,type:c.type,photo:c.photo||"",role:"",isNew:false}); onAdded(up); onClose(); }
    catch(e) { setErr(typeof e==="string"?e:"Failed"); setSaving(false); }
  };
  const addNew = async () => {
    if (!newName.trim()) return setErr("Name required.");
    setSaving(true); setErr("");
    try { const up = await API.addCastToMovie(movieId,{name:newName,type:newType,role:newRole,photo:newPhoto,bio:newBio,isNew:true}); onAdded(up); onClose(); }
    catch(e) { setErr(typeof e==="string"?e:"Failed"); setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:520}}>
        <div className="modal-header"><span className="modal-title">Add Cast / Crew</span><button className="modal-close" onClick={onClose}>×</button></div>
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          <button className={`btn btn-sm ${mode==="search"?"btn-gold":"btn-outline"}`} onClick={()=>setMode("search")}>Search Existing</button>
          <button className={`btn btn-sm ${mode==="new"?"btn-gold":"btn-outline"}`} onClick={()=>setMode("new")}>Add New Person</button>
        </div>
        {mode==="search" && (
          <>
            <input className="form-input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Type name to search…" autoFocus />
            {(results.length>0||searching) && (
              <div className="search-dropdown">
                {searching && <div className="search-dropdown-item muted">Searching…</div>}
                {results.map(c=>(
                  <div key={c._id} className="search-dropdown-item" onClick={()=>!saving&&addExisting(c)}>
                    <span style={{fontWeight:600}}>{c.name}</span>
                    <span style={{color:"var(--gold)",fontSize:"0.75rem",marginLeft:8}}>{c.type}</span>
                    <span style={{color:"var(--muted)",fontSize:"0.75rem",marginLeft:8}}>{c.movies?.length||0} films</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {mode==="new" && (
          <>
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={newName} onChange={e=>setNewName(e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Role / Character</label><input className="form-input" value={newRole} onChange={e=>setNewRole(e.target.value)} /></div>
            </div>
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Type</label><select className="form-select" value={newType} onChange={e=>setNewType(e.target.value)}>{CTYPES.map(t=><option key={t}>{t}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Photo URL</label><input className="form-input" value={newPhoto} onChange={e=>setNewPhoto(e.target.value)} /></div>
            </div>
            <div className="form-group"><label className="form-label">Bio (optional)</label><input className="form-input" value={newBio} onChange={e=>setNewBio(e.target.value)} /></div>
            {err && <p style={{color:"var(--red)",fontSize:"0.82rem",marginBottom:8}}>{err}</p>}
            <button className="btn btn-gold btn-sm" onClick={addNew} disabled={saving||!newName.trim()}>{saving?"Adding…":"+ Add to Movie"}</button>
          </>
        )}
        {mode==="search"&&err && <p style={{color:"var(--red)",fontSize:"0.82rem",marginTop:8}}>{err}</p>}
      </div>
    </div>
  );
}

// ── Add Song Modal ────────────────────────────────────────
function AddSongModal({ movieId, onAdded, onClose }) {
  const [title, setTitle] = useState("");
  const [singer, setSinger] = useState("");
  const [ytId, setYtId] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const save = async () => {
    if (!title.trim()) return setErr("Song title required.");
    setSaving(true); setErr("");
    try { const up = await API.addSong(movieId,{title:title.trim(),singer:singer.trim(),ytId:ytId.trim()}); onAdded(up); onClose(); }
    catch(e) { setErr(typeof e==="string"?e:"Failed"); setSaving(false); }
  };
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:440}}>
        <div className="modal-header"><span className="modal-title">Add Song</span><button className="modal-close" onClick={onClose}>×</button></div>
        <div className="form-group"><label className="form-label">Song Title *</label><input className="form-input" value={title} onChange={e=>setTitle(e.target.value)} autoFocus /></div>
        <div className="form-group"><label className="form-label">Singer(s)</label><input className="form-input" value={singer} onChange={e=>setSinger(e.target.value)} /></div>
        <div className="form-group"><label className="form-label">YouTube ID</label><input className="form-input" value={ytId} onChange={e=>setYtId(e.target.value)} placeholder="e.g. dQw4w9WgXcQ" /></div>
        {ytId && <div className="trailer-embed" style={{maxWidth:380,marginBottom:12}}><iframe src={`https://www.youtube.com/embed/${ytId}`} allowFullScreen title="preview" /></div>}
        {err && <p style={{color:"var(--red)",fontSize:"0.82rem",marginBottom:8}}>{err}</p>}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-gold btn-sm" onClick={save} disabled={saving||!title.trim()}>{saving?"Adding…":"+ Add Song"}</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════
export default function MovieDetails({ production, onToast, portalMode }) {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const location     = useLocation();
  const trailerRef   = useRef(null);

  const [movie,    setMovie]   = useState(null);
  const [allMovies, setAllMovies] = useState([]);
  const [tab,      setTab]     = useState("overview");
  const [loading,  setLoading] = useState(true);
  const [error,    setError]   = useState(null);

  const isOwner  = !!(getToken()&&production&&movie&&String(movie.productionId?._id||movie.productionId)===String(production._id));
  const isCollab = !!(getToken()&&production&&movie&&(movie.collaborators||[]).some(c=>String(c._id||c)===String(production._id)));
  const canNews  = isOwner||isCollab;

  const [editing,    setEditing]    = useState(false);
  const [editForm,   setEditForm]   = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [editBO,     setEditBO]     = useState(false);
  const [boForm,     setBoForm]     = useState({});
  const [savingBO,   setSavingBO]   = useState(false);
  const [newsModal,    setNewsModal]    = useState(false);
  const [editingNews,  setEditingNews]  = useState(null);
  const [addCastModal, setAddCastModal] = useState(false);
  const [addSongModal, setAddSongModal] = useState(false);
  const [editTrailer,  setEditTrailer]  = useState(false);
  const [trailerInput, setTrailerInput] = useState("");
  const [savingTrailer, setSavingTrailer] = useState(false);
  const [rvUser, setRvUser] = useState("");
  const [rvRating, setRvRating] = useState(5);
  const [rvText, setRvText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    // Load movie first for fast render, then fetch all movies in background
    API.getMovie(id)
      .then(m => {
        setMovie(m);
        setEditForm({...m});
        setBoForm({...(m.boxOffice||{}), verdict: m.verdict});
        setTrailerInput(m.media?.trailer?.ytId||"");
        setLoading(false);
        API.getMovies().catch(()=>[]).then(all => setAllMovies(all));
      })
      .catch(e => { setError(typeof e==="string"?e:"Failed to load"); setLoading(false); });
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // ── Scroll to trailer if navigated here with scrollTo:"trailer" state ──
  useEffect(() => {
    if (location.state?.scrollTo === "trailer" && !loading && movie) {
      // Switch to overview tab (where the embedded trailer lives)
      setTab("overview");
      // Small delay so the tab content renders before we scroll
      setTimeout(() => {
        trailerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
      // Clear the state so a manual tab-switch later doesn't re-trigger
      window.history.replaceState({}, "");
    }
  }, [location.state, loading, movie]);

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      const up = await API.updateMovie(id,{
        title:editForm.title, category:editForm.category, genre:editForm.genre,
        releaseDate:editForm.releaseDate, releaseTBA:editForm.releaseTBA,
        director:editForm.director, producer:editForm.producer,
        budget:editForm.budget, language:editForm.language,
        synopsis:editForm.synopsis, posterUrl:editForm.posterUrl,
        thumbnailUrl:editForm.thumbnailUrl,
        runtime:editForm.runtime, imdbId:editForm.imdbId, imdbRating:editForm.imdbRating,
        verdict:editForm.verdict,
      });
      setMovie(m=>({...m,...up})); setEditing(false);
      onToast&&onToast("Movie updated!");
    } catch(e) { onToast&&onToast(typeof e==="string"?e:"Save failed","error"); }
    finally { setSavingEdit(false); }
  };

  const saveBO = async () => {
    setSavingBO(true);
    try { const up = await API.updateBoxOffice(id,boForm); setMovie(m=>({...m,...up})); setEditBO(false); onToast&&onToast("Box office updated!"); }
    catch(e) { onToast&&onToast(typeof e==="string"?e:"Save failed","error"); }
    finally { setSavingBO(false); }
  };

  const saveTrailer = async () => {
    setSavingTrailer(true);
    try { const up = await API.updateTrailer(id,{ytId:trailerInput.trim()}); setMovie(m=>({...m,media:{...m.media,trailer:{ytId:trailerInput.trim()}}})); setEditTrailer(false); onToast&&onToast("Trailer updated!"); }
    catch(e) { onToast&&onToast(typeof e==="string"?e:"Save failed","error"); }
    finally { setSavingTrailer(false); }
  };

  const removeCast = async (castId) => {
    if (!window.confirm("Remove this person?")) return;
    try { const up = await API.removeCastFromMovie(id,castId); setMovie(m=>({...m,cast:up.cast})); onToast&&onToast("Removed."); }
    catch(e) { onToast&&onToast(typeof e==="string"?e:"Failed","error"); }
  };

  const removeSong = async (index) => {
    if (!window.confirm("Remove this song?")) return;
    try { const up = await API.removeSong(id,index); setMovie(m=>({...m,media:up.media})); onToast&&onToast("Song removed."); }
    catch(e) { onToast&&onToast(typeof e==="string"?e:"Failed","error"); }
  };

  const handleNewsSaved = (item, isEdit) => {
    setMovie(m=>({...m, news:isEdit?(m.news||[]).map(n=>n._id===item._id?item:n):[...(m.news||[]),item]}));
    onToast&&onToast(isEdit?"News updated!":"News published!");
  };

  const handleDeleteNews = async (newsId) => {
    if (!window.confirm("Delete this article?")) return;
    try { await API.deleteNews(newsId); setMovie(m=>({...m,news:(m.news||[]).filter(n=>n._id!==newsId)})); onToast&&onToast("News deleted."); }
    catch(e) { onToast&&onToast(typeof e==="string"?e:"Failed","error"); }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!rvUser.trim()||!rvText.trim()) return;
    setSubmitting(true);
    try { const reviews = await API.postReview(id,{user:rvUser,rating:rvRating,text:rvText}); setMovie(m=>({...m,reviews})); setRvUser(""); setRvText(""); setRvRating(5); onToast&&onToast("Review submitted!"); }
    catch { onToast&&onToast("Failed","error"); }
    finally { setSubmitting(false); }
  };

  // ── Loading/Error ─────────────────────────────────────
  if (loading) return (
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--muted)"}}>
      <div style={{textAlign:"center"}}>
        <div className="skeleton" style={{width:300,height:450,borderRadius:12,margin:"0 auto 24px"}} />
        <div className="skeleton" style={{height:20,width:200,margin:"0 auto 12px"}} />
        <div className="skeleton" style={{height:40,width:320,margin:"0 auto"}} />
      </div>
    </div>
  );
  if (error||!movie) return (
    <div className="page empty-state"><h3>Movie not found</h3><p>{error}</p>
      <Link to="/movies" className="btn btn-outline" style={{marginTop:16}}>← Back to Movies</Link>
    </div>
  );

  const avgRating = movie.reviews?.length
    ? (movie.reviews.reduce((s,r)=>s+r.rating,0)/movie.reviews.length).toFixed(1) : null;

  const setE = (k,v) => setEditForm(f=>({...f,[k]:v}));
  const setBo = (k,v) => setBoForm(f=>({...f,[k]:v}));
  const toggleGenre = (g) => setE("genre",(editForm.genre||[]).includes(g)?(editForm.genre||[]).filter(x=>x!==g):[...(editForm.genre||[]),g]);

  const crew   = (movie.cast||[]).filter(c=>["Director","Producer","Music Director","Cinematographer","Choreographer","Lyricist"].includes(c.type));
  const actors = (movie.cast||[]).filter(c=>!["Director","Producer","Music Director","Cinematographer","Choreographer","Lyricist"].includes(c.type));

  // Banner = thumbnailUrl > posterUrl > ytThumb
  const bannerImg = movie.thumbnailUrl || ytThumb(movie.media?.trailer?.ytId) || movie.posterUrl;
  const verdictColor = VERDICT_COLOR[movie.verdict] || "#7aaae8";

  // Related movies — same genre or same director, exclude self
  const relatedMovies = allMovies
    .filter(m => m._id !== id && (
      (movie.genre?.length && m.genre?.some(g => movie.genre.includes(g))) ||
      (movie.director && m.director === movie.director)
    ))
    .sort((a,b) => new Date(b.releaseDate||0) - new Date(a.releaseDate||0))
    .slice(0, 15);

  const sameDirector = allMovies
    .filter(m => m._id !== id && movie.director && m.director === movie.director)
    .sort((a,b) => new Date(b.releaseDate||0) - new Date(a.releaseDate||0))
    .slice(0, 12);

  return (
    <div className="home-root" style={{minHeight:"100vh"}}>

      {/* ══════════════════════════════════════════════════
          HERO BANNER — full-width background
      ══════════════════════════════════════════════════ */}
      <div style={{
        position:"relative",
        width:"100%",
        minHeight:"auto",
        background:"#0f0f0f",
        marginTop:-60,
        paddingTop:60,
        overflow:"hidden",
      }}>
        {/* Blurred background banner */}
        {bannerImg && (
          <div style={{
            position:"absolute", inset:0,
            backgroundImage:`url(${bannerImg})`,
            backgroundSize:"cover",
            backgroundPosition:"center top",
            filter:"blur(22px) brightness(0.25) saturate(1.4)",
            transform:"scale(1.08)",
          }} />
        )}
        {/* Gradient overlays */}
        <div style={{
          position:"absolute", inset:0,
          background:"linear-gradient(to right, rgba(0,0,0,0.95) 40%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0.15) 100%), linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.5) 35%, transparent 65%)",
        }} />

        {/* ── Back link ── */}
        <div style={{position:"relative",zIndex:3,padding:"24px 28px 0"}}>
          <Link to="/movies" className="btn btn-ghost btn-sm" style={{opacity:0.7}}>← All Films</Link>
        </div>

        {/* ── Hero content ── */}
        <div style={{
          position:"relative", zIndex:3,
          display:"flex", gap:36, alignItems:"flex-start",
          padding:"28px 28px 52px",
        }}>
          {/* Poster */}
          <div style={{
            flexShrink:0, width:220, borderRadius:12,
            overflow:"hidden", boxShadow:"0 24px 60px rgba(0,0,0,0.7)",
            border:"1px solid rgba(255,255,255,0.1)",
          }}>
            {movie.posterUrl
              ? <img src={movie.posterUrl} alt={movie.title} style={{width:"100%",display:"block"}}
                  onError={e=>e.target.style.display="none"} />
              : <div style={{width:240,height:360,background:"var(--bg3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"4rem"}}>🎬</div>
            }
          </div>

          {/* Info */}
          <div style={{flex:1, minWidth:0}}>
            {/* Category · Language */}
            <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
              <span className="home-tag">{movie.category||"Feature Film"}</span>
              {movie.language && <span className="home-tag-outline">{movie.language}</span>}
              {movie.genre?.map(g => <span key={g} className="home-tag-outline">{g}</span>)}
            </div>

            {/* Title */}
            <h1 style={{
              fontFamily:"'Playfair Display',serif",
              fontSize:"clamp(2rem,5vw,3.6rem)",
              fontWeight:900, lineHeight:1.05,
              margin:"0 0 12px",
              textShadow:"0 2px 20px rgba(0,0,0,0.6)",
            }}>{movie.title}</h1>

            {/* Rating + Verdict */}
            <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16,flexWrap:"wrap"}}>
              {avgRating && (
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{color:"var(--gold)",fontSize:"1.3rem",fontWeight:700}}>{avgRating}</span>
                  <span style={{color:"var(--gold)",fontSize:"0.85rem"}}>{stars(avgRating)}</span>
                  <span style={{color:"var(--muted)",fontSize:"0.78rem"}}>({movie.reviews.length})</span>
                </div>
              )}
              <span style={{
                background:`${verdictColor}22`, border:`1px solid ${verdictColor}`,
                color:verdictColor, fontSize:"0.72rem", fontWeight:700,
                padding:"3px 12px", borderRadius:3, letterSpacing:"0.08em", textTransform:"uppercase",
              }}>{movie.verdict||"Upcoming"}</span>
            </div>

            {/* Meta row */}
            <div className="home-hero-info" style={{marginBottom:16}}>
              {movie.director && <span>🎬 Dir. {movie.director}</span>}
              {movie.producer && <span>🎥 {movie.producer}</span>}
              {(movie.releaseDate||movie.releaseTBA) && <span>🗓 {movie.releaseTBA?"TBA":fmtDate(movie.releaseDate)}</span>}
              {movie.runtime   && <span>⏱ {movie.runtime}</span>}
              {movie.budget    && <span>💰 {movie.budget}</span>}
              {movie.boxOffice?.total && <span>📊 {movie.boxOffice.total}</span>}
              {movie.imdbRating && (
                <span style={{display:"flex",alignItems:"center",gap:4}}>
                  <span style={{color:"#f5c518",fontWeight:700}}>IMDb</span>
                  <span style={{fontWeight:700,}}>{movie.imdbRating}</span>
                </span>
              )}
            </div>

            {/* Production chips */}
            {(movie.productionId||(movie.collaborators||[]).length>0) && (
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
                {movie.productionId && (
                  <Link to={`/production/${movie.productionId._id||movie.productionId}`} className="prod-chip">
                    {movie.productionId.logo && <SafeImg src={movie.productionId.logo} alt="" style={{width:18,height:18,borderRadius:3,objectFit:"cover"}} />}
                    <span>{movie.productionId.name}</span>
                  </Link>
                )}
                {(movie.collaborators||[]).map(c=>(
                  <Link key={c._id||c} to={`/production/${c._id||c}`} className="prod-chip prod-chip-collab">
                    {c.logo&&<SafeImg src={c.logo} alt="" style={{width:18,height:18,borderRadius:3,objectFit:"cover"}} />}
                    <span>{c.name}</span>
                  </Link>
                ))}
              </div>
            )}

            {/* Synopsis */}
            {movie.synopsis && (
              <p style={{
                fontSize:"0.9rem", color:"rgba(255,255,255,0.72)",
                lineHeight:1.7, maxWidth:600, margin:"0 0 22px",
              }}>{movie.synopsis.slice(0,220)}{movie.synopsis.length>220?"…":""}</p>
            )}

            {/* Action buttons */}
            <div className="home-hero-actions">
              {movie.media?.trailer?.ytId && (
                <button className="btn-hero-play" onClick={() => {
                  setTab("overview");
                  setTimeout(() => trailerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
                }}>▶ Watch Trailer</button>
              )}
              <button className="btn-hero-info" onClick={() => setTab("cast")}>👥 Cast</button>
              <button className="btn-hero-info" onClick={() => setTab("media")}>🎵 Songs</button>
              {isOwner && (
                <button className="btn btn-gold btn-sm" onClick={()=>{setEditing(true);setTab("overview");}}>✏ Edit</button>
              )}
            </div>
          </div>

          {/* Box office sidebar (desktop) */}
          {(movie.boxOffice?.opening||movie.boxOffice?.total) && (
            <div style={{
              flexShrink:0, width:180,
              background:"rgba(255,255,255,0.04)",
              border:"1px solid rgba(255,255,255,0.08)",
              borderRadius:10, padding:20,
            }}>
              <div style={{fontSize:"0.65rem",fontWeight:800,letterSpacing:"0.1em",color:"var(--muted)",textTransform:"uppercase",marginBottom:14}}>Box Office</div>
              {movie.boxOffice.opening && <div style={{marginBottom:12}}><div style={{fontSize:"0.65rem",color:"var(--muted)",marginBottom:2}}>Opening</div><div style={{fontWeight:700,color:"var(--gold)"}}>{movie.boxOffice.opening}</div></div>}
              {movie.boxOffice.firstWeek && <div style={{marginBottom:12}}><div style={{fontSize:"0.65rem",color:"var(--muted)",marginBottom:2}}>First Week</div><div style={{fontWeight:700,color:"var(--gold)"}}>{movie.boxOffice.firstWeek}</div></div>}
              {movie.boxOffice.total && <div><div style={{fontSize:"0.65rem",color:"var(--muted)",marginBottom:2}}>Total</div><div style={{fontWeight:800,color:"var(--gold)",fontSize:"1.1rem"}}>{movie.boxOffice.total}</div></div>}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          TABS
      ══════════════════════════════════════════════════ */}
      <div style={{
        borderBottom:"1px solid var(--border)",
        background:"rgba(15,15,15,0.95)",
backdropFilter:"blur(12px)",
        position:"sticky", top:60, zIndex:10,
boxShadow:"0 1px 0 rgba(255,255,255,0.08)",
        padding:"0 20px",
      }}>
        <div className="tabs" style={{margin:0,border:"none"}}>
          {["overview","cast","media","boxoffice","news","reviews"].map(t=>(
            <button key={t} className={`tab ${tab===t?"active":""}`}
              onClick={()=>{setTab(t);setEditing(false);setEditBO(false);}}>
              {t==="boxoffice"?"Box Office":t.charAt(0).toUpperCase()+t.slice(1)}
              {t==="reviews"&&movie.reviews?.length?` (${movie.reviews.length})`:""}
              {t==="news"&&movie.news?.length?` (${movie.news.length})`:""}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          TAB CONTENT
      ══════════════════════════════════════════════════ */}
      <div style={{background:"var(--bg)",minHeight:400}}>

        {/* ── OVERVIEW ── */}
        {tab==="overview" && !editing && (
          <div style={{padding:"32px 24px",maxWidth:980}}>
            {movie.synopsis
              ? <p style={{color:"#b0a898",lineHeight:1.8,fontSize:"0.98rem",marginBottom:32}}>{movie.synopsis}</p>
              : <p style={{color:"var(--muted)"}}>No synopsis available.</p>}

            {/* ── Quick cast & crew strip ── */}
            {(movie.cast||[]).length>0 && (
              <div style={{marginBottom:36}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
                  <h3 style={{fontSize:"0.72rem",fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:"var(--muted)",margin:0}}>Cast & Crew</h3>
                  <button className="btn btn-ghost btn-sm" style={{fontSize:"0.72rem"}} onClick={()=>setTab("cast")}>See all →</button>
                </div>
                {/* Directors / key crew row */}
                {crew.length>0 && (
                  <div style={{display:"flex",flexWrap:"wrap",gap:10,marginBottom:14}}>
                    {crew.slice(0,6).map((c,i)=>(
                      <div key={c.castId||i} style={{display:"flex",alignItems:"center",gap:8,background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:8,padding:"7px 12px",cursor:c.castId?"pointer":"default"}}
                        onClick={()=>c.castId&&navigate(`/cast/${c.castId}`)}>
                        <div style={{width:32,height:32,borderRadius:"50%",overflow:"hidden",flexShrink:0,background:"var(--bg3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.9rem"}}>
                          {c.photo?<img src={c.photo} alt={c.name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>:"👤"}
                        </div>
                        <div>
                          <div style={{fontWeight:700,fontSize:"0.82rem",lineHeight:1.2}}>{c.name}</div>
                          <div style={{fontSize:"0.62rem",color:"var(--gold)",fontWeight:600}}>{c.type}{c.role?` · ${c.role}`:""}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Actors scroll row */}
                {actors.length>0 && (
                  <div style={{display:"flex",gap:12,overflowX:"auto",paddingBottom:8}}>
                    {actors.slice(0,12).map((c,i)=>(
                      <div key={c.castId||i} style={{flexShrink:0,width:90,cursor:c.castId?"pointer":"default",textAlign:"center"}}
                        onClick={()=>c.castId&&navigate(`/cast/${c.castId}`)}>
                        <div style={{width:72,height:72,borderRadius:"50%",overflow:"hidden",background:"var(--bg3)",margin:"0 auto 6px",border:"2px solid var(--border)",transition:"border-color 0.15s",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.6rem"}}
                          onMouseEnter={e=>e.currentTarget.style.borderColor="var(--gold)"}
                          onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
                          {c.photo?<img src={c.photo} alt={c.name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>:"👤"}
                        </div>
                        <div style={{fontSize:"0.72rem",fontWeight:600,lineHeight:1.3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</div>
                        {c.role&&<div style={{fontSize:"0.62rem",color:"var(--gold)",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.role}</div>}
                      </div>
                    ))}
                    {actors.length>12&&(
                      <div style={{flexShrink:0,width:90,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6}}
                        onClick={()=>setTab("cast")}>
                        <div style={{width:72,height:72,borderRadius:"50%",background:"rgba(201,151,58,0.1)",border:"2px dashed var(--gold)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:"1.4rem"}}>+{actors.length-12}</div>
                        <div style={{fontSize:"0.7rem",color:"var(--gold)"}}>more</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── Songs preview strip ── */}
            {(movie.media?.songs||[]).length>0 && (
              <div style={{marginBottom:36}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <h3 style={{fontSize:"0.72rem",fontWeight:800,letterSpacing:"0.12em",textTransform:"uppercase",color:"var(--muted)",margin:0}}>Songs ({movie.media.songs.length})</h3>
                  <button className="btn btn-ghost btn-sm" style={{fontSize:"0.72rem"}} onClick={()=>setTab("media")}>See all →</button>
                </div>
                <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:4}}>
                  {movie.media.songs.slice(0,8).map((s,i)=>(
                    <div key={i} style={{flexShrink:0,width:130,cursor:"pointer",borderRadius:8,overflow:"hidden",background:"var(--bg2)",border:"1px solid var(--border)",transition:"border-color 0.15s"}}
                      onClick={()=>navigate(`/song/${id}/${i}`)}
                      onMouseEnter={e=>e.currentTarget.style.borderColor="var(--gold)"}
                      onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
                      <div style={{width:"100%",height:80,background:"var(--bg3)",position:"relative",overflow:"hidden"}}>
                        {s.ytId&&<img src={`https://img.youtube.com/vi/${s.ytId}/mqdefault.jpg`} alt={s.title} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.opacity="0.3"}/>}
                        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.25)",fontSize:"1.4rem"}}>♪</div>
                      </div>
                      <div style={{padding:"6px 8px"}}>
                        <div style={{fontWeight:600,fontSize:"0.75rem",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.title}</div>
                        {s.singer&&<div style={{fontSize:"0.64rem",color:"var(--gold)",marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.singer}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {movie.media?.trailer?.ytId && (
              <>
                <h3 className="section-sub-title" style={{marginBottom:16}}>Official Trailer</h3>
                <div ref={trailerRef} className="trailer-embed" style={{maxWidth:720,marginBottom:32}}>
                  <iframe src={`https://www.youtube.com/embed/${movie.media.trailer.ytId}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen title="Trailer" />
                </div>
              </>
            )}
            {isOwner && (
              <div style={{display:"flex",gap:10,flexWrap:"wrap",paddingTop:16,borderTop:"1px solid var(--border)"}}>
                <button className="btn btn-gold btn-sm" onClick={()=>setEditing(true)}>✏ Edit Details</button>
                <button className="btn btn-outline btn-sm" onClick={()=>{setEditBO(true);setTab("boxoffice");}}>📊 Box Office</button>
              </div>
            )}
          </div>
        )}

        {/* ── OVERVIEW EDIT ── */}
        {tab==="overview" && editing && (
          <div style={{padding:"32px 24px",maxWidth:900}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
              <h3 style={{fontSize:"1rem",textTransform:"uppercase",letterSpacing:"0.08em",color:"var(--muted)"}}>Edit Movie Details</h3>
              <div style={{display:"flex",gap:10}}>
                <button className="btn btn-ghost btn-sm" onClick={()=>setEditing(false)}>Cancel</button>
                <button className="btn btn-gold btn-sm" onClick={saveEdit} disabled={savingEdit}>{savingEdit?"Saving…":"Save Changes"}</button>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={editForm.title||""} onChange={e=>setE("title",e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Language</label><input className="form-input" value={editForm.language||""} onChange={e=>setE("language",e.target.value)} /></div>
            </div>
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Category</label><select className="form-select" value={editForm.category||""} onChange={e=>setE("category",e.target.value)}>{CATS.map(c=><option key={c}>{c}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Release Date</label>
                <input className="form-input" type="date" value={editForm.releaseDate||""} onChange={e=>setE("releaseDate",e.target.value)} disabled={editForm.releaseTBA} />
                <label style={{marginTop:6,display:"flex",alignItems:"center",gap:6,fontSize:"0.8rem",color:"var(--muted)",cursor:"pointer"}}>
                  <input type="checkbox" checked={!!editForm.releaseTBA} onChange={e=>setE("releaseTBA",e.target.checked)} /> TBA
                </label>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Budget</label><input className="form-input" value={editForm.budget||""} onChange={e=>setE("budget",e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Runtime</label><input className="form-input" value={editForm.runtime||""} onChange={e=>setE("runtime",e.target.value)} placeholder="e.g. 2h 15m" /></div>
            </div>
            <div className="form-grid">
              <div className="form-group"><label className="form-label">IMDb ID</label><input className="form-input" value={editForm.imdbId||""} onChange={e=>setE("imdbId",e.target.value)} placeholder="tt1234567" /></div>
              <div className="form-group"><label className="form-label">IMDb Rating</label><input className="form-input" value={editForm.imdbRating||""} onChange={e=>setE("imdbRating",e.target.value)} placeholder="7.5" /></div>
            </div>
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Poster URL</label><input className="form-input" value={editForm.posterUrl||""} onChange={e=>setE("posterUrl",e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Verdict</label><select className="form-select" value={editForm.verdict||"Upcoming"} onChange={e=>setE("verdict",e.target.value)}>{VDICT.map(v=><option key={v}>{v}</option>)}</select></div>
            </div>
            <div className="form-group"><label className="form-label">Genres</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {GENRES.map(g=>(
                  <button key={g} type="button" className="badge" onClick={()=>toggleGenre(g)}
                    style={{cursor:"pointer",borderColor:(editForm.genre||[]).includes(g)?"var(--gold)":"var(--border)",color:(editForm.genre||[]).includes(g)?"var(--gold)":"var(--muted)"}}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group"><label className="form-label">Synopsis</label><textarea className="form-textarea" value={editForm.synopsis||""} onChange={e=>setE("synopsis",e.target.value)} style={{minHeight:100}} /></div>
          </div>
        )}

        {/* ── CAST ── */}
        {tab==="cast" && (
          <div style={{padding:"32px 24px"}}>
            {isOwner && (
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:28}}>
                <button className="btn btn-gold btn-sm" onClick={()=>setAddCastModal(true)}>+ Add Cast / Crew</button>
              </div>
            )}
            {!crew.length&&!actors.length ? (
              <div style={{textAlign:"center",padding:"60px 0",color:"var(--muted)"}}>
                <div style={{fontSize:"3rem",marginBottom:16}}>🎭</div>
                <p style={{marginBottom:isOwner?16:0}}>No cast information yet.</p>
                {isOwner&&<button className="btn btn-gold btn-sm" onClick={()=>setAddCastModal(true)}>+ Add Cast / Crew</button>}
              </div>
            ) : (
              <>
                {/* ── KEY CREW ── */}
                {crew.length>0 && (
                  <div style={{marginBottom:40}}>
                    <h3 style={{fontSize:"0.7rem",fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:"var(--muted)",marginBottom:16,paddingBottom:8,borderBottom:"1px solid var(--border)"}}>Crew</h3>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:12}}>
                      {crew.map((c,i)=>(
                        <div key={c.castId||i}
                          style={{display:"flex",alignItems:"center",gap:14,background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:10,padding:"12px 16px",cursor:c.castId?"pointer":"default",transition:"border-color 0.15s"}}
                          onClick={()=>c.castId&&navigate(portalMode?`/portal/cast/${c.castId}`:`/cast/${c.castId}`)}
                          onMouseEnter={e=>{ if(c.castId) e.currentTarget.style.borderColor="var(--gold)"; }}
                          onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}>
                          <div style={{width:48,height:48,borderRadius:"50%",overflow:"hidden",flexShrink:0,background:"var(--bg3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.3rem",border:"2px solid var(--border)"}}>
                            {c.photo?<img src={c.photo} alt={c.name} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>:"👤"}
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontWeight:700,fontSize:"0.9rem",lineHeight:1.3}}>{c.name}</div>
                            <div style={{fontSize:"0.68rem",color:"var(--gold)",fontWeight:600,marginTop:2}}>{c.type}</div>
                            {c.role&&<div style={{fontSize:"0.65rem",color:"var(--muted)",marginTop:1}}>{c.role}</div>}
                          </div>
                          {isOwner&&<button style={{background:"none",border:"none",color:"var(--red)",cursor:"pointer",fontSize:"0.8rem",padding:"2px 6px",opacity:0.6,flexShrink:0}}
                            onClick={e=>{e.stopPropagation();removeCast(String(c.castId));}} title="Remove">✕</button>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── CAST CARDS ── */}
                {actors.length>0 && (
                  <div>
                    <h3 style={{fontSize:"0.7rem",fontWeight:800,letterSpacing:"0.14em",textTransform:"uppercase",color:"var(--muted)",marginBottom:16,paddingBottom:8,borderBottom:"1px solid var(--border)"}}>Cast</h3>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:16}}>
                      {actors.map((c,i)=>(
                        <div key={c.castId||i}
                          style={{cursor:c.castId?"pointer":"default",textAlign:"center",position:"relative"}}
                          onClick={()=>c.castId&&navigate(portalMode?`/portal/cast/${c.castId}`:`/cast/${c.castId}`)}>
                          {/* Remove button */}
                          {isOwner&&<button style={{position:"absolute",top:4,right:4,zIndex:5,background:"rgba(0,0,0,0.7)",border:"none",color:"var(--red)",cursor:"pointer",width:22,height:22,borderRadius:"50%",fontSize:"0.75rem",display:"flex",alignItems:"center",justifyContent:"center",opacity:0,transition:"opacity 0.15s"}}
                            onClick={e=>{e.stopPropagation();removeCast(String(c.castId));}}
                            onMouseEnter={e=>e.currentTarget.style.opacity="1"}
                            ref={el=>{
                              if(!el) return;
                              const parent=el.closest('[data-cast-card]');
                              if(parent){parent.addEventListener('mouseenter',()=>el.style.opacity='1');parent.addEventListener('mouseleave',()=>el.style.opacity='0');}
                            }}>✕</button>}
                          <div data-cast-card=""
                            style={{borderRadius:10,overflow:"hidden",background:"var(--bg2)",border:"1px solid var(--border)",transition:"border-color 0.15s,transform 0.15s"}}
                            onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--gold)";e.currentTarget.style.transform="translateY(-3px)";const btn=e.currentTarget.previousSibling;if(btn&&isOwner)btn.style.opacity="1";}}
                            onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.transform="none";const btn=e.currentTarget.previousSibling;if(btn&&isOwner)btn.style.opacity="0";}}>
                            <div style={{width:"100%",aspectRatio:"2/3",background:"var(--bg3)",overflow:"hidden",position:"relative"}}>
                              {c.photo
                                ?<img src={c.photo} alt={c.name} style={{width:"100%",height:"100%",objectFit:"cover",objectPosition:"top"}} onError={e=>e.target.style.display="none"}/>
                                :<div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"2.5rem"}}>👤</div>}
                              <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"20px 8px 8px",background:"linear-gradient(to top,rgba(0,0,0,0.8),transparent)"}}>
                                <div style={{fontSize:"0.62rem",color:"var(--gold)",fontWeight:700}}>{c.type||"Actor"}</div>
                              </div>
                            </div>
                            <div style={{padding:"8px 10px"}}>
                              <div style={{fontWeight:700,fontSize:"0.78rem",lineHeight:1.3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{c.name}</div>
                              {c.role&&<div style={{fontSize:"0.65rem",color:"var(--muted)",marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>as {c.role}</div>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── MEDIA ── */}
        {tab==="media" && (
          <div style={{padding:"32px 24px"}}>
            {/* Trailer */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <h3 className="section-sub-title" style={{margin:0}}>Trailer</h3>
              {isOwner&&<button className="btn btn-outline btn-sm" onClick={()=>{setTrailerInput(movie.media?.trailer?.ytId||"");setEditTrailer(t=>!t);}}>{editTrailer?"Cancel":"✏ Edit"}</button>}
            </div>
            {editTrailer && (
              <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:16}}>
                <input className="form-input" style={{flex:1}} value={trailerInput} onChange={e=>setTrailerInput(e.target.value)} placeholder="YouTube ID" />
                <button className="btn btn-gold btn-sm" onClick={saveTrailer} disabled={savingTrailer}>{savingTrailer?"Saving…":"Save"}</button>
              </div>
            )}
            {movie.media?.trailer?.ytId
              ? <div className="trailer-embed" style={{maxWidth:720,marginBottom:40}}><iframe src={`https://www.youtube.com/embed/${movie.media.trailer.ytId}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Trailer" /></div>
              : <p style={{color:"var(--muted)",marginBottom:40}}>No trailer added yet.</p>}

            {/* Songs */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h3 className="section-sub-title" style={{margin:0}}>
                Songs {movie.media?.songs?.length ? <span style={{color:"var(--gold)",fontSize:"0.85em"}}>({movie.media.songs.length})</span> : ""}
              </h3>
              {isOwner&&<button className="btn btn-outline btn-sm" onClick={()=>setAddSongModal(true)}>+ Add Song</button>}
            </div>
            {(movie.media?.songs||[]).length>0 ? (
              <div style={{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:12,overflow:"hidden"}}>
                {movie.media.songs.map((s,i)=>(
                  <div key={i}
                    style={{display:"flex",alignItems:"center",gap:0,borderBottom:i<movie.media.songs.length-1?"1px solid rgba(255,255,255,0.05)":"none",cursor:"pointer",transition:"background 0.12s"}}
                    onClick={()=>navigate(`/song/${id}/${i}`)}
                    onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.04)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    {/* Track number */}
                    <div style={{width:44,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--muted)",fontSize:"0.8rem",fontWeight:600}}>{i+1}</div>
                    {/* Thumbnail */}
                    <div style={{flexShrink:0,width:54,height:54,background:"var(--bg3)",position:"relative",overflow:"hidden"}}>
                      {s.ytId
                        ? <img src={`https://img.youtube.com/vi/${s.ytId}/mqdefault.jpg`} alt={s.title} style={{width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.opacity="0.2"}/>
                        : <div style={{width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",color:"var(--muted)"}}>♪</div>}
                      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0)",opacity:0,transition:"all 0.15s",fontSize:"1.2rem",color:"#fff"}}
                        onMouseEnter={e=>{e.currentTarget.style.background="rgba(0,0,0,0.5)";e.currentTarget.style.opacity="1";}}
                        onMouseLeave={e=>{e.currentTarget.style.background="rgba(0,0,0,0)";e.currentTarget.style.opacity="0";}}>▶</div>
                    </div>
                    {/* Info */}
                    <div style={{flex:1,padding:"0 16px",minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:"0.88rem",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.title}</div>
                      <div style={{fontSize:"0.72rem",color:"var(--gold)",marginTop:3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                        {s.singer && <span>🎤 {s.singer}</span>}
                        {s.musicDirector && <span style={{marginLeft:10,color:"var(--muted)"}}>🎼 {s.musicDirector}</span>}
                      </div>
                    </div>
                    {/* Actions */}
                    <div style={{display:"flex",alignItems:"center",gap:8,padding:"0 16px",flexShrink:0}}>
                      {s.ytId && <a href={`https://youtube.com/watch?v=${s.ytId}`} target="_blank" rel="noreferrer"
                        style={{color:"var(--muted)",fontSize:"0.72rem",textDecoration:"none",padding:"4px 8px",border:"1px solid var(--border)",borderRadius:5,transition:"all 0.12s"}}
                        onClick={e=>e.stopPropagation()}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--gold)";e.currentTarget.style.color="var(--gold)";}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border)";e.currentTarget.style.color="var(--muted)";}}>YT ↗</a>}
                      {isOwner && <button className="news-action-btn news-action-delete" style={{fontSize:"0.7rem",opacity:0.7}}
                        onClick={e=>{e.stopPropagation();removeSong(i);}}>🗑</button>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{textAlign:"center",padding:"48px 24px",color:"var(--muted)",background:"var(--bg2)",borderRadius:12,border:"1px dashed var(--border)"}}>
                <div style={{fontSize:"2.5rem",marginBottom:12}}>🎵</div>
                <p style={{marginBottom:isOwner?16:0}}>No songs added yet.</p>
                {isOwner&&<button className="btn btn-gold btn-sm" onClick={()=>setAddSongModal(true)}>+ Add First Song</button>}
              </div>
            )}
          </div>
        )}

        {/* ── BOX OFFICE ── */}
        {tab==="boxoffice" && !editBO && (
          <div style={{padding:"32px 24px",maxWidth:700}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:32}}>
              {[["Opening Weekend",movie.boxOffice?.opening],["First Week",movie.boxOffice?.firstWeek],["Total Collection",movie.boxOffice?.total]].map(([label,val])=>(
                <div key={label} className="boxoffice-card">
                  <div className="boxoffice-label">{label}</div>
                  <div className="boxoffice-value">{val||"TBA"}</div>
                </div>
              ))}
            </div>
            <div style={{textAlign:"center"}}>
              <span className={`movie-card-verdict ${verdictClass(movie.verdict)}`} style={{display:"inline-block",padding:"6px 20px",fontSize:"0.85rem",fontWeight:700,borderRadius:4}}>
                Verdict: {movie.verdict||"Upcoming"}
              </span>
            </div>
            {isOwner && <div style={{marginTop:24,textAlign:"center"}}><button className="btn btn-outline btn-sm" onClick={()=>setEditBO(true)}>✏ Update Box Office</button></div>}
          </div>
        )}
        {tab==="boxoffice" && editBO && (
          <div style={{padding:"32px 24px",maxWidth:700}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
              <h3 style={{fontSize:"1rem",textTransform:"uppercase",letterSpacing:"0.08em",color:"var(--muted)"}}>Update Box Office</h3>
              <div style={{display:"flex",gap:10}}>
                <button className="btn btn-ghost btn-sm" onClick={()=>setEditBO(false)}>Cancel</button>
                <button className="btn btn-gold btn-sm" onClick={saveBO} disabled={savingBO}>{savingBO?"Saving…":"Save"}</button>
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Opening Weekend</label><input className="form-input" value={boForm.opening||""} onChange={e=>setBo("opening",e.target.value)} /></div>
              <div className="form-group"><label className="form-label">First Week</label><input className="form-input" value={boForm.firstWeek||""} onChange={e=>setBo("firstWeek",e.target.value)} /></div>
            </div>
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Total Collection</label><input className="form-input" value={boForm.total||""} onChange={e=>setBo("total",e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Verdict</label><select className="form-select" value={boForm.verdict||movie.verdict||"Upcoming"} onChange={e=>setBo("verdict",e.target.value)}>{VDICT.map(v=><option key={v}>{v}</option>)}</select></div>
            </div>
          </div>
        )}

        {/* ── NEWS ── */}
        {tab==="news" && (
          <div style={{padding:"32px 24px"}}>
            {canNews && <div style={{display:"flex",justifyContent:"flex-end",marginBottom:20}}><button className="btn btn-gold btn-sm" onClick={()=>{setEditingNews(null);setNewsModal(true);}}>+ Add News</button></div>}
            {movie.news?.length ? (
              <div className="news-grid">
                {[...movie.news].reverse().map(n=>(
                  <div key={n._id} className="news-card">
                    <SafeNewsImg src={n.imageUrl} alt={n.title} />
                    <div className="news-card-body">
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                        <div className="news-card-category">{n.category||"Update"}</div>
                        {canNews && <div style={{display:"flex",gap:6}}><button className="news-action-btn" onClick={()=>{setEditingNews(n);setNewsModal(true);}}>✏</button><button className="news-action-btn news-action-delete" onClick={()=>handleDeleteNews(n._id)}>🗑</button></div>}
                      </div>
                      <div className="news-card-title">{n.title}</div>
                      <div className="news-card-content">{n.content}</div>
                      <div className="news-card-meta">{new Date(n.createdAt).toLocaleDateString("en-IN")}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state" style={{paddingTop:40}}><p style={{color:"var(--muted)"}}>No news yet.</p>{canNews&&<button className="btn btn-gold btn-sm" style={{marginTop:16}} onClick={()=>setNewsModal(true)}>+ Add First News</button>}</div>
            )}
          </div>
        )}

        {/* ── REVIEWS ── */}
        {tab==="reviews" && (
          <div style={{padding:"32px 24px",maxWidth:800}}>
            <div className="review-form" style={{marginBottom:40}}>
              <h3 style={{marginBottom:16,fontSize:"1rem"}}>Write a Review</h3>
              <form onSubmit={submitReview}>
                <div className="form-grid" style={{marginBottom:12}}>
                  <div className="form-group" style={{marginBottom:0}}><label className="form-label">Your Name</label><input className="form-input" required value={rvUser} onChange={e=>setRvUser(e.target.value)} /></div>
                  <div className="form-group" style={{marginBottom:0}}><label className="form-label">Rating</label>
                    <select className="form-select" value={rvRating} onChange={e=>setRvRating(Number(e.target.value))}>
                      {[5,4,3,2,1].map(n=><option key={n} value={n}>{n} — {["","Poor","Below Average","Average","Good","Excellent"][n]}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Review</label><textarea className="form-textarea" required value={rvText} onChange={e=>setRvText(e.target.value)} /></div>
                <button className="btn btn-gold btn-sm" type="submit" disabled={submitting}>{submitting?"Submitting…":"Submit Review"}</button>
              </form>
            </div>
            {movie.reviews?.length ? (
              <div className="review-list">
                {[...movie.reviews].reverse().map((r,i)=>(
                  <div key={i} className="review-item">
                    <div className="review-header">
                      <span className="review-user">{r.user}</span>
                      <div style={{display:"flex",gap:10,alignItems:"center"}}>
                        <span className="review-stars">{stars(r.rating)}</span>
                        {r.date&&<span className="review-date">{r.date}</span>}
                      </div>
                    </div>
                    <p className="review-text">{r.text}</p>
                  </div>
                ))}
              </div>
            ) : <p style={{color:"var(--muted)",marginTop:24}}>No reviews yet. Be the first!</p>}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          RELATED SECTIONS — trending-style rows
      ══════════════════════════════════════════════════ */}
      <div className="home-sections" style={{paddingTop:32,background:"var(--bg)"}}>

        {/* Cast of this movie */}
        {actors.length>0 && (
          <HomeRow title="🎭 Full Cast">
            {[...crew,...actors].map((c,i)=>(
              <MiniCastCard key={c.castId||i} person={c}
                onClick={()=>c.castId&&navigate(portalMode?`/portal/cast/${c.castId}`:`/cast/${c.castId}`)} />
            ))}
          </HomeRow>
        )}

        {/* Same director */}
        {sameDirector.length>0 && (
          <HomeRow title={`🎬 More by ${movie.director}`}>
            {sameDirector.map(m=>(
              <MiniMovieCard key={m._id} movie={m} onClick={()=>navigate(`/movie/${m._id}`)} />
            ))}
          </HomeRow>
        )}

        {/* Related movies */}
        {relatedMovies.length>0 && (
          <HomeRow title="🎥 Similar Films" tag="Related">
            {relatedMovies.map(m=>(
              <MiniMovieCard key={m._id} movie={m} onClick={()=>navigate(`/movie/${m._id}`)} />
            ))}
          </HomeRow>
        )}
      </div>

      {/* ── Modals ── */}
      {newsModal&&<NewsModal movieId={id} existing={editingNews} onSave={handleNewsSaved} onClose={()=>{setNewsModal(false);setEditingNews(null);}} />}
      {addCastModal&&<AddCastModal movieId={id} onAdded={m=>{setMovie(prev=>({...prev,cast:m.cast}));}} onClose={()=>setAddCastModal(false)} />}
      {addSongModal&&<AddSongModal movieId={id} onAdded={m=>{setMovie(prev=>({...prev,media:m.media}));}} onClose={()=>setAddSongModal(false)} />}
    </div>
  );
}