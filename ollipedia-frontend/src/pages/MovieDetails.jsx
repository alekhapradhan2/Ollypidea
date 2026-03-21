import SEO, { movieSEO } from "../components/SEO";
import { extractId, moviePath, castPath, songPath } from "../utils/slugs";
import { Helmet } from "react-helmet-async";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { API, getToken } from "../api/api";
import { Cache } from "../api/cache";

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
const ytThumb = (id) => id ? `https://img.youtube.com/vi/${extractYtId(id)||id}/mqdefault.jpg` : null;

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
  const { slug }     = useParams();
  const id           = extractId(slug);
  const navigate     = useNavigate();
  const location     = useLocation();
  const trailerRef   = useRef(null);

  const [movie,    setMovie]    = useState(null);
  // Pre-fill from cache so related sections appear instantly on fast connections
  const [allMovies, setAllMovies] = useState(() => Cache.peek("movies") || []);
  const [tab,      setTab]      = useState("overview");
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

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
    API.getMovie(id)
      .then(m => {
        setMovie(m);
        setEditForm({...m});
        setBoForm({...(m.boxOffice||{}), verdict: m.verdict});
        setTrailerInput(m.media?.trailer?.ytId||"");
        setLoading(false);
        // Defer allMovies via cache — instant if already loaded from another page
        const tid = typeof requestIdleCallback !== "undefined"
          ? requestIdleCallback(() => Cache.getMovies().catch(()=>[]).then(all => setAllMovies(all)))
          : setTimeout(() => Cache.getMovies().catch(()=>[]).then(all => setAllMovies(all)), 300);
        return () => typeof requestIdleCallback !== "undefined" ? cancelIdleCallback(tid) : clearTimeout(tid);
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
    <div style={{ minHeight:"100vh", background:"#0f0f0f", color:"#f1f1f1" }}>
      <SEO {...movieSEO(movie)} />
      <Helmet>
        {movie && <script type="application/ld+json">{JSON.stringify({
          "@context":"https://schema.org","@type":"Movie",
          "name":movie.title,"description":movie.synopsis?.slice(0,300),
          "image":movie.posterUrl||movie.thumbnailUrl,
          "datePublished":movie.releaseDate,"duration":movie.runtime,
          "director":movie.director?{"@type":"Person","name":movie.director}:undefined,
          "contentRating":movie.contentRating,"genre":movie.genre,
          "inLanguage":movie.language||"or",
          "aggregateRating":movie.reviews?.length?{"@type":"AggregateRating","ratingValue":(movie.reviews.reduce((s,r)=>s+(r.rating||0),0)/movie.reviews.length).toFixed(1),"reviewCount":movie.reviews.length,"bestRating":"5","worstRating":"1"}:undefined,
          "trailer":movie.media?.trailer?.ytId?{"@type":"VideoObject","name":movie.title+" Trailer","embedUrl":"https://www.youtube.com/embed/"+movie.media.trailer.ytId}:undefined,
        })}</script>}
      </Helmet>

      <style>{`
        /* ── Movie Detail Page ── */
        .md-root { min-height:100vh; background:#0f0f0f; color:#f1f1f1; padding-top:58px; }

        /* ── Hero ── */
        .md-hero {
          position: relative;
          overflow: hidden;
          background: #0a0a0a;
          /* min-height so the hero feels tall even without long content */
          min-height: 420px;
        }
        @media(min-width:600px){ .md-hero { min-height: 480px; } }
        @media(min-width:900px){ .md-hero { min-height: 520px; } }

        /* Blurred backdrop — the key: fill the whole hero, not clipped too tight */
        .md-hero-bg {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center 20%;
          /* brightness .35 = visible but dark, not pitch black */
          filter: blur(0px) brightness(.35) saturate(1.2);
          transform: scale(1.05); /* slight scale prevents blur edge bleeding */
        }

        /* Two-layer gradient:
           left-to-right: dark on left so poster/text are legible
           top-to-bottom: fades to solid #0a0a0a at bottom so page flows in */
        .md-hero-overlay {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(to right,
              rgba(10,10,10,.88) 0%,
              rgba(10,10,10,.55) 50%,
              rgba(10,10,10,.25) 100%
            ),
            linear-gradient(to bottom,
              transparent 0%,
              transparent 55%,
              rgba(10,10,10,.85) 80%,
              #0a0a0a 100%
            );
        }

        .md-hero-inner {
          position: relative;
          z-index: 2;
          max-width: 1200px;
          margin: 0 auto;
          padding: 24px 16px 44px;
          display: flex;
          gap: 28px;
          align-items: flex-end; /* align to bottom so poster sits on same baseline as text */
        }
        @media(min-width:600px){ .md-hero-inner { padding: 32px 24px 48px; gap: 32px; } }
        @media(min-width:900px){ .md-hero-inner { padding: 44px 40px 56px; gap: 40px; align-items: flex-end; } }

        /* Poster — taller, more cinematic */
        .md-poster {
          flex-shrink: 0;
          width: clamp(130px, 20vw, 220px);
          border-radius: 12px;
          overflow: hidden;
          /* Strong shadow so poster lifts off the background */
          box-shadow:
            0 8px 24px rgba(0,0,0,.6),
            0 24px 64px rgba(0,0,0,.8),
            0 0 0 1px rgba(255,255,255,.1);
          background: #1a1a1a;
          /* Slight upward nudge for cinematic feel */
          transform: translateY(0);
        }
        .md-poster img { width: 100%; display: block; }
        .md-poster-ph {
          aspect-ratio: 2/3;
          display: flex; align-items: center; justify-content: center;
          font-size: 3rem; color: rgba(255,255,255,.2);
        }

        /* Info column */
        .md-info { flex:1; min-width:0; padding-top:4px; }
        .md-tags { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px; }
        .md-tag {
          font-size:.62rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em;
          padding:3px 9px; border-radius:20px;
          background:rgba(201,151,58,.14); border:1px solid rgba(201,151,58,.35); color:#c9973a;
        }
        .md-tag-outline {
          font-size:.62rem; font-weight:600;
          padding:3px 9px; border-radius:20px;
          background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.15); color:rgba(255,255,255,.7);
        }
        .md-title {
          font-family:'Playfair Display',serif;
          font-size:clamp(1.5rem,4vw,2.8rem);
          font-weight:900; line-height:1.08; margin:0 0 10px;
          color:#fff; text-shadow:0 2px 20px rgba(0,0,0,.5);
        }
        .md-score-row {
          display:flex; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;
        }
        .md-rating { display:flex; align-items:center; gap:5px; }
        .md-rating-num { color:#c9973a; font-size:1.1rem; font-weight:800; }
        .md-rating-stars { color:#c9973a; font-size:.82rem; }
        .md-rating-cnt { color:rgba(255,255,255,.4); font-size:.72rem; }
        .md-verdict-badge {
          font-size:.64rem; font-weight:800; text-transform:uppercase; letter-spacing:.08em;
          padding:4px 12px; border-radius:4px;
        }
        .md-meta-row {
          display:flex; flex-wrap:wrap; gap:6px 16px;
          font-size:.78rem; color:rgba(255,255,255,.55);
          margin-bottom:12px; align-items:center;
        }
        .md-meta-row span { display:flex; align-items:center; gap:4px; }
        .md-synopsis {
          font-size:.88rem; color:rgba(255,255,255,.68);
          line-height:1.7; margin:0 0 18px;
          max-width:620px;
          display:-webkit-box; -webkit-line-clamp:4; -webkit-box-orient:vertical; overflow:hidden;
        }
        @media(min-width:768px){ .md-synopsis { -webkit-line-clamp:5; } }
        .md-actions { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:16px; }
        .md-btn-play {
          display:inline-flex; align-items:center; gap:7px;
          background:#c9973a; color:#000; border:none;
          padding:10px 20px; border-radius:8px;
          font-size:.84rem; font-weight:800; cursor:pointer;
          transition:opacity .18s;
        }
        .md-btn-play:hover { opacity:.88; }
        .md-btn-outline {
          display:inline-flex; align-items:center; gap:6px;
          background:rgba(255,255,255,.09); color:#f1f1f1;
          border:1px solid rgba(255,255,255,.2);
          padding:10px 16px; border-radius:8px;
          font-size:.82rem; font-weight:600; cursor:pointer;
          transition:background .18s;
        }
        .md-btn-outline:hover { background:rgba(255,255,255,.15); }

        /* Box office chips row */
        .md-bo-row {
          display:flex; gap:12px; flex-wrap:wrap;
          padding:10px 14px;
          background:rgba(255,255,255,.05);
          border:1px solid rgba(255,255,255,.08);
          border-radius:8px; width:fit-content;
        }
        .md-bo-item { }
        .md-bo-label { font-size:.58rem; color:rgba(255,255,255,.38); text-transform:uppercase; letter-spacing:.07em; font-weight:700; margin-bottom:2px; }
        .md-bo-val   { font-size:.84rem; font-weight:800; color:#c9973a; }

        /* ── Sticky tabs ── */
        .md-tabs-bar {
          position:sticky; top:58px; z-index:20;
          background:rgba(15,15,15,.97);
          backdrop-filter:blur(12px);
          border-bottom:1px solid rgba(255,255,255,.08);
          overflow-x:auto; scrollbar-width:none;
        }
        .md-tabs-bar::-webkit-scrollbar { display:none; }
        .md-tabs-inner {
          display:flex; padding:0 16px;
          min-width:max-content;
        }
        @media(min-width:600px){ .md-tabs-inner { padding:0 24px; } }
        @media(min-width:900px){ .md-tabs-inner { padding:0 40px; } }
        .md-tab {
          padding:12px 14px;
          background:none; border:none; cursor:pointer;
          font-weight:700; font-size:.78rem;
          color:rgba(255,255,255,.45);
          border-bottom:2px solid transparent;
          white-space:nowrap; transition:all .18s;
          flex-shrink:0;
        }
        @media(min-width:480px){ .md-tab { padding:13px 18px; font-size:.8rem; } }
        .md-tab.on { color:#c9973a; border-bottom-color:#c9973a; }
        .md-tab:hover:not(.on) { color:#f1f1f1; }

        /* ── Tab body ── */
        .md-body {
          max-width:1200px; margin:0 auto;
          padding:24px 16px 60px;
          background:#0f0f0f;
        }
        @media(min-width:600px){ .md-body { padding:28px 24px 60px; } }
        @media(min-width:900px){ .md-body { padding:32px 40px 60px; } }

        /* Section heading inside tabs */
        .md-sec-label {
          font-size:.66rem; font-weight:800; text-transform:uppercase;
          letter-spacing:.1em; color:rgba(255,255,255,.38);
          margin:0 0 12px;
        }

        /* Crew pill */
        .md-crew-pill {
          display:inline-flex; align-items:center; gap:8px;
          background:#1a1a1a; border:1px solid rgba(255,255,255,.09);
          border-radius:8px; padding:7px 12px; cursor:pointer;
          transition:border-color .16s;
        }
        .md-crew-pill:hover { border-color:rgba(201,151,58,.45); }
        .md-crew-av {
          width:28px; height:28px; border-radius:50%; overflow:hidden;
          background:#272727; display:flex; align-items:center; justify-content:center;
          font-size:.8rem; flex-shrink:0;
        }
        .md-crew-av img { width:100%; height:100%; object-fit:cover; }
        .md-crew-name { font-size:.78rem; font-weight:700; line-height:1.2; color:#f1f1f1; }
        .md-crew-role { font-size:.6rem; color:#c9973a; font-weight:600; }

        /* Actor circle */
        .md-actor {
          flex-shrink:0; width:72px; text-align:center; cursor:pointer;
        }
        .md-actor-av {
          width:56px; height:56px; border-radius:50%; overflow:hidden;
          background:#272727; margin:0 auto 5px;
          border:2px solid rgba(255,255,255,.1);
          display:flex; align-items:center; justify-content:center;
          font-size:1.3rem; transition:border-color .16s;
        }
        @media(min-width:480px){ .md-actor-av { width:64px; height:64px; } }
        .md-actor-av img { width:100%; height:100%; object-fit:cover; }
        .md-actor-name { font-size:.66rem; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#f1f1f1; }
        .md-actor-role { font-size:.58rem; color:#c9973a; margin-top:1px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

        /* Song card */
        .md-song {
          flex-shrink:0; width:130px; cursor:pointer;
          border-radius:8px; overflow:hidden;
          background:#1a1a1a; border:1px solid rgba(255,255,255,.08);
          transition:border-color .16s;
        }
        .md-song:hover { border-color:#c9973a; }
        .md-song-thumb {
          width:100%; aspect-ratio:16/9; background:#272727;
          position:relative; overflow:hidden;
        }
        .md-song-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
        .md-song-icon {
          position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
          background:rgba(0,0,0,.25); font-size:1.2rem;
        }
        .md-song-info { padding:7px 8px; }
        .md-song-title { font-size:.72rem; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#f1f1f1; }
        .md-song-singer { font-size:.62rem; color:#c9973a; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

        /* Cast full grid */
        .md-cast-grid {
          display:grid;
          grid-template-columns:repeat(auto-fill,minmax(140px,1fr));
          gap:10px;
        }
        @media(min-width:480px){ .md-cast-grid { grid-template-columns:repeat(auto-fill,minmax(155px,1fr)); gap:12px; } }
        .md-cast-card {
          background:#1a1a1a; border:1px solid rgba(255,255,255,.08);
          border-radius:10px; overflow:hidden; cursor:pointer;
          transition:border-color .16s;
        }
        .md-cast-card:hover { border-color:rgba(201,151,58,.4); }
        .md-cast-img {
          width:100%; aspect-ratio:3/4; background:#272727;
          display:flex; align-items:center; justify-content:center;
          font-size:2.5rem; overflow:hidden; position:relative;
        }
        .md-cast-img img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:top; }
        .md-cast-meta { padding:8px 10px; }
        .md-cast-cname { font-size:.78rem; font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#f1f1f1; }
        .md-cast-type  { font-size:.64rem; color:#c9973a; margin-top:2px; font-weight:600; }
        .md-cast-role  { font-size:.62rem; color:rgba(255,255,255,.4); margin-top:1px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

        /* Box office table */
        .md-bo-table { width:100%; border-collapse:collapse; }
        .md-bo-table td { padding:12px 16px; border-bottom:1px solid rgba(255,255,255,.06); font-size:.85rem; }
        .md-bo-table td:first-child { color:rgba(255,255,255,.45); font-size:.72rem; text-transform:uppercase; letter-spacing:.07em; font-weight:700; width:140px; }
        .md-bo-table td:last-child { color:#f1f1f1; font-weight:600; }

        /* Scroll rows */
        .md-hscroll { display:flex; gap:10px; overflow-x:auto; padding-bottom:6px; scrollbar-width:none; }
        .md-hscroll::-webkit-scrollbar { display:none; }
        @media(min-width:480px){ .md-hscroll { gap:12px; } }

        /* Trailer embed */
        .md-trailer { width:100%; max-width:720px; aspect-ratio:16/9; border-radius:10px; overflow:hidden; background:#000; }
        .md-trailer iframe { width:100%; height:100%; border:none; display:block; }

        /* Divider */
        .md-divider { border:none; border-top:1px solid rgba(255,255,255,.07); margin:24px 0; }

        /* Production chip */
        .md-prod-chip {
          display:inline-flex; align-items:center; gap:6px;
          background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12);
          border-radius:20px; padding:5px 12px;
          font-size:.73rem; font-weight:600; color:rgba(255,255,255,.7);
          text-decoration:none; transition:border-color .16s;
        }
        .md-prod-chip:hover { border-color:rgba(201,151,58,.45); color:#c9973a; }

        /* Empty */
        .md-empty { text-align:center; padding:48px 20px; color:rgba(255,255,255,.3); }
        .md-empty p { font-size:.84rem; margin:8px 0 0; }
      `}</style>

      {/* ══ HERO ══ */}
      <div className="md-hero">
        {/* Blurred backdrop — visible, atmospheric */}
        {bannerImg && (
          <div className="md-hero-bg" style={{ backgroundImage:`url(${bannerImg})` }} />
        )}
        {/* Gradient overlay: left-dark + bottom-fade */}
        <div className="md-hero-overlay" />

        <div className="md-hero-inner">
          {/* ── Poster ── */}
          <div className="md-poster">
            {movie.posterUrl
              ? <img src={movie.posterUrl} alt={movie.title} loading="eager" decoding="async"
                  onError={e => e.target.style.display="none"} />
              : <div className="md-poster-ph">🎬</div>}
          </div>

          {/* ── Info ── */}
          <div className="md-info">
            {/* Back link */}
            <Link to="/movies" style={{ fontSize:".74rem", color:"rgba(255,255,255,.38)", textDecoration:"none", display:"inline-block", marginBottom:18, letterSpacing:".01em" }}>
              ← All Films
            </Link>

            {/* Genre / category tags */}
            <div className="md-tags">
              <span className="md-tag">{movie.category||"Feature Film"}</span>
              {movie.language && <span className="md-tag-outline">{movie.language}</span>}
              {movie.genre?.slice(0,3).map(g => <span key={g} className="md-tag-outline">{g}</span>)}
            </div>

            {/* Title */}
            <h1 className="md-title">{movie.title}</h1>

            {/* Rating + Verdict */}
            <div className="md-score-row">
              {avgRating && (
                <div className="md-rating">
                  <span className="md-rating-num">⭐ {avgRating}</span>
                  <span className="md-rating-cnt">({movie.reviews.length} reviews)</span>
                </div>
              )}
              <span className="md-verdict-badge" style={{
                background:`${verdictColor}25`,
                border:`1.5px solid ${verdictColor}`,
                color: verdictColor,
              }}>{movie.verdict||"Upcoming"}</span>
            </div>

            {/* Meta row */}
            <div className="md-meta-row">
              {movie.director  && <span>🎬 {movie.director}</span>}
              {(movie.releaseDate||movie.releaseTBA) && <span>🗓 {movie.releaseTBA?"TBA":fmtDate(movie.releaseDate)}</span>}
              {movie.runtime   && <span>⏱ {movie.runtime}</span>}
              {movie.budget    && <span>💰 {movie.budget}</span>}
              {movie.imdbRating && <span><span style={{color:"#f5c518",fontWeight:700,fontSize:".7rem"}}>IMDb</span> {movie.imdbRating}</span>}
            </div>

            {/* Synopsis */}
            {movie.synopsis && <p className="md-synopsis">{movie.synopsis}</p>}

            {/* CTA buttons */}
            <div className="md-actions">
              {movie.media?.trailer?.ytId && (
                <button className="md-btn-play" onClick={() => {
                  setTab("overview");
                  setTimeout(() => trailerRef.current?.scrollIntoView({ behavior:"smooth", block:"center" }), 200);
                }}>▶ Watch Trailer</button>
              )}
              <button className="md-btn-outline" onClick={() => setTab("cast")}>👥 Cast</button>
              <button className="md-btn-outline" onClick={() => setTab("media")}>🎵 Songs</button>
              {isOwner && (
                <button className="btn btn-gold btn-sm" onClick={() => { setEditing(true); setTab("overview"); }}>✏ Edit</button>
              )}
            </div>

            {/* Production houses */}
            {(movie.productionId || (movie.collaborators||[]).length > 0) && (
              <div style={{ display:"flex", gap:7, flexWrap:"wrap", marginBottom:14 }}>
                {movie.productionId && (
                  <Link to={`/production/${movie.productionId._id||movie.productionId}`} className="md-prod-chip">
                    {movie.productionId.logo && <SafeImg src={movie.productionId.logo} alt="" style={{width:15,height:15,borderRadius:3,objectFit:"cover"}} />}
                    {movie.productionId.name}
                  </Link>
                )}
                {(movie.collaborators||[]).map(c => (
                  <Link key={c._id||c} to={`/production/${c._id||c}`} className="md-prod-chip">
                    {c.logo && <SafeImg src={c.logo} alt="" style={{width:15,height:15,borderRadius:3,objectFit:"cover"}} />}
                    {c.name}
                  </Link>
                ))}
              </div>
            )}

            {/* Box office mini-strip */}
            {(movie.boxOffice?.opening || movie.boxOffice?.firstWeek || movie.boxOffice?.total) && (
              <div className="md-bo-row">
                {movie.boxOffice.opening   && <div className="md-bo-item"><div className="md-bo-label">Opening</div><div className="md-bo-val">{movie.boxOffice.opening}</div></div>}
                {movie.boxOffice.firstWeek && <div className="md-bo-item"><div className="md-bo-label">First Week</div><div className="md-bo-val">{movie.boxOffice.firstWeek}</div></div>}
                {movie.boxOffice.total     && <div className="md-bo-item"><div className="md-bo-label">Total</div><div className="md-bo-val">{movie.boxOffice.total}</div></div>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          STICKY TABS
      ══════════════════════════════════════════ */}
      <div className="md-tabs-bar">
        <div className="md-tabs-inner">
          {["overview","cast","media","boxoffice","news","reviews"].map(t => (
            <button key={t} className={`md-tab${tab===t?" on":""}`}
              onClick={() => { setTab(t); setEditing(false); setEditBO(false); }}>
              {t==="boxoffice" ? "Box Office" : t.charAt(0).toUpperCase()+t.slice(1)}
              {t==="reviews" && movie.reviews?.length ? ` (${movie.reviews.length})` : ""}
              {t==="news"    && movie.news?.length    ? ` (${movie.news.length})`    : ""}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════
          TAB CONTENT
      ══════════════════════════════════════════ */}
      <div className="md-body">

        {/* ── OVERVIEW ── */}
        {tab==="overview" && !editing && (
          <div style={{ maxWidth:860 }}>
            {movie.synopsis
              ? <p style={{ color:"rgba(255,255,255,.7)", lineHeight:1.8, fontSize:"clamp(.86rem,2vw,.96rem)", marginBottom:28 }}>{movie.synopsis}</p>
              : <p style={{ color:"rgba(255,255,255,.35)" }}>No synopsis available.</p>}

            {/* Crew pills */}
            {crew.length > 0 && (
              <div style={{ marginBottom:24 }}>
                <p className="md-sec-label">Director & Crew</p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {crew.slice(0,8).map((c,i) => (
                    <div key={c.castId||i} className="md-crew-pill"
                      onClick={() => c.castId && navigate(castPath({ _id:c.castId, name:c.name }))}>
                      <div className="md-crew-av">
                        {c.photo
                          ? <img src={c.photo} alt={c.name} loading="lazy" onError={e=>e.target.style.display="none"}/>
                          : "👤"}
                      </div>
                      <div>
                        <div className="md-crew-name">{c.name}</div>
                        <div className="md-crew-role">{c.type}{c.role?` · ${c.role}`:""}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actor circles */}
            {actors.length > 0 && (
              <div style={{ marginBottom:28 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <p className="md-sec-label" style={{ margin:0 }}>Cast</p>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize:".7rem" }} onClick={() => setTab("cast")}>See all →</button>
                </div>
                <div className="md-hscroll">
                  {actors.slice(0,14).map((c,i) => (
                    <div key={c.castId||i} className="md-actor"
                      onClick={() => c.castId && navigate(castPath({ _id:c.castId, name:c.name }))}
                      onMouseEnter={e => e.currentTarget.querySelector(".md-actor-av").style.borderColor="#c9973a"}
                      onMouseLeave={e => e.currentTarget.querySelector(".md-actor-av").style.borderColor="rgba(255,255,255,.1)"}>
                      <div className="md-actor-av">
                        {c.photo
                          ? <img src={c.photo} alt={c.name} loading="lazy" onError={e=>e.target.style.display="none"}/>
                          : "👤"}
                      </div>
                      <div className="md-actor-name">{c.name}</div>
                      {c.role && <div className="md-actor-role">{c.role}</div>}
                    </div>
                  ))}
                  {actors.length > 14 && (
                    <div className="md-actor" onClick={() => setTab("cast")} style={{ cursor:"pointer" }}>
                      <div className="md-actor-av" style={{ borderStyle:"dashed", borderColor:"#c9973a", background:"rgba(201,151,58,.08)", color:"#c9973a", fontSize:"1rem" }}>
                        +{actors.length-14}
                      </div>
                      <div className="md-actor-name" style={{ color:"#c9973a" }}>more</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Songs preview */}
            {(movie.media?.songs||[]).length > 0 && (
              <div style={{ marginBottom:28 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                  <p className="md-sec-label" style={{ margin:0 }}>Songs · {movie.media.songs.length}</p>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize:".7rem" }} onClick={() => setTab("media")}>See all →</button>
                </div>
                <div className="md-hscroll">
                  {movie.media.songs.slice(0,8).map((s,i) => (
                    <div key={i} className="md-song"
                      onClick={() => navigate(movie ? songPath(movie,i) : `/song/${id}/${i}`)}>
                      <div className="md-song-thumb">
                        {s.ytId && <img src={`https://img.youtube.com/vi/${s.ytId}/mqdefault.jpg`} alt={s.title} loading="lazy" onError={e=>e.target.style.opacity=".2"}/>}
                        <div className="md-song-icon">♪</div>
                      </div>
                      <div className="md-song-info">
                        <div className="md-song-title">{s.title}</div>
                        {s.singer && <div className="md-song-singer">{s.singer}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trailer */}
            {movie.media?.trailer?.ytId && (
              <div style={{ marginBottom:28 }}>
                <p className="md-sec-label">Official Trailer</p>
                <div ref={trailerRef} className="md-trailer">
                  <iframe src={`https://www.youtube.com/embed/${movie.media.trailer.ytId}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen title="Trailer" />
                </div>
              </div>
            )}

            {isOwner && (
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", paddingTop:16, borderTop:"1px solid rgba(255,255,255,.07)" }}>
                <button className="btn btn-gold btn-sm" onClick={() => setEditing(true)}>✏ Edit Details</button>
                <button className="btn btn-outline btn-sm" onClick={() => { setEditBO(true); setTab("boxoffice"); }}>📊 Box Office</button>
              </div>
            )}
          </div>
        )}

        {/* ── OVERVIEW EDIT ── */}
        {tab==="overview" && editing && (
          <div style={{ maxWidth:900 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <h3 style={{ fontSize:"1rem", textTransform:"uppercase", letterSpacing:"0.08em", color:"rgba(255,255,255,.45)" }}>Edit Movie Details</h3>
              <div style={{ display:"flex", gap:10 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
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
              <div className="form-group"><label className="form-label">Director</label><input className="form-input" value={editForm.director||""} onChange={e=>setE("director",e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Producer</label><input className="form-input" value={editForm.producer||""} onChange={e=>setE("producer",e.target.value)} /></div>
            </div>
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Runtime</label><input className="form-input" value={editForm.runtime||""} onChange={e=>setE("runtime",e.target.value)} placeholder="e.g. 2h 15m" /></div>
              <div className="form-group"><label className="form-label">IMDb Rating</label><input className="form-input" value={editForm.imdbRating||""} onChange={e=>setE("imdbRating",e.target.value)} placeholder="7.5" /></div>
            </div>
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Poster URL</label><input className="form-input" value={editForm.posterUrl||""} onChange={e=>setE("posterUrl",e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Verdict</label><select className="form-select" value={editForm.verdict||"Upcoming"} onChange={e=>setE("verdict",e.target.value)}>{VDICT.map(v=><option key={v}>{v}</option>)}</select></div>
            </div>
            <div className="form-group"><label className="form-label">Genres</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {GENRES.map(g=>(
                  <button key={g} type="button" className={`btn btn-sm ${(editForm.genre||[]).includes(g)?"btn-gold":"btn-outline"}`} onClick={()=>toggleGenre(g)}>{g}</button>
                ))}
              </div>
            </div>
            <div className="form-group"><label className="form-label">Synopsis</label><textarea className="form-textarea" value={editForm.synopsis||""} onChange={e=>setE("synopsis",e.target.value)} style={{minHeight:100}} /></div>
            <div className="form-group"><label className="form-label">Thumbnail URL</label><input className="form-input" value={editForm.thumbnailUrl||""} onChange={e=>setE("thumbnailUrl",e.target.value)} /></div>
          </div>
        )}

        {/* ── CAST ── */}
        {tab==="cast" && (
          <div>
            {isOwner && (
              <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:20 }}>
                <button className="btn btn-gold btn-sm" onClick={() => setAddCastModal(true)}>+ Add Cast</button>
              </div>
            )}
            {/* Crew section */}
            {crew.length > 0 && (
              <div style={{ marginBottom:28 }}>
                <p className="md-sec-label">Director & Crew</p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {crew.map((c,i) => (
                    <div key={c.castId||i} className="md-crew-pill"
                      onClick={() => c.castId && navigate(portalMode?`/portal/cast/${c.castId}`:castPath({ _id:c.castId, name:c.name }))}>
                      <div className="md-crew-av">
                        {c.photo ? <img src={c.photo} alt={c.name} loading="lazy" onError={e=>e.target.style.display="none"}/> : "👤"}
                      </div>
                      <div>
                        <div className="md-crew-name">{c.name}</div>
                        <div className="md-crew-role">{c.type}{c.role?` · ${c.role}`:""}</div>
                      </div>
                      {isOwner && <button style={{marginLeft:8,background:"none",border:"none",color:"rgba(255,100,100,.6)",cursor:"pointer",fontSize:".75rem"}} onClick={e=>{e.stopPropagation();removeCast(c.castId);}}>✕</button>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Actors grid */}
            {actors.length > 0 && (
              <div>
                <p className="md-sec-label">Actors & Actresses</p>
                <div className="md-cast-grid">
                  {actors.map((c,i) => (
                    <div key={c.castId||i} className="md-cast-card"
                      onClick={() => c.castId && navigate(portalMode?`/portal/cast/${c.castId}`:castPath({ _id:c.castId, name:c.name }))}>
                      <div className="md-cast-img">
                        {c.photo ? <img src={c.photo} alt={c.name} loading="lazy" onError={e=>e.target.style.display="none"}/> : "👤"}
                        {isOwner && <button style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,.6)",border:"none",color:"rgba(255,100,100,.8)",cursor:"pointer",borderRadius:4,fontSize:".72rem",padding:"2px 6px"}} onClick={e=>{e.stopPropagation();removeCast(c.castId);}}>✕</button>}
                      </div>
                      <div className="md-cast-meta">
                        <div className="md-cast-cname">{c.name}</div>
                        <div className="md-cast-type">{c.type}</div>
                        {c.role && <div className="md-cast-role">{c.role}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(movie.cast||[]).length === 0 && (
              <div className="md-empty"><span style={{fontSize:"2.5rem"}}>👤</span><p>No cast added yet.</p></div>
            )}
          </div>
        )}

        {/* ── MEDIA (Songs + Trailer) ── */}
        {tab==="media" && (
          <div>
            {isOwner && (
              <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:20, gap:10 }}>
                <button className="btn btn-outline btn-sm" onClick={() => setEditTrailer(true)}>🎬 Edit Trailer</button>
                <button className="btn btn-gold btn-sm" onClick={() => setAddSongModal(true)}>+ Add Song</button>
              </div>
            )}
            {movie.media?.trailer?.ytId && (
              <div style={{ marginBottom:36 }}>
                <p className="md-sec-label">Official Trailer</p>
                <div ref={trailerRef} className="md-trailer">
                  <iframe src={`https://www.youtube.com/embed/${movie.media.trailer.ytId}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen title="Trailer" />
                </div>
                {editTrailer && (
                  <div style={{ display:"flex", gap:10, marginTop:12, flexWrap:"wrap" }}>
                    <input className="form-input" value={trailerInput} onChange={e=>setTrailerInput(e.target.value)} placeholder="YouTube ID or URL" style={{ flex:1, minWidth:200 }} />
                    <button className="btn btn-gold btn-sm" onClick={saveTrailer} disabled={savingTrailer}>{savingTrailer?"Saving…":"Save"}</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditTrailer(false)}>Cancel</button>
                  </div>
                )}
              </div>
            )}
            {(movie.media?.songs||[]).length > 0 && (
              <div>
                <p className="md-sec-label">Songs · {movie.media.songs.length}</p>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {movie.media.songs.map((s,i) => (
                    <div key={i} style={{ display:"flex", gap:12, alignItems:"center", padding:"10px 12px", background:"#1a1a1a", border:"1px solid rgba(255,255,255,.07)", borderRadius:8, cursor:"pointer", transition:"border-color .16s" }}
                      onClick={() => navigate(movie ? songPath(movie,i) : `/song/${id}/${i}`)}
                      onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(201,151,58,.4)"}
                      onMouseLeave={e=>e.currentTarget.style.borderColor="rgba(255,255,255,.07)"}>
                      <div style={{ flexShrink:0, width:60, height:40, borderRadius:5, overflow:"hidden", background:"#272727", position:"relative" }}>
                        {s.ytId && <img src={`https://img.youtube.com/vi/${s.ytId}/mqdefault.jpg`} alt={s.title} style={{ width:"100%",height:"100%",objectFit:"cover" }} loading="lazy" onError={e=>e.target.style.opacity=".2"}/>}
                        <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.25)",fontSize:".9rem" }}>♪</div>
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:".82rem", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"#f1f1f1" }}>{s.title}</div>
                        {s.singer && <div style={{ fontSize:".7rem", color:"#c9973a", marginTop:2 }}>{s.singer}</div>}
                        {s.musicDirector && <div style={{ fontSize:".66rem", color:"rgba(255,255,255,.35)", marginTop:1 }}>🎼 {s.musicDirector}</div>}
                      </div>
                      {s.ytId && <a href={`https://youtube.com/watch?v=${s.ytId}`} target="_blank" rel="noreferrer" style={{ fontSize:".68rem",color:"#c9973a",fontWeight:700,opacity:.7,padding:"4px 8px",flexShrink:0 }} onClick={e=>e.stopPropagation()}>YT↗</a>}
                      {isOwner && <button style={{ background:"none",border:"none",color:"rgba(255,100,100,.6)",cursor:"pointer",fontSize:".75rem",padding:"4px 8px",flexShrink:0 }} onClick={e=>{e.stopPropagation();removeSong(i);}}>✕</button>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!movie.media?.trailer?.ytId && !movie.media?.songs?.length && (
              <div className="md-empty"><span style={{fontSize:"2.5rem"}}>🎵</span><p>No media added yet.</p></div>
            )}
          </div>
        )}

        {/* ── BOX OFFICE ── */}
        {tab==="boxoffice" && !editBO && (
          <div style={{ maxWidth:600 }}>
            <table className="md-bo-table">
              <tbody>
                {[["Opening Weekend", movie.boxOffice?.opening],["First Week", movie.boxOffice?.firstWeek],["Total Collection", movie.boxOffice?.total],["Budget", movie.budget],["Verdict", movie.verdict]].map(([k,v])=>v?(
                  <tr key={k}><td>{k}</td><td>{v}</td></tr>
                ):null)}
              </tbody>
            </table>
            {isOwner && <div style={{ marginTop:24 }}><button className="btn btn-outline btn-sm" onClick={() => setEditBO(true)}>✏ Update Box Office</button></div>}
          </div>
        )}
        {tab==="boxoffice" && editBO && (
          <div style={{ maxWidth:700 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <h3 style={{ fontSize:"1rem", textTransform:"uppercase", letterSpacing:"0.08em", color:"rgba(255,255,255,.45)" }}>Update Box Office</h3>
              <div style={{ display:"flex", gap:10 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditBO(false)}>Cancel</button>
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
          <div>
            {canNews && <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:20 }}><button className="btn btn-gold btn-sm" onClick={() => { setEditingNews(null); setNewsModal(true); }}>+ Add News</button></div>}
            {movie.news?.length ? (
              <div className="news-grid">
                {[...movie.news].reverse().map(n => (
                  <div key={n._id} className="news-card">
                    <SafeNewsImg src={n.imageUrl} alt={n.title} />
                    <div className="news-card-body">
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                        <div className="news-card-category">{n.category||"Update"}</div>
                        {canNews && <div style={{ display:"flex", gap:6 }}>
                          <button className="news-action-btn" onClick={() => { setEditingNews(n); setNewsModal(true); }}>✏</button>
                          <button className="news-action-btn news-action-delete" onClick={() => handleDeleteNews(n._id)}>🗑</button>
                        </div>}
                      </div>
                      <div className="news-card-title">{n.title}</div>
                      <div className="news-card-content">{n.content}</div>
                      <div className="news-card-meta">{new Date(n.createdAt).toLocaleDateString("en-IN")}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="md-empty">
                <span style={{fontSize:"2.5rem"}}>📰</span>
                <p>No news yet.</p>
                {canNews && <button className="btn btn-gold btn-sm" style={{ marginTop:12 }} onClick={() => setNewsModal(true)}>+ Add First News</button>}
              </div>
            )}
          </div>
        )}

        {/* ── REVIEWS ── */}
        {tab==="reviews" && (
          <div style={{ maxWidth:800 }}>
            <div style={{ background:"#1a1a1a", border:"1px solid rgba(255,255,255,.08)", borderRadius:10, padding:"20px", marginBottom:32 }}>
              <h3 style={{ marginBottom:16, fontSize:".94rem", fontWeight:700 }}>Write a Review</h3>
              <form onSubmit={submitReview}>
                <div className="form-grid" style={{ marginBottom:12 }}>
                  <div className="form-group" style={{ marginBottom:0 }}><label className="form-label">Your Name</label><input className="form-input" required value={rvUser} onChange={e=>setRvUser(e.target.value)} /></div>
                  <div className="form-group" style={{ marginBottom:0 }}><label className="form-label">Rating</label>
                    <select className="form-select" value={rvRating} onChange={e=>setRvRating(Number(e.target.value))}>
                      {[5,4,3,2,1].map(n=><option key={n} value={n}>{n} ★ — {["","Poor","Below Average","Average","Good","Excellent"][n]}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Review</label><textarea className="form-textarea" required value={rvText} onChange={e=>setRvText(e.target.value)} /></div>
                <button className="btn btn-gold btn-sm" type="submit" disabled={submitting}>{submitting?"Submitting…":"Submit Review"}</button>
              </form>
            </div>
            {movie.reviews?.length ? (
              <div className="review-list">
                {[...movie.reviews].reverse().map((r,i) => (
                  <div key={i} className="review-item">
                    <div className="review-header">
                      <span className="review-user">{r.user}</span>
                      <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                        <span className="review-stars">{stars(r.rating)}</span>
                        {r.date && <span className="review-date">{r.date}</span>}
                      </div>
                    </div>
                    <p className="review-text">{r.text}</p>
                  </div>
                ))}
              </div>
            ) : <p style={{ color:"rgba(255,255,255,.35)", marginTop:20 }}>No reviews yet. Be the first!</p>}
          </div>
        )}
      </div>

      {/* ══ RELATED SECTIONS ══ */}
      <div className="home-sections" style={{ paddingTop:16, background:"var(--bg)" }}>
        {actors.length > 0 && (
          <HomeRow title="🎭 Full Cast">
            {[...crew,...actors].map((c,i) => (
              <MiniCastCard key={c.castId||i} person={c}
                onClick={() => c.castId && navigate(portalMode?`/portal/cast/${c.castId}`:castPath({ _id:c.castId, name:c.name }))} />
            ))}
          </HomeRow>
        )}
        {sameDirector.length > 0 && (
          <HomeRow title={`🎬 More by ${movie.director}`}>
            {sameDirector.map(m => <MiniMovieCard key={m._id} movie={m} onClick={() => navigate(moviePath(m))} />)}
          </HomeRow>
        )}
        {relatedMovies.length > 0 && (
          <HomeRow title="🎥 Similar Films" tag="Related">
            {relatedMovies.map(m => <MiniMovieCard key={m._id} movie={m} onClick={() => navigate(moviePath(m))} />)}
          </HomeRow>
        )}
      </div>

      {/* ── Modals ── */}
      {newsModal    && <NewsModal movieId={id} existing={editingNews} onSave={handleNewsSaved} onClose={()=>{setNewsModal(false);setEditingNews(null);}} />}
      {addCastModal && <AddCastModal movieId={id} onAdded={m=>{setMovie(prev=>({...prev,cast:m.cast}));}} onClose={()=>setAddCastModal(false)} />}
      {addSongModal && <AddSongModal movieId={id} onAdded={m=>{setMovie(prev=>({...prev,media:m.media}));}} onClose={()=>setAddSongModal(false)} />}
    </div>
  );

}