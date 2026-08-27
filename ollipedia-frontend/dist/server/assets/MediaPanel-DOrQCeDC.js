import { jsxs, jsx } from "react/jsx-runtime";
import { useState, useRef, useEffect, useCallback } from "react";
import { A as API } from "../entry-server.js";
import "react-dom/server";
import "react-router-dom/server.mjs";
import "react-helmet-async";
import "react-router-dom";
const SOURCES = [
  { key: "all", label: "All Media", icon: "☁️" },
  { key: "Movie", label: "Movies & Banners", icon: "🎬" },
  { key: "Cast", label: "Cast & Crew", icon: "🎭" },
  { key: "Blog", label: "Blog Images", icon: "✍️" },
  { key: "News", label: "News Images", icon: "📰" },
  { key: "Production", label: "Productions", icon: "🎥" },
  { key: "Cloudinary Upload", label: "Direct Uploads", icon: "📤" }
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
function MediaPanel({ onToast }) {
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
  const [viewMode, setViewMode] = useState("grid");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [syncingCloudinary, setSyncingCloudinary] = useState(false);
  const [selected, setSelected] = useState(/* @__PURE__ */ new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const fileInputRef = useRef(null);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);
  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const data = await API.adminGetMedia({
        page,
        limit,
        search: debouncedSearch,
        source: sourceFilter
      });
      setMediaList(data.media || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (data.sourcesCount) setSourceStats(data.sourcesCount);
    } catch (err) {
      console.error("Failed to load media:", err);
      onToast == null ? void 0 : onToast(err.message || "Failed to load media", "error");
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch, sourceFilter, onToast]);
  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);
  const handleUploadFiles = async (files) => {
    if (!files || !files.length) return;
    setUploading(true);
    setUploadProgress(`Uploading ${files.length} image${files.length > 1 ? "s" : ""} to Cloudinary…`);
    try {
      const fd = new FormData();
      Array.from(files).forEach((file) => fd.append("files", file));
      fd.append("source", "Cloudinary Upload");
      const res = await API.adminUploadMedia(fd);
      onToast == null ? void 0 : onToast(`🎉 Uploaded ${res.count || files.length} image(s) to Cloudinary successfully!`);
      fetchMedia();
    } catch (err) {
      console.error("Upload error:", err);
      onToast == null ? void 0 : onToast(err.message || "Upload failed", "error");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
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
  const handleCopyUrl = (url, id) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    onToast == null ? void 0 : onToast("📋 URL copied to clipboard!");
    setTimeout(() => setCopiedId(null), 1800);
  };
  const handleSyncCloudinary = async () => {
    setSyncingCloudinary(true);
    try {
      const res = await API.adminSyncCloudinary();
      onToast == null ? void 0 : onToast(`☁️ ${res.message || `Synced ${res.syncedCount} Cloudinary assets!`}`);
      fetchMedia();
    } catch (err) {
      onToast == null ? void 0 : onToast(err.message || "Cloudinary sync failed", "error");
    } finally {
      setSyncingCloudinary(false);
    }
  };
  const handleDeleteMedia = (media) => {
    setConfirmDelete({
      message: `Permanently delete "${media.filename || media.title || "this media"}" from Cloudinary and database?`,
      onConfirm: async () => {
        setConfirmDelete(null);
        try {
          await API.adminDeleteMedia(media._id);
          setMediaList((prev) => prev.filter((m) => m._id !== media._id));
          setTotal((prev) => Math.max(0, prev - 1));
          if ((previewMedia == null ? void 0 : previewMedia._id) === media._id) setPreviewMedia(null);
          onToast == null ? void 0 : onToast("Media asset deleted from Cloudinary.");
        } catch (err) {
          onToast == null ? void 0 : onToast(err.message, "error");
        }
      }
    });
  };
  const handleBulkDelete = () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setConfirmDelete({
      message: `Permanently delete ${ids.length} selected media file(s) from Cloudinary?`,
      onConfirm: async () => {
        setConfirmDelete(null);
        try {
          await API.adminBulkDeleteMedia(ids);
          setSelected(/* @__PURE__ */ new Set());
          setSelectMode(false);
          onToast == null ? void 0 : onToast(`Deleted ${ids.length} media items.`);
          fetchMedia();
        } catch (err) {
          onToast == null ? void 0 : onToast(err.message, "error");
        }
      }
    });
  };
  const handleBulkCopy = () => {
    const urls = mediaList.filter((m) => selected.has(m._id)).map((m) => m.url).join("\n");
    if (!urls) return;
    navigator.clipboard.writeText(urls);
    onToast == null ? void 0 : onToast(`📋 Copied ${selected.size} image URLs to clipboard!`);
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
    setSelected(/* @__PURE__ */ new Set());
    setSelectMode(false);
  };
  const sourceBadgeColor = (s) => {
    switch (s) {
      case "Cloudinary Upload":
        return { bg: "rgba(59,130,246,0.15)", text: "#60a5fa", border: "rgba(59,130,246,0.35)", icon: "☁️" };
      case "Blog":
        return { bg: "rgba(16,185,129,0.15)", text: "#34d399", border: "rgba(16,185,129,0.35)", icon: "✍️" };
      case "Movie":
        return { bg: "rgba(201,151,58,0.15)", text: "#ffd700", border: "rgba(201,151,58,0.35)", icon: "🎬" };
      case "Cast":
        return { bg: "rgba(168,85,247,0.15)", text: "#c084fc", border: "rgba(168,85,247,0.35)", icon: "🎭" };
      case "News":
        return { bg: "rgba(59,130,246,0.15)", text: "#60a5fa", border: "rgba(59,130,246,0.35)", icon: "📰" };
      case "Production":
        return { bg: "rgba(244,63,94,0.15)", text: "#fb7185", border: "rgba(244,63,94,0.35)", icon: "🎥" };
      default:
        return { bg: "rgba(59,130,246,0.15)", text: "#60a5fa", border: "rgba(59,130,246,0.35)", icon: "☁️" };
    }
  };
  return /* @__PURE__ */ jsxs("div", { style: { padding: "28px 36px 60px" }, children: [
    /* @__PURE__ */ jsxs("div", { style: {
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
    }, children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", fontWeight: 800, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }, children: "Cloudinary Media Storage & URL Hub" }),
        /* @__PURE__ */ jsxs("h1", { style: { fontSize: "1.75rem", margin: 0, fontWeight: 900, color: "#fff", display: "flex", alignItems: "center", gap: 10 }, children: [
          /* @__PURE__ */ jsx("span", { children: "☁️ Uploaded Cloudinary Media" }),
          /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.8rem", color: "#9292a4", background: "#181824", padding: "3px 12px", borderRadius: 14, fontWeight: 700, border: "1px solid rgba(255,255,255,0.08)" }, children: [
            total,
            " Uploaded Files"
          ] })
        ] }),
        /* @__PURE__ */ jsx("p", { style: { color: "#9292a4", fontSize: "0.85rem", margin: "6px 0 0" }, children: "Every image uploaded using Cloudinary shows up here with preview, direct link, and instant 1-click URL copying." })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            className: "btn btn-outline btn-sm",
            onClick: handleSyncCloudinary,
            disabled: syncingCloudinary,
            style: {
              display: "flex",
              alignItems: "center",
              gap: 6,
              borderColor: "rgba(59,130,246,0.5)",
              background: "rgba(59,130,246,0.1)",
              color: "#60a5fa",
              fontWeight: 700
            },
            children: [
              /* @__PURE__ */ jsx("span", { style: { display: "inline-block", animation: syncingCloudinary ? "spin 1s linear infinite" : "none" }, children: "☁️" }),
              /* @__PURE__ */ jsx("span", { children: syncingCloudinary ? "Syncing Cloudinary…" : "Refresh from Cloudinary" })
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            className: "btn btn-gold btn-sm",
            onClick: () => {
              var _a;
              return (_a = fileInputRef.current) == null ? void 0 : _a.click();
            },
            disabled: uploading,
            style: { display: "flex", alignItems: "center", gap: 6 },
            children: [
              /* @__PURE__ */ jsx("span", { children: "📤" }),
              /* @__PURE__ */ jsx("span", { children: uploading ? "Uploading…" : "+ Upload Images" })
            ]
          }
        ),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "file",
            ref: fileInputRef,
            style: { display: "none" },
            multiple: true,
            accept: "image/*",
            onChange: (e) => handleUploadFiles(e.target.files)
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs(
      "div",
      {
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
        onDrop: handleDrop,
        onClick: () => {
          var _a;
          return (_a = fileInputRef.current) == null ? void 0 : _a.click();
        },
        style: {
          border: `2px dashed ${isDragOver ? "#60a5fa" : "rgba(255,255,255,0.14)"}`,
          background: isDragOver ? "rgba(59,130,246,0.08)" : "rgba(18,18,26,0.6)",
          borderRadius: 14,
          padding: "22px 20px",
          textAlign: "center",
          cursor: "pointer",
          marginBottom: 24,
          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
        },
        children: [
          /* @__PURE__ */ jsx("div", { style: { fontSize: "1.8rem", marginBottom: 6 }, children: uploading ? "⏳" : isDragOver ? "📥" : "☁️" }),
          /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, fontSize: "0.92rem", color: isDragOver ? "#60a5fa" : "#fff", marginBottom: 4 }, children: uploadProgress || (isDragOver ? "Drop images here to upload directly to Cloudinary" : "Drag & drop images here to upload to Cloudinary (or click to browse)") }),
          /* @__PURE__ */ jsx("div", { style: { color: "#8a8a9e", fontSize: "0.75rem" }, children: "Uploaded images will be immediately available in this library with direct public Cloudinary URLs." })
        ]
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "ap-sticky-bar", style: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 20 }, children: [
      /* @__PURE__ */ jsxs("div", { style: { position: "relative", minWidth: 240, flex: "1 1 200px" }, children: [
        /* @__PURE__ */ jsx("span", { style: { position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: "0.8rem", color: "#6a6a7c", pointerEvents: "none" }, children: "🔍" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            className: "form-input",
            style: {
              paddingLeft: 32,
              paddingRight: 28,
              fontSize: "0.82rem",
              background: "#14141d",
              borderColor: "rgba(255,255,255,0.1)",
              borderRadius: 8,
              height: 36
            },
            placeholder: "Search by filename, public ID, or URL…",
            value: search,
            onChange: (e) => {
              setSearch(e.target.value);
              setPage(1);
            }
          }
        ),
        search && /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => {
              setSearch("");
              setPage(1);
            },
            style: {
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: "#888",
              cursor: "pointer",
              fontSize: "0.75rem"
            },
            children: "✕"
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }, children: SOURCES.map((s) => {
        const count = s.key === "all" ? sourceStats.all || total : sourceStats[s.key] || 0;
        const active = sourceFilter === s.key;
        return /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => {
              setSourceFilter(s.key);
              setPage(1);
            },
            style: {
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
            },
            children: [
              /* @__PURE__ */ jsx("span", { children: s.icon }),
              /* @__PURE__ */ jsx("span", { children: s.label }),
              count > 0 && /* @__PURE__ */ jsx("span", { style: {
                fontSize: "0.65rem",
                padding: "1px 6px",
                borderRadius: 10,
                background: active ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.08)",
                color: active ? "#fff" : "#aaa"
              }, children: count })
            ]
          },
          s.key
        );
      }) }),
      /* @__PURE__ */ jsx("div", { style: { flex: 1 } }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => {
              if (selectMode) clearSelection();
              else setSelectMode(true);
            },
            style: {
              padding: "6px 12px",
              borderRadius: 8,
              border: `1px solid ${selectMode ? "#60a5fa" : "rgba(255,255,255,0.1)"}`,
              background: selectMode ? "rgba(59,130,246,0.15)" : "#14141d",
              color: selectMode ? "#60a5fa" : "#8a8a9e",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: "pointer"
            },
            children: selectMode ? "Cancel Select" : "☑️ Select"
          }
        ),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", background: "#14141d", borderRadius: 8, padding: 2, border: "1px solid rgba(255,255,255,0.08)" }, children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setViewMode("grid"),
              style: {
                padding: "5px 10px",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                background: viewMode === "grid" ? "var(--gold)" : "transparent",
                color: viewMode === "grid" ? "#000" : "#8a8a9e",
                fontWeight: 800,
                fontSize: "0.75rem"
              },
              children: "▦ Grid"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: () => setViewMode("list"),
              style: {
                padding: "5px 10px",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                background: viewMode === "list" ? "var(--gold)" : "transparent",
                color: viewMode === "list" ? "#000" : "#8a8a9e",
                fontWeight: 800,
                fontSize: "0.75rem"
              },
              children: "≡ List"
            }
          )
        ] })
      ] })
    ] }),
    selectMode && /* @__PURE__ */ jsxs("div", { style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      background: "rgba(59,130,246,0.12)",
      border: "1px solid rgba(59,130,246,0.35)",
      borderRadius: 10,
      padding: "10px 16px",
      marginBottom: 20
    }, children: [
      /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.82rem", fontWeight: 700, color: "#60a5fa" }, children: [
        selected.size,
        " selected"
      ] }),
      /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", onClick: selectAllOnPage, style: { fontSize: "0.72rem" }, children: "Select All on Page" }),
      /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", onClick: clearSelection, style: { fontSize: "0.72rem", color: "#8a8a9e" }, children: "Clear" }),
      /* @__PURE__ */ jsx("div", { style: { flex: 1 } }),
      /* @__PURE__ */ jsx(
        "button",
        {
          className: "btn btn-outline btn-sm",
          onClick: handleBulkCopy,
          disabled: selected.size === 0,
          style: { fontSize: "0.75rem" },
          children: "📋 Copy All URLs"
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          className: "btn btn-sm",
          onClick: handleBulkDelete,
          disabled: selected.size === 0,
          style: { background: "#ef4444", color: "#fff", border: "none", fontSize: "0.75rem", fontWeight: 700 },
          children: "🗑️ Delete Selected"
        }
      )
    ] }),
    loading ? /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", padding: "80px 0", color: "#8a8a9e" }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontSize: "2rem", marginBottom: 12 }, children: "⏳" }),
      /* @__PURE__ */ jsx("div", { style: { fontWeight: 700 }, children: "Loading Cloudinary media…" })
    ] }) : mediaList.length === 0 ? /* @__PURE__ */ jsxs("div", { style: {
      textAlign: "center",
      padding: "60px 20px",
      background: "#12121a",
      border: "1px dashed rgba(255,255,255,0.1)",
      borderRadius: 14
    }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontSize: "3rem", marginBottom: 12 }, children: "☁️" }),
      /* @__PURE__ */ jsx("h3", { style: { fontSize: "1.15rem", fontWeight: 800, color: "#fff", marginBottom: 6 }, children: "No Cloudinary Uploads Found" }),
      /* @__PURE__ */ jsx("p", { style: { color: "#8a8a9e", fontSize: "0.85rem", maxWidth: 460, margin: "0 auto 20px" }, children: search || sourceFilter !== "all" ? "No images match your search or filter criteria. Try resetting filters." : "Click '+ Upload Images' or 'Refresh from Cloudinary' to fetch all your uploaded Cloudinary assets." }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, justifyContent: "center" }, children: [
        /* @__PURE__ */ jsx("button", { className: "btn btn-outline btn-sm", onClick: handleSyncCloudinary, children: "☁️ Refresh from Cloudinary" }),
        /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: () => {
          var _a;
          return (_a = fileInputRef.current) == null ? void 0 : _a.click();
        }, children: "+ Upload Image" })
      ] })
    ] }) : viewMode === "grid" ? (
      /* ── Grid Gallery View ── */
      /* @__PURE__ */ jsx("div", { style: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
        gap: 18
      }, children: mediaList.map((m) => {
        const isSel = selected.has(m._id);
        const isCopied = copiedId === m._id;
        const badge = sourceBadgeColor(m.source);
        return /* @__PURE__ */ jsxs(
          "div",
          {
            className: "ap-card-glow",
            style: {
              position: "relative",
              borderRadius: 12,
              overflow: "hidden",
              border: `2px solid ${isSel ? "#60a5fa" : "rgba(255,255,255,0.08)"}`,
              background: "#12121a",
              display: "flex",
              flexDirection: "column",
              cursor: selectMode ? "pointer" : "default"
            },
            onClick: () => selectMode && toggleSelect(m._id),
            children: [
              selectMode && /* @__PURE__ */ jsx("div", { style: { position: "absolute", top: 8, left: 8, zIndex: 20 }, children: /* @__PURE__ */ jsx("div", { style: {
                width: 22,
                height: 22,
                borderRadius: 6,
                border: `2px solid ${isSel ? "#60a5fa" : "rgba(255,255,255,0.8)"}`,
                background: isSel ? "#60a5fa" : "rgba(0,0,0,0.65)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }, children: isSel && /* @__PURE__ */ jsx("span", { style: { color: "#fff", fontSize: "0.75rem", fontWeight: 900 }, children: "✓" }) }) }),
              /* @__PURE__ */ jsxs(
                "div",
                {
                  style: {
                    position: "relative",
                    aspectRatio: "16/10",
                    background: "#0c0c12",
                    overflow: "hidden",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  },
                  onClick: (e) => {
                    if (selectMode) return;
                    e.stopPropagation();
                    setPreviewMedia(m);
                  },
                  children: [
                    /* @__PURE__ */ jsx(
                      "img",
                      {
                        src: m.url,
                        alt: m.title || m.filename,
                        style: { width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.25s" },
                        onError: (e) => {
                          e.target.style.display = "none";
                          if (e.target.nextSibling) e.target.nextSibling.style.display = "flex";
                        },
                        onMouseEnter: (e) => e.target.style.transform = "scale(1.05)",
                        onMouseLeave: (e) => e.target.style.transform = "none"
                      }
                    ),
                    /* @__PURE__ */ jsx("div", { style: { display: "none", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", color: "#666" }, children: "🖼️ Image Error" }),
                    /* @__PURE__ */ jsxs("div", { style: {
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
                    }, children: [
                      badge.icon,
                      " ",
                      m.source || "Cloudinary"
                    ] }),
                    /* @__PURE__ */ jsx("div", { style: {
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
                    }, children: m.width && m.height ? `${m.width}×${m.height}` : formatBytes(m.size) })
                  ]
                }
              ),
              /* @__PURE__ */ jsxs("div", { style: { padding: "10px 12px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }, children: [
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx(
                    "div",
                    {
                      title: m.title || m.filename,
                      style: {
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        color: "#fff",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        marginBottom: 4
                      },
                      children: m.title || m.filename
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "div",
                    {
                      style: {
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
                      },
                      title: m.url,
                      children: m.url
                    }
                  )
                ] }),
                !selectMode && /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 8 }, children: [
                  /* @__PURE__ */ jsxs(
                    "button",
                    {
                      onClick: () => handleCopyUrl(m.url, m._id),
                      style: {
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
                      },
                      children: [
                        /* @__PURE__ */ jsx("span", { children: isCopied ? "✓" : "📋" }),
                        /* @__PURE__ */ jsx("span", { children: isCopied ? "Copied!" : "Copy URL" })
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      onClick: () => setPreviewMedia(m),
                      title: "View Full Details",
                      style: {
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "#181824",
                        color: "#e2e2ea",
                        fontSize: "0.72rem",
                        cursor: "pointer"
                      },
                      children: "🔍"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      onClick: () => handleDeleteMedia(m),
                      title: "Delete Image",
                      style: {
                        padding: "6px 10px",
                        borderRadius: 6,
                        border: "none",
                        background: "rgba(239,68,68,0.1)",
                        color: "#ef4444",
                        fontSize: "0.72rem",
                        cursor: "pointer",
                        transition: "background 0.15s"
                      },
                      onMouseEnter: (e) => e.currentTarget.style.background = "rgba(239,68,68,0.25)",
                      onMouseLeave: (e) => e.currentTarget.style.background = "rgba(239,68,68,0.1)",
                      children: "✕"
                    }
                  )
                ] })
              ] })
            ]
          },
          m._id
        );
      }) })
    ) : (
      /* ── Table List View ── */
      /* @__PURE__ */ jsx("div", { style: { background: "#12121a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, overflow: "hidden" }, children: /* @__PURE__ */ jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }, children: [
        /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { style: { background: "#181824", color: "#8a8a9e", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.08)" }, children: [
          /* @__PURE__ */ jsx("th", { style: { padding: "12px 16px", width: 60 }, children: "Preview" }),
          /* @__PURE__ */ jsx("th", { style: { padding: "12px 16px" }, children: "Title / Filename" }),
          /* @__PURE__ */ jsx("th", { style: { padding: "12px 16px" }, children: "Source" }),
          /* @__PURE__ */ jsx("th", { style: { padding: "12px 16px" }, children: "Direct URL" }),
          /* @__PURE__ */ jsx("th", { style: { padding: "12px 16px" }, children: "Date" }),
          /* @__PURE__ */ jsx("th", { style: { padding: "12px 16px", textAlign: "right" }, children: "Actions" })
        ] }) }),
        /* @__PURE__ */ jsx("tbody", { children: mediaList.map((m) => {
          const isSel = selected.has(m._id);
          const isCopied = copiedId === m._id;
          const badge = sourceBadgeColor(m.source);
          return /* @__PURE__ */ jsxs(
            "tr",
            {
              style: {
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                background: isSel ? "rgba(59,130,246,0.06)" : "transparent"
              },
              children: [
                /* @__PURE__ */ jsx("td", { style: { padding: "10px 16px" }, children: /* @__PURE__ */ jsx(
                  "div",
                  {
                    onClick: () => setPreviewMedia(m),
                    style: { width: 44, height: 44, borderRadius: 6, overflow: "hidden", background: "#0c0c12", cursor: "pointer" },
                    children: /* @__PURE__ */ jsx("img", { src: m.url, alt: m.filename, style: { width: "100%", height: "100%", objectFit: "cover" }, onError: (e) => e.target.style.display = "none" })
                  }
                ) }),
                /* @__PURE__ */ jsxs("td", { style: { padding: "10px 16px", fontWeight: 700, color: "#fff" }, children: [
                  /* @__PURE__ */ jsx("div", { children: m.title || m.filename }),
                  /* @__PURE__ */ jsx("div", { style: { fontSize: "0.7rem", color: "#6a6a7c", marginTop: 2 }, children: formatBytes(m.size) })
                ] }),
                /* @__PURE__ */ jsx("td", { style: { padding: "10px 16px" }, children: /* @__PURE__ */ jsxs("span", { style: {
                  background: badge.bg,
                  color: badge.text,
                  border: `1px solid ${badge.border}`,
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: 10,
                  textTransform: "uppercase"
                }, children: [
                  badge.icon,
                  " ",
                  m.source || "Cloudinary"
                ] }) }),
                /* @__PURE__ */ jsx("td", { style: { padding: "10px 16px", maxWidth: 280 }, children: /* @__PURE__ */ jsx("div", { style: {
                  fontFamily: "monospace",
                  fontSize: "0.72rem",
                  color: "#ffd700",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }, children: m.url }) }),
                /* @__PURE__ */ jsx("td", { style: { padding: "10px 16px", color: "#8a8a9e", fontSize: "0.75rem" }, children: formatDate(m.createdAt) }),
                /* @__PURE__ */ jsx("td", { style: { padding: "10px 16px", textAlign: "right" }, children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, justifyContent: "flex-end" }, children: [
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      className: "btn btn-ghost btn-sm",
                      onClick: () => handleCopyUrl(m.url, m._id),
                      style: {
                        color: isCopied ? "#10b981" : "#ffd700",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "3px 8px"
                      },
                      children: isCopied ? "✓ Copied" : "📋 Copy"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      className: "btn btn-ghost btn-sm",
                      onClick: () => setPreviewMedia(m),
                      style: { fontSize: "0.72rem", padding: "3px 8px" },
                      children: "View"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      className: "btn btn-ghost btn-sm",
                      onClick: () => handleDeleteMedia(m),
                      style: { color: "#ef4444", fontSize: "0.72rem", padding: "3px 8px" },
                      children: "✕"
                    }
                  )
                ] }) })
              ]
            },
            m._id
          );
        }) })
      ] }) })
    ),
    totalPages > 1 && /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 32 }, children: [
      /* @__PURE__ */ jsx(
        "button",
        {
          className: "btn btn-outline btn-sm",
          onClick: () => setPage((p) => Math.max(1, p - 1)),
          disabled: page === 1,
          children: "← Previous"
        }
      ),
      /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.82rem", color: "#8a8a9e", fontWeight: 700 }, children: [
        "Page ",
        page,
        " of ",
        totalPages
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          className: "btn btn-outline btn-sm",
          onClick: () => setPage((p) => Math.min(totalPages, p + 1)),
          disabled: page === totalPages,
          children: "Next →"
        }
      )
    ] }),
    previewMedia && /* @__PURE__ */ jsx(
      "div",
      {
        className: "modal-overlay",
        onClick: () => setPreviewMedia(null),
        style: {
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.88)",
          zIndex: 1200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20
        },
        children: /* @__PURE__ */ jsxs(
          "div",
          {
            className: "modal",
            onClick: (e) => e.stopPropagation(),
            style: {
              maxWidth: 720,
              width: "100%",
              background: "#111118",
              border: "1px solid rgba(59,130,246,0.4)",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.9)"
            },
            children: [
              /* @__PURE__ */ jsxs("div", { style: {
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.08)"
              }, children: [
                /* @__PURE__ */ jsx("span", { style: { fontWeight: 800, color: "#60a5fa", fontSize: "0.95rem" }, children: "🔍 Cloudinary Image Preview & Direct URL" }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => setPreviewMedia(null),
                    style: { background: "none", border: "none", color: "#fff", fontSize: "1.2rem", cursor: "pointer" },
                    children: "×"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { style: { padding: 20 }, children: [
                /* @__PURE__ */ jsx("div", { style: {
                  background: "#08080c",
                  borderRadius: 10,
                  padding: 12,
                  textAlign: "center",
                  maxHeight: 360,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 18,
                  border: "1px solid rgba(255,255,255,0.06)"
                }, children: /* @__PURE__ */ jsx(
                  "img",
                  {
                    src: previewMedia.url,
                    alt: previewMedia.title || previewMedia.filename,
                    style: { maxWidth: "100%", maxHeight: 330, objectFit: "contain", borderRadius: 6 }
                  }
                ) }),
                /* @__PURE__ */ jsxs("div", { style: { marginBottom: 16 }, children: [
                  /* @__PURE__ */ jsx("label", { className: "form-label", style: { fontSize: "0.75rem", marginBottom: 6 }, children: "Direct Public Cloudinary URL (Ready for paste in Movie / News / Blog forms):" }),
                  /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8 }, children: [
                    /* @__PURE__ */ jsx(
                      "input",
                      {
                        className: "form-input",
                        readOnly: true,
                        value: previewMedia.url,
                        onClick: (e) => e.target.select(),
                        style: { flex: 1, fontFamily: "monospace", fontSize: "0.8rem", color: "#ffd700" }
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        className: "btn btn-gold btn-sm",
                        onClick: () => handleCopyUrl(previewMedia.url, previewMedia._id),
                        style: { whiteSpace: "nowrap" },
                        children: copiedId === previewMedia._id ? "✓ Copied!" : "📋 Copy URL"
                      }
                    )
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { style: {
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                  background: "#161622",
                  padding: "12px 16px",
                  borderRadius: 8,
                  fontSize: "0.75rem",
                  border: "1px solid rgba(255,255,255,0.06)",
                  marginBottom: 16
                }, children: [
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("span", { style: { color: "#8a8a9e" }, children: "Source: " }),
                    /* @__PURE__ */ jsx("strong", { style: { color: "#fff" }, children: previewMedia.source || "Cloudinary" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("span", { style: { color: "#8a8a9e" }, children: "Dimensions: " }),
                    /* @__PURE__ */ jsx("strong", { style: { color: "#fff" }, children: previewMedia.width && previewMedia.height ? `${previewMedia.width} × ${previewMedia.height}` : "—" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("span", { style: { color: "#8a8a9e" }, children: "File Size: " }),
                    /* @__PURE__ */ jsx("strong", { style: { color: "#fff" }, children: formatBytes(previewMedia.size) })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { children: [
                    /* @__PURE__ */ jsx("span", { style: { color: "#8a8a9e" }, children: "Uploaded: " }),
                    /* @__PURE__ */ jsx("strong", { style: { color: "#fff" }, children: formatDate(previewMedia.createdAt) })
                  ] }),
                  previewMedia.publicId && /* @__PURE__ */ jsxs("div", { style: { gridColumn: "span 2" }, children: [
                    /* @__PURE__ */ jsx("span", { style: { color: "#8a8a9e" }, children: "Public ID: " }),
                    /* @__PURE__ */ jsx("strong", { style: { color: "#60a5fa", fontFamily: "monospace" }, children: previewMedia.publicId })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { style: { gridColumn: previewMedia.publicId ? "span 3" : "span 2" }, children: [
                    /* @__PURE__ */ jsx("span", { style: { color: "#8a8a9e" }, children: "Filename: " }),
                    /* @__PURE__ */ jsx("strong", { style: { color: "#fff" }, children: previewMedia.filename || "—" })
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
                  /* @__PURE__ */ jsx(
                    "a",
                    {
                      href: previewMedia.url,
                      target: "_blank",
                      rel: "noreferrer",
                      className: "btn btn-outline btn-sm",
                      style: { fontSize: "0.75rem" },
                      children: "Open in New Tab ↗"
                    }
                  ),
                  /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8 }, children: [
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        className: "btn btn-ghost btn-sm",
                        onClick: () => handleDeleteMedia(previewMedia),
                        style: { color: "#ef4444" },
                        children: "🗑️ Delete Image"
                      }
                    ),
                    /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: () => setPreviewMedia(null), children: "Done" })
                  ] })
                ] })
              ] })
            ]
          }
        )
      }
    ),
    confirmDelete && /* @__PURE__ */ jsx("div", { style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.8)",
      zIndex: 1300,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20
    }, children: /* @__PURE__ */ jsxs("div", { style: {
      background: "#181824",
      border: "1px solid rgba(255,255,255,0.12)",
      borderRadius: 12,
      padding: 24,
      width: "100%",
      maxWidth: 400,
      textAlign: "center"
    }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontSize: "2rem", marginBottom: 10 }, children: "⚠️" }),
      /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, fontSize: "1.05rem", color: "#fff", marginBottom: 8 }, children: "Confirm Delete" }),
      /* @__PURE__ */ jsx("p", { style: { color: "#9292a4", fontSize: "0.85rem", marginBottom: 20, lineHeight: 1.5 }, children: confirmDelete.message }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, justifyContent: "center" }, children: [
        /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => setConfirmDelete(null), children: "Cancel" }),
        /* @__PURE__ */ jsx(
          "button",
          {
            className: "btn btn-sm",
            onClick: confirmDelete.onConfirm,
            style: { background: "#ef4444", color: "#fff", border: "none", fontWeight: 700 },
            children: "Yes, Delete"
          }
        )
      ] })
    ] }) })
  ] });
}
export {
  MediaPanel as default
};
