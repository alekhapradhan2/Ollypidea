import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API, getToken } from "../api/api";

const GENRES = ["Action","Drama","Romance","Comedy","Thriller","Family","Historical","Devotional","Horror"];
const CATEGORIES = ["Feature Film","Short Film","Web Series","Documentary"];

export default function AddMovie({ production, onToast }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [form, setForm] = useState({
    title: "", category: "Feature Film", genre: [], releaseDate: "",
    releaseTBA: false, language: "Odia", director: "", producer: "",
    budget: "", synopsis: "", posterUrl: "",
  });
  const [cast, setCast] = useState([]);
  const [songs, setSongs] = useState([]);
  const [trailerYtId, setTrailerYtId] = useState("");
  const [collaborators, setCollaborators] = useState([]);

  // Cast search
  const [castQuery, setCastQuery] = useState("");
  const [castResults, setCastResults] = useState([]);
  const [castSearching, setCastSearching] = useState(false);
  const [newCastName, setNewCastName] = useState("");
  const [newCastRole, setNewCastRole] = useState("");
  const [newCastType, setNewCastType] = useState("Actor");
  const [newCastPhoto, setNewCastPhoto] = useState("");
  const castTimer = useRef(null);

  // Collaborator search
  const [collabQuery, setCollabQuery] = useState("");
  const [collabResults, setCollabResults] = useState([]);
  const collabTimer = useRef(null);

  // Song form
  const [newSongTitle, setNewSongTitle] = useState("");
  const [newSongSinger, setNewSongSinger] = useState("");
  const [newSongYtId, setNewSongYtId] = useState("");

  const steps = ["Basic Info", "Cast", "Collaborators", "Media", "Review & Submit"];

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleGenre = (g) =>
    set("genre", form.genre.includes(g) ? form.genre.filter(x => x !== g) : [...form.genre, g]);

  // ── Cast search with debounce ──
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

  const addExistingCast = (c) => {
    if (cast.find(x => String(x.castId) === String(c._id))) return;
    setCast(prev => [...prev, { castId: c._id, name: c.name, photo: c.photo || "", type: c.type, role: "", isNew: false }]);
    setCastQuery(""); setCastResults([]);
  };

  const addNewCast = () => {
    if (!newCastName.trim()) return;
    setCast(prev => [...prev, { name: newCastName.trim(), role: newCastRole.trim(), type: newCastType, photo: newCastPhoto.trim(), isNew: true }]);
    setNewCastName(""); setNewCastRole(""); setNewCastPhoto("");
  };

  const updateCastRole = (i, role) =>
    setCast(prev => prev.map((c, idx) => idx === i ? { ...c, role } : c));

  const removeCast = (i) => setCast(prev => prev.filter((_, idx) => idx !== i));

  // ── Collaborator search ──
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

  const addCollaborator = (p) => {
    if (collaborators.find(x => String(x._id) === String(p._id))) return;
    setCollaborators(prev => [...prev, p]);
    setCollabQuery(""); setCollabResults([]);
  };

  const removeCollaborator = (i) => setCollaborators(prev => prev.filter((_, idx) => idx !== i));

  const addSong = () => {
    if (!newSongTitle.trim()) return;
    setSongs(prev => [...prev, { title: newSongTitle.trim(), singer: newSongSinger.trim(), ytId: newSongYtId.trim() }]);
    setNewSongTitle(""); setNewSongSinger(""); setNewSongYtId("");
  };

  const removeSong = (i) => setSongs(prev => prev.filter((_, idx) => idx !== i));

  const canNext = () => {
    if (step === 0) return form.title.trim() && form.director.trim();
    return true;
  };

  const handleSubmit = async () => {
    setError(""); setLoading(true);
    try {
      const body = {
        ...form,
        releaseDate: form.releaseTBA ? "" : form.releaseDate,
        cast: cast.map(c => ({
          isNew: c.isNew,
          castId: c.isNew ? undefined : c.castId,
          name: c.name, type: c.type, role: c.role || "", photo: c.photo || "",
          bio: "",
        })),
        media: {
          trailer: trailerYtId ? { ytId: trailerYtId } : {},
          songs,
        },
        collaborators: collaborators.map(c => c._id),
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
    <div className="page empty-state">
      <h3>Please login to add movies.</h3>
    </div>
  );

  return (
    <div className="register-page" style={{ maxWidth: 760 }}>
      <div className="register-header">
        <h1>Add New Film</h1>
        <p>Adding as <strong style={{ color: "var(--gold)" }}>{production.name}</strong></p>
      </div>

      <div className="register-card">
        <div className="register-steps">
          {steps.map((s, i) => (
            <div key={s} className={`register-step ${i === step ? "active" : i < step ? "done" : ""}`}>
              {i < step ? "✓" : i + 1}
            </div>
          ))}
        </div>

        {/* ── Step 0: Basic Info ── */}
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
                <label className="form-label">Director *</label>
                <input className="form-input" value={form.director} onChange={e => set("director", e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Producer</label>
                <input className="form-input" value={form.producer} onChange={e => set("producer", e.target.value)} />
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Release Date</label>
                <input className="form-input" type="date" value={form.releaseDate} onChange={e => set("releaseDate", e.target.value)} disabled={form.releaseTBA} />
                <label style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "var(--muted)", cursor: "pointer" }}>
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
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {GENRES.map(g => (
                  <button key={g} type="button" className="badge" onClick={() => toggleGenre(g)}
                    style={{ cursor: "pointer", borderColor: form.genre.includes(g) ? "var(--gold)" : "var(--border)", color: form.genre.includes(g) ? "var(--gold)" : "var(--muted)" }}>
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Poster URL</label>
              <input className="form-input" value={form.posterUrl} onChange={e => set("posterUrl", e.target.value)} placeholder="https://…" />
            </div>
            <div className="form-group">
              <label className="form-label">Synopsis</label>
              <textarea className="form-textarea" value={form.synopsis} onChange={e => set("synopsis", e.target.value)} style={{ minHeight: 90 }} />
            </div>
          </>
        )}

        {/* ── Step 1: Cast ── */}
        {step === 1 && (
          <>
            {/* Search existing */}
            <p className="form-label" style={{ marginBottom: 10 }}>Search existing cast in the system</p>
            <div style={{ position: "relative", marginBottom: 20 }}>
              <input className="form-input" value={castQuery} onChange={e => setCastQuery(e.target.value)} placeholder="Type name to search… (e.g. Babushaan)" />
              {(castResults.length > 0 || castSearching) && (
                <div className="search-dropdown">
                  {castSearching && <div className="search-dropdown-item muted">Searching…</div>}
                  {castResults.map(c => (
                    <div key={c._id} className="search-dropdown-item" onClick={() => addExistingCast(c)}>
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                      <span style={{ color: "var(--gold)", fontSize: "0.75rem", marginLeft: 8 }}>{c.type}</span>
                      <span style={{ color: "var(--muted)", fontSize: "0.75rem", marginLeft: 8 }}>
                        {c.movies?.length || 0} film{c.movies?.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add new */}
            <p className="form-label" style={{ marginBottom: 10 }}>Or add a new cast member</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <input className="form-input" value={newCastName} onChange={e => setNewCastName(e.target.value)} placeholder="Full Name" />
              <input className="form-input" value={newCastRole} onChange={e => setNewCastRole(e.target.value)} placeholder="Role / Character" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 20 }}>
              <select className="form-select" value={newCastType} onChange={e => setNewCastType(e.target.value)}>
                {["Actor","Actress","Director","Producer","Music Director","Cinematographer","Other"].map(t => <option key={t}>{t}</option>)}
              </select>
              <input className="form-input" value={newCastPhoto} onChange={e => setNewCastPhoto(e.target.value)} placeholder="Photo URL (optional)" />
              <button className="btn btn-outline btn-sm" type="button" onClick={addNewCast}>+ Add</button>
            </div>

            {/* Cast list */}
            {cast.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cast.map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--bg3)", padding: "10px 14px", borderRadius: 4, border: "1px solid var(--border)" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--bg2)", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)" }}>
                      {c.photo ? <img src={c.photo} alt={c.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display="none"} /> : <span>👤</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                      <span style={{ color: "var(--gold)", fontSize: "0.72rem", marginLeft: 8 }}>{c.type}</span>
                      {!c.isNew && <span style={{ color: "#2d6a4f", fontSize: "0.68rem", marginLeft: 8 }}>✓ existing</span>}
                    </div>
                    <input
                      className="form-input" style={{ width: 160 }}
                      value={c.role} placeholder="Role"
                      onChange={e => updateCastRole(i, e.target.value)}
                    />
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => removeCast(i)} style={{ color: "var(--red)" }}>✕</button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--muted)", textAlign: "center", padding: "20px 0" }}>No cast added yet.</p>
            )}
          </>
        )}

        {/* ── Step 2: Collaborators ── */}
        {step === 2 && (
          <>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: 20 }}>
              Search for other registered production companies to collaborate on this film.
              They will see this movie on their dashboard too.
            </p>
            <div style={{ position: "relative", marginBottom: 20 }}>
              <input className="form-input" value={collabQuery} onChange={e => setCollabQuery(e.target.value)} placeholder="Search production company name…" />
              {collabResults.length > 0 && (
                <div className="search-dropdown">
                  {collabResults.map(p => (
                    <div key={p._id} className="search-dropdown-item" onClick={() => addCollaborator(p)}>
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                      {p.location && <span style={{ color: "var(--muted)", fontSize: "0.75rem", marginLeft: 8 }}>{p.location}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {collaborators.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {collaborators.map((p, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg3)", padding: "12px 16px", borderRadius: 4, border: "1px solid var(--border)" }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                      {p.location && <span style={{ color: "var(--muted)", fontSize: "0.8rem", marginLeft: 8 }}>{p.location}</span>}
                    </div>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => removeCollaborator(i)} style={{ color: "var(--red)" }}>Remove</button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--muted)", textAlign: "center", padding: "20px 0" }}>No collaborators added. You can skip this step.</p>
            )}
          </>
        )}

        {/* ── Step 3: Media ── */}
        {step === 3 && (
          <>
            <div className="form-group">
              <label className="form-label">YouTube Trailer ID</label>
              <input className="form-input" value={trailerYtId} onChange={e => setTrailerYtId(e.target.value)} placeholder="e.g. dQw4w9WgXcQ" />
              {trailerYtId && (
                <div className="trailer-embed" style={{ maxWidth: 400, marginTop: 10 }}>
                  <iframe src={`https://www.youtube.com/embed/${trailerYtId}`} allowFullScreen title="Preview" />
                </div>
              )}
            </div>
            <hr className="divider" />
            <label className="form-label">Songs</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 8, marginBottom: 12, marginTop: 10 }}>
              <input className="form-input" value={newSongTitle} onChange={e => setNewSongTitle(e.target.value)} placeholder="Song title" />
              <input className="form-input" value={newSongSinger} onChange={e => setNewSongSinger(e.target.value)} placeholder="Singer(s)" />
              <input className="form-input" value={newSongYtId} onChange={e => setNewSongYtId(e.target.value)} placeholder="YT ID (optional)" />
              <button className="btn btn-outline btn-sm" type="button" onClick={addSong}>+ Add</button>
            </div>
            {songs.length > 0 && (
              <div className="song-list">
                {songs.map((s, i) => (
                  <div key={i} className="song-item">
                    <span className="song-num">{i + 1}</span>
                    <div className="song-info">
                      <div className="song-title">{s.title}</div>
                      {s.singer && <div className="song-singer">{s.singer}</div>}
                    </div>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => removeSong(i)} style={{ color: "var(--red)", opacity: 1 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Step 4: Review ── */}
        {step === 4 && (
          <div>
            <div style={{ display: "grid", gap: 12 }}>
              <ReviewRow label="Title" value={form.title} />
              <ReviewRow label="Director" value={form.director} />
              <ReviewRow label="Category" value={form.category} />
              <ReviewRow label="Language" value={form.language} />
              <ReviewRow label="Release" value={form.releaseTBA ? "TBA" : form.releaseDate || "—"} />
              <ReviewRow label="Budget" value={form.budget || "—"} />
              <ReviewRow label="Genres" value={form.genre.join(", ") || "—"} />
              <ReviewRow label="Cast" value={`${cast.length} member${cast.length !== 1 ? "s" : ""}`} />
              <ReviewRow label="Collaborators" value={collaborators.length === 0 ? "None" : collaborators.map(c => c.name).join(", ")} />
              <ReviewRow label="Songs" value={`${songs.length} song${songs.length !== 1 ? "s" : ""}`} />
              <ReviewRow label="Trailer" value={trailerYtId ? "✓ Added" : "—"} />
            </div>
            {error && (
              <div style={{ marginTop: 16, color: "var(--red)", background: "rgba(217,79,61,0.1)", padding: "10px 14px", borderRadius: 4, fontSize: "0.85rem" }}>
                {error}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
          <button className="btn btn-outline btn-sm" type="button"
            onClick={() => step > 0 ? setStep(s => s - 1) : navigate("/dashboard")}
          >
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

function ReviewRow({ label, value }) {
  return (
    <div style={{ display: "flex", gap: 16, padding: "8px 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ color: "var(--muted)", fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", width: 120, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: "0.9rem" }}>{value}</span>
    </div>
  );
}
