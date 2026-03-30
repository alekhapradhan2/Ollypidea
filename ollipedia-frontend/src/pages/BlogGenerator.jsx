import React, { useState } from "react";
import { getAdminToken } from "../api/api";

// ─── API base ────────────────────────────────────────────────────────────────
// Reads VITE_API_URL from your frontend .env file.
// HARDCODED FALLBACK: if env var is missing, hits port 4000 directly.
// This prevents the 404 on port 5173 you were seeing.
const API_BASE = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").replace(/\/$/, "") + "/api";

// ─── helpers ────────────────────────────────────────────────────────────────

function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function buildPrompt(movie) {
  const cast = (movie.cast || [])
    .slice(0, 5)
    .map((c) => `${c.name}${c.role ? ` as ${c.role}` : ""}`)
    .join(", ");

  const songs = (movie.media?.songs || [])
    .slice(0, 3)
    .map((s) => s.title)
    .filter(Boolean)
    .join(", ");

  const year = movie.releaseDate
    ? new Date(movie.releaseDate).getFullYear()
    : "upcoming";

  const genre = (movie.genre || []).join(", ") || "Odia";

  return `Write a high-quality, unique, SEO-optimized article about the Odia movie "${movie.title}" (${year}).

Requirements:
- Minimum 1000 words
- Use simple, engaging language
- Do NOT copy from any source
- Make it feel like an original blog-style article

Structure your article around these 6 parts (write flowing paragraphs, NO section headers, NO bullet points):
1. Introduction of the movie (release year: ${year}, genre: ${genre}, its importance in Ollywood)
2. Story summary (short, no spoilers)
3. Cast details: ${cast || "the lead cast"}
4. Highlights: music${songs ? ` (songs: ${songs})` : ""}, direction${movie.director ? ` by ${movie.director}` : ""}, cinematography
5. Why people should watch this movie
6. One or two interesting facts about the movie

Context:
- Director: ${movie.director || "not specified"}
- Producer: ${movie.producer || "not specified"}
- Synopsis: ${movie.synopsis || "not available"}
- Verdict: ${movie.verdict || "Upcoming"}
- Language: ${movie.language || "Odia"}

Tone: Informative, engaging, SEO-friendly, human-like. Not robotic.
IMPORTANT: Return ONLY the article text. No headings. No markdown. No labels. No preamble. Just the article.`;
}

// ─── Core fetch functions ────────────────────────────────────────────────────

async function generateArticle(movie) {
  const token = getAdminToken();
  if (!token) throw new Error("Not logged in as admin. Please log in again.");

  const response = await fetch(`${API_BASE}/admin/generate-article`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ prompt: buildPrompt(movie) }),
  });

  if (!response.ok) {
    let errorMessage = `Server error (${response.status})`;
    try {
      const errData = await response.json();
      errorMessage = errData.error || errorMessage;
    } catch {
      errorMessage = (await response.text()) || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const text = (data.text || "").trim();
  if (!text) throw new Error("AI returned an empty response. Try again.");
  return text;
}

async function publishArticle(movie, article) {
  const token = getAdminToken();
  if (!token) throw new Error("Not logged in as admin.");

  const year     = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const genre    = (movie.genre || []).join(", ") || "Odia Film";
  const title    = `${movie.title}${year ? ` (${year})` : ""} – ${genre} Odia Movie Review & Story`;
  const slug     = slugify(`${movie.title}${year ? `-${year}` : ""}-odia-movie`);
  const excerpt  = article.slice(0, 200).trim() + "…";
  const readTime = Math.ceil(article.split(/\s+/).length / 200);

  const res = await fetch(`${API_BASE}/admin/blog`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title,
      slug,
      content: article,
      excerpt,
      category: "Movie Review",
      tags: [movie.title, "Ollywood", "Odia Movie", ...(movie.genre || [])],
      coverImage: movie.posterUrl || movie.thumbnailUrl || "",
      movieTitle: movie.title,
      author: "OllyPedia Editorial",
      readTime,
      seoTitle: title,
      seoDesc: excerpt,
      published: true,
    }),
  });

  if (!res.ok) {
    let errorMessage = `Publish failed (${res.status})`;
    try {
      const errData = await res.json();
      errorMessage = errData.error || errorMessage;
    } catch {
      /* ignore */
    }
    throw new Error(errorMessage);
  }
}

// ─── Single movie row ────────────────────────────────────────────────────────

function MovieRow({ movie, isPublished, onPublished, onToast }) {
  const [status,  setStatus]  = useState(isPublished ? "done" : "idle");
  const [article, setArticle] = useState("");
  const [preview, setPreview] = useState(false);
  const [errMsg,  setErrMsg]  = useState("");

  const busy = status === "generating" || status === "publishing";

  const handleGenerate = async () => {
    setStatus("generating");
    setArticle("");
    setErrMsg("");
    setPreview(false);
    try {
      const text = await generateArticle(movie);
      setArticle(text);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setErrMsg(err.message);
      onToast("❌ " + err.message, "error");
    }
  };

  const handlePublish = async () => {
    if (!article.trim()) return;
    setStatus("publishing");
    setErrMsg("");
    try {
      await publishArticle(movie, article);
      setStatus("done");
      onPublished(movie._id);
      onToast(`✅ Published: "${movie.title}"`, "success");
    } catch (err) {
      setStatus("error");
      setErrMsg(err.message);
      onToast("❌ " + err.message, "error");
    }
  };

  const year = movie.releaseDate
    ? new Date(movie.releaseDate).getFullYear()
    : "TBA";

  const btn = (variant, disabled) => ({
    padding: "5px 13px",
    borderRadius: 6,
    border: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: "0.78rem",
    fontWeight: 600,
    opacity: disabled ? 0.55 : 1,
    background:
      variant === "gold"  ? "var(--gold)"  :
      variant === "green" ? "#28a050"       :
      variant === "red"   ? "#a02828"       :
                            "var(--bg3)",
    color:
      variant === "gold" || variant === "green" || variant === "red"
        ? "#fff"
        : "var(--text)",
  });

  return (
    <div>
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 14,
        padding: "14px 18px", borderBottom: "1px solid var(--border)",
        background:
          status === "done"  ? "rgba(40,160,80,0.06)"  :
          status === "error" ? "rgba(160,40,40,0.06)"  :
          "transparent",
      }}>
        {/* Poster */}
        {movie.posterUrl || movie.thumbnailUrl ? (
          <img
            src={movie.posterUrl || movie.thumbnailUrl}
            alt={movie.title}
            style={{ width: 38, height: 54, objectFit: "cover", borderRadius: 4,
              flexShrink: 0, border: "1px solid var(--border)", background: "var(--bg3)" }}
            onError={(e) => (e.target.style.opacity = "0")}
          />
        ) : (
          <div style={{ width: 38, height: 54, borderRadius: 4, flexShrink: 0,
            border: "1px solid var(--border)", background: "var(--bg3)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>
            🎬
          </div>
        )}

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "0.93rem", color: "var(--text)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {movie.title}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: 2 }}>
            {year} · {(movie.genre || []).join(", ") || "Odia"} · {movie.verdict || "Upcoming"}
          </div>
          {status === "error" && errMsg && (
            <div style={{ fontSize: "0.72rem", color: "#f77", marginTop: 4,
              background: "rgba(220,50,50,0.12)", padding: "3px 8px", borderRadius: 4 }}>
              ⚠️ {errMsg}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          {status === "done" ? (
            <span style={{ fontSize: "0.78rem", color: "#28a050", fontWeight: 700 }}>
              ✅ Published
            </span>
          ) : (
            <>
              <button style={btn("gold", busy)} onClick={handleGenerate} disabled={busy}>
                {status === "generating" ? "⏳ Generating…" : article ? "🔄 Regenerate" : "✨ Generate"}
              </button>

              {article && (
                <>
                  <button style={btn("ghost", busy)} onClick={() => setPreview(p => !p)} disabled={busy}>
                    {preview ? "Hide" : "Preview"}
                  </button>
                  <button style={btn("green", busy)} onClick={handlePublish} disabled={busy}>
                    {status === "publishing" ? "⏳ Publishing…" : "🚀 Publish"}
                  </button>
                </>
              )}

              {status === "error" && (
                <button style={btn("red", false)} onClick={handleGenerate}>
                  🔁 Retry
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Preview */}
      {article && preview && (
        <div style={{
          margin: "0 18px 12px 70px", padding: 12,
          background: "var(--bg3)", borderRadius: 6,
          fontSize: "0.78rem", color: "var(--text)", lineHeight: 1.75,
          whiteSpace: "pre-wrap", maxHeight: 220, overflowY: "auto",
          border: "1px solid var(--border)",
        }}>
          {article}
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function BlogGenerator({ movies = [], onToast }) {
  const [published,    setPublished]    = useState(new Set());
  const [generating,   setGenerating]   = useState(false);
  const [search,       setSearch]       = useState("");
  const [bulkProgress, setBulkProgress] = useState(null);

  const markPublished = (id) =>
    setPublished(prev => new Set([...prev, id]));

  const filtered    = movies.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase())
  );
  const unpublished = filtered.filter(m => !published.has(m._id));
  const done        = filtered.filter(m =>  published.has(m._id));

  const bulkGenerate = async () => {
    const targets = movies.filter(m => !published.has(m._id));
    if (!targets.length) return;
    setGenerating(true);
    setBulkProgress({ done: 0, total: targets.length });

    for (let i = 0; i < targets.length; i++) {
      const movie = targets[i];
      try {
        const text = await generateArticle(movie);
        await publishArticle(movie, text);
        markPublished(movie._id);
      } catch {
        // skip, continue with next
      }
      setBulkProgress({ done: i + 1, total: targets.length });
      await new Promise(r => setTimeout(r, 1000));
    }

    setGenerating(false);
    setBulkProgress(null);
    onToast("✅ Bulk generation complete!", "success");
  };

  return (
    <div style={{ padding: "24px 28px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14,
        marginBottom: 16, flexWrap: "wrap" }}>

        <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--gold)", flex: 1 }}>
          ✨ AI Blog Generator
          <span style={{ fontSize: "0.65rem", fontWeight: 500, marginLeft: 10,
            color: "var(--muted)", fontFamily: "monospace" }}>
            {API_BASE}
          </span>
        </div>

        <div style={{ display: "flex", gap: 18, fontSize: "0.82rem", color: "var(--muted)" }}>
          <span>🎬 <b style={{ color: "var(--text)" }}>{movies.length}</b> total</span>
          <span>✅ <b style={{ color: "#28a050" }}>{published.size}</b> published</span>
          <span>⏳ <b style={{ color: "var(--gold)" }}>{movies.length - published.size}</b> pending</span>
        </div>

        <input
          style={{ padding: "7px 12px", borderRadius: 7, border: "1px solid var(--border)",
            background: "var(--bg2)", color: "var(--text)", fontSize: "0.85rem", width: 200 }}
          placeholder="Search movies…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <button
          onClick={bulkGenerate}
          disabled={generating}
          style={{ padding: "7px 16px", borderRadius: 7, border: "none",
            cursor: generating ? "not-allowed" : "pointer",
            fontSize: "0.82rem", fontWeight: 700,
            background: generating ? "var(--bg3)" : "var(--gold)",
            color: generating ? "var(--muted)" : "#000" }}>
          {generating ? "⏳ Generating All…" : "🚀 Generate All"}
        </button>
      </div>

      {/* Bulk progress */}
      {bulkProgress && (
        <div style={{ marginBottom: 14, padding: "10px 14px",
          background: "rgba(201,151,58,0.1)", borderRadius: 8,
          border: "1px solid rgba(201,151,58,0.3)",
          fontSize: "0.84rem", color: "var(--gold)", fontWeight: 600 }}>
          ⏳ {bulkProgress.done} / {bulkProgress.total} complete
          <div style={{ marginTop: 8, height: 6, background: "var(--bg3)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 4, background: "var(--gold)",
              transition: "width 0.4s",
              width: `${(bulkProgress.done / bulkProgress.total) * 100}%` }} />
          </div>
        </div>
      )}

      {/* Ollama tip */}
      <div style={{ marginBottom: 14, padding: "8px 14px", borderRadius: 7,
        background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)",
        fontSize: "0.74rem", color: "var(--muted)", lineHeight: 1.7 }}>
        💡 <b style={{ color: "var(--text)" }}>Ollama must be running.</b>{" "}
        If you see a 500 error, open Command Prompt and run:{" "}
        <code style={{ background: "var(--bg3)", padding: "1px 6px", borderRadius: 3, fontSize: "0.72rem" }}>
          ollama pull llama3.2
        </code>
        {" "}— model downloads once (~2 GB), then generation works instantly.
      </div>

      {/* Movie list */}
      <div style={{ background: "var(--bg2)", borderRadius: 10,
        border: "1px solid var(--border)", overflow: "hidden" }}>

        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: "center",
            color: "var(--muted)", fontSize: "0.9rem" }}>
            {search ? "No movies match your search." : "No movies found."}
          </div>
        )}

        {unpublished.map(movie => (
          <MovieRow key={movie._id} movie={movie} isPublished={false}
            onPublished={markPublished} onToast={onToast} />
        ))}

        {done.map(movie => (
          <MovieRow key={movie._id} movie={movie} isPublished={true}
            onPublished={markPublished} onToast={onToast} />
        ))}

        {unpublished.length === 0 && done.length > 0 && !search && (
          <div style={{ padding: 16, textAlign: "center",
            color: "#28a050", fontSize: "0.85rem", fontWeight: 600 }}>
            🎉 All movies have published articles!
          </div>
        )}
      </div>
    </div>
  );
}