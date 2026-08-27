import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { API, getToken } from "../api/api";
import { ImageUploadInput } from "../components/UI";

const GENRES     = ["Action","Drama","Romance","Comedy","Thriller","Family","Historical","Devotional","Horror"];
const CATEGORIES = ["Feature Film","Short Film","Web Series","Documentary"];
const CAST_TYPES = ["Actor","Actress","Director","Producer","Music Director","Cinematographer","Choreographer","Lyricist","Singer","Editor","Other"];
const STEPS      = ["Basic Info","Cast & Crew","Collaborators","Media","Review & Submit"];

// ── Is s a valid 24-hex MongoDB ObjectId string? ──
const isOid = (s) => typeof s === "string" && /^[a-f0-9]{24}$/i.test(s.trim());

// ── Extract bare YouTube ID ──
const extractYtId = (input) => {
  if (!input) return "";
  const s = String(input).trim();
  const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  return "";
};

// ────────────────────────────────────────────
// StepBar
// ────────────────────────────────────────────
function StepBar({ current }) {
  return (
    <div style={{ display:"flex", alignItems:"center", marginBottom:32 }}>
      {STEPS.map((label, i) => (
        <React.Fragment key={i}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
            <div style={{
              width:34, height:34, borderRadius:"50%",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontWeight:700, fontSize:"0.82rem", flexShrink:0,
              background: i < current ? "var(--gold)" : i === current ? "rgba(201,151,58,0.18)" : "var(--bg3)",
              color: i < current ? "#000" : i === current ? "var(--gold)" : "var(--muted)",
              border: i === current ? "2px solid var(--gold)" : "2px solid transparent",
              transition:"all 0.2s",
            }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span style={{
              fontSize:"0.6rem", fontWeight:600, textTransform:"uppercase",
              letterSpacing:"0.06em", whiteSpace:"nowrap",
              color: i === current ? "var(--gold)" : "var(--muted)",
            }}>{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{
              flex:1, height:2, margin:"0 4px", marginBottom:22,
              background: i < current ? "var(--gold)" : "var(--border)",
              transition:"background 0.3s",
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────
// CastCard row
// ────────────────────────────────────────────
function CastCard({ entry, index, onRoleChange, onRemove }) {
  const icons = { Director:"🎬", Producer:"🎥", "Music Director":"🎵", Cinematographer:"📷", Choreographer:"💃", Lyricist:"✍️", Singer:"🎤", Editor:"✂️", Actor:"🎭", Actress:"🎭" };
  const icon = icons[entry.type] || "👤";

  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, background:"var(--bg3)", padding:"11px 14px", borderRadius:8, border:"1px solid var(--border)" }}>
      <div style={{ width:40, height:40, borderRadius:"50%", background:"var(--bg2)", overflow:"hidden", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid var(--border)", fontSize:"1.1rem" }}>
        {entry.photo
          ? <img src={entry.photo} alt={entry.name} style={{ width:"100%",height:"100%",objectFit:"cover" }} onError={e=>{e.target.style.display="none";}} />
          : icon}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{ fontWeight:700, fontSize:"0.88rem" }}>{entry.name}</span>
          <span style={{ fontSize:"0.67rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.04em", padding:"2px 8px", borderRadius:10, background:"rgba(201,151,58,0.14)", color:"var(--gold)" }}>{entry.type}</span>
          {entry.isNew
            ? <span style={{ fontSize:"0.64rem", color:"#e8b96a", fontWeight:600 }}>✦ NEW</span>
            : <span style={{ fontSize:"0.64rem", color:"#4caf82", fontWeight:600 }}>✓ LINKED</span>}
        </div>
      </div>
      <input className="form-input" style={{ width:150, flexShrink:0 }} value={entry.role} placeholder="Character / role" onChange={e => onRoleChange(index, e.target.value)} />
      <button className="btn btn-ghost btn-sm" type="button" onClick={() => onRemove(index)} style={{ color:"var(--red)", flexShrink:0 }} title="Remove">✕</button>
    </div>
  );
}

// ────────────────────────────────────────────
// Main component
// ────────────────────────────────────────────
export default function AddMovie({ production, onToast }) {
  const navigate = useNavigate();
  const [step,    setStep]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // ── Step 0: Basic ──
  const [form, setForm] = useState({
    title:"", category:"Feature Film", genre:[], releaseDate:"", releaseDatePrecision:"full",
    releaseTBA:false, isReRelease:false, reReleaseDate:"", reReleaseDatePrecision:"full", language:"Odia", budget:"", synopsis:"", posterUrl:"", thumbnailUrl:"",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleGenre = g => set("genre", form.genre.includes(g) ? form.genre.filter(x=>x!==g) : [...form.genre, g]);

  // ── Step 1: Cast ──
  const [cast,         setCast]         = useState([]);
  const [castQuery,    setCastQuery]    = useState("");
  const [castResults,  setCastResults]  = useState([]);
  const [castSearching,setCastSearching]= useState(false);
  const [showNewCast,  setShowNewCast]  = useState(false);
  const [nc, setNc] = useState({ name:"", type:"Actor", role:"", photo:"", bio:"" });
  const castTimer = useRef(null);

  // ── Step 2: Collaborators ──
  const [collabs,       setCollabs]       = useState([]);
  const [collabQuery,   setCollabQuery]   = useState("");
  const [collabResults, setCollabResults] = useState([]);
  const collabTimer = useRef(null);

  // ── Step 3: Media ──
  const [videos, setVideos] = useState([]);
  const [vf, setVf] = useState({ url: "", type: "Trailer" });
  const [songs,      setSongs]      = useState([]);
  const [sf, setSf] = useState({ url:"", title:"", singer:"", thumb:"" });

  // ── Debounced cast search ──
  useEffect(() => {
    if (!castQuery.trim()) { setCastResults([]); return; }
    clearTimeout(castTimer.current);
    castTimer.current = setTimeout(async () => {
      setCastSearching(true);
      try { setCastResults(await API.searchCast(castQuery)); }
      catch { setCastResults([]); }
      finally { setCastSearching(false); }
    }, 300);
    return () => clearTimeout(castTimer.current);
  }, [castQuery]);

  // ── Debounced collab search ──
  useEffect(() => {
    if (!collabQuery.trim()) { setCollabResults([]); return; }
    clearTimeout(collabTimer.current);
    collabTimer.current = setTimeout(async () => {
      try {
        const res = await API.searchProductions(collabQuery);
        setCollabResults(res.filter(p => String(p._id) !== String(production?._id)));
      } catch { setCollabResults([]); }
    }, 300);
    return () => clearTimeout(collabTimer.current);
  }, [collabQuery, production]);

  // ── Add existing cast ──
  // CRITICAL: castId MUST be stored as a plain string extracted from c._id
  const addExistingCast = useCallback((c) => {
    // c._id might be an ObjectId object from the API — always convert to string
    const idStr = String(c._id || "").trim();
    if (!isOid(idStr)) return; // safety check
    if (cast.some(x => x.castId === idStr)) return; // already added
    setCast(prev => [...prev, {
      castId: idStr,   // ← plain "abc123..." hex string, NEVER ObjectId object
      isNew:  false,
      name:   String(c.name  || ""),
      photo:  String(c.photo || ""),
      type:   String(c.type  || "Actor"),
      role:   "",
    }]);
    setCastQuery(""); setCastResults([]);
  }, [cast]);

  // ── Add new cast ──
  const addNewCast = useCallback(() => {
    const name = nc.name.trim();
    if (!name) return;
    if (cast.some(x => x.name.toLowerCase() === name.toLowerCase())) {
      setNc({ name:"", type:"Actor", role:"", photo:"", bio:"" });
      setShowNewCast(false); return;
    }
    setCast(prev => [...prev, {
      castId: "",     // ← empty string signals "create new" to backend
      isNew:  true,
      name,
      type:   nc.type,
      role:   nc.role.trim(),
      photo:  nc.photo.trim(),
      bio:    nc.bio.trim(),
    }]);
    setNc({ name:"", type:"Actor", role:"", photo:"", bio:"" });
    setShowNewCast(false);
  }, [cast, nc]);

  const updateCastRole = (i, role) => setCast(p => p.map((c,idx) => idx===i ? {...c,role} : c));
  const removeCast     = (i)       => setCast(p => p.filter((_,idx) => idx!==i));

  const addCollab    = p => { if (!collabs.some(x=>String(x._id)===String(p._id))) { setCollabs(p=>[...p,p]); setCollabQuery(""); setCollabResults([]); } };
  const removeCollab = i => setCollabs(p => p.filter((_,idx) => idx!==i));

  // workaround for addCollab closure bug
  const addCollabSafe = (p) => {
    setCollabs(prev => {
      if (prev.some(x => String(x._id) === String(p._id))) return prev;
      return [...prev, p];
    });
    setCollabQuery(""); setCollabResults([]);
  };

  const handleSongUrlChange = val => {
    const id = extractYtId(val);
    setSf(f => ({ ...f, url: val, thumb: id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "" }));
  };
  const addSong = () => {
    if (!sf.title.trim()) return;
    const id = extractYtId(sf.url);
    setSongs(p => [...p, { title:sf.title.trim(), singer:sf.singer.trim(), ytId:id, thumbnailUrl:sf.thumb||(id?`https://img.youtube.com/vi/${id}/hqdefault.jpg`:"") }]);
    setSf({ url:"", title:"", singer:"", thumb:"" });
  };
  const removeSong = i => setSongs(p => p.filter((_,idx) => idx!==i));

  // ── Submit ──
  const handleSubmit = async () => {
    if (!form.title.trim()) { setError("Movie title is required"); return; }
    setError(""); setLoading(true);

    try {
      /**
       * Build castPayload — each entry has:
       *   castId: plain hex string (24 chars) for existing, or "" for new
       *   isNew:  true only for genuinely new members with no castId
       *
       * Backend resolveCastEntry() checks isOid(castId):
       *   true  → attach existing Cast doc
       *   false → create new Cast doc
       */
      const castPayload = cast.map(c => ({
        castId: isOid(c.castId) ? c.castId : "",   // ALWAYS a plain string
        isNew:  !isOid(c.castId),
        name:   String(c.name  || ""),
        type:   String(c.type  || "Actor"),
        role:   String(c.role  || ""),
        photo:  String(c.photo || ""),
        bio:    String(c.bio   || ""),
      }));



      const body = {
        title:        String(form.title).trim(),
        category:     String(form.category    || "Feature Film"),
        genre:        [...(form.genre         || [])],
        releaseDate:  form.releaseTBA ? "" : String(form.releaseDate || ""),
        releaseDatePrecision: String(form.releaseDatePrecision || "full"),
        releaseTBA:   !!form.releaseTBA,
        isReRelease:  !!form.isReRelease,
        reReleaseDate:form.isReRelease ? String(form.reReleaseDate || "") : "",
        reReleaseDatePrecision: String(form.reReleaseDatePrecision || "full"),
        language:     String(form.language    || "Odia"),
        budget:       String(form.budget      || ""),
        synopsis:     String(form.synopsis    || ""),
        posterUrl:    String(form.posterUrl   || ""),
        thumbnailUrl: String(form.thumbnailUrl || ""),
        cast: castPayload,
        media: {
          videos: videos.map(v => ({
            ytId: v.ytId,
            url: v.url,
            thumbnailUrl: v.thumbnailUrl,
            type: v.type,
          })),
          songs: songs.map(s => ({
            title:        String(s.title        || ""),
            singer:       String(s.singer       || ""),
            ytId:         String(s.ytId         || ""),
            thumbnailUrl: String(s.thumbnailUrl || ""),
          })),
        },
        collaborators: collabs
          .map(c => String(c._id || "").trim())
          .filter(id => isOid(id)),
      };

      // Final safety: ensure body is JSON-serializable (no ObjectId objects)
      // by doing a roundtrip through JSON
      const safeBody = JSON.parse(JSON.stringify(body));

      const movie = await API.createMovie(safeBody);
      onToast?.(`"${movie.title}" created successfully!`);
      navigate(`/movie/${movie._id}`);
    } catch (e) {
      setError(typeof e === "string" ? e : (e?.message || "Failed to create movie. Please try again."));
      setLoading(false);
    }
  };

  if (!production || !getToken()) return (
    <div className="page empty-state"><h3>Please login to add movies.</h3></div>
  );

  const trailerYtIdPreview = extractYtId(trailerUrl);

  return (
    <div className="register-page" style={{ maxWidth:800 }}>
      <div className="register-header">
        <div style={{ marginBottom:12 }}>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => navigate("/dashboard")}>← Back to Portal</button>
        </div>
        <h1>Add New Film</h1>
        <p>Adding as <strong style={{ color:"var(--gold)" }}>{production.name}</strong></p>
      </div>

      <div className="register-card">
        <StepBar current={step} />

        {/* ════ STEP 0 — Basic Info ════ */}
        {step === 0 && (
          <>
            <div className="form-group">
              <label className="form-label">Movie Title *</label>
              <input className="form-input" value={form.title} onChange={e=>set("title",e.target.value)} placeholder="e.g. Daman" autoFocus />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e=>set("category",e.target.value)}>
                  {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Language</label>
                <input className="form-input" value={form.language} onChange={e=>set("language",e.target.value)} />
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Release Date</label>
                <div style={{ display:"flex", gap:10, marginBottom:8, flexWrap:"wrap" }}>
                  <label style={{ fontSize:"0.78rem", cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                    <input type="radio" name="releaseDatePrecision" value="full" checked={form.releaseDatePrecision === "full"} onChange={() => set("releaseDatePrecision", "full")} disabled={form.releaseTBA} /> Full Date
                  </label>
                  <label style={{ fontSize:"0.78rem", cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                    <input type="radio" name="releaseDatePrecision" value="month" checked={form.releaseDatePrecision === "month"} onChange={() => set("releaseDatePrecision", "month")} disabled={form.releaseTBA} /> Month & Year
                  </label>
                  <label style={{ fontSize:"0.78rem", cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                    <input type="radio" name="releaseDatePrecision" value="year" checked={form.releaseDatePrecision === "year"} onChange={() => set("releaseDatePrecision", "year")} disabled={form.releaseTBA} /> Year Only
                  </label>
                </div>
                {form.releaseDatePrecision === "full" && (
                  <input className="form-input" type="date" value={form.releaseDate} onChange={e=>set("releaseDate",e.target.value)} disabled={form.releaseTBA} />
                )}
                {form.releaseDatePrecision === "month" && (
                  <input className="form-input" type="month" value={form.releaseDate} onChange={e=>set("releaseDate",e.target.value)} disabled={form.releaseTBA} />
                )}
                {form.releaseDatePrecision === "year" && (
                  <input className="form-input" type="number" min="1900" max="2100" placeholder="e.g. 2025" value={form.releaseDate} onChange={e=>set("releaseDate",e.target.value)} disabled={form.releaseTBA} />
                )}

                <label style={{ marginTop:6, display:"flex", alignItems:"center", gap:6, fontSize:"0.8rem", color:"var(--muted)", cursor:"pointer" }}>
                  <input type="checkbox" checked={form.releaseTBA} onChange={e=>set("releaseTBA",e.target.checked)} /> TBA
                </label>
                <label style={{ marginTop:12, display:"flex", alignItems:"center", gap:6, fontSize:"0.8rem", color:"var(--muted)", cursor:"pointer" }}>
                  <input type="checkbox" checked={form.isReRelease} onChange={e=>set("isReRelease",e.target.checked)} /> Mark as Re-Release
                </label>
                {form.isReRelease && (
                  <div style={{ marginTop:6 }}>
                    <div style={{ display:"flex", gap:10, marginBottom:6, flexWrap:"wrap" }}>
                      <label style={{ fontSize:"0.75rem", cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                        <input type="radio" name="reReleaseDatePrecision" value="full" checked={form.reReleaseDatePrecision === "full"} onChange={() => set("reReleaseDatePrecision", "full")} /> Full Date
                      </label>
                      <label style={{ fontSize:"0.75rem", cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                        <input type="radio" name="reReleaseDatePrecision" value="month" checked={form.reReleaseDatePrecision === "month"} onChange={() => set("reReleaseDatePrecision", "month")} /> Month & Year
                      </label>
                      <label style={{ fontSize:"0.75rem", cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
                        <input type="radio" name="reReleaseDatePrecision" value="year" checked={form.reReleaseDatePrecision === "year"} onChange={() => set("reReleaseDatePrecision", "year")} /> Year Only
                      </label>
                    </div>
                    {form.reReleaseDatePrecision === "full" && (
                      <input className="form-input" type="date" value={form.reReleaseDate} onChange={e=>set("reReleaseDate",e.target.value)} />
                    )}
                    {form.reReleaseDatePrecision === "month" && (
                      <input className="form-input" type="month" value={form.reReleaseDate} onChange={e=>set("reReleaseDate",e.target.value)} />
                    )}
                    {form.reReleaseDatePrecision === "year" && (
                      <input className="form-input" type="number" min="1900" max="2100" placeholder="e.g. 2025" value={form.reReleaseDate} onChange={e=>set("reReleaseDate",e.target.value)} />
                    )}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Budget</label>
                <input className="form-input" value={form.budget} onChange={e=>set("budget",e.target.value)} placeholder="e.g. ₹2 Crore" />
              </div>
            </div>
                    <div className="form-group">
              <label className="form-label">Poster URL <span style={{ color:"var(--muted)", fontWeight:400 }}>(portrait 2:3)</span></label>
              <ImageUploadInput value={form.posterUrl} onChange={v => set("posterUrl", v)} placeholder="https://…" source="Movie" />
              {form.posterUrl && (
                <img src={form.posterUrl} alt="poster" style={{ marginTop:8, height:120, borderRadius:4, border:"1px solid var(--border)", objectFit:"cover" }} onError={e=>e.target.style.display="none"} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Thumbnail URL <span style={{ color:"var(--muted)", fontWeight:400 }}>(landscape 16:9)</span></label>
              <ImageUploadInput value={form.thumbnailUrl} onChange={v => set("thumbnailUrl", v)} placeholder="https://…" source="Movie" />
              {form.thumbnailUrl && (
                <img src={form.thumbnailUrl} alt="thumbnail" style={{ marginTop:8, width:"100%", maxHeight:140, objectFit:"cover", borderRadius:4, border:"1px solid var(--border)" }} onError={e=>e.target.style.display="none"} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Banner URL <span style={{ color:"var(--muted)", fontWeight:400 }}>(landscape 16:9 — homepage hero)</span></label>
              <ImageUploadInput value={form.bannerUrl} onChange={v => set("bannerUrl", v)} placeholder="Wide landscape image URL…" source="Movie" />
              {form.bannerUrl && (
                <img src={form.bannerUrl} alt="banner" style={{ marginTop:8, width:"100%", maxHeight:140, objectFit:"cover", borderRadius:4, border:"1px solid var(--border)" }} onError={e=>e.target.style.display="none"} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Synopsis</label>
              <textarea className="form-textarea" value={form.synopsis} onChange={e=>set("synopsis",e.target.value)} style={{ minHeight:90 }} placeholder="Brief story description…" />
            </div>
          </>
        )}

        {/* ════ STEP 1 — Cast & Crew ════ */}
        {step === 1 && (
          <>
            <div style={{ marginBottom:10 }}>
              <label className="form-label">Search existing cast & crew</label>
              <p style={{ fontSize:"0.78rem", color:"var(--muted)", margin:"4px 0 10px" }}>
                Search by name to link to an existing profile in the database.
              </p>
            </div>
            <div style={{ position:"relative", marginBottom:20 }}>
              <input className="form-input" value={castQuery} onChange={e=>setCastQuery(e.target.value)} placeholder="Type name to search…" />
              {(castSearching || castResults.length > 0 || (castQuery.trim() && !castSearching)) && (
                <div className="search-dropdown">
                  {castSearching && <div className="search-dropdown-item" style={{ color:"var(--muted)" }}>Searching…</div>}
                  {!castSearching && castResults.length === 0 && castQuery.trim() && (
                    <div className="search-dropdown-item" style={{ color:"var(--muted)", fontSize:"0.82rem" }}>
                      No results for "{castQuery}" — use Add New Member below
                    </div>
                  )}
                  {castResults.map(r => {
                    const idStr = String(r._id || "").trim();
                    const already = cast.some(x => x.castId === idStr);
                    return (
                      <div key={idStr} className="search-dropdown-item"
                        onClick={() => !already && addExistingCast(r)}
                        style={{ opacity:already?0.5:1, cursor:already?"default":"pointer" }}>
                        {r.photo && <img src={r.photo} alt={r.name} style={{ width:28,height:28,borderRadius:"50%",objectFit:"cover" }} onError={e=>e.target.style.display="none"} />}
                        <div style={{ flex:1 }}>
                          <span style={{ fontWeight:600 }}>{r.name}</span>
                          <span style={{ color:"var(--gold)", fontSize:"0.72rem", marginLeft:8 }}>{r.type}</span>
                        </div>
                        <span style={{ fontSize:"0.7rem", color:already?"var(--muted)":"#4caf82" }}>
                          {already ? "already added" : "✓ existing"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* New cast form */}
            {!showNewCast ? (
              <button className="btn btn-outline btn-sm" type="button" style={{ marginBottom:20 }} onClick={()=>setShowNewCast(true)}>
                + Add New Member
              </button>
            ) : (
              <div style={{ background:"var(--bg3)", border:"1px solid var(--gold)", borderRadius:8, padding:"16px 18px", marginBottom:20 }}>
                <p style={{ fontSize:"0.8rem", fontWeight:700, color:"var(--gold)", marginBottom:12 }}>✦ New Cast / Crew Member</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                  <div className="form-group" style={{ margin:0 }}>
                    <label className="form-label" style={{ fontSize:"0.72rem" }}>Full Name *</label>
                    <input className="form-input" value={nc.name} onChange={e=>setNc(f=>({...f,name:e.target.value}))} placeholder="Full name" autoFocus />
                  </div>
                  <div className="form-group" style={{ margin:0 }}>
                    <label className="form-label" style={{ fontSize:"0.72rem" }}>Type *</label>
                    <select className="form-select" value={nc.type} onChange={e=>setNc(f=>({...f,type:e.target.value}))}>
                      {CAST_TYPES.map(t=><option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:10 }}>
                  <div className="form-group" style={{ margin:0 }}>
                    <label className="form-label" style={{ fontSize:"0.72rem" }}>Character / Role</label>
                    <input className="form-input" value={nc.role} onChange={e=>setNc(f=>({...f,role:e.target.value}))} placeholder="e.g. Arjun" />
                  </div>
                  <div className="form-group" style={{ margin:0 }}>
                    <label className="form-label" style={{ fontSize:"0.72rem" }}>Photo URL</label>
                    <input className="form-input" value={nc.photo} onChange={e=>setNc(f=>({...f,photo:e.target.value}))} placeholder="https://… (optional)" />
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom:12 }}>
                  <label className="form-label" style={{ fontSize:"0.72rem" }}>Bio (optional)</label>
                  <input className="form-input" value={nc.bio} onChange={e=>setNc(f=>({...f,bio:e.target.value}))} placeholder="Short bio…" />
                </div>
                <div style={{ background:"rgba(201,151,58,0.06)", border:"1px solid rgba(201,151,58,0.15)", borderRadius:5, padding:"8px 12px", marginBottom:12, fontSize:"0.74rem", color:"var(--muted)", lineHeight:1.7 }}>
                  ℹ️ A new public Cast profile will be created and linked to this movie.
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button className="btn btn-gold btn-sm" type="button" onClick={addNewCast} disabled={!nc.name.trim()}>✓ Add to Cast</button>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={()=>{setShowNewCast(false);setNc({name:"",type:"Actor",role:"",photo:"",bio:""});}}>Cancel</button>
                </div>
              </div>
            )}

            {/* Cast list */}
            {cast.length > 0 ? (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <p className="form-label" style={{ marginBottom:4 }}>Cast & Crew ({cast.length})</p>
                {cast.map((c,i) => (
                  <CastCard key={`${c.castId||c.name}-${i}`} entry={c} index={i} onRoleChange={updateCastRole} onRemove={removeCast} />
                ))}
                <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:4, paddingTop:8, borderTop:"1px solid var(--border)" }}>
                  {["Director","Producer","Actor","Actress","Music Director"].map(type => {
                    const count = cast.filter(c=>c.type===type).length;
                    if (!count) return null;
                    return <span key={type} style={{ fontSize:"0.72rem", padding:"3px 10px", borderRadius:10, background:"rgba(201,151,58,0.08)", color:"var(--gold)", border:"1px solid rgba(201,151,58,0.2)" }}>{type}: {count}</span>;
                  })}
                </div>
              </div>
            ) : (
              <div style={{ textAlign:"center", padding:"32px 20px", background:"var(--bg3)", borderRadius:8, border:"1px dashed var(--border)" }}>
                <div style={{ fontSize:"2rem", marginBottom:8 }}>🎭</div>
                <p style={{ color:"var(--muted)", fontSize:"0.85rem" }}>No cast added yet.</p>
                <p style={{ color:"var(--muted)", fontSize:"0.75rem", marginTop:4 }}>You can skip this and add cast later from the movie page.</p>
              </div>
            )}
          </>
        )}

        {/* ════ STEP 2 — Collaborators ════ */}
        {step === 2 && (
          <>
            <p style={{ color:"var(--muted)", fontSize:"0.85rem", marginBottom:20 }}>
              Add other registered production companies as collaborators. They can post news but cannot edit movie details.
            </p>
            <div style={{ position:"relative", marginBottom:20 }}>
              <input className="form-input" value={collabQuery} onChange={e=>setCollabQuery(e.target.value)} placeholder="Search production company name…" />
              {collabResults.length > 0 && (
                <div className="search-dropdown">
                  {collabResults.map(p=>(
                    <div key={p._id} className="search-dropdown-item" onClick={()=>addCollabSafe(p)}>
                      <span style={{ fontWeight:600 }}>{p.name}</span>
                      {p.location && <span style={{ color:"var(--muted)", fontSize:"0.75rem", marginLeft:8 }}>📍 {p.location}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {collabs.length > 0 ? (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {collabs.map((p,i)=>(
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"var(--bg3)", padding:"12px 16px", borderRadius:6, border:"1px solid var(--border)" }}>
                    <span style={{ fontWeight:600 }}>{p.name}</span>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={()=>removeCollab(i)} style={{ color:"var(--red)" }}>Remove</button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign:"center", padding:"24px 0", color:"var(--muted)", fontSize:"0.85rem" }}>No collaborators. You can skip this step.</div>
            )}
          </>
        )}

        {/* ════ STEP 3 — Media ════ */}
        {step === 3 && (
          <>
            <label className="form-label">Promotional Videos</label>
            <div style={{ background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:8, padding:"14px 16px", marginBottom:16 }}>
              <div className="form-group" style={{ marginBottom:10 }}>
                <label className="form-label">Video Type</label>
                <select className="form-select" value={vf.type} onChange={e=>setVf({...vf, type: e.target.value})} style={{ marginBottom: 12, width: '100%' }}>
                  <option value="Trailer">Trailer</option>
                  <option value="Teaser">Teaser</option>
                  <option value="Glimpse">Glimpse</option>
                  <option value="First Look">First Look</option>
                  <option value="Motion Poster">Motion Poster</option>
                </select>
                <label className="form-label">Video URL (YouTube URL or ID)</label>
                <input className="form-input" value={vf.url} onChange={e=>setVf({...vf, url: e.target.value})} placeholder="e.g. https://youtube.com/watch?v=dQw4w9WgXcQ" />
                {extractYtId(vf.url) && (
                  <div style={{ marginTop:10, maxWidth:420, position:"relative", paddingBottom:"56.25%", height:0, overflow:"hidden", borderRadius:6 }}>
                    <iframe src={`https://www.youtube.com/embed/${extractYtId(vf.url)}`} allowFullScreen title="Preview"
                      style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%" }} />
                  </div>
                )}
              </div>
              <button type="button" className="btn btn-gold btn-sm" onClick={() => {
                if (!vf.url.trim()) return;
                const vid = extractYtId(vf.url);
                setVideos(p => [...p, { ytId: vid, url: vf.url, thumbnailUrl: vid ? `https://img.youtube.com/vi/${vid}/hqdefault.jpg` : "", type: vf.type }]);
                setVf({ url: "", type: "Trailer" });
              }} disabled={!vf.url.trim()}>+ Add Video</button>
            </div>
            {videos.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                {videos.map((v, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--bg3)", padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border)" }}>
                    {v.thumbnailUrl
                      ? <img src={v.thumbnailUrl} alt={v.type} style={{ width: 64, height: 36, objectFit: "cover", borderRadius: 3, flexShrink: 0 }} onError={e => e.target.style.opacity = "0.2"} />
                      : <div style={{ width: 64, height: 36, background: "var(--bg2)", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>▶</div>}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.84rem" }}>{v.type}</div>
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" style={{ color: "var(--red)", fontSize: "0.7rem", padding: "4px 8px" }} onClick={() => setVideos(p => p.filter((_, idx) => idx !== i))}>Remove</button>
                  </div>
                ))}
              </div>
            )}
            <hr className="divider" />
            <label className="form-label">Songs</label>
            <div style={{ background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:8, padding:"14px 16px", marginBottom:16 }}>
              <div className="form-group" style={{ marginBottom:10 }}>
                <label className="form-label" style={{ fontSize:"0.72rem" }}>YouTube URL or ID</label>
                <input className="form-input" value={sf.url} onChange={e=>handleSongUrlChange(e.target.value)} placeholder="Paste YouTube link" />
              </div>
              {sf.thumb && (
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10, padding:"8px 10px", background:"rgba(201,151,58,0.06)", border:"1px solid rgba(201,151,58,0.15)", borderRadius:5 }}>
                  <img src={sf.thumb} alt="thumb" style={{ width:80,height:45,objectFit:"cover",borderRadius:4 }} onError={e=>e.target.style.opacity="0.3"} />
                  <div>
                    <div style={{ fontSize:"0.7rem", color:"var(--gold)", marginBottom:2 }}>🎵 Thumbnail detected</div>
                    <div style={{ fontSize:"0.65rem", color:"var(--muted)" }}>ID: {extractYtId(sf.url)}</div>
                  </div>
                </div>
              )}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
                <div className="form-group" style={{ margin:0 }}>
                  <label className="form-label" style={{ fontSize:"0.72rem" }}>Song Title *</label>
                  <input className="form-input" value={sf.title} onChange={e=>setSf(f=>({...f,title:e.target.value}))} placeholder="Song name" />
                </div>
                <div className="form-group" style={{ margin:0 }}>
                  <label className="form-label" style={{ fontSize:"0.72rem" }}>Singer(s)</label>
                  <input className="form-input" value={sf.singer} onChange={e=>setSf(f=>({...f,singer:e.target.value}))} placeholder="Singer name" />
                </div>
              </div>
              <button className="btn btn-gold btn-sm" type="button" onClick={addSong} disabled={!sf.title.trim()}>+ Add Song</button>
            </div>
            {songs.length > 0 && (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <p className="form-label" style={{ marginBottom:4 }}>Songs ({songs.length})</p>
                {songs.map((s,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, background:"var(--bg3)", padding:"8px 12px", borderRadius:6, border:"1px solid var(--border)" }}>
                    {s.thumbnailUrl
                      ? <img src={s.thumbnailUrl} alt={s.title} style={{ width:72,height:40,objectFit:"cover",borderRadius:3,flexShrink:0 }} onError={e=>e.target.style.opacity="0.2"} />
                      : <div style={{ width:72,height:40,background:"var(--bg2)",borderRadius:3,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.2rem",flexShrink:0 }}>🎵</div>
                    }
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:"0.85rem" }}>{s.title}</div>
                      {s.singer && <div style={{ fontSize:"0.72rem", color:"var(--gold)" }}>{s.singer}</div>}
                    </div>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={()=>removeSong(i)} style={{ color:"var(--red)", flexShrink:0 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ════ STEP 4 — Review & Submit ════ */}
        {step === 4 && (
          <div>
            <p style={{ color:"var(--muted)", fontSize:"0.82rem", marginBottom:20 }}>Review everything before submitting.</p>
            {form.posterUrl && (
              <div style={{ display:"flex", gap:20, marginBottom:24, alignItems:"flex-start" }}>
                <img src={form.posterUrl} alt="poster" style={{ width:80,height:110,objectFit:"cover",borderRadius:6,border:"2px solid var(--border)",flexShrink:0 }} onError={e=>e.target.style.display="none"} />
                <div>
                  <h2 style={{ fontSize:"1.4rem", marginBottom:6 }}>{form.title}</h2>
                  <span style={{ fontSize:"0.78rem", color:"var(--gold)", background:"rgba(201,151,58,0.12)", padding:"3px 10px", borderRadius:10 }}>{form.category}</span>
                </div>
              </div>
            )}
            <div style={{ display:"flex", flexDirection:"column" }}>
              {[
                ["Title",         form.title||"—"],
                ["Category",      form.category],
                ["Language",      form.language],
                ["Release",       form.releaseTBA?"TBA":form.releaseDate||"—"],
                ["Budget",        form.budget||"—"],
                ["Genres",        form.genre.join(", ")||"—"],
                ["Director",      cast.find(c=>c.type==="Director")?.name||"—"],
                ["Producer",      cast.find(c=>c.type==="Producer")?.name||"—"],
                ["Total cast",    String(cast.length)],
                ["  New members", String(cast.filter(c=>c.isNew).length)],
                ["  Linked",      String(cast.filter(c=>!c.isNew).length)],
                ["Collaborators", collabs.length===0?"None":collabs.map(c=>c.name).join(", ")],
                ["Songs",         String(songs.length)],
                ["Videos",       String(videos.length)],
              ].map(([label, value]) => (
                <div key={label} style={{ display:"flex", gap:16, padding:"9px 0", borderBottom:"1px solid var(--border)" }}>
                  <span style={{ color:"var(--muted)", fontSize:"0.76rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", width:160, flexShrink:0 }}>{label}</span>
                  <span style={{ fontSize:"0.88rem" }}>{value}</span>
                </div>
              ))}
            </div>
            {error && (
              <div style={{ marginTop:20, color:"var(--red)", background:"rgba(217,79,61,0.1)", padding:"12px 16px", borderRadius:6, fontSize:"0.85rem", border:"1px solid rgba(217,79,61,0.3)" }}>
                ⚠️ {error}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:28, paddingTop:20, borderTop:"1px solid var(--border)" }}>
          <button className="btn btn-outline btn-sm" type="button"
            onClick={()=>step>0?setStep(s=>s-1):navigate("/dashboard")}>
            ← {step===0?"Cancel":"Back"}
          </button>
          {step < STEPS.length - 1 ? (
            <button className="btn btn-gold btn-sm" type="button"
              onClick={()=>{setError("");setStep(s=>s+1);}}
              disabled={step===0&&!form.title.trim()}>
              Next →
            </button>
          ) : (
            <button className="btn btn-gold" type="button" onClick={handleSubmit} disabled={loading}>
              {loading?"Creating…":"🎬 Create Movie"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}