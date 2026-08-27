import React, { useState, useEffect, useRef, useCallback } from "react";
import { API } from "../api/api";

const SOURCES = [
  { key: "all", label: "All Media", icon: "☁️" },
  { key: "Movie", label: "Movies & Banners", icon: "🎬" },
  { key: "Cast", label: "Cast & Crew", icon: "🎭" },
  { key: "Blog", label: "Blog Images", icon: "✍️" },
  { key: "News", label: "News Images", icon: "📰" },
  { key: "Production", label: "Productions", icon: "🎥" },
  { key: "Cloudinary Upload", label: "Direct Uploads", icon: "📤" },
];

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return "—";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function formatDate(d) {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return String(d);
  }
}

export default function MediaPanel({ onToast }) {
  const [mediaList, setMediaList] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [limit] = useState(36);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sourceStats, setSourceStats] = useState({});
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  
  // Upload & Sync states
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [syncingCloudinary, setSyncingCloudinary] = useState(false);
  
  // Selection & Modal states
  const [selected, setSelected] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(null); // lightbox modal
  const [copiedId, setCopiedId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  const fileInputRef = useRef(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Load media list
  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const data = await API.adminGetMedia({
        page,
        limit,
        search: debouncedSearch,
        source: sourceFilter,
      });
      setMediaList(data.media || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (data.sourcesCount) setSourceStats(data.sourcesCount);
    } catch (err) {
      console.error("Failed to load media:", err);
      onToast?.(err.message || "Failed to load media", "error");
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, sourceFilter, onToast]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  // Handle file uploads (single or multiple)
  const handleUploadFiles = async (files) => {
    if (!files || !files.length) return;
    setUploading(true);
    setUploadProgress(`Uploading ${files.length} image${files.length > 1 ? "s" : ""} to Cloudinary…`);
    try {
      const fd = new FormData();
      Array.from(files).forEach((file) => fd.append("files", file));
      fd.append("source", "Cloudinary Upload");

      const res = await API.adminUploadMedia(fd);
      onToast?.(`🎉 Uploaded ${res.count || files.length} image(s) to Cloudinary successfully!`);
      fetchMedia();
    } catch (err) {
      console.error("Upload error:", err);
      onToast?.(err.message || "Upload failed", "error");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  // Copy URL to clipboard
  const handleCopyUrl = (url, id) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    onToast?.("📋 URL copied to clipboard!");
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Sync from Cloudinary
  const handleSyncCloudinary = async () => {
    setSyncingCloudinary(true);
    try {
      const res = await API.adminSyncCloudinary();
      onToast?.(`☁️ ${res.message || `Synced ${res.syncedCount} Cloudinary assets!`}`);
      fetchMedia();
    } catch (err) {
      onToast?.(err.message || "Cloudinary sync failed", "error");
    } finally {
      setSyncingCloudinary(false);
    }
  };

  // Delete single media
  const handleDeleteMedia = (media) => {
    setConfirmDelete({
      message: `Permanently delete "${media.filename || media.title || "this media"}" from Cloudinary and database?`,
      onConfirm: async () => {
        setConfirmDelete(null);
        try {
          await API.adminDeleteMedia(media._id);
          setMediaList((prev) => prev.filter((m) => m._id !== media._id));
          setTotal((prev) => Math.max(0, prev - 1));
          if (previewMedia?._id === media._id) setPreviewMedia(null);
          onToast?.("Media asset deleted from Cloudinary.");
        } catch (err) {
          onToast?.(err.message, "error");
        }
      },
    });
  };

  // Bulk delete selected
  const handleBulkDelete = () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setConfirmDelete({
      message: `Permanently delete ${ids.length} selected media file(s) from Cloudinary?`,
      onConfirm: async () => {
        setConfirmDelete(null);
        try {
          await API.adminBulkDeleteMedia(ids);
          setSelected(new Set());
          setSelectMode(false);
          onToast?.(`Deleted ${ids.length} media items.`);
          fetchMedia();
        } catch (err) {
          onToast?.(err.message, "error");
        }
      },
    });
  };

  // Bulk copy all URLs
  const handleBulkCopy = () => {
    const urls = mediaList.filter((m) => selected.has(m._id)).map((m) => m.url).join("\n");
    if (!urls) return;
    navigator.clipboard.writeText(urls);
    onToast?.(`📋 Copied ${selected.size} image URLs to clipboard!`);
  };

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllOnPage = () => {
    setSelected(new Set(mediaList.map((m) => m._id)));
  };

  const clearSelection = () => {
    setSelected(new Set());
    setSelectMode(false);
  };

  const sourceBadgeColor = (s) => {
    switch (s) {
      case "Cloudinary Upload": return { bg: "rgba(59,130,246,0.15)", text: "#60a5fa", border: "rgba(59,130,246,0.35)", icon: "☁️" };
      case "Blog": return { bg: "rgba(16,185,129,0.15)", text: "#34d399", border: "rgba(16,185,129,0.35)", icon: "✍️" };
      case "Movie": return { bg: "rgba(201,151,58,0.15)", text: "#ffd700", border: "rgba(201,151,58,0.35)", icon: "🎬" };
      case "Cast": return { bg: "rgba(168,85,247,0.15)", text: "#c084fc", border: "rgba(168,85,247,0.35)", icon: "🎭" };
      case "News": return { bg: "rgba(59,130,246,0.15)", text: "#60a5fa", border: "rgba(59,130,246,0.35)", icon: "📰" };
      case "Production": return { bg: "rgba(244,63,94,0.15)", text: "#fb7185", border: "rgba(244,63,94,0.35)", icon: "🎥" };
      default: return { bg: "rgba(59,130,246,0.15)", text: "#60a5fa", border: "rgba(59,130,246,0.35)", icon: "☁️" };
    }
  };

  return (
    <div style={{ padding: "28px 36px 60px" }}>
      {/* ── Top Header Banner ── */}
      <div style={{
        background: "linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(20, 20, 32, 0.7) 100%)",
        border: "1px solid rgba(59, 130, 246, 0.28)",
        borderRadius: 16,
        padding: "24px 28px",
        marginBottom: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 16
      }}>
        <div>
          <div style={{ fontSize: "0.72rem", fontWeight: 800, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>
            Cloudinary Media Storage & URL Hub
          </div>
          <h1 style={{ fontSize: "1.75rem", margin: 0, fontWeight: 900, color: "#fff", display: "flex", alignItems: "center", gap: 10 }}>
            <span>☁️ Uploaded Cloudinary Media</span>
            <span style={{ fontSize: "0.8rem", color: "#9292a4", background: "#181824", padding: "3px 12px", borderRadius: 14, fontWeight: 700, border: "1px solid rgba(255,255,255,0.08)" }}>
              {total} Uploaded Files
            </span>
          </h1>
          <p style={{ color: "#9292a4", fontSize: "0.85rem", margin: "6px 0 0" }}>
            Every image uploaded using Cloudinary shows up here with preview, direct link, and instant 1-click URL copying.
          </p>
        </div>

        {/* Header Actions */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={handleSyncCloudinary}
            disabled={syncingCloudinary}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              borderColor: "rgba(59,130,246,0.5)", background: "rgba(59,130,246,0.1)", color: "#60a5fa", fontWeight: 700
            }}
          >
            <span style={{ display: "inline-block", animation: syncingCloudinary ? "spin 1s linear infinite" : "none" }}>☁️</span>
            <span>{syncingCloudinary ? "Syncing Cloudinary…" : "Refresh from Cloudinary"}</span>
          </button>

          <button
            className="btn btn-gold btn-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <span>📤</span>
            <span>{uploading ? "Uploading…" : "+ Upload Images"}</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: "none" }}
            multiple
            accept="image/*"
            onChange={(e) => handleUploadFiles(e.target.files)}
          />
        </div>
      </div>

      {/* ── Drag & Drop Upload Zone ── */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragOver ? "#60a5fa" : "rgba(255,255,255,0.14)"}`,
          background: isDragOver ? "rgba(59,130,246,0.08)" : "rgba(18,18,26,0.6)",
          borderRadius: 14,
          padding: "22px 20px",
          textAlign: "center",
          cursor: "pointer",
          marginBottom: 24,
          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        <div style={{ fontSize: "1.8rem", marginBottom: 6 }}>
          {uploading ? "⏳" : isDragOver ? "📥" : "☁️"}
        </div>
        <div style={{ fontWeight: 800, fontSize: "0.92rem", color: isDragOver ? "#60a5fa" : "#fff", marginBottom: 4 }}>
          {uploadProgress || (isDragOver ? "Drop images here to upload directly to Cloudinary" : "Drag & drop images here to upload to Cloudinary (or click to browse)")}
        </div>
        <div style={{ color: "#8a8a9e", fontSize: "0.75rem" }}>
          Uploaded images will be immediately available in this library with direct public Cloudinary URLs.
        </div>
      </div>

      {/* ── Filter Bar & Search Toolbar ── */}
      <div className="ap-sticky-bar" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        {/* Search */}
        <div style={{ position: "relative", minWidth: 240, flex: "1 1 200px" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: "0.8rem", color: "#6a6a7c", pointerEvents: "none" }}>🔍</span>
          <input
            className="form-input"
            style={{
              paddingLeft: 32,
              paddingRight: 28,
              fontSize: "0.82rem",
              background: "#14141d",
              borderColor: "rgba(255,255,255,0.1)",
              borderRadius: 8,
              height: 36,
            }}
            placeholder="Search by filename, public ID, or URL…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setPage(1); }}
              style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: "0.75rem"
              }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Source Filter Pills */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          {SOURCES.map((s) => {
            const count = s.key === "all" ? (sourceStats.all || total) : (sourceStats[s.key] || 0);
            const active = sourceFilter === s.key;
            return (
              <button
                key={s.key}
                onClick={() => { setSourceFilter(s.key); setPage(1); }}
                style={{
                  padding: "6px 12px",
                  borderRadius: 20,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  border: `1px solid ${active ? "#60a5fa" : "rgba(255,255,255,0.08)"}`,
                  background: active ? "rgba(59,130,246,0.2)" : "#14141d",
                  color: active ? "#60a5fa" : "#8a8a9e",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  whiteSpace: "nowrap",
                  transition: "all 0.15s"
                }}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
                {count > 0 && (
                  <span style={{
                    fontSize: "0.65rem",
                    padding: "1px 6px",
                    borderRadius: 10,
                    background: active ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.08)",
                    color: active ? "#fff" : "#aaa",
                  }}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        {/* Select Mode & View Switcher */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => {
              if (selectMode) clearSelection();
              else setSelectMode(true);
            }}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: `1px solid ${selectMode ? "#60a5fa" : "rgba(255,255,255,0.1)"}`,
              background: selectMode ? "rgba(59,130,246,0.15)" : "#14141d",
              color: selectMode ? "#60a5fa" : "#8a8a9e",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            {selectMode ? "Cancel Select" : "☑️ Select"}
          </button>

          {/* Grid/List toggle */}
          <div style={{ display: "flex", background: "#14141d", borderRadius: 8, padding: 2, border: "1px solid rgba(255,255,255,0.08)" }}>
            <button
              onClick={() => setViewMode("grid")}
              style={{
                padding: "5px 10px", border: "none", borderRadius: 6, cursor: "pointer",
                background: viewMode === "grid" ? "var(--gold)" : "transparent",
                color: viewMode === "grid" ? "#000" : "#8a8a9e",
                fontWeight: 800, fontSize: "0.75rem"
              }}
            >
              ▦ Grid
            </button>
            <button
              onClick={() => setViewMode("list")}
              style={{
                padding: "5px 10px", border: "none", borderRadius: 6, cursor: "pointer",
                background: viewMode === "list" ? "var(--gold)" : "transparent",
                color: viewMode === "list" ? "#000" : "#8a8a9e",
                fontWeight: 800, fontSize: "0.75rem"
              }}
            >
              ≡ List
            </button>
          </div>
        </div>
      </div>

      {/* ── Bulk Actions Toolbar ── */}
      {selectMode && (
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "rgba(59,130,246,0.12)",
          border: "1px solid rgba(59,130,246,0.35)",
          borderRadius: 10,
          padding: "10px 16px",
          marginBottom: 20
        }}>
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#60a5fa" }}>
            {selected.size} selected
          </span>
          <button className="btn btn-ghost btn-sm" onClick={selectAllOnPage} style={{ fontSize: "0.72rem" }}>
            Select All on Page
          </button>
          <button className="btn btn-ghost btn-sm" onClick={clearSelection} style={{ fontSize: "0.72rem", color: "#8a8a9e" }}>
            Clear
          </button>
          <div style={{ flex: 1 }} />
          <button
            className="btn btn-outline btn-sm"
            onClick={handleBulkCopy}
            disabled={selected.size === 0}
            style={{ fontSize: "0.75rem" }}
          >
            📋 Copy All URLs
          </button>
          <button
            className="btn btn-sm"
            onClick={handleBulkDelete}
            disabled={selected.size === 0}
            style={{ background: "#ef4444", color: "#fff", border: "none", fontSize: "0.75rem", fontWeight: 700 }}
          >
            🗑️ Delete Selected
          </button>
        </div>
      )}

      {/* ── Media Content Area ── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#8a8a9e" }}>
          <div style={{ fontSize: "2rem", marginBottom: 12 }}>⏳</div>
          <div style={{ fontWeight: 700 }}>Loading Cloudinary media…</div>
        </div>
      ) : mediaList.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "60px 20px",
          background: "#12121a",
          border: "1px dashed rgba(255,255,255,0.1)",
          borderRadius: 14
        }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>☁️</div>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 800, color: "#fff", marginBottom: 6 }}>No Cloudinary Uploads Found</h3>
          <p style={{ color: "#8a8a9e", fontSize: "0.85rem", maxWidth: 460, margin: "0 auto 20px" }}>
            {search || sourceFilter !== "all"
              ? "No images match your search or filter criteria. Try resetting filters."
              : "Click '+ Upload Images' or 'Refresh from Cloudinary' to fetch all your uploaded Cloudinary assets."}
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <button className="btn btn-outline btn-sm" onClick={handleSyncCloudinary}>
              ☁️ Refresh from Cloudinary
            </button>
            <button className="btn btn-gold btn-sm" onClick={() => fileInputRef.current?.click()}>
              + Upload Image
            </button>
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* ── Grid Gallery View ── */
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
          gap: 18
        }}>
          {mediaList.map((m) => {
            const isSel = selected.has(m._id);
            const isCopied = copiedId === m._id;
            const badge = sourceBadgeColor(m.source);

            return (
              <div
                key={m._id}
                className="ap-card-glow"
                style={{
                  position: "relative",
                  borderRadius: 12,
                  overflow: "hidden",
                  border: `2px solid ${isSel ? "#60a5fa" : "rgba(255,255,255,0.08)"}`,
                  background: "#12121a",
                  display: "flex",
                  flexDirection: "column",
                  cursor: selectMode ? "pointer" : "default"
                }}
                onClick={() => selectMode && toggleSelect(m._id)}
              >
                {/* Select checkbox overlay */}
                {selectMode && (
                  <div style={{ position: "absolute", top: 8, left: 8, zIndex: 20 }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      border: `2px solid ${isSel ? "#60a5fa" : "rgba(255,255,255,0.8)"}`,
                      background: isSel ? "#60a5fa" : "rgba(0,0,0,0.65)",
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      {isSel && <span style={{ color: "#fff", fontSize: "0.75rem", fontWeight: 900 }}>✓</span>}
                    </div>
                  </div>
                )}

                {/* Thumbnail Image Container */}
                <div
                  style={{
                    position: "relative",
                    aspectRatio: "16/10",
                    background: "#0c0c12",
                    overflow: "hidden",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                  onClick={(e) => {
                    if (selectMode) return;
                    e.stopPropagation();
                    setPreviewMedia(m);
                  }}
                >
                  <img
                    src={m.url}
                    alt={m.title || m.filename}
                    style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.25s" }}
                    onError={(e) => {
                      e.target.style.display = "none";
                      if (e.target.nextSibling) e.target.nextSibling.style.display = "flex";
                    }}
                    onMouseEnter={(e) => e.target.style.transform = "scale(1.05)"}
                    onMouseLeave={(e) => e.target.style.transform = "none"}
                  />
                  <div style={{ display: "none", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", color: "#666" }}>
                    🖼️ Image Error
                  </div>

                  {/* Top Source Badge */}
                  <div style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    background: badge.bg,
                    color: badge.text,
                    border: `1px solid ${badge.border}`,
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    backdropFilter: "blur(6px)"
                  }}>
                    {badge.icon} {m.source || "Cloudinary"}
                  </div>

                  {/* Dimensions / Size chip at bottom left */}
                  <div style={{
                    position: "absolute",
                    bottom: 6,
                    left: 8,
                    background: "rgba(0,0,0,0.75)",
                    color: "#e2e2ea",
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    padding: "1px 6px",
                    borderRadius: 4,
                    backdropFilter: "blur(4px)"
                  }}>
                    {m.width && m.height ? `${m.width}×${m.height}` : formatBytes(m.size)}
                  </div>
                </div>

                {/* Card Details Body */}
                <div style={{ padding: "10px 12px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div
                      title={m.title || m.filename}
                      style={{
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        color: "#fff",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginBottom: 4
                      }}
                    >
                      {m.title || m.filename}
                    </div>

                    {/* URL Snippet */}
                    <div
                      style={{
                        fontSize: "0.68rem",
                        color: "#8a8a9e",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        padding: "3px 6px",
                        borderRadius: 4,
                        fontFamily: "monospace",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginBottom: 8
                      }}
                      title={m.url}
                    >
                      {m.url}
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  {!selectMode && (
                    <div style={{ display: "flex", gap: 6, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 8 }}>
                      <button
                        onClick={() => handleCopyUrl(m.url, m._id)}
                        style={{
                          flex: 1,
                          padding: "6px 0",
                          borderRadius: 6,
                          border: "1px solid",
                          borderColor: isCopied ? "#10b981" : "rgba(201,151,58,0.3)",
                          background: isCopied ? "rgba(16,185,129,0.15)" : "rgba(201,151,58,0.1)",
                          color: isCopied ? "#10b981" : "#ffd700",
                          fontSize: "0.72rem",
                          fontWeight: 800,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 4,
                          transition: "all 0.15s"
                        }}
                      >
                        <span>{isCopied ? "✓" : "📋"}</span>
                        <span>{isCopied ? "Copied!" : "Copy URL"}</span>
                      </button>

                      <button
                        onClick={() => setPreviewMedia(m)}
                        title="View Full Details"
                        style={{
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: "1px solid rgba(255,255,255,0.1)",
                          background: "#181824",
                          color: "#e2e2ea",
                          fontSize: "0.72rem",
                          cursor: "pointer"
                        }}
                      >
                        🔍
                      </button>

                      <button
                        onClick={() => handleDeleteMedia(m)}
                        title="Delete Image"
                        style={{
                          padding: "6px 10px",
                          borderRadius: 6,
                          border: "none",
                          background: "rgba(239,68,68,0.1)",
                          color: "#ef4444",
                          fontSize: "0.72rem",
                          cursor: "pointer",
                          transition: "background 0.15s"
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.25)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.1)"}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Table List View ── */
        <div style={{ background: "#12121a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ background: "#181824", color: "#8a8a9e", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <th style={{ padding: "12px 16px", width: 60 }}>Preview</th>
                <th style={{ padding: "12px 16px" }}>Title / Filename</th>
                <th style={{ padding: "12px 16px" }}>Source</th>
                <th style={{ padding: "12px 16px" }}>Direct URL</th>
                <th style={{ padding: "12px 16px" }}>Date</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {mediaList.map((m) => {
                const isSel = selected.has(m._id);
                const isCopied = copiedId === m._id;
                const badge = sourceBadgeColor(m.source);

                return (
                  <tr
                    key={m._id}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                      background: isSel ? "rgba(59,130,246,0.06)" : "transparent"
                    }}
                  >
                    <td style={{ padding: "10px 16px" }}>
                      <div
                        onClick={() => setPreviewMedia(m)}
                        style={{ width: 44, height: 44, borderRadius: 6, overflow: "hidden", background: "#0c0c12", cursor: "pointer" }}
                      >
                        <img src={m.url} alt={m.filename} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => e.target.style.display = "none"} />
                      </div>
                    </td>
                    <td style={{ padding: "10px 16px", fontWeight: 700, color: "#fff" }}>
                      <div>{m.title || m.filename}</div>
                      <div style={{ fontSize: "0.7rem", color: "#6a6a7c", marginTop: 2 }}>{formatBytes(m.size)}</div>
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <span style={{
                        background: badge.bg, color: badge.text, border: `1px solid ${badge.border}`,
                        fontSize: "0.68rem", fontWeight: 800, padding: "2px 8px", borderRadius: 10, textTransform: "uppercase"
                      }}>
                        {badge.icon} {m.source || "Cloudinary"}
                      </span>
                    </td>
                    <td style={{ padding: "10px 16px", maxWidth: 280 }}>
                      <div style={{
                        fontFamily: "monospace", fontSize: "0.72rem", color: "#ffd700",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                      }}>
                        {m.url}
                      </div>
                    </td>
                    <td style={{ padding: "10px 16px", color: "#8a8a9e", fontSize: "0.75rem" }}>
                      {formatDate(m.createdAt)}
                    </td>
                    <td style={{ padding: "10px 16px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleCopyUrl(m.url, m._id)}
                          style={{
                            color: isCopied ? "#10b981" : "#ffd700",
                            fontSize: "0.72rem", fontWeight: 700, padding: "3px 8px"
                          }}
                        >
                          {isCopied ? "✓ Copied" : "📋 Copy"}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => setPreviewMedia(m)}
                          style={{ fontSize: "0.72rem", padding: "3px 8px" }}
                        >
                          View
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDeleteMedia(m)}
                          style={{ color: "#ef4444", fontSize: "0.72rem", padding: "3px 8px" }}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 32 }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ← Previous
          </button>
          <span style={{ fontSize: "0.82rem", color: "#8a8a9e", fontWeight: 700 }}>
            Page {page} of {totalPages}
          </span>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next →
          </button>
        </div>
      )}

      {/* ── Lightbox / Image Detail Modal ── */}
      {previewMedia && (
        <div
          className="modal-overlay"
          onClick={() => setPreviewMedia(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 1200,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20
          }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 720, width: "100%", background: "#111118",
              border: "1px solid rgba(59,130,246,0.4)", borderRadius: 16,
              overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.9)"
            }}
          >
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)"
            }}>
              <span style={{ fontWeight: 800, color: "#60a5fa", fontSize: "0.95rem" }}>
                🔍 Cloudinary Image Preview & Direct URL
              </span>
              <button
                onClick={() => setPreviewMedia(null)}
                style={{ background: "none", border: "none", color: "#fff", fontSize: "1.2rem", cursor: "pointer" }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: 20 }}>
              {/* Full Image Preview Container */}
              <div style={{
                background: "#08080c", borderRadius: 10, padding: 12, textAlign: "center",
                maxHeight: 360, display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 18, border: "1px solid rgba(255,255,255,0.06)"
              }}>
                <img
                  src={previewMedia.url}
                  alt={previewMedia.title || previewMedia.filename}
                  style={{ maxWidth: "100%", maxHeight: 330, objectFit: "contain", borderRadius: 6 }}
                />
              </div>

              {/* Full Copyable URL Box */}
              <div style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontSize: "0.75rem", marginBottom: 6 }}>
                  Direct Public Cloudinary URL (Ready for paste in Movie / News / Blog forms):
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="form-input"
                    readOnly
                    value={previewMedia.url}
                    onClick={(e) => e.target.select()}
                    style={{ flex: 1, fontFamily: "monospace", fontSize: "0.8rem", color: "#ffd700" }}
                  />
                  <button
                    className="btn btn-gold btn-sm"
                    onClick={() => handleCopyUrl(previewMedia.url, previewMedia._id)}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {copiedId === previewMedia._id ? "✓ Copied!" : "📋 Copy URL"}
                  </button>
                </div>
              </div>

              {/* Metadata Details Grid */}
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10,
                background: "#161622", padding: "12px 16px", borderRadius: 8, fontSize: "0.75rem",
                border: "1px solid rgba(255,255,255,0.06)", marginBottom: 16
              }}>
                <div>
                  <span style={{ color: "#8a8a9e" }}>Source: </span>
                  <strong style={{ color: "#fff" }}>{previewMedia.source || "Cloudinary"}</strong>
                </div>
                <div>
                  <span style={{ color: "#8a8a9e" }}>Dimensions: </span>
                  <strong style={{ color: "#fff" }}>{previewMedia.width && previewMedia.height ? `${previewMedia.width} × ${previewMedia.height}` : "—"}</strong>
                </div>
                <div>
                  <span style={{ color: "#8a8a9e" }}>File Size: </span>
                  <strong style={{ color: "#fff" }}>{formatBytes(previewMedia.size)}</strong>
                </div>
                <div>
                  <span style={{ color: "#8a8a9e" }}>Uploaded: </span>
                  <strong style={{ color: "#fff" }}>{formatDate(previewMedia.createdAt)}</strong>
                </div>
                {previewMedia.publicId && (
                  <div style={{ gridColumn: "span 2" }}>
                    <span style={{ color: "#8a8a9e" }}>Public ID: </span>
                    <strong style={{ color: "#60a5fa", fontFamily: "monospace" }}>{previewMedia.publicId}</strong>
                  </div>
                )}
                <div style={{ gridColumn: previewMedia.publicId ? "span 3" : "span 2" }}>
                  <span style={{ color: "#8a8a9e" }}>Filename: </span>
                  <strong style={{ color: "#fff" }}>{previewMedia.filename || "—"}</strong>
                </div>
              </div>

              {/* Footer Actions */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <a
                  href={previewMedia.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline btn-sm"
                  style={{ fontSize: "0.75rem" }}
                >
                  Open in New Tab ↗
                </a>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDeleteMedia(previewMedia)}
                    style={{ color: "#ef4444" }}
                  >
                    🗑️ Delete Image
                  </button>
                  <button className="btn btn-gold btn-sm" onClick={() => setPreviewMedia(null)}>
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Modal ── */}
      {confirmDelete && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1300,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20
        }}>
          <div style={{
            background: "#181824", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 12, padding: 24, width: "100%", maxWidth: 400, textAlign: "center"
          }}>
            <div style={{ fontSize: "2rem", marginBottom: 10 }}>⚠️</div>
            <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#fff", marginBottom: 8 }}>Confirm Delete</div>
            <p style={{ color: "#9292a4", fontSize: "0.85rem", marginBottom: 20, lineHeight: 1.5 }}>
              {confirmDelete.message}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(null)}>
                Cancel
              </button>
              <button
                className="btn btn-sm"
                onClick={confirmDelete.onConfirm}
                style={{ background: "#ef4444", color: "#fff", border: "none", fontWeight: 700 }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
