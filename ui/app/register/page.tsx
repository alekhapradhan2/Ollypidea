"use client";
import { useState, ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { API, setToken } from "../../lib/api";

interface Movie {
  _id: string;
  title: string;
}

interface CastMember {
  name: string;
  role: string;
  type: string;
  photo: string;
  isNew: boolean;
  bio?: string;
}

interface Song {
  title: string;
  singer: string;
}

interface FormData {
  title: string;
  category: string;
  genre: string[];
  releaseDate: string;
  releaseTBA: boolean;
  language: string;
  director: string;
  producer: string;
  budget: string;
  synopsis: string;
  posterUrl: string;
  cast: CastMember[];
  trailerYtId: string;
  songs: Song[];
  email: string;
  password: string;
  confirm: string;
}

const GENRES = ["Action", "Drama", "Romance", "Comedy", "Thriller", "Family", "Historical", "Devotional", "Horror"];
const CATEGORIES = ["Feature Film", "Short Film", "Web Series", "Documentary"];

const EMPTY: FormData = {
  title: "", category: "Feature Film", genre: [],
  releaseDate: "", releaseTBA: false,
  language: "Odia", director: "", producer: "",
  budget: "", synopsis: "", posterUrl: "",
  cast: [],
  trailerYtId: "", songs: [],
  email: "", password: "", confirm: "",
};

interface RegisterProps {
  onSuccess?: (movie: Movie) => void;
}

export default function Register({ onSuccess }: RegisterProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(EMPTY);
  const [newCastName, setNewCastName] = useState("");
  const [newCastRole, setNewCastRole] = useState("");
  const [newCastType, setNewCastType] = useState("Actor");
  const [newCastPhoto, setNewCastPhoto] = useState("");
  const [newSongTitle, setNewSongTitle] = useState("");
  const [newSongSinger, setNewSongSinger] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const steps = ["Basic Info", "Cast", "Media", "Account"];

  const set = <K extends keyof FormData>(key: K, val: FormData[K]) => 
    setForm(f => ({ ...f, [key]: val }));

  const toggleGenre = (g: string) => {
    set("genre", form.genre.includes(g)
      ? form.genre.filter(x => x !== g)
      : [...form.genre, g]
    );
  };

  const addCast = () => {
    if (!newCastName.trim()) return;
    set("cast", [...form.cast, { 
      name: newCastName.trim(), 
      role: newCastRole.trim(), 
      type: newCastType, 
      photo: newCastPhoto.trim(), 
      isNew: true 
    }]);
    setNewCastName(""); 
    setNewCastRole(""); 
    setNewCastPhoto("");
  };

  const removeCast = (i: number) => 
    set("cast", form.cast.filter((_, idx) => idx !== i));

  const addSong = () => {
    if (!newSongTitle.trim()) return;
    set("songs", [...form.songs, { 
      title: newSongTitle.trim(), 
      singer: newSongSinger.trim() 
    }]);
    setNewSongTitle(""); 
    setNewSongSinger("");
  };

  const removeSong = (i: number) => 
    set("songs", form.songs.filter((_, idx) => idx !== i));

  const canNext = () => {
    if (step === 0) return form.title.trim().length > 0 && form.director.trim().length > 0;
    if (step === 3) return form.email.trim() && form.password.length >= 6 && form.password === form.confirm;
    return true;
  };

  const handleSubmit = async () => {
    setError(""); 
    setLoading(true);
    try {
      const cleanCast = form.cast.map(c => ({
        isNew: true,
        name: c.name,
        type: c.type || "Actor",
        role: c.role || "",
        photo: c.photo || "",
        bio: c.bio || "",
      }));

      const body = {
        title: form.title,
        category: form.category,
        genre: form.genre,
        releaseDate: form.releaseTBA ? "" : form.releaseDate,
        releaseTBA: form.releaseTBA,
        language: form.language,
        director: form.director,
        producer: form.producer,
        budget: form.budget,
        synopsis: form.synopsis,
        posterUrl: form.posterUrl,
        cast: cleanCast,
        media: {
          trailer: form.trailerYtId ? { ytId: form.trailerYtId } : {},
          songs: form.songs.map(s => ({ title: s.title, singer: s.singer || "" })),
        },
        email: form.email.toLowerCase().trim(),
        password: form.password,
      };

      const { token, movie } = await API.register(body);
      setToken(token);
      onSuccess && onSuccess(movie);
      router.push(`/movie/${movie._id}`);
    } catch (e: any) {
      const msg = typeof e === "string" ? e : (e?.message || "Registration failed. Please try again.");
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-header">
        <h1>Register Your Film</h1>
        <p>Add your Ollywood movie to the database and manage its profile.</p>
      </div>

      <div className="register-card">
        <div className="register-steps">
          {steps.map((s, i) => (
            <div key={s} className={`register-step ${i === step ? "active" : i < step ? "done" : ""}`}>
              {i < step ? "✓ " : ""}{s}
            </div>
          ))}
        </div>

        {step === 0 && (
          <>
            <div className="form-group">
              <label className="form-label">Movie Title *</label>
              <input 
                className="form-input" 
                value={form.title} 
                onChange={(e: ChangeEvent<HTMLInputElement>) => set("title", e.target.value)} 
                placeholder="e.g. Daman" 
              />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select 
                  className="form-select" 
                  value={form.category} 
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => set("category", e.target.value)}
                >
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Language</label>
                <input 
                  className="form-input" 
                  value={form.language} 
                  onChange={(e: ChangeEvent<HTMLInputElement>) => set("language", e.target.value)} 
                />
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Director *</label>
                <input 
                  className="form-input" 
                  value={form.director} 
                  onChange={(e: ChangeEvent<HTMLInputElement>) => set("director", e.target.value)} 
                  placeholder="Director name" 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Producer</label>
                <input 
                  className="form-input" 
                  value={form.producer} 
                  onChange={(e: ChangeEvent<HTMLInputElement>) => set("producer", e.target.value)} 
                  placeholder="Producer name" 
                />
              </div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Release Date</label>
                <input 
                  className="form-input" 
                  type="date" 
                  value={form.releaseDate} 
                  onChange={(e: ChangeEvent<HTMLInputElement>) => set("releaseDate", e.target.value)} 
                  disabled={form.releaseTBA} 
                />
                <label style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, fontSize: "0.8rem", color: "var(--muted)", cursor: "pointer" }}>
                  <input 
                    type="checkbox" 
                    checked={form.releaseTBA} 
                    onChange={(e: ChangeEvent<HTMLInputElement>) => set("releaseTBA", e.target.checked)} 
                  /> TBA
                </label>
              </div>
              <div className="form-group">
                <label className="form-label">Budget</label>
                <input 
                  className="form-input" 
                  value={form.budget} 
                  onChange={(e: ChangeEvent<HTMLInputElement>) => set("budget", e.target.value)} 
                  placeholder="e.g. ₹2 Crore" 
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Genres</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {GENRES.map(g => (
                  <button key={g} type="button"
                    className="badge"
                    style={{
                      cursor: "pointer", border: "1px solid",
                      borderColor: form.genre.includes(g) ? "var(--gold)" : "var(--border)",
                      color: form.genre.includes(g) ? "var(--gold)" : "var(--muted)",
                      background: "var(--bg3)",
                    }}
                    onClick={() => toggleGenre(g)}
                  >{g}</button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Poster URL</label>
              <input 
                className="form-input" 
                value={form.posterUrl} 
                onChange={(e: ChangeEvent<HTMLInputElement>) => set("posterUrl", e.target.value)} 
                placeholder="https://…" 
              />
            </div>
            <div className="form-group">
              <label className="form-label">Synopsis</label>
              <textarea 
                className="form-textarea" 
                value={form.synopsis} 
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => set("synopsis", e.target.value)} 
                placeholder="Brief description of the film…" 
                style={{ minHeight: 100 }} 
              />
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: 20 }}>
              Add cast members for this film. You can skip this and update later.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <input 
                className="form-input" 
                value={newCastName} 
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewCastName(e.target.value)} 
                placeholder="Full Name *" 
              />
              <input 
                className="form-input" 
                value={newCastRole} 
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewCastRole(e.target.value)} 
                placeholder="Role / Character (e.g. Hero)" 
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, marginBottom: 12, alignItems: "center" }}>
              <select 
                className="form-select" 
                value={newCastType} 
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setNewCastType(e.target.value)}
              >
                {["Actor", "Actress", "Director", "Producer", "Music Director", "Cinematographer", "Other"].map(t => <option key={t}>{t}</option>)}
              </select>
              <input 
                className="form-input" 
                value={newCastPhoto} 
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewCastPhoto(e.target.value)} 
                placeholder="Photo URL (optional)" 
              />
              <button className="btn btn-outline btn-sm" type="button" onClick={addCast} style={{ whiteSpace: "nowrap" }}>+ Add</button>
            </div>
            {form.cast.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {form.cast.map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg3)", padding: "10px 14px", borderRadius: 4, border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {c.photo ? (
                        <img src={c.photo} alt={c.name} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "1px solid var(--border)" }} />
                      ) : (
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--bg2)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>👤</div>
                      )}
                      <div>
                        <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>{c.name}</span>
                        {c.role && <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}> — {c.role}</span>}
                        <span style={{ color: "var(--gold)", fontSize: "0.72rem", marginLeft: 8 }}>{c.type}</span>
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => removeCast(i)} style={{ color: "var(--red)" }}>✕</button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--muted)", fontSize: "0.85rem", textAlign: "center", padding: "20px 0" }}>No cast added yet.</p>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <div className="form-group">
              <label className="form-label">YouTube Trailer ID</label>
              <input 
                className="form-input" 
                value={form.trailerYtId} 
                onChange={(e: ChangeEvent<HTMLInputElement>) => set("trailerYtId", e.target.value)} 
                placeholder="e.g. dQw4w9WgXcQ (from youtube.com/watch?v=…)" 
              />
              {form.trailerYtId && (
                <div className="trailer-embed" style={{ maxWidth: 400, marginTop: 10 }}>
                  <iframe 
                    src={`https://www.youtube.com/embed/${form.trailerYtId}`} 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen 
                    title="Preview" 
                  />
                </div>
              )}
            </div>
            <hr className="divider" />
            <label className="form-label" style={{ marginBottom: 12 }}>Songs</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <input 
                className="form-input" 
                style={{ flex: 2, minWidth: 120 }} 
                value={newSongTitle} 
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewSongTitle(e.target.value)} 
                placeholder="Song title" 
                onKeyDown={(e: KeyboardEvent) => e.key === "Enter" && addSong()} 
              />
              <input 
                className="form-input" 
                style={{ flex: 1, minWidth: 100 }} 
                value={newSongSinger} 
                onChange={(e: ChangeEvent<HTMLInputElement>) => setNewSongSinger(e.target.value)} 
                placeholder="Singer(s)" 
                onKeyDown={(e: KeyboardEvent) => e.key === "Enter" && addSong()} 
              />
              <button className="btn btn-outline btn-sm" type="button" onClick={addSong}>+ Add</button>
            </div>
            {form.songs.length > 0 && (
              <div className="song-list">
                {form.songs.map((s, i) => (
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

        {step === 3 && (
          <>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", marginBottom: 20 }}>
              Create an account to manage your movie's profile, update box office numbers, and post news.
            </p>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input 
                className="form-input" 
                type="email" 
                value={form.email} 
                onChange={(e: ChangeEvent<HTMLInputElement>) => set("email", e.target.value)} 
                placeholder="your@email.com" 
              />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Password * (min 6 chars)</label>
                <input 
                  className="form-input" 
                  type="password" 
                  value={form.password} 
                  onChange={(e: ChangeEvent<HTMLInputElement>) => set("password", e.target.value)} 
                  placeholder="••••••••" 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <input 
                  className="form-input" 
                  type="password" 
                  value={form.confirm} 
                  onChange={(e: ChangeEvent<HTMLInputElement>) => set("confirm", e.target.value)} 
                  placeholder="••••••••" 
                />
                {form.confirm && form.password !== form.confirm && (
                  <p style={{ color: "var(--red)", fontSize: "0.75rem", marginTop: 4 }}>Passwords don't match</p>
                )}
              </div>
            </div>
            {error && <p style={{ color: "var(--red)", fontSize: "0.85rem", marginBottom: 12, padding: "10px 14px", background: "rgba(217,79,61,0.1)", borderRadius: 4 }}>{error}</p>}
          </>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
          <button
            className="btn btn-outline btn-sm" type="button"
            onClick={() => step > 0 ? setStep(s => s - 1) : null}
            style={{ visibility: step === 0 ? "hidden" : "visible" }}
          >
            ← Back
          </button>

          {step < steps.length - 1 ? (
            <button className="btn btn-gold btn-sm" type="button" onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
              Next: {steps[step + 1]} →
            </button>
          ) : (
            <button className="btn btn-gold" type="button" onClick={handleSubmit} disabled={loading || !canNext()}>
              {loading ? "Registering…" : "🎬 Register Film"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}