import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { API, getToken } from "../api/api";

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const verdictClass = (v) => {
  if (!v) return "verdict-upcoming";
  const l = v.toLowerCase();
  if (["hit","super hit","blockbuster"].includes(l)) return "verdict-hit";
  if (["flop","disaster"].includes(l)) return "verdict-flop";
  if (l === "average") return "verdict-average";
  return "verdict-upcoming";
};

const stars   = (n) => "★".repeat(Math.round(n||0)) + "☆".repeat(5-Math.round(n||0));
const GENRES  = ["Action","Drama","Romance","Comedy","Thriller","Family","Historical","Devotional","Horror"];
const CATS    = ["Feature Film","Short Film","Web Series","Documentary"];
const VDICT   = ["Upcoming","Average","Hit","Super Hit","Blockbuster","Flop","Disaster"];
const NCATS   = ["Update","Release","Trailer","Song","Award","Interview","Other"];
const CTYPES  = ["Actor","Actress","Director","Producer","Music Director","Cinematographer","Choreographer","Lyricist","Other"];

// ── News Modal ────────────────────────────────────────────────────────────────

function NewsModal({ movieId, existing, onSave, onClose }) {
  const [form, setForm] = useState({ title: existing?.title||"", content: existing?.content||"", category: existing?.category||"Update", imageUrl: existing?.imageUrl||"" });
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const save = async () => {
    if (!form.title.trim() || !form.content.trim()) return setErr("Title and content required.");
    setSaving(true); setErr("");
    try {
      const r = existing ? await API.editNews(existing._id, form) : await API.addNews(movieId, form);
      onSave(r, !!existing); onClose();
    } catch(e) { setErr(typeof e==="string"?e:"Failed"); } finally { setSaving(false); }
  };
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:540}}>
        <div className="modal-header">
          <span className="modal-title">{existing?"Edit News":"Add News"}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={form.title} onChange={e=>set("title",e.target.value)} /></div>
        <div className="form-group"><label className="form-label">Category</label>
          <select className="form-select" value={form.category} onChange={e=>set("category",e.target.value)}>{NCATS.map(c=><option key={c}>{c}</option>)}</select>
        </div>
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

// ── Add Cast Modal (owner only) ───────────────────────────────────────────────

function AddCastModal({ movieId, onAdded, onClose }) {
  const [query,    setQuery]    = useState("");
  const [results,  setResults]  = useState([]);
  const [searching, setSearching] = useState(false);
  const [mode,     setMode]     = useState("search"); // "search" | "new"
  const [newName,  setNewName]  = useState("");
  const [newRole,  setNewRole]  = useState("");
  const [newType,  setNewType]  = useState("Actor");
  const [newPhoto, setNewPhoto] = useState("");
  const [newBio,   setNewBio]   = useState("");
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState("");
  const timer = useRef(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSearching(true);
      try { setResults(await API.searchCast(query)); }
      catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
  }, [query]);

  const addExisting = async (c) => {
    setSaving(true); setErr("");
    try {
      const updated = await API.addCastToMovie(movieId, { castId: c._id, name: c.name, type: c.type, photo: c.photo||"", role: "", isNew: false });
      onAdded(updated); onClose();
    } catch(e) { setErr(typeof e==="string"?e:"Failed"); setSaving(false); }
  };

  const addNew = async () => {
    if (!newName.trim()) return setErr("Name required.");
    setSaving(true); setErr("");
    try {
      const updated = await API.addCastToMovie(movieId, { name: newName, type: newType, role: newRole, photo: newPhoto, bio: newBio, isNew: true });
      onAdded(updated); onClose();
    } catch(e) { setErr(typeof e==="string"?e:"Failed"); setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:520}}>
        <div className="modal-header">
          <span className="modal-title">Add Cast / Crew</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div style={{display:"flex",gap:8,marginBottom:16}}>
          <button className={`btn btn-sm ${mode==="search"?"btn-gold":"btn-outline"}`} onClick={()=>setMode("search")}>Search Existing</button>
          <button className={`btn btn-sm ${mode==="new"?"btn-gold":"btn-outline"}`} onClick={()=>setMode("new")}>Add New Person</button>
        </div>

        {mode === "search" && (
          <>
            <div style={{position:"relative"}}>
              <input className="form-input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Type name to search…" autoFocus />
              {(results.length>0||searching) && (
                <div className="search-dropdown">
                  {searching && <div className="search-dropdown-item muted">Searching…</div>}
                  {results.map(c => (
                    <div key={c._id} className="search-dropdown-item" onClick={()=>!saving&&addExisting(c)}>
                      <span style={{fontWeight:600}}>{c.name}</span>
                      <span style={{color:"var(--gold)",fontSize:"0.75rem",marginLeft:8}}>{c.type}</span>
                      <span style={{color:"var(--muted)",fontSize:"0.75rem",marginLeft:8}}>{c.movies?.length||0} films</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p style={{color:"var(--muted)",fontSize:"0.8rem",marginTop:12}}>Click a result to add instantly. Or switch to "Add New Person" to create a new entry.</p>
          </>
        )}

        {mode === "new" && (
          <>
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={newName} onChange={e=>setNewName(e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Role / Character</label><input className="form-input" value={newRole} onChange={e=>setNewRole(e.target.value)} /></div>
            </div>
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Type</label>
                <select className="form-select" value={newType} onChange={e=>setNewType(e.target.value)}>{CTYPES.map(t=><option key={t}>{t}</option>)}</select>
              </div>
              <div className="form-group"><label className="form-label">Photo URL</label><input className="form-input" value={newPhoto} onChange={e=>setNewPhoto(e.target.value)} /></div>
            </div>
            <div className="form-group"><label className="form-label">Bio (optional)</label><input className="form-input" value={newBio} onChange={e=>setNewBio(e.target.value)} /></div>
            {err && <p style={{color:"var(--red)",fontSize:"0.82rem",marginBottom:8}}>{err}</p>}
            <button className="btn btn-gold btn-sm" onClick={addNew} disabled={saving||!newName.trim()}>{saving?"Adding…":"+ Add to Movie"}</button>
          </>
        )}

        {mode==="search" && err && <p style={{color:"var(--red)",fontSize:"0.82rem",marginTop:8}}>{err}</p>}
      </div>
    </div>
  );
}

// ── Add Song Modal ────────────────────────────────────────────────────────────

function AddSongModal({ movieId, onAdded, onClose }) {
  const [title,  setTitle]  = useState("");
  const [singer, setSinger] = useState("");
  const [ytId,   setYtId]   = useState("");
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState("");

  const save = async () => {
    if (!title.trim()) return setErr("Song title required.");
    setSaving(true); setErr("");
    try {
      const updated = await API.addSong(movieId, { title: title.trim(), singer: singer.trim(), ytId: ytId.trim() });
      onAdded(updated); onClose();
    } catch(e) { setErr(typeof e==="string"?e:"Failed"); setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:440}}>
        <div className="modal-header">
          <span className="modal-title">Add Song</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="form-group"><label className="form-label">Song Title *</label><input className="form-input" value={title} onChange={e=>setTitle(e.target.value)} autoFocus /></div>
        <div className="form-group"><label className="form-label">Singer(s)</label><input className="form-input" value={singer} onChange={e=>setSinger(e.target.value)} /></div>
        <div className="form-group"><label className="form-label">YouTube ID (optional)</label><input className="form-input" value={ytId} onChange={e=>setYtId(e.target.value)} placeholder="e.g. dQw4w9WgXcQ" /></div>
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

// ── Main Component ────────────────────────────────────────────────────────────

export default function MovieDetails({ production, onToast }) {
  const { id }     = useParams();
  const navigate   = useNavigate();
  const [movie,    setMovie]   = useState(null);
  const [tab,      setTab]     = useState("overview");
  const [loading,  setLoading] = useState(true);
  const [error,    setError]   = useState(null);

  // Permissions
  const isOwner   = !!(getToken()&&production&&movie&&String(movie.productionId?._id||movie.productionId)===String(production._id));
  const isCollab  = !!(getToken()&&production&&movie&&(movie.collaborators||[]).some(c=>String(c._id||c)===String(production._id)));
  const canNews   = isOwner||isCollab;

  // Edit basics
  const [editing,    setEditing]    = useState(false);
  const [editForm,   setEditForm]   = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Edit box office
  const [editBO,   setEditBO]   = useState(false);
  const [boForm,   setBoForm]   = useState({});
  const [savingBO, setSavingBO] = useState(false);

  // Modals
  const [newsModal,    setNewsModal]    = useState(false);
  const [editingNews,  setEditingNews]  = useState(null);
  const [addCastModal, setAddCastModal] = useState(false);
  const [addSongModal, setAddSongModal] = useState(false);

  // Trailer edit
  const [editTrailer, setEditTrailer]   = useState(false);
  const [trailerInput, setTrailerInput] = useState("");
  const [savingTrailer, setSavingTrailer] = useState(false);

  // Reviews
  const [rvUser, setRvUser]   = useState("");
  const [rvRating, setRvRating] = useState(5);
  const [rvText, setRvText]   = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    API.getMovie(id)
      .then(m => { setMovie(m); setEditForm({...m}); setBoForm({...(m.boxOffice||{}), verdict: m.verdict}); setTrailerInput(m.media?.trailer?.ytId||""); })
      .catch(e => setError(typeof e==="string"?e:"Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      const up = await API.updateMovie(id, { title:editForm.title, category:editForm.category, genre:editForm.genre, releaseDate:editForm.releaseDate, releaseTBA:editForm.releaseTBA, director:editForm.director, producer:editForm.producer, budget:editForm.budget, language:editForm.language, synopsis:editForm.synopsis, posterUrl:editForm.posterUrl });
      setMovie(m=>({...m,...up})); setEditing(false);
      onToast&&onToast("Movie updated!");
    } catch(e) { onToast&&onToast(typeof e==="string"?e:"Save failed","error"); }
    finally { setSavingEdit(false); }
  };

  const saveBO = async () => {
    setSavingBO(true);
    try {
      const up = await API.updateBoxOffice(id, boForm);
      setMovie(m=>({...m,...up})); setEditBO(false);
      onToast&&onToast("Box office updated!");
    } catch(e) { onToast&&onToast(typeof e==="string"?e:"Save failed","error"); }
    finally { setSavingBO(false); }
  };

  const saveTrailer = async () => {
    setSavingTrailer(true);
    try {
      const up = await API.updateTrailer(id, { ytId: trailerInput.trim() });
      setMovie(m=>({...m, media:{...m.media, trailer:{ytId: trailerInput.trim()}}}));
      setEditTrailer(false);
      onToast&&onToast("Trailer updated!");
    } catch(e) { onToast&&onToast(typeof e==="string"?e:"Save failed","error"); }
    finally { setSavingTrailer(false); }
  };

  const removeCast = async (castId) => {
    if (!window.confirm("Remove this person from the movie?")) return;
    try {
      const up = await API.removeCastFromMovie(id, castId);
      setMovie(m=>({...m, cast: up.cast}));
      onToast&&onToast("Cast member removed.");
    } catch(e) { onToast&&onToast(typeof e==="string"?e:"Failed","error"); }
  };

  const removeSong = async (index) => {
    if (!window.confirm("Remove this song?")) return;
    try {
      const up = await API.removeSong(id, index);
      setMovie(m=>({...m, media: up.media}));
      onToast&&onToast("Song removed.");
    } catch(e) { onToast&&onToast(typeof e==="string"?e:"Failed","error"); }
  };

  const handleNewsSaved = (item, isEdit) => {
    setMovie(m=>({ ...m, news: isEdit ? (m.news||[]).map(n=>n._id===item._id?item:n) : [...(m.news||[]),item] }));
    onToast&&onToast(isEdit?"News updated!":"News published!");
  };

  const handleDeleteNews = async (newsId) => {
    if (!window.confirm("Delete this article?")) return;
    try {
      await API.deleteNews(newsId);
      setMovie(m=>({...m, news:(m.news||[]).filter(n=>n._id!==newsId)}));
      onToast&&onToast("News deleted.");
    } catch(e) { onToast&&onToast(typeof e==="string"?e:"Failed","error"); }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!rvUser.trim()||!rvText.trim()) return;
    setSubmitting(true);
    try {
      const reviews = await API.postReview(id, {user:rvUser, rating:rvRating, text:rvText});
      setMovie(m=>({...m,reviews})); setRvUser(""); setRvText(""); setRvRating(5);
      onToast&&onToast("Review submitted!");
    } catch { onToast&&onToast("Failed","error"); }
    finally { setSubmitting(false); }
  };

  // ── Loading/Error ──
  if (loading) return (
    <div className="page">
      <div style={{display:"grid",gridTemplateColumns:"260px 1fr",gap:48}}>
        <div className="skeleton" style={{aspectRatio:"2/3"}} />
        <div><div className="skeleton" style={{height:20,width:"40%",marginBottom:12}} /><div className="skeleton" style={{height:48,width:"70%",marginBottom:16}} /></div>
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

  // Crew members are director, producer etc.; actors are the rest
  const crew   = (movie.cast||[]).filter(c=>["Director","Producer","Music Director","Cinematographer","Choreographer","Lyricist"].includes(c.type));
  const actors = (movie.cast||[]).filter(c=>!["Director","Producer","Music Director","Cinematographer","Choreographer","Lyricist"].includes(c.type));

  return (
    <div className="page">
      <Link to="/movies" className="btn btn-ghost btn-sm" style={{marginBottom:24,display:"inline-flex"}}>← All Films</Link>

      {/* ── Hero ── */}
      <div className="movie-hero">
        <div className="movie-hero-poster">
          {movie.posterUrl ? <SafeImg src={movie.posterUrl} alt={movie.title} style={{width:"100%",height:"100%",objectFit:"cover"}} /> : <div className="movie-hero-poster-placeholder">🎬</div>}
        </div>
        <div className="movie-hero-content">
          <div className="movie-category">{movie.category||"Feature Film"} · {movie.language||"Odia"}</div>
          <h1 className="movie-title">{movie.title}</h1>

          {avgRating && (
            <div style={{marginBottom:12}}>
              <span style={{color:"var(--gold)",fontFamily:"'Playfair Display',serif",fontSize:"1.4rem"}}>{avgRating}</span>
              <span style={{color:"var(--gold)",fontSize:"0.85rem",marginLeft:6}}>{stars(avgRating)}</span>
              <span style={{color:"var(--muted)",fontSize:"0.8rem",marginLeft:6}}>({movie.reviews.length} reviews)</span>
            </div>
          )}

          <div className="movie-badges">
            {movie.genre?.map(g=><span key={g} className="badge">{g}</span>)}
            <span className={`movie-card-verdict ${verdictClass(movie.verdict)}`}
              style={{borderRadius:3,padding:"4px 12px",fontSize:"0.72rem",fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase"}}>
              {movie.verdict||"Upcoming"}
            </span>
          </div>

          {/* Production chips */}
          <div className="movie-productions">
            {movie.productionId && (
              <Link to={`/production/${movie.productionId._id||movie.productionId}`} className="prod-chip">
                {movie.productionId.logo && <SafeImg src={movie.productionId.logo} alt="" style={{width:18,height:18,borderRadius:3,objectFit:"cover"}} />}
                <span>{movie.productionId.name}</span>
              </Link>
            )}
            {(movie.collaborators||[]).map(c=>(
              <React.Fragment key={c._id||c}>
                <span className="prod-chip-sep">×</span>
                <Link to={`/production/${c._id||c}`} className="prod-chip prod-chip-collab">
                  {c.logo&&<SafeImg src={c.logo} alt="" style={{width:18,height:18,borderRadius:3,objectFit:"cover"}} />}
                  <span>{c.name}</span>
                </Link>
              </React.Fragment>
            ))}
          </div>

          <div className="movie-meta-grid">
            {movie.director&&<div className="movie-meta-item"><label>Director</label><span>{movie.director}</span></div>}
            {movie.producer&&<div className="movie-meta-item"><label>Producer</label><span>{movie.producer}</span></div>}
            {(movie.releaseDate||movie.releaseTBA)&&<div className="movie-meta-item"><label>Release</label><span>{movie.releaseTBA?"TBA":movie.releaseDate}</span></div>}
            {movie.budget&&<div className="movie-meta-item"><label>Budget</label><span>{movie.budget}</span></div>}
          </div>

          {movie.synopsis&&<p className="movie-synopsis">{movie.synopsis}</p>}

          {isOwner&&(
            <div style={{marginTop:20,display:"flex",gap:10,flexWrap:"wrap"}}>
              <button className="btn btn-gold btn-sm" onClick={()=>{setEditing(true);setTab("overview");}}>✏ Edit Details</button>
              <button className="btn btn-outline btn-sm" onClick={()=>{setEditBO(true);setTab("boxoffice");}}>📊 Box Office</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="tabs">
        {["overview","cast","media","boxoffice","news","reviews"].map(t=>(
          <button key={t} className={`tab ${tab===t?"active":""}`} onClick={()=>{setTab(t);setEditing(false);setEditBO(false);}}>
            {t==="boxoffice"?"Box Office":t.charAt(0).toUpperCase()+t.slice(1)}
            {t==="reviews"&&movie.reviews?.length?` (${movie.reviews.length})`:""}
            {t==="news"&&movie.news?.length?` (${movie.news.length})`:""}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW (view) ── */}
      {tab==="overview"&&!editing&&(
        <div className="section">
          {movie.synopsis?<p style={{color:"#b0a898",lineHeight:1.8,fontSize:"0.95rem",maxWidth:720}}>{movie.synopsis}</p>:<p style={{color:"var(--muted)"}}>No synopsis available.</p>}
          {movie.media?.trailer?.ytId&&(
            <><hr className="divider" /><h3 className="section-sub-title">Trailer</h3>
              <div className="trailer-embed" style={{maxWidth:640}}>
                <iframe src={`https://www.youtube.com/embed/${movie.media.trailer.ytId}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Trailer" />
              </div>
            </>
          )}
        </div>
      )}

      {/* ── OVERVIEW (edit) ── */}
      {tab==="overview"&&editing&&(
        <div className="section">
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
            <div className="form-group"><label className="form-label">Category</label>
              <select className="form-select" value={editForm.category||""} onChange={e=>setE("category",e.target.value)}>{CATS.map(c=><option key={c}>{c}</option>)}</select>
            </div>
            <div className="form-group"><label className="form-label">Release Date</label>
              <input className="form-input" type="date" value={editForm.releaseDate||""} onChange={e=>setE("releaseDate",e.target.value)} disabled={editForm.releaseTBA} />
              <label style={{marginTop:6,display:"flex",alignItems:"center",gap:6,fontSize:"0.8rem",color:"var(--muted)",cursor:"pointer"}}>
                <input type="checkbox" checked={!!editForm.releaseTBA} onChange={e=>setE("releaseTBA",e.target.checked)} /> TBA
              </label>
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group"><label className="form-label">Budget</label><input className="form-input" value={editForm.budget||""} onChange={e=>setE("budget",e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Poster URL</label><input className="form-input" value={editForm.posterUrl||""} onChange={e=>setE("posterUrl",e.target.value)} /></div>
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

      {/* ── CAST (with clickable links + owner management) ── */}
      {tab==="cast"&&(
        <div className="section">
          {isOwner&&(
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:20}}>
              <button className="btn btn-gold btn-sm" onClick={()=>setAddCastModal(true)}>+ Add Cast / Crew</button>
            </div>
          )}

          {crew.length>0&&(
            <>
              <h3 className="section-sub-title">Crew</h3>
              <div className="cast-grid" style={{marginBottom:32}}>
                {crew.map((c,i)=>(
                  <div key={c.castId||i} className="cast-card cast-card-linked" onClick={()=>c.castId&&navigate(`/cast/${c.castId}`)}>
                    <div className="cast-card-photo" style={{display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg3)"}}>
                      {c.photo?<SafeImg src={c.photo} alt={c.name} style={{width:"100%",height:"100%",objectFit:"cover"}} />
                        :<span style={{fontSize:"2rem"}}>{c.type==="Director"?"🎬":c.type==="Producer"?"🎥":c.type==="Music Director"?"🎵":"🎭"}</span>
                      }
                    </div>
                    <div className="cast-card-body">
                      <div className="cast-card-name">{c.name}</div>
                      {c.role&&c.role!==c.type&&<div className="cast-card-role">{c.role}</div>}
                      <div className="cast-card-role" style={{color:"var(--gold)"}}>{c.type}</div>
                    </div>
                    {isOwner&&<button className="cast-remove-btn" title="Remove" onClick={e=>{e.stopPropagation();removeCast(String(c.castId))}}>✕</button>}
                  </div>
                ))}
              </div>
            </>
          )}

          {actors.length>0&&(
            <>
              <h3 className="section-sub-title">Cast</h3>
              <div className="cast-grid">
                {actors.map((c,i)=>(
                  <div key={c.castId||i} className="cast-card cast-card-linked" onClick={()=>c.castId&&navigate(`/cast/${c.castId}`)}>
                    <div className="cast-card-photo" style={{display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {c.photo?<SafeImg src={c.photo} alt={c.name} style={{width:"100%",height:"100%",objectFit:"cover"}} />:<span style={{fontSize:"2rem"}}>👤</span>}
                    </div>
                    <div className="cast-card-body">
                      <div className="cast-card-name">{c.name}</div>
                      {c.role&&<div className="cast-card-role">{c.role}</div>}
                      {c.type&&<div className="cast-card-role" style={{color:"var(--gold)",fontSize:"0.65rem"}}>{c.type}</div>}
                    </div>
                    {isOwner&&<button className="cast-remove-btn" title="Remove" onClick={e=>{e.stopPropagation();removeCast(String(c.castId))}}>✕</button>}
                  </div>
                ))}
              </div>
            </>
          )}

          {!crew.length&&!actors.length&&(
            <div className="empty-state" style={{paddingTop:40}}>
              <p style={{color:"var(--muted)"}}>No cast information yet.</p>
              {isOwner&&<button className="btn btn-gold btn-sm" style={{marginTop:16}} onClick={()=>setAddCastModal(true)}>+ Add Cast / Crew</button>}
            </div>
          )}
        </div>
      )}

      {/* ── MEDIA (with owner management) ── */}
      {tab==="media"&&(
        <div className="section">
          {/* Trailer */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <h3 className="section-sub-title" style={{margin:0}}>Trailer</h3>
            {isOwner&&<button className="btn btn-outline btn-sm" onClick={()=>{setTrailerInput(movie.media?.trailer?.ytId||"");setEditTrailer(t=>!t);}}>
              {editTrailer?"Cancel":"✏ Edit Trailer"}
            </button>}
          </div>

          {editTrailer&&(
            <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:16}}>
              <input className="form-input" style={{flex:1}} value={trailerInput} onChange={e=>setTrailerInput(e.target.value)} placeholder="YouTube Trailer ID (e.g. dQw4w9WgXcQ)" />
              <button className="btn btn-gold btn-sm" onClick={saveTrailer} disabled={savingTrailer}>{savingTrailer?"Saving…":"Save"}</button>
            </div>
          )}

          {movie.media?.trailer?.ytId?(
            <div className="trailer-embed" style={{maxWidth:640,marginBottom:32}}>
              <iframe src={`https://www.youtube.com/embed/${movie.media.trailer.ytId}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Trailer" />
            </div>
          ):<p style={{color:"var(--muted)",marginBottom:32}}>No trailer added yet.</p>}

          {/* Songs */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <h3 className="section-sub-title" style={{margin:0}}>Songs {movie.media?.songs?.length?`(${movie.media.songs.length})`:""}</h3>
            {isOwner&&<button className="btn btn-outline btn-sm" onClick={()=>setAddSongModal(true)}>+ Add Song</button>}
          </div>

          {movie.media?.songs?.length>0?(
            <div className="song-list">
              {movie.media.songs.map((s,i)=>(
                <div key={i} className="song-item">
                  <span className="song-num">{i+1}</span>
                  <div className="song-info">
                    <div className="song-title">{s.title}</div>
                    {s.singer&&<div className="song-singer">{s.singer}</div>}
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    {s.ytId&&<a href={`https://www.youtube.com/watch?v=${s.ytId}`} target="_blank" rel="noreferrer"><button className="song-play">▶</button></a>}
                    {isOwner&&<button className="news-action-btn news-action-delete" title="Remove song" onClick={()=>removeSong(i)}>🗑</button>}
                  </div>
                </div>
              ))}
            </div>
          ):<p style={{color:"var(--muted)"}}>No songs added yet.{isOwner&&" Click '+ Add Song' to add."}</p>}
        </div>
      )}

      {/* ── BOX OFFICE ── */}
      {tab==="boxoffice"&&!editBO&&(
        <div className="section">
          <div className="boxoffice-grid" style={{marginBottom:24}}>
            <div className="boxoffice-card"><div className="boxoffice-label">Opening Weekend</div><div className="boxoffice-value">{movie.boxOffice?.opening||"TBA"}</div></div>
            <div className="boxoffice-card"><div className="boxoffice-label">First Week</div><div className="boxoffice-value">{movie.boxOffice?.firstWeek||"TBA"}</div></div>
            <div className="boxoffice-card"><div className="boxoffice-label">Total Collection</div><div className="boxoffice-value">{movie.boxOffice?.total||"TBA"}</div></div>
          </div>
          <div style={{textAlign:"center"}}>
            <span className={`movie-card-verdict ${verdictClass(movie.verdict)}`} style={{display:"inline-block",padding:"6px 20px",fontSize:"0.85rem",fontWeight:700,borderRadius:4}}>
              Verdict: {movie.verdict||"Upcoming"}
            </span>
          </div>
          {isOwner&&<div style={{marginTop:24,textAlign:"center"}}><button className="btn btn-outline btn-sm" onClick={()=>setEditBO(true)}>✏ Update Box Office</button></div>}
        </div>
      )}

      {tab==="boxoffice"&&editBO&&(
        <div className="section">
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
            <div className="form-group"><label className="form-label">Verdict</label>
              <select className="form-select" value={boForm.verdict||movie.verdict||"Upcoming"} onChange={e=>setBo("verdict",e.target.value)}>{VDICT.map(v=><option key={v}>{v}</option>)}</select>
            </div>
          </div>
        </div>
      )}

      {/* ── NEWS ── */}
      {tab==="news"&&(
        <div className="section">
          {canNews&&(
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:20}}>
              <button className="btn btn-gold btn-sm" onClick={()=>{setEditingNews(null);setNewsModal(true);}}>+ Add News</button>
            </div>
          )}
          {movie.news?.length?(
            <div className="news-grid">
              {[...movie.news].reverse().map(n=>(
                <div key={n._id} className="news-card">
                  <SafeNewsImg src={n.imageUrl} alt={n.title} />
                  <div className="news-card-body">
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                      <div className="news-card-category">{n.category||"Update"}</div>
                      {canNews&&(
                        <div style={{display:"flex",gap:6}}>
                          <button className="news-action-btn" onClick={()=>{setEditingNews(n);setNewsModal(true);}}>✏</button>
                          <button className="news-action-btn news-action-delete" onClick={()=>handleDeleteNews(n._id)}>🗑</button>
                        </div>
                      )}
                    </div>
                    <div className="news-card-title">{n.title}</div>
                    <div className="news-card-content">{n.content}</div>
                    <div className="news-card-meta">{new Date(n.createdAt).toLocaleDateString("en-IN")}</div>
                  </div>
                </div>
              ))}
            </div>
          ):(
            <div className="empty-state" style={{paddingTop:40}}>
              <p style={{color:"var(--muted)"}}>No news yet.</p>
              {canNews&&<button className="btn btn-gold btn-sm" style={{marginTop:16}} onClick={()=>setNewsModal(true)}>+ Add First News</button>}
            </div>
          )}
        </div>
      )}

      {/* ── REVIEWS ── */}
      {tab==="reviews"&&(
        <div className="section">
          <div className="review-form">
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
          {movie.reviews?.length?(
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
          ):<p style={{color:"var(--muted)",marginTop:24}}>No reviews yet. Be the first!</p>}
        </div>
      )}

      {/* ── Modals ── */}
      {newsModal&&<NewsModal movieId={id} existing={editingNews} onSave={handleNewsSaved} onClose={()=>{setNewsModal(false);setEditingNews(null);}} />}
      {addCastModal&&<AddCastModal movieId={id} onAdded={m=>{setMovie(prev=>({...prev,cast:m.cast}));}} onClose={()=>setAddCastModal(false)} />}
      {addSongModal&&<AddSongModal movieId={id} onAdded={m=>{setMovie(prev=>({...prev,media:m.media}));}} onClose={()=>setAddSongModal(false)} />}
    </div>
  );
}