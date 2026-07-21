import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// ── Toast ──
export function Toast({ message, type = "success", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return <div className={`toast ${type}`}>{type === "success" ? "✓ " : "✕ "}{message}</div>;
}
export default Toast;

// ── Safe image with fallback ──
export function SafeImg({ src, alt, className, style, fallback }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return fallback || null;
  return <img src={src} alt={alt} className={className} style={style} onError={() => setBroken(true)} />;
}

// ── Verdict badge class ──
export function verdictClass(v) {
  if (!v) return "verdict-upcoming";
  const l = v.toLowerCase();
  if (["hit","super hit","blockbuster"].includes(l)) return "verdict-hit";
  if (["flop","disaster"].includes(l)) return "verdict-flop";
  if (l === "average") return "verdict-average";
  return "verdict-upcoming";
}

// ── Movie Card ──
export function MovieCard({ movie, portalMode }) {
  const navigate = useNavigate();
  return (
    <div className="movie-card" onClick={() => navigate(portalMode ? `/portal/movie/${movie._id}` : `/movie/${movie._id}`)}>
      <div className="movie-card-poster">
        <SafeImg
          src={movie.posterUrl} alt={movie.title}
          fallback={<span className="movie-card-poster-placeholder">🎬</span>}
        />
        <span className={`movie-card-verdict ${verdictClass(movie.verdict)}`}>
          {movie.verdict || "Upcoming"}
        </span>
      </div>
      <div className="movie-card-body">
        <div className="movie-card-title">{movie.title}</div>
        <div className="movie-card-meta">
          {movie.productionId?.name && <span>{movie.productionId.name}</span>}
          {movie.releaseDate && <span> · {movie.releaseDate}</span>}
        </div>
      </div>
    </div>
  );
}

// ── Reusable Image Upload Input (Text + File Upload) ──
import { getAdminToken } from "../api/api";
export function ImageUploadInput({ value, onChange, placeholder = "Enter URL...", className = "form-input" }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = React.useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
      const res = await fetch(`${API_BASE}/admin/upload-blog-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAdminToken()}` },
        body: fd
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      onChange(url);
    } catch (err) {
      alert("Upload failed: " + err.message);
    }
    setUploading(false);
    e.target.value = "";
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input type="text" className={className} placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} style={{ flex: 1, minWidth: 0 }} />
      <input type="file" accept="image/*" ref={fileRef} style={{ display: "none" }} onChange={handleFile} />
      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} style={{ padding: "8px 12px", border: "1px solid var(--border)", background: "var(--bg3)", color: "var(--text)", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.75rem", whiteSpace: "nowrap" }}>
        {uploading ? "⏳ Uploading..." : "📤 Upload"}
      </button>
    </div>
  );
}