import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API, getToken } from "../api/api";

const GENRES     = ["Action","Drama","Romance","Comedy","Thriller","Family","Historical","Devotional","Horror"];
const CATEGORIES = ["Feature Film","Short Film","Web Series","Documentary"];
const CAST_TYPES = ["Actor","Actress","Director","Producer","Music Director","Cinematographer","Choreographer","Lyricist","Other"];

export default function AddMovie({ production, onToast }) {
  const navigate = useNavigate();
  const [step,    setStep]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  // Basic info
  const [form, setForm] = useState({
    title: "", category: "Feature Film", genre: [], releaseDate: "",
    releaseTBA: false, language: "Odia", budget: "", synopsis: "", posterUrl: "", thumbnailUrl: "",
  });

  // Cast (includes director, producer etc.)
  const [cast, setCast] = useState([]);

  // Songs & trailer
  const [songs,       setSongs]       = useState([]);
  const [trailerYtId, setTrailerYtId] = useState("");

  // Collaborators
  const [collaborators,  setCollaborators]  = useState([]);

  // ── Cast search ──
  const [castQuery,    setCastQuery]    = useState("");
  const [castResults,  setCastResults]  = useState([]);
  const [castSearching, setCastSearching] = useState(false);
  const castTimer = useRef(null);

  // ── New cast form ──
  const [showNewCast, setShowNewCast] = useState(false);
  const [newName,     setNewName]     = useState("");
  const [newType,     setNewType]     = useState("Actor");
  const [newRole,     setNewRole]     = useState("");
  const [newPhoto,    setNewPhoto]    = useState("");

  // ── Collab search ──
  const [collabQuery,   setCollabQuery]   = useState("");
  const [collabResults, setCollabResults] = useState([]);
  const collabTimer = useRef(null);

  // ── Song form ──
  const [songUrl,    setSongUrl]    = useState("");  // accepts full YT URL or bare ID
  const [songTitle,  setSongTitle]  = useState("");
  const [songSinger, setSongSinger] = useState("");
  const [songThumb,  setSongThumb]  = useState("");
  const [songFetching, setSongFetching] = useState(false);

  // Extract bare 11-char YouTube ID from any URL or ID string
  const extractYtId = (input) => {
    if (!input) return "";
    const s = input.trim();
    const m = s.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
    return s; // fallback, let it fail gracefully
  };

  // When user pastes a YT URL — auto-fill thumbnail
  const handleSongUrlChange = (val) => {
    setSongUrl(val);
    const id = extractYtId(val);
    if (id.length >= 11) {
      setSongThumb(`https://img.youtube.com/vi/${id}/hqdefault.jpg`);
    } else {
      setSongThumb("");
    }
  };

  const steps = ["Basic Info", "Cast & Crew", "Collaborators", "Media", "Review & Submit"];
  const set   = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleGenre = (g) => set("genre",
    form.genre.includes(g) ? form.genre.filter(x => x !== g) : [...form.genre, g]
  );

  // Cast search debounce
  useEffect(() => {
    if (!castQuery.trim()) { setCastResults([]); return; }
    clearTimeout(castTimer.current);
    castTimer.current = setTimeout(async () => {
      setCastSearching(true);
      try { setCastResults(await API.searchCast(castQuery)); }
      catch { setCastResults([]); }
      finally { setCastSearching(false); }
    }, 300);
  }, [castQuery]);

  // Collab search debounce
  useEffect(() => {
    if (!collabQuery.trim()) { setCollabResults([]); return; }
    clearTimeout(collabTimer.current);
    collabTimer.current = setTimeout(async () => {
      try {
        const res = await API.searchProductions(collabQuery);
        setCollabResults(res.filter(p => String(p._id) !== String(production?._id)));
      } catch { setCollabResults([]); }
    }, 300);
  }, [collabQuery, production]);

  const addExistingCast = (c) => {
    if (cast.find(x => String(x.castId) === String(c._id))) return;
    setCast(prev => [...prev, { castId: c._id, name: c.name, photo: c.photo || "", type: c.type, role: "", isNew: false }]);
    setCastQuery(""); setCastResults([]);
  };

  const addNewCast = () => {
    if (!newName.trim()) return;
    if (cast.find(x => x.name.toLowerCase() === newName.trim().toLowerCase())) {
      setShowNewCast(false); return;
    }
    setCast(prev => [...prev, { castId: "", isNew: true, name: newName.trim(), type: newType, role: newRole.trim(), photo: newPhoto.trim() }]);
    setNewName(""); setNewRole(""); setNewPhoto(""); setNewType("Actor");
    setShowNewCast(false);
  };

  const updateCastRole = (i, role) => setCast(prev => prev.map((c, idx) => idx === i ? { ...c, role } : c));
  const removeCast     = (i)       => setCast(prev => prev.filter((_, idx) => idx !== i));

  const addCollaborator = (p) => {
    if (collaborators.find(x => String(x._id) === String(p._id))) return;
    setCollaborators(prev => [...prev, p]);
    setCollabQuery(""); setCollabResults([]);
  };
  const removeCollaborator = (i) => setCollaborators(prev => prev.filter((_, idx) => idx !== i));

  const addSong = () => {
    if (!songTitle.trim()) return;
    const ytId = extractYtId(songUrl);
    const thumb = songThumb || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : "");
    setSongs(prev => [...prev, {
      title: songTitle.trim(),
      singer: songSinger.trim(),
      ytId,
      thumbnailUrl: thumb,
    }]);
    setSongUrl(""); setSongTitle(""); setSongSinger(""); setSongThumb("");
  };
  const removeSong = (i) => setSongs(prev => prev.filter((_, idx) => idx !== i));

  const canNext = () => step === 0 ? form.title.trim().length > 0 : true;

  const handleSubmit = async () => {
    setError(""); setLoading(true);
    try {
      // director / producer are identified from cast by type
      const director = cast.find(c => c.type === "Director")?.name || "";
      const producer = cast.find(c => c.type === "Producer")?.name || "";

      // castId MUST be plain 24-char hex string — never a Mongoose ObjectId object
      const body = {
        title:       String(form.title      || ""),
        category:    String(form.category   || "Feature Film"),
        genre:       Array.isArray(form.genre) ? [...form.genre] : [],
        releaseDate: form.releaseTBA ? "" : String(form.releaseDate || ""),
        releaseTBA:  !!form.releaseTBA,
        language:    String(form.language   || "Odia"),
        budget:      String(form.budget     || ""),
        synopsis:    String(form.synopsis   || ""),
        posterUrl:   String(form.posterUrl  || ""),
        thumbnailUrl: String(form.thumbnailUrl || ""),
        director,
        producer,
        cast: cast.map(c => {
          const rawId = String(c.castId || "");
          const hexId = (rawId.match(/([a-f0-9]{24})/i) || [])[1] || "";
          return {
            castId: hexId,
            isNew:  c.isNew === true || !hexId,
            name:   String(c.name  || ""),
            type:   String(c.type  || "Actor"),
            role:   String(c.role  || ""),
            photo:  String(c.photo || ""),
          };
        }),
        media: {
          trailer: trailerYtId ? { ytId: String(trailerYtId) } : {},
          songs: (songs || []).map(s => ({
            title:        String(s.title        || ""),
            singer:       String(s.singer       || ""),
            ytId:         String(s.ytId         || ""),
            thumbnailUrl: String(s.thumbnailUrl || (s.ytId ? `https://img.youtube.com/vi/${s.ytId}/hqdefault.jpg` : "")),
          })),
        },
        collaborators: (collaborators || []).map(c => {
          const raw = String(c._id || c || "");
          return (raw.match(/([a-f0-9]{24})/i) || [])[1] || "";
        }).filter(Boolean),
      };

      const movie = await API.createMovie(body);
      onToast && onToast(`"${movie.title}" added successfully!`);
      navigate(`/movie/${movie._id}`);
    } catch (e) {
      setError(typeof e === "string" ? e : "Failed to create movie");
      setLoading(false);
    }
  };

  if (!production || !getToken()) return (
    <div className="page empty-state"><h3>Please login to add movies.</h3></div>
  );

  // Crew quick-add helpers
  const hasDirector = cast.some(c => c.type === "Director");
  const hasProducer = cast.some(c => c.type === "Producer");

  return (
    <div className="register-page" style={{ maxWidth: 760 }}>
      <div className="register-header">
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:12 }}>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => navigate("/dashboard")}>← Back to Portal</button>
        </div>
        <h1>Add New Film</h1>
        <p>Adding as <strong style={{ color: "var(--gold)" }}>{production.name}</strong></p>
      </div>

      <div className="register-card">
        {/* Step indicators */}
        <div className="register-steps">
          {steps.map((s, i) => (
            <div key={s} className={`register-step ${i === step ? "active" : i < step ? "done" : ""}`}>
              {i < step ? "✓" : i + 1}
            </div>
          ))}
        </div>

        {/* ── STEP 0: Basic Info ── */}
        {step === 0 && (
          <>
            <div className="form-group">
              <label className="form-label">Movie Title *</label>
              <input className="form-input" value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Daman" />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category} onChange={e => set("category", e.target.value)}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Language</label>
                <input className="form-input" value={form.language} onChange={e => set("language", e.target.value)} />
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Release Date</label>
                <input className="form-input" type="date" value={form.releaseDate} onChange={e => set("releaseDate", e.target.value)} disabled={form.releaseTBA} />
                <label style={{ marginTop:6, display:"flex", alignItems:"center", gap:6, fontSize:"0.8rem", color:"var(--muted)", cursor:"pointer" }}>
                  <input type="checkbox" checked={form.releaseTBA} onChange={e => set("releaseTBA", e.target.checked)} /> TBA
                </label>
              </div>
              <div className="form-group">
                <label className="form-label">Budget</label>
                <input className="form-input" value={form.budget} onChange={e => set("budget", e.target.value)} placeholder="e.g. ₹2 Crore" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Genres</label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {GENRES.map(g => (
                  <button key={g} type="button" className="badge" onClick={() => toggleGenre(g)}
                    style={{ cursor:"pointer", borderColor: form.genre.includes(g) ? "var(--gold)" : "var(--border)", color: form.genre.includes(g) ? "var(--gold)" : "var(--muted)" }}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Poster URL</label>
              <input className="form-input" value={form.posterUrl} onChange={e => set("posterUrl", e.target.value)} placeholder="https://… (portrait poster)" />
            </div>
            <div className="form-group">
              <label className="form-label">Thumbnail / Banner URL <span style={{ color:"var(--muted)", fontWeight:400 }}>(wide image shown on homepage hero)</span></label>
              <input className="form-input" value={form.thumbnailUrl} onChange={e => set("thumbnailUrl", e.target.value)} placeholder="https://… (landscape 16:9 image)" />
              {form.thumbnailUrl && (
                <img src={form.thumbnailUrl} alt="thumbnail preview"
                  style={{ marginTop:8, width:"100%", maxHeight:160, objectFit:"cover", borderRadius:4, border:"1px solid var(--border)" }}
                  onError={e => e.target.style.display="none"} />
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Synopsis</label>
              <textarea className="form-textarea" value={form.synopsis} onChange={e => set("synopsis", e.target.value)} style={{ minHeight:90 }} />
            </div>
          </>
        )}

        {/* ── STEP 1: Cast & Crew ── */}
        {step === 1 && (
          <>
            <p className="form-label" style={{ marginBottom:8 }}>Search existing cast & crew</p>
            <div style={{ position:"relative", marginBottom:16 }}>
              <input className="form-input" value={castQuery}
                onChange={e => setCastQuery(e.target.value)}
                placeholder="Type name to search… (e.g. Babushaan)" />
              {(castResults.length > 0 || castSearching) && (
                <div className="search-dropdown">
                  {castSearching && <div className="search-dropdown-item muted">Searching…</div>}
                  {castResults.length === 0 && !castSearching && castQuery.trim() && (
                    <div className="search-dropdown-item" style={{ color:"var(--muted)", fontSize:"0.82rem" }}>
                      No results for "{castQuery}"
                    </div>
                  )}
                  {castResults.map(r => (
                    <div key={r._id} className="search-dropdown-item" onClick={() => addExistingCast(r)}>
                      {r.photo && <img src={r.photo} alt={r.name} style={{ width:28,height:28,borderRadius:"50%",objectFit:"cover" }} onError={e=>e.target.style.display="none"} />}
                      <div style={{ flex:1 }}>
                        <span style={{ fontWeight:600 }}>{r.name}</span>
                        <span style={{ color:"var(--gold)", fontSize:"0.72rem", marginLeft:8 }}>{r.type}</span>
                      </div>
                      <span style={{ color:"#2d6a4f", fontSize:"0.7rem" }}>✓ existing</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!showNewCast ? (
              <button className="btn btn-outline btn-sm" type="button"
                style={{ marginBottom:20 }} onClick={() => setShowNewCast(true)}>
                + Add New Member
              </button>
            ) : (
              <div style={{ background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:6, padding:"14px 16px", marginBottom:20 }}>
                <p style={{ fontSize:"0.78rem", fontWeight:700, color:"var(--gold)", marginBottom:10 }}>New Cast / Crew Member</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                  <input className="form-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Full Name *" autoFocus />
                  <select className="form-select" value={newType} onChange={e => setNewType(e.target.value)}>
                    {CAST_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:8 }}>
                  <input className="form-input" value={newRole} onChange={e => setNewRole(e.target.value)} placeholder="Role / Character" />
                  <input className="form-input" value={newPhoto} onChange={e => setNewPhoto(e.target.value)} placeholder="Photo URL (optional)" />
                </div>
                <div style={{ background:"rgba(201,151,58,0.06)", border:"1px solid rgba(201,151,58,0.2)", borderRadius:4, padding:"8px 10px", marginBottom:10, fontSize:"0.75rem", color:"var(--muted)", lineHeight:1.8 }}>
                  🔐 Login credentials auto-created on submit<br/>
                  <strong style={{ color:"var(--text)" }}>Email:</strong>{" "}
                  {newName.trim() ? newName.trim().toLowerCase().replace(/\s+/g, ".") + "@ollipedia.com" : "name@ollipedia.com"}<br/>
                  <strong style={{ color:"var(--text)" }}>Password:</strong> Admin@123
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button className="btn btn-gold btn-sm" type="button" onClick={addNewCast} disabled={!newName.trim()}>✓ Add</button>
                  <button className="btn btn-ghost btn-sm" type="button" onClick={() => { setShowNewCast(false); setNewName(""); }}>Cancel</button>
                </div>
              </div>
            )}

            {cast.length > 0 ? (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <p className="form-label" style={{ marginBottom:4 }}>Added Cast & Crew ({cast.length})</p>
                {cast.map((c, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, background:"var(--bg3)", padding:"10px 14px", borderRadius:4, border:"1px solid var(--border)" }}>
                    <div style={{ width:36,height:36,borderRadius:"50%",background:"var(--bg2)",overflow:"hidden",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid var(--border)",fontSize:"1.1rem" }}>
                      {c.photo
                        ? <img src={c.photo} alt={c.name} style={{ width:"100%",height:"100%",objectFit:"cover" }} onError={e=>e.target.style.display="none"} />
                        : (c.type==="Director"?"🎬":c.type==="Producer"?"🎥":"👤")}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <span style={{ fontWeight:600 }}>{c.name}</span>
                      <span style={{ color:"var(--gold)", fontSize:"0.72rem", marginLeft:8, background:"rgba(201,151,58,0.12)", padding:"2px 8px", borderRadius:10 }}>{c.type}</span>
                      {c.isNew
                        ? <span style={{ color:"#e8b96a", fontSize:"0.68rem", marginLeft:6 }}>✦ new</span>
                        : <span style={{ color:"#2d6a4f", fontSize:"0.68rem", marginLeft:6 }}>✓ existing</span>}
                    </div>
                    <input className="form-input" style={{ width:150 }} value={c.role}
                      placeholder="Role / Character" onChange={e => updateCastRole(i, e.target.value)} />
                    <button className="btn btn-ghost btn-sm" type="button"
                      onClick={() => removeCast(i)} style={{ color:"var(--red)", flexShrink:0 }}>✕</button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color:"var(--muted)", textAlign:"center", padding:"24px 0", fontSize:"0.85rem" }}>
                No cast added yet. Search above or add a new member.
              </p>
            )}
          </>
        )}

        {/* ── STEP 2: Collaborators ── */}
        {step === 2 && (
          <>
            <p style={{ color:"var(--muted)", fontSize:"0.85rem", marginBottom:20 }}>
              Search for other registered production companies to collaborate on this film.
              Collaborators can add/edit news but cannot edit movie details.
            </p>
            <div style={{ position:"relative", marginBottom:20 }}>
              <input className="form-input" value={collabQuery} onChange={e => setCollabQuery(e.target.value)}
                placeholder="Search production company name…" />
              {collabResults.length > 0 && (
                <div className="search-dropdown">
                  {collabResults.map(p => (
                    <div key={p._id} className="search-dropdown-item" onClick={() => addCollaborator(p)}>
                      <span style={{ fontWeight:600 }}>{p.name}</span>
                      {p.location && <span style={{ color:"var(--muted)", fontSize:"0.75rem", marginLeft:8 }}>{p.location}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {collaborators.length > 0 ? (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {collaborators.map((p, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"var(--bg3)", padding:"12px 16px", borderRadius:4, border:"1px solid var(--border)" }}>
                    <span style={{ fontWeight:600 }}>{p.name}</span>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => removeCollaborator(i)} style={{ color:"var(--red)" }}>Remove</button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color:"var(--muted)", textAlign:"center", padding:"20px 0" }}>No collaborators. You can skip this step.</p>
            )}
          </>
        )}

        {/* ── STEP 3: Media ── */}
        {step === 3 && (
          <>
            <div className="form-group">
              <label className="form-label">YouTube Trailer ID</label>
              <input className="form-input" value={trailerYtId} onChange={e => setTrailerYtId(e.target.value)} placeholder="e.g. dQw4w9WgXcQ" />
              {trailerYtId && (
                <div className="trailer-embed" style={{ maxWidth:400, marginTop:10 }}>
                  <iframe src={`https://www.youtube.com/embed/${trailerYtId}`} allowFullScreen title="Preview" />
                </div>
              )}
            </div>
            <hr className="divider" />
            <label className="form-label">Songs</label>

            {/* YouTube URL → auto thumbnail */}
            <div style={{ marginBottom:8 }}>
              <input className="form-input" value={songUrl}
                onChange={e => handleSongUrlChange(e.target.value)}
                placeholder="Paste YouTube URL or ID (e.g. https://youtube.com/watch?v=abc or abc123)" />
            </div>

            {/* Thumbnail preview — auto from URL */}
            {songThumb && (
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10, padding:"8px 12px", background:"var(--bg3)", border:"1px solid var(--border)", borderRadius:4 }}>
                <img src={songThumb} alt="thumb" style={{ width:90, height:50, objectFit:"cover", borderRadius:3 }}
                  onError={e => { e.target.style.opacity="0.3"; }} />
                <div>
                  <div style={{ fontSize:"0.72rem", color:"var(--gold)", marginBottom:4 }}>🎵 Thumbnail auto-detected</div>
                  <div style={{ fontSize:"0.7rem", color:"var(--muted)" }}>ID: {extractYtId(songUrl)}</div>
                </div>
              </div>
            )}

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
              <input className="form-input" value={songTitle} onChange={e => setSongTitle(e.target.value)} placeholder="Song title *" />
              <input className="form-input" value={songSinger} onChange={e => setSongSinger(e.target.value)} placeholder="Singer(s)" />
            </div>
            <button className="btn btn-outline btn-sm" type="button" onClick={addSong}
              disabled={!songTitle.trim()} style={{ marginBottom:16 }}>
              + Add Song
            </button>

            {songs.length > 0 && (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                <p className="form-label" style={{ marginBottom:4 }}>Added Songs ({songs.length})</p>
                {songs.map((s, i) => (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, background:"var(--bg3)", padding:"8px 12px", borderRadius:4, border:"1px solid var(--border)" }}>
                    {s.thumbnailUrl
                      ? <img src={s.thumbnailUrl} alt={s.title} style={{ width:72, height:40, objectFit:"cover", borderRadius:3, flexShrink:0 }}
                          onError={e => { e.target.style.opacity="0.2"; }} />
                      : <div style={{ width:72, height:40, background:"var(--bg2)", borderRadius:3, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"1.2rem", flexShrink:0 }}>🎵</div>
                    }
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:600, fontSize:"0.85rem" }}>{s.title}</div>
                      {s.singer && <div style={{ fontSize:"0.72rem", color:"var(--gold)" }}>{s.singer}</div>}
                      {s.ytId && <div style={{ fontSize:"0.65rem", color:"var(--muted)" }}>YT: {s.ytId}</div>}
                    </div>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => removeSong(i)} style={{ color:"var(--red)", flexShrink:0 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── STEP 4: Review ── */}
        {step === 4 && (
          <div>
            {[
              ["Title",        form.title],
              ["Category",     form.category],
              ["Language",     form.language],
              ["Release",      form.releaseTBA ? "TBA" : form.releaseDate || "—"],
              ["Budget",       form.budget || "—"],
              ["Genres",       form.genre.join(", ") || "—"],
              ["Director",     cast.find(c=>c.type==="Director")?.name || "—"],
              ["Producer",     cast.find(c=>c.type==="Producer")?.name || "—"],
              ["Cast members", String(cast.length)],
              ["Collaborators",collaborators.length === 0 ? "None" : collaborators.map(c=>c.name).join(", ")],
              ["Songs",        String(songs.length)],
              ["Trailer",      trailerYtId ? "✓ Added" : "—"],
            ].map(([label, value]) => (
              <div key={label} style={{ display:"flex", gap:16, padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
                <span style={{ color:"var(--muted)", fontSize:"0.8rem", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", width:130, flexShrink:0 }}>{label}</span>
                <span style={{ fontSize:"0.9rem" }}>{value}</span>
              </div>
            ))}
            {error && (
              <div style={{ marginTop:16, color:"var(--red)", background:"rgba(217,79,61,0.1)", padding:"10px 14px", borderRadius:4, fontSize:"0.85rem" }}>
                {error}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:28, paddingTop:20, borderTop:"1px solid var(--border)" }}>
          <button className="btn btn-outline btn-sm" type="button"
            onClick={() => step > 0 ? setStep(s => s - 1) : navigate("/dashboard")}>
            ← {step === 0 ? "Cancel" : "Back"}
          </button>
          {step < steps.length - 1 ? (
            <button className="btn btn-gold btn-sm" type="button" onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
              Next →
            </button>
          ) : (
            <button className="btn btn-gold" type="button" onClick={handleSubmit} disabled={loading}>
              {loading ? "Creating…" : "🎬 Create Movie"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}