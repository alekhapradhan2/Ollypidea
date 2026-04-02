import React, { useState, useEffect } from "react";
import { getAdminToken } from "../api/api";

// Uses the same env var as api.js — VITE_API_URL already includes /api
// e.g. "https://ollipedia-backend.onrender.com/api"
// Do NOT append /api again — that creates a double /api/api path in prod.
const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:4000/api").replace(/\/$/, "");

// ─── Article type variants ─────────────────────────────────────────────────
const ARTICLE_TYPES = [
  { id: "review",   label: "🎬 Movie Review",    color: "#c9973a" },
  { id: "story",    label: "📖 Story & Plot",     color: "#7aaae8" },
  { id: "cast",     label: "👥 Cast Spotlight",   color: "#a78be8" },
  { id: "music",    label: "🎵 Music & Songs",    color: "#4caf82" },
  { id: "analysis", label: "🔍 Deep Dive",        color: "#e8c87a" },
  { id: "trivia",   label: "💡 Trivia & Facts",   color: "#e5799a" },
];

function slugify(str) {
  return String(str || "").toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ─── Prompt builders ───────────────────────────────────────────────────────
function buildPrompt(movie, type) {
  const cast  = (movie.cast || []).slice(0, 5).map(c => `${c.name}${c.role ? ` as ${c.role}` : ""}`).join(", ");
  const songs = (movie.media?.songs || []).slice(0, 3).map(s => s.title).filter(Boolean).join(", ");
  const year  = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "upcoming";
  const genre = (movie.genre || []).join(", ") || "Odia";
  const ctx   = `Movie: "${movie.title}" (${year}) | Genre: ${genre} | Director: ${movie.director || "N/A"} | Cast: ${cast || "N/A"} | Songs: ${songs || "N/A"} | Synopsis: ${movie.synopsis || "N/A"} | Verdict: ${movie.verdict || "Upcoming"}`;

  const prompts = {
    review:   `Write a 1000+ word original engaging movie review for the Odia film "${movie.title}" (${year}). Cover introduction, story, performances, direction, music, verdict. Flowing paragraphs. No headers. No bullet points. SEO-friendly. ${ctx}`,
    story:    `Write a 1000+ word detailed story and plot breakdown for the Odia film "${movie.title}" (${year}). Cover narrative arc, key scenes, emotional beats, themes — no major spoilers. Flowing paragraphs only. ${ctx}`,
    cast:     `Write a 1000+ word cast spotlight article for "${movie.title}" (${year}). Profile each major cast member's role, acting performance, career highlights, and contribution. Flowing paragraphs only. ${ctx}`,
    music:    `Write a 1000+ word music and songs review for the Odia film "${movie.title}" (${year}). Cover the music director's work, each song's mood, lyrics, and overall musical impact. Flowing paragraphs only. ${ctx}`,
    analysis: `Write a 1000+ word deep-dive analysis of the Odia film "${movie.title}" (${year}). Examine themes, cinematography, direction style, cultural significance, Ollywood impact. Flowing paragraphs only. ${ctx}`,
    trivia:   `Write a 1000+ word trivia and interesting facts article about the Odia film "${movie.title}" (${year}). Include behind-the-scenes stories, production challenges, casting decisions, box office, fun trivia. Flowing paragraphs only. ${ctx}`,
  };
  return (prompts[type] || prompts.review) + "\n\nIMPORTANT: Return ONLY the article text. No headings. No markdown. No labels. Just the article.";
}

function articleTitle(movie, type) {
  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const genre = (movie.genre || []).join(", ") || "Odia Film";
  const titles = {
    review:   `${movie.title}${year ? ` (${year})` : ""} – ${genre} Odia Movie Review & Story`,
    story:    `${movie.title} – Full Story, Plot & Narrative Breakdown`,
    cast:     `${movie.title} – Cast Spotlight: Meet the Actors & Characters`,
    music:    `${movie.title} – Music Review: Songs, Score & Soundtrack`,
    analysis: `${movie.title} – Deep Dive Analysis & Themes`,
    trivia:   `${movie.title} – Interesting Trivia, Facts & Behind the Scenes`,
  };
  return titles[type] || titles.review;
}

function articleCategory(type) {
  return { review: "Movie Review", story: "Movie Review", cast: "Actor Spotlight", music: "General", analysis: "Top 10", trivia: "General" }[type] || "Movie Review";
}

// ─── API helpers ───────────────────────────────────────────────────────────
async function generateArticle(movie, type) {
  const token = getAdminToken();
  if (!token) throw new Error("Not logged in as admin.");
  const response = await fetch(`${API_BASE}/admin/generate-article`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ prompt: buildPrompt(movie, type) }),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Server error (${response.status})`);
  }
  const data = await response.json();
  const text = (data.text || "").trim();
  if (!text) throw new Error("AI returned empty response. Try again.");
  return text;
}

async function publishArticle(movie, article, type) {
  const token = getAdminToken();
  if (!token) throw new Error("Not logged in as admin.");
  const title    = articleTitle(movie, type);
  const slug     = slugify(`${movie.title}-${type}-${Date.now().toString(36)}`);
  const excerpt  = article.slice(0, 200).trim() + "…";
  const readTime = Math.max(1, Math.ceil(article.split(/\s+/).length / 200));
  const res = await fetch(`${API_BASE}/admin/blog`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      title, slug, content: article, excerpt,
      category: articleCategory(type),
      tags: [movie.title, "Ollywood", "Odia Movie", ...(movie.genre || [])],
      coverImage: movie.posterUrl || movie.thumbnailUrl || "",
      movieTitle: movie.title,
      movieId: movie._id,
      author: "OllyPedia Editorial",
      readTime, seoTitle: title, seoDesc: excerpt, published: true,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Publish failed (${res.status})`);
  }
  return res.json();
}

async function fetchMovieBlogs(movieTitle) {
  const token = getAdminToken();
  const res = await fetch(`${API_BASE}/admin/blog`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const all = await res.json();
  return all.filter(p => p.movieTitle === movieTitle);
}

async function deleteArticle(id) {
  const token = getAdminToken();
  await fetch(`${API_BASE}/admin/blog/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function updateArticle(id, body) {
  const token = getAdminToken();
  const res = await fetch(`${API_BASE}/admin/blog/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Update failed");
  }
  return res.json();
}

// ─── CSS ──────────────────────────────────────────────────────────────────
const CSS = `
.bg-wrap { padding:24px 28px; }
.bg-header { display:flex; align-items:center; gap:14px; margin-bottom:20px; flex-wrap:wrap; }
.bg-title { font-size:1.1rem; font-weight:800; color:var(--gold); flex:1; }
.bg-stats { display:flex; gap:18px; font-size:.82rem; color:var(--muted); }
.bg-search { padding:7px 12px; border-radius:7px; border:1px solid var(--border); background:var(--bg2); color:var(--text); font-size:.85rem; width:200px; outline:none; }
.bg-bulk-btn { padding:7px 16px; border-radius:7px; border:none; font-size:.82rem; font-weight:700; cursor:pointer; background:var(--gold); color:#000; }
.bg-bulk-btn:disabled { opacity:.5; cursor:not-allowed; }
.bg-progress { margin-bottom:14px; padding:10px 14px; background:rgba(201,151,58,.1); border-radius:8px; border:1px solid rgba(201,151,58,.3); font-size:.84rem; color:var(--gold); font-weight:600; }
.bg-progress-bar { margin-top:8px; height:6px; background:var(--bg3); border-radius:4px; overflow:hidden; }
.bg-progress-fill { height:100%; border-radius:4px; background:var(--gold); transition:width .4s; }
.bg-tip { margin-bottom:14px; padding:8px 14px; border-radius:7px; background:rgba(255,255,255,.03); border:1px solid var(--border); font-size:.74rem; color:var(--muted); line-height:1.7; }
.bg-list { background:var(--bg2); border-radius:10px; border:1px solid var(--border); overflow:hidden; }
.bg-empty { padding:40px; text-align:center; color:var(--muted); font-size:.9rem; }

.bg-movie-row { border-bottom:1px solid var(--border); }
.bg-movie-row:last-child { border-bottom:none; }
.bg-movie-header { display:flex; align-items:flex-start; gap:14px; padding:14px 18px; cursor:pointer; transition:background .15s; user-select:none; }
.bg-movie-header:hover { background:rgba(255,255,255,.03); }
.bg-poster { width:38px; height:54px; object-fit:cover; border-radius:4px; flex-shrink:0; border:1px solid var(--border); background:var(--bg3); }
.bg-poster-ph { width:38px; height:54px; border-radius:4px; flex-shrink:0; border:1px solid var(--border); background:var(--bg3); display:flex; align-items:center; justify-content:center; font-size:1.2rem; }
.bg-minfo { flex:1; min-width:0; }
.bg-mtitle { font-weight:700; font-size:.93rem; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.bg-msub { font-size:.75rem; color:var(--muted); margin-top:2px; display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
.bg-mcount { font-size:.68rem; font-weight:700; padding:1px 7px; border-radius:10px; background:rgba(201,151,58,.15); color:#c9973a; border:1px solid rgba(201,151,58,.3); }
.bg-chevron { font-size:.8rem; color:var(--muted); margin-top:3px; transition:transform .2s; }

.bg-panel { padding:0 18px 18px 70px; }
.bg-section-label { font-size:.65rem; font-weight:800; text-transform:uppercase; letter-spacing:.09em; color:var(--muted); margin-bottom:8px; }

/* Published articles */
.bg-articles { display:flex; flex-direction:column; gap:6px; margin-bottom:14px; }
.bg-art-item { display:flex; align-items:flex-start; gap:10px; padding:10px 12px; background:var(--bg3); border:1px solid var(--border); border-radius:8px; }
.bg-art-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; margin-top:5px; }
.bg-art-body { flex:1; min-width:0; }
.bg-art-title { font-size:.8rem; font-weight:700; color:var(--text); line-height:1.35; margin-bottom:3px; }
.bg-art-meta { font-size:.67rem; color:var(--muted); display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.bg-art-actions { display:flex; gap:5px; flex-shrink:0; }
.bg-art-btn { padding:3px 9px; border-radius:5px; border:1px solid var(--border); background:var(--bg2); color:var(--text); font-size:.67rem; cursor:pointer; font-weight:600; text-decoration:none; display:inline-flex; align-items:center; transition:all .15s; }
.bg-art-btn:hover { border-color:var(--gold); color:var(--gold); }
.bg-art-btn.del:hover { border-color:#e57373; color:#e57373; }

/* Type selector */
.bg-types { display:flex; flex-wrap:wrap; gap:7px; margin-bottom:12px; }
.bg-type-chip { padding:4px 12px; border-radius:18px; border:1.5px solid; font-size:.73rem; font-weight:700; cursor:pointer; transition:all .15s; background:transparent; }
.bg-type-chip.active { filter:brightness(1.1); }

/* Generate box */
.bg-gen-box { padding:10px 12px; background:rgba(201,151,58,.05); border:1px dashed rgba(201,151,58,.25); border-radius:8px; }
.bg-gen-row { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.bg-gen-label { font-size:.75rem; font-weight:700; flex:1; }
.bg-gen-preview { margin-top:10px; padding:10px 12px; background:var(--bg3); border-radius:6px; font-size:.76rem; color:var(--text); line-height:1.75; white-space:pre-wrap; max-height:200px; overflow-y:auto; border:1px solid var(--border); }

/* Buttons */
.bg-btn { padding:5px 12px; border-radius:6px; border:none; cursor:pointer; font-size:.75rem; font-weight:600; transition:opacity .15s; }
.bg-btn:disabled { opacity:.45; cursor:not-allowed; }
.bg-btn-gold  { background:var(--gold); color:#000; }
.bg-btn-green { background:#28a050; color:#fff; }
.bg-btn-red   { background:#a02828; color:#fff; }
.bg-btn-ghost { background:var(--bg3); color:var(--text); border:1px solid var(--border); }

/* Edit modal */
.bg-overlay { position:fixed; inset:0; background:rgba(0,0,0,.78); z-index:1000; display:flex; align-items:center; justify-content:center; padding:16px; }
.bg-modal { background:var(--bg2); border:1px solid var(--border); border-radius:14px; width:100%; max-width:680px; max-height:90vh; display:flex; flex-direction:column; overflow:hidden; }
.bg-modal-head { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid var(--border); }
.bg-modal-title { font-size:.95rem; font-weight:800; color:var(--gold); }
.bg-modal-close { background:none; border:none; color:var(--muted); font-size:1.3rem; cursor:pointer; line-height:1; }
.bg-modal-body { flex:1; overflow-y:auto; padding:18px 20px; display:flex; flex-direction:column; gap:14px; }
.bg-modal-foot { display:flex; justify-content:flex-end; gap:10px; padding:14px 20px; border-top:1px solid var(--border); }
.bg-field-label { font-size:.68rem; font-weight:700; text-transform:uppercase; letter-spacing:.07em; color:var(--muted); margin-bottom:5px; display:block; }
.bg-field-input { padding:9px 12px; border-radius:7px; border:1px solid var(--border); background:var(--bg3); color:var(--text); font-size:.84rem; outline:none; font-family:inherit; width:100%; box-sizing:border-box; }
.bg-field-input:focus { border-color:rgba(201,151,58,.5); }
.bg-field-textarea { min-height:200px; resize:vertical; }
`;

// ─── Edit Modal ────────────────────────────────────────────────────────────
function EditModal({ article, onClose, onSaved, onToast }) {
  const [title,   setTitle]   = useState(article.title   || "");
  const [content, setContent] = useState(article.content || "");
  const [excerpt, setExcerpt] = useState(article.excerpt || "");
  const [pub,     setPub]     = useState(article.published !== false);
  const [saving,  setSaving]  = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateArticle(article._id, {
        title: title.trim(), content: content.trim(),
        excerpt: excerpt.trim() || content.slice(0, 200).trim() + "…",
        published: pub,
      });
      onSaved(updated);
      onToast("✅ Article updated!", "success");
      onClose();
    } catch (err) {
      onToast("❌ " + err.message, "error");
    }
    setSaving(false);
  };

  return (
    <div className="bg-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-modal">
        <div className="bg-modal-head">
          <span className="bg-modal-title">✏️ Edit Article</span>
          <button className="bg-modal-close" onClick={onClose}>×</button>
        </div>
        <div className="bg-modal-body">
          <div>
            <label className="bg-field-label">Title</label>
            <input className="bg-field-input" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="bg-field-label">Excerpt</label>
            <input className="bg-field-input" value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="Short teaser shown on blog cards…" />
          </div>
          <div>
            <label className="bg-field-label">Article Content</label>
            <textarea className="bg-field-input bg-field-textarea" value={content} onChange={e => setContent(e.target.value)} />
          </div>
          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:".84rem", color:"var(--text)" }}>
            <input type="checkbox" checked={pub} onChange={e => setPub(e.target.checked)} />
            Published (visible on public blog)
          </label>
        </div>
        <div className="bg-modal-foot">
          <button className="bg-btn bg-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="bg-btn bg-btn-gold" onClick={save}
            disabled={saving || !title.trim() || !content.trim()}>
            {saving ? "Saving…" : "💾 Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Generator for one type ────────────────────────────────────────────────
function GenPanel({ movie, type, onPublished, onToast }) {
  const [status,  setStatus]  = useState("idle");
  const [article, setArticle] = useState("");
  const [preview, setPreview] = useState(false);
  const [errMsg,  setErrMsg]  = useState("");
  const busy = status === "generating" || status === "publishing";
  const typeInfo = ARTICLE_TYPES.find(t => t.id === type);

  const handleGenerate = async () => {
    setStatus("generating"); setArticle(""); setErrMsg(""); setPreview(false);
    try {
      const text = await generateArticle(movie, type);
      setArticle(text); setStatus("ready");
    } catch (err) {
      setStatus("error"); setErrMsg(err.message);
      onToast("❌ " + err.message, "error");
    }
  };

  const handlePublish = async () => {
    if (!article.trim()) return;
    setStatus("publishing"); setErrMsg("");
    try {
      const post = await publishArticle(movie, article, type);
      onPublished(post);
      onToast(`✅ Published: "${typeInfo?.label}" for ${movie.title}`, "success");
      setStatus("idle"); setArticle(""); setPreview(false);
    } catch (err) {
      setStatus("error"); setErrMsg(err.message);
      onToast("❌ " + err.message, "error");
    }
  };

  return (
    <div className="bg-gen-box">
      <div className="bg-gen-row">
        <span className="bg-gen-label" style={{ color: typeInfo?.color }}>{typeInfo?.label}</span>
        {errMsg && <span style={{ fontSize:".69rem", color:"#f77" }}>⚠️ {errMsg}</span>}
        <button className="bg-btn bg-btn-gold" onClick={handleGenerate} disabled={busy}>
          {status === "generating" ? "⏳ Generating…" : article ? "🔄 Regenerate" : "✨ Generate"}
        </button>
        {article && <>
          <button className="bg-btn bg-btn-ghost" onClick={() => setPreview(p => !p)} disabled={busy}>
            {preview ? "Hide" : "Preview"}
          </button>
          <button className="bg-btn bg-btn-green" onClick={handlePublish} disabled={busy}>
            {status === "publishing" ? "⏳ Publishing…" : "🚀 Publish"}
          </button>
        </>}
        {status === "error" && (
          <button className="bg-btn bg-btn-red" onClick={handleGenerate}>🔁 Retry</button>
        )}
      </div>
      {article && preview && <div className="bg-gen-preview">{article}</div>}
    </div>
  );
}

// ─── Expanded movie panel ──────────────────────────────────────────────────
function MoviePanel({ movie, onToast }) {
  const [articles,    setArticles]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeType,  setActiveType]  = useState(null);
  const [editTarget,  setEditTarget]  = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchMovieBlogs(movie.title)
      .then(posts => setArticles(posts))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [movie.title]);

  const handlePublished = (post) => {
    setArticles(prev => [post, ...prev]);
    setActiveType(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this article? This cannot be undone.")) return;
    try {
      await deleteArticle(id);
      setArticles(prev => prev.filter(a => a._id !== id));
      onToast("🗑 Article deleted", "success");
    } catch {
      onToast("❌ Delete failed", "error");
    }
  };

  const handleSaved = (updated) => {
    setArticles(prev => prev.map(a => a._id === updated._id ? updated : a));
  };

  return (
    <div className="bg-panel">
      {/* Published articles */}
      {loading
        ? <div style={{ fontSize:".77rem", color:"var(--muted)", padding:"6px 0 10px" }}>Loading articles…</div>
        : articles.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <div className="bg-section-label">📄 Published Articles ({articles.length})</div>
            <div className="bg-articles">
              {articles.map(art => (
                <div key={art._id} className="bg-art-item">
                  <div className="bg-art-dot" style={{ background: art.published ? "#4caf82" : "#666" }} />
                  <div className="bg-art-body">
                    <div className="bg-art-title">{art.title}</div>
                    <div className="bg-art-meta">
                      <span style={{ color: art.published ? "#4caf82" : "#888", fontWeight:700 }}>
                        {art.published ? "● Live" : "○ Draft"}
                      </span>
                      <span>📅 {formatDate(art.createdAt)}</span>
                      {art.readTime && <span>⏱ {art.readTime} min</span>}
                      {art.views > 0 && <span>👁 {art.views}</span>}
                      <span style={{ color:"rgba(255,255,255,.25)" }}>{art.category}</span>
                    </div>
                  </div>
                  <div className="bg-art-actions">
                    <a href={`/blog/${art.slug}`} target="_blank" rel="noreferrer" className="bg-art-btn">🔗 View</a>
                    <button className="bg-art-btn" onClick={() => setEditTarget(art)}>✏️</button>
                    <button className="bg-art-btn del" onClick={() => handleDelete(art._id)}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      }

      {/* Type selector */}
      <div className="bg-section-label">✨ Generate New Article — Choose Type</div>
      <div className="bg-types">
        {ARTICLE_TYPES.map(t => (
          <button
            key={t.id}
            className={`bg-type-chip${activeType === t.id ? " active" : ""}`}
            style={{
              borderColor: t.color,
              color: activeType === t.id ? (t.id === "review" ? "#000" : "#fff") : t.color,
              background: activeType === t.id ? t.color : "transparent",
            }}
            onClick={() => setActiveType(p => p === t.id ? null : t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeType && (
        <GenPanel
          key={activeType}
          movie={movie}
          type={activeType}
          onPublished={handlePublished}
          onToast={onToast}
        />
      )}

      {editTarget && (
        <EditModal
          article={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={handleSaved}
          onToast={onToast}
        />
      )}
    </div>
  );
}

// ─── Movie row ─────────────────────────────────────────────────────────────
function MovieRow({ movie, onToast }) {
  const [open,     setOpen]     = useState(false);
  const [artCount, setArtCount] = useState(null);

  // Peek count on mount without full expand
  useEffect(() => {
    fetchMovieBlogs(movie.title)
      .then(posts => setArtCount(posts.length))
      .catch(() => setArtCount(0));
  }, [movie.title]);

  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "TBA";

  return (
    <div className="bg-movie-row">
      <div className="bg-movie-header" onClick={() => setOpen(o => !o)}>
        {movie.posterUrl || movie.thumbnailUrl
          ? <img src={movie.posterUrl || movie.thumbnailUrl} alt={movie.title}
              className="bg-poster" onError={e => e.target.style.opacity = "0"} />
          : <div className="bg-poster-ph">🎬</div>
        }
        <div className="bg-minfo">
          <div className="bg-mtitle">{movie.title}</div>
          <div className="bg-msub">
            <span>{year}</span>
            <span>·</span>
            <span>{(movie.genre || []).join(", ") || "Odia"}</span>
            <span>·</span>
            <span>{movie.verdict || "Upcoming"}</span>
            {artCount !== null && artCount > 0 && (
              <span className="bg-mcount">{artCount} article{artCount !== 1 ? "s" : ""}</span>
            )}
            {artCount === 0 && (
              <span className="bg-mcount" style={{ background:"rgba(255,255,255,.06)", color:"var(--muted)", borderColor:"var(--border)" }}>
                No articles
              </span>
            )}
          </div>
        </div>
        <div className="bg-chevron" style={{ transform: open ? "rotate(90deg)" : "none" }}>▶</div>
      </div>
      {open && <MoviePanel movie={movie} onToast={onToast} />}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────
export default function BlogGenerator({ movies = [], onToast }) {
  const [search,       setSearch]       = useState("");
  const [generating,   setGenerating]   = useState(false);
  const [bulkProgress, setBulkProgress] = useState(null);

  const filtered = movies.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase())
  );

  const bulkGenerate = async () => {
    if (!window.confirm(`Generate review articles for all ${movies.length} movies? This may take several minutes.`)) return;
    setGenerating(true);
    setBulkProgress({ done: 0, total: movies.length });
    for (let i = 0; i < movies.length; i++) {
      try {
        const text = await generateArticle(movies[i], "review");
        await publishArticle(movies[i], text, "review");
      } catch { /* skip failed */ }
      setBulkProgress({ done: i + 1, total: movies.length });
      await new Promise(r => setTimeout(r, 1200));
    }
    setGenerating(false);
    setBulkProgress(null);
    onToast("✅ Bulk generation complete!", "success");
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="bg-wrap">
        <div className="bg-header">
          <div className="bg-title">
            ✨ AI Blog Generator
            <span style={{ fontSize:".63rem", fontWeight:500, marginLeft:10, color:"var(--muted)", fontFamily:"monospace" }}>
              {API_BASE}
            </span>
          </div>
          <div className="bg-stats">
            <span>🎬 <b style={{ color:"var(--text)" }}>{movies.length}</b> movies</span>
            <span>📝 <b style={{ color:"var(--gold)" }}>6</b> article types each</span>
          </div>
          <input className="bg-search" placeholder="Search movies…"
            value={search} onChange={e => setSearch(e.target.value)} />
          <button className="bg-bulk-btn" onClick={bulkGenerate} disabled={generating}>
            {generating ? "⏳ Generating…" : "🚀 Bulk Generate Reviews"}
          </button>
        </div>

        {bulkProgress && (
          <div className="bg-progress">
            ⏳ {bulkProgress.done} / {bulkProgress.total} complete
            <div className="bg-progress-bar">
              <div className="bg-progress-fill" style={{ width:`${(bulkProgress.done/bulkProgress.total)*100}%` }} />
            </div>
          </div>
        )}

        <div className="bg-tip">
          💡 <b style={{ color:"var(--text)" }}>Multiple articles per movie:</b> Click any movie to expand it, then pick an article type — <b style={{ color:"var(--text)" }}>Movie Review, Story & Plot, Cast Spotlight, Music & Songs, Deep Dive, or Trivia & Facts.</b> Each generates a unique 1000+ word article. Edit or delete any article after publishing. A single movie can have all 6 types published simultaneously.
        </div>

        <div className="bg-list">
          {filtered.length === 0
            ? <div className="bg-empty">{search ? "No movies match your search." : "No movies found."}</div>
            : filtered.map(movie => (
                <MovieRow key={movie._id} movie={movie} onToast={onToast} />
              ))
          }
        </div>
      </div>
    </>
  );
}