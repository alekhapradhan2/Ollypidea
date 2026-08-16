import React, { useState, useEffect, useCallback } from "react";
import { getAdminToken } from "../api/api";

const _API_ROOT = (import.meta.env.VITE_API_URL ?? "http://localhost:4000").replace(/\/$/, "");
const API_BASE = _API_ROOT.endsWith("/api") ? _API_ROOT : _API_ROOT + "/api";

function formatDateTime(iso) {
  if (!iso) return "Never";
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "N/A";
  }
}

export default function BlogSuggestionsPanel({ onNavigateToBlog }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [cronStatus, setCronStatus] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Multiselect & Bulk Delete State
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Instagram Ingestion Box State
  const [showIgBox, setShowIgBox] = useState(false);
  const [igCaption, setIgCaption] = useState("");
  const [igPostUrl, setIgPostUrl] = useState("");
  const [igHandle, setIgHandle] = useState("ollypedia_official");
  const [igIngesting, setIgIngesting] = useState(false);

  // Prompt Modal & AI Article Generation State
  const [promptModal, setPromptModal] = useState(null);
  const [articleGenerating, setArticleGenerating] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("pending");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceTypeFilter, setSourceTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Card Expansion State
  const [expandedCardId, setExpandedCardId] = useState(null);

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const token = getAdminToken();
  const headers = {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };

  // Fetch Cron Status & Stats
  const fetchCronStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/blog-suggestions/cron-status`, { headers });
      if (res.ok) {
        const data = await res.json();
        setCronStatus(data);
      }
    } catch (e) {
      console.warn("Failed to load cron status", e);
    }
  }, []);

  // Fetch Blog Suggestions
  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      if (sourceTypeFilter !== "all") params.append("sourceType", sourceTypeFilter);
      if (searchQuery) params.append("search", searchQuery);

      const res = await fetch(`${API_BASE}/blog-suggestions?${params.toString()}`, { headers });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to fetch blog suggestions");
      }
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, sourceTypeFilter, searchQuery]);

  useEffect(() => {
    fetchSuggestions();
    fetchCronStatus();
  }, [fetchSuggestions, fetchCronStatus]);

  // Multiselect Helpers
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    const all = suggestions.map((s) => s._id);
    setSelectedIds(new Set(all));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
    setSelectMode(false);
  };

  // Bulk Delete Action
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} selected blog suggestions?`)) return;

    try {
      const res = await fetch(`${API_BASE}/blog-suggestions/bulk-delete`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to bulk delete");

      showToast(`🗑 Deleted ${data.count} blog suggestions!`, "success");
      setSelectedIds(new Set());
      setSelectMode(false);
      fetchSuggestions();
      fetchCronStatus();
    } catch (e) {
      showToast(`Error: ${e.message}`, "error");
    }
  };

  // Run Manual Generator (Produces 2-3 Top Odia Suggestions)
  const handleGenerateNow = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`${API_BASE}/blog-suggestions/generate`, {
        method: "POST",
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate suggestions");

      showToast(`✨ Generated ${data.count} accurate Odia blog suggestions!`, "success");
      fetchSuggestions();
      fetchCronStatus();
    } catch (e) {
      showToast(`Error: ${e.message}`, "error");
    } finally {
      setGenerating(false);
    }
  };

  // Handle Instagram Post Ingestion
  const handleIngestInstagramPost = async () => {
    if (!igCaption && !igPostUrl) {
      showToast("Please enter Instagram caption text or post URL", "error");
      return;
    }

    setIgIngesting(true);
    try {
      const res = await fetch(`${API_BASE}/blog-suggestions/instagram-post`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          caption: igCaption,
          postUrl: igPostUrl,
          handle: igHandle,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to ingest Instagram post");

      showToast(`📸 Generated ${data.count} blog idea from Instagram post!`, "success");
      setIgCaption("");
      setIgPostUrl("");
      setShowIgBox(false);
      fetchSuggestions();
      fetchCronStatus();
    } catch (e) {
      showToast(`Error: ${e.message}`, "error");
    } finally {
      setIgIngesting(false);
    }
  };

  // Update Status (Approve / Dismiss)
  const handleStatusUpdate = async (id, newStatus) => {
    try {
      const res = await fetch(`${API_BASE}/blog-suggestions/${id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");

      showToast(`Suggestion marked as ${newStatus}`, "success");
      fetchSuggestions();
      fetchCronStatus();
    } catch (e) {
      showToast(`Error: ${e.message}`, "error");
    }
  };

  // Convert Suggestion to Blog Draft
  const handleConvertToDraft = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/blog-suggestions/${id}/convert`, {
        method: "POST",
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to convert suggestion");

      showToast(`🚀 Successfully converted to Blog Draft!`, "success");
      fetchSuggestions();
      fetchCronStatus();
    } catch (e) {
      showToast(`Error: ${e.message}`, "error");
    }
  };

  // Delete Single Suggestion
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this blog suggestion?")) return;
    try {
      const res = await fetch(`${API_BASE}/blog-suggestions/${id}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) throw new Error("Failed to delete suggestion");

      showToast("Suggestion deleted", "info");
      fetchSuggestions();
      fetchCronStatus();
    } catch (e) {
      showToast(`Error: ${e.message}`, "error");
    }
  };

  const categoriesList = [
    "Movie Review",
    "Actor Spotlight",
    "Box Office Analysis",
    "Upcoming Release",
    "Industry News",
    "Trivia & Facts",
    "OTT Update",
  ];

  const allSelected = suggestions.length > 0 && suggestions.every((s) => selectedIds.has(s._id));

  return (
    <div style={{ padding: "24px", color: "#e2e8f0", fontFamily: "Inter, sans-serif" }}>
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9999,
            padding: "14px 20px",
            borderRadius: "10px",
            background: toast.type === "error" ? "#7f1d1d" : toast.type === "success" ? "#064e3b" : "#1e293b",
            color: "#fff",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            border: `1px solid ${toast.type === "error" ? "#f87171" : toast.type === "success" ? "#34d399" : "#64748b"}`,
            fontWeight: 500,
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(30,41,59,0.8) 0%, rgba(15,23,42,0.9) 100%)",
          borderRadius: "16px",
          padding: "24px",
          marginBottom: "24px",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
          backdropFilter: "blur(8px)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 700, margin: 0, color: "#f8fafc" }}>
              💡 Daily Odia Blog Suggestion Engine
            </h1>
            <span
              style={{
                background: cronStatus?.active ? "rgba(16, 185, 129, 0.15)" : "rgba(148, 163, 184, 0.15)",
                color: cronStatus?.active ? "#10b981" : "#94a3b8",
                border: cronStatus?.active ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid rgba(148, 163, 184, 0.3)",
                fontSize: "0.75rem",
                padding: "3px 10px",
                borderRadius: "20px",
                fontWeight: 600,
              }}
            >
              {cronStatus?.active ? "● Daily Cron Active (08:00 AM IST)" : "● Manual / On-Demand Mode"}
            </span>
          </div>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: "6px 0 0 0" }}>
            Generates 2–3 accurate, strictly Ollywood & Odia cinema blog ideas daily with ready-to-use AI prompts and Instagram post ingestion.
          </p>
          {cronStatus && (
            <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "8px" }}>
              Last Run: <strong style={{ color: "#cbd5e1" }}>{formatDateTime(cronStatus.lastRunAt)}</strong> | Last Status:{" "}
              <span style={{ color: cronStatus.lastRunStatus === "success" ? "#34d399" : "#f87171" }}>
                {cronStatus.lastRunStatus.toUpperCase()} ({cronStatus.lastRunCount} ideas)
              </span>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={() => setShowIgBox(!showIgBox)}
            style={{
              background: "linear-gradient(135deg, #e1306c 0%, #c13584 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              padding: "12px 20px",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(225, 48, 108, 0.4)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            📸 {showIgBox ? "Close IG Box" : "Ingest Instagram Post"}
          </button>

          <button
            onClick={handleGenerateNow}
            disabled={generating}
            style={{
              background: generating ? "#475569" : "linear-gradient(135deg, #d97706 0%, #b45309 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "10px",
              padding: "12px 24px",
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: generating ? "not-allowed" : "pointer",
              boxShadow: generating ? "none" : "0 4px 14px rgba(217, 119, 6, 0.4)",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {generating ? "⏳ Generating 2-3 Ideas..." : "⚡ Run Generator Now (2-3 Top Ideas)"}
          </button>
        </div>
      </div>

      {/* 📸 Instagram Post Ingestion Drawer / Box */}
      {showIgBox && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(225, 48, 108, 0.12) 0%, rgba(15,23,42,0.95) 100%)",
            border: "1px solid rgba(225, 48, 108, 0.3)",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "24px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <h3 style={{ margin: 0, color: "#f472b6", fontSize: "1.1rem", fontWeight: 700 }}>
              📸 Ingest Real-Time Instagram Post / Reel / Teaser Drop
            </h3>
            <span style={{ fontSize: "0.75rem", background: "rgba(244, 114, 182, 0.2)", color: "#f472b6", padding: "2px 8px", borderRadius: "12px" }}>
              Direct Feed Grounding
            </span>
          </div>
          <p style={{ color: "#94a3b8", fontSize: "0.85rem", marginTop: 0, marginBottom: "16px" }}>
            Paste any Instagram post URL or caption text from @ollypedia, @aaonxt, or Odia stars to create grounded blog ideas directly from the post!
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
            <div>
              <label style={{ display: "block", color: "#cbd5e1", fontSize: "0.8rem", marginBottom: "4px" }}>
                Instagram Handle Name:
              </label>
              <input
                type="text"
                value={igHandle}
                onChange={(e) => setIgHandle(e.target.value)}
                placeholder="e.g. ollypedia_official, aaonxt"
                style={{
                  width: "100%",
                  background: "#1e293b",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  fontSize: "0.85rem",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", color: "#cbd5e1", fontSize: "0.8rem", marginBottom: "4px" }}>
                Instagram Post / Reel URL (Optional):
              </label>
              <input
                type="text"
                value={igPostUrl}
                onChange={(e) => setIgPostUrl(e.target.value)}
                placeholder="https://www.instagram.com/p/..."
                style={{
                  width: "100%",
                  background: "#1e293b",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  fontSize: "0.85rem",
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", color: "#cbd5e1", fontSize: "0.8rem", marginBottom: "4px" }}>
              Instagram Post Caption Text / Announcement:
            </label>
            <textarea
              rows={3}
              value={igCaption}
              onChange={(e) => setIgCaption(e.target.value)}
              placeholder="Paste Instagram caption text here... (e.g. First look poster of upcoming Odia movie 'XYZ' released today! Starring @actor...)"
              style={{
                width: "100%",
                background: "#1e293b",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                padding: "10px 12px",
                fontSize: "0.85rem",
                resize: "none",
              }}
            />
          </div>

          <button
            onClick={handleIngestInstagramPost}
            disabled={igIngesting}
            style={{
              background: igIngesting ? "#475569" : "linear-gradient(135deg, #e1306c 0%, #c13584 100%)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "10px 20px",
              fontSize: "0.88rem",
              fontWeight: 700,
              cursor: igIngesting ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(225, 48, 108, 0.4)",
            }}
          >
            {igIngesting ? "⏳ Parsing Instagram Post..." : "⚡ Generate Blog Ideas from Instagram Post"}
          </button>
        </div>
      )}

      {/* Metrics Overview Cards */}
      {cronStatus?.stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              background: "rgba(30, 41, 59, 0.6)",
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div style={{ color: "#94a3b8", fontSize: "0.8rem", fontWeight: 600 }}>TOTAL IDEAS</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#f8fafc", marginTop: "4px" }}>
              {cronStatus.stats.total}
            </div>
          </div>
          <div
            style={{
              background: "rgba(245, 158, 11, 0.1)",
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid rgba(245, 158, 11, 0.2)",
            }}
          >
            <div style={{ color: "#f59e0b", fontSize: "0.8rem", fontWeight: 600 }}>PENDING REVIEW</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#fbbf24", marginTop: "4px" }}>
              {cronStatus.stats.pending}
            </div>
          </div>
          <div
            style={{
              background: "rgba(59, 130, 246, 0.1)",
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid rgba(59, 130, 246, 0.2)",
            }}
          >
            <div style={{ color: "#60a5fa", fontSize: "0.8rem", fontWeight: 600 }}>APPROVED</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#93c5fd", marginTop: "4px" }}>
              {cronStatus.stats.approved}
            </div>
          </div>
          <div
            style={{
              background: "rgba(16, 185, 129, 0.1)",
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid rgba(16, 185, 129, 0.2)",
            }}
          >
            <div style={{ color: "#10b981", fontSize: "0.8rem", fontWeight: 600 }}>CONVERTED TO DRAFTS</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#34d399", marginTop: "4px" }}>
              {cronStatus.stats.converted}
            </div>
          </div>
        </div>
      )}

      {/* Filter & Selection Toolbar */}
      <div
        style={{
          background: "rgba(15, 23, 42, 0.7)",
          padding: "16px",
          borderRadius: "12px",
          border: "1px solid rgba(255,255,255,0.06)",
          marginBottom: "16px",
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Status Filter Tabs */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {["pending", "approved", "converted", "dismissed", "all"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                background: statusFilter === st ? "#3b82f6" : "rgba(30,41,59,0.8)",
                color: statusFilter === st ? "#ffffff" : "#94a3b8",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
                transition: "all 0.15s ease",
              }}
            >
              {st}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{
              background: "#1e293b",
              color: "#e2e8f0",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              padding: "8px 12px",
              fontSize: "0.85rem",
            }}
          >
            <option value="all">All Categories</option>
            {categoriesList.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Search Box */}
          <input
            type="text"
            placeholder="🔍 Search ideas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: "#1e293b",
              color: "#e2e8f0",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              padding: "8px 12px",
              fontSize: "0.85rem",
              minWidth: "180px",
            }}
          />

          {/* Multiselect Toggle Button */}
          <button
            onClick={() => {
              setSelectMode(!selectMode);
              if (selectMode) setSelectedIds(new Set());
            }}
            style={{
              background: selectMode ? "rgba(245, 158, 11, 0.2)" : "rgba(30, 41, 59, 0.8)",
              color: selectMode ? "#fbbf24" : "#94a3b8",
              border: `1px solid ${selectMode ? "rgba(245, 158, 11, 0.4)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {selectMode ? "✓ Select Mode Active" : "☐ Select Multiple"}
          </button>
        </div>
      </div>

      {/* Multiselect Action Bar */}
      {selectMode && (
        <div
          style={{
            background: "rgba(245, 158, 11, 0.1)",
            border: "1px solid rgba(245, 158, 11, 0.3)",
            borderRadius: "10px",
            padding: "12px 18px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => (allSelected ? setSelectedIds(new Set()) : handleSelectAll())}
              style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#f59e0b" }}
            />
            <span style={{ color: "#fbbf24", fontWeight: 600, fontSize: "0.9rem" }}>
              {selectedIds.size > 0
                ? `Selected ${selectedIds.size} of ${suggestions.length} items`
                : `Select all ${suggestions.length} items`}
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            {selectedIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                style={{
                  background: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 10px rgba(220, 38, 38, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                🗑 Delete {selectedIds.size} Selected
              </button>
            )}

            <button
              onClick={handleClearSelection}
              style={{
                background: "transparent",
                color: "#94a3b8",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                padding: "8px 12px",
                fontSize: "0.82rem",
                cursor: "pointer",
              }}
            >
              Cancel / Clear
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⏳</div>
          Loading Odia film blog suggestions...
        </div>
      ) : error ? (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            color: "#f87171",
            padding: "16px",
            borderRadius: "10px",
            border: "1px solid rgba(239, 68, 68, 0.2)",
          }}
        >
          Failed to load suggestions: {error}
        </div>
      ) : suggestions.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "rgba(30, 41, 59, 0.3)",
            borderRadius: "16px",
            border: "1px dashed rgba(255,255,255,0.1)",
          }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🎬</div>
          <h3 style={{ color: "#f8fafc", margin: "0 0 8px 0" }}>No Suggestions Found</h3>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: 0 }}>
            No blog suggestions match your current criteria. Click "Run Generator Now" or paste an Instagram post URL above!
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
          {suggestions.map((item) => {
            const isExpanded = expandedCardId === item._id;
            const isSelected = selectedIds.has(item._id);

            return (
              <div
                key={item._id}
                onClick={() => selectMode && toggleSelect(item._id)}
                style={{
                  background: isSelected
                    ? "linear-gradient(145deg, rgba(245, 158, 11, 0.12) 0%, rgba(15,23,42,0.95) 100%)"
                    : "linear-gradient(145deg, rgba(30,41,59,0.7) 0%, rgba(15,23,42,0.85) 100%)",
                  borderRadius: "14px",
                  border: `2px solid ${isSelected ? "#f59e0b" : "rgba(255,255,255,0.08)"}`,
                  padding: "20px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  transition: "all 0.2s ease",
                  cursor: selectMode ? "pointer" : "default",
                }}
              >
                {/* Card Header Row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    {/* Multiselect Checkbox */}
                    {selectMode && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item._id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: "20px",
                          height: "20px",
                          marginTop: "4px",
                          cursor: "pointer",
                          accentColor: "#f59e0b",
                        }}
                      />
                    )}

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                        {item.sourceType === "instagram_post" ? (
                          <span
                            style={{
                              background: "linear-gradient(135deg, #e1306c 0%, #c13584 100%)",
                              color: "#fff",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              padding: "2px 10px",
                              borderRadius: "12px",
                              boxShadow: "0 2px 8px rgba(225, 48, 108, 0.4)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            📸 INSTAGRAM DROP (@{item.groundingData?.instagramHandle || "ollypedia"})
                          </span>
                        ) : (
                          item.isFresh24h && (
                            <span
                              style={{
                                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                                color: "#fff",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                padding: "2px 10px",
                                borderRadius: "12px",
                                boxShadow: "0 2px 8px rgba(239, 68, 68, 0.4)",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              ⚡ FRESH UPDATE (Last 24h)
                            </span>
                          )
                        )}

                        <span
                          style={{
                            background: "#d97706",
                            color: "#fff",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "6px",
                          }}
                        >
                          {item.category}
                        </span>
                        <span
                          style={{
                            background: "rgba(59, 130, 246, 0.15)",
                            color: "#60a5fa",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            padding: "2px 8px",
                            borderRadius: "6px",
                            border: "1px solid rgba(59, 130, 246, 0.3)",
                          }}
                        >
                          {item.sourceType.replace("_", " ").toUpperCase()}
                        </span>
                        <span
                          style={{
                            background: "rgba(16, 185, 129, 0.15)",
                            color: "#34d399",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: "6px",
                          }}
                        >
                          🎯 {item.accuracyScore}% Grounded
                        </span>
                      </div>

                      <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#f8fafc", margin: "0 0 6px 0", lineHeight: 1.4 }}>
                        {item.title}
                      </h2>

                      {item.titleOdia && item.titleOdia !== item.title && (
                        <div
                          style={{
                            background: "rgba(245, 158, 11, 0.12)",
                            color: "#fbbf24",
                            border: "1px solid rgba(245, 158, 11, 0.3)",
                            fontSize: "0.95rem",
                            fontWeight: 600,
                            padding: "6px 12px",
                            borderRadius: "8px",
                            marginBottom: "8px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                          }}
                        >
                          🏷️ <strong>ଓଡ଼ିଆ ଟାଇଟଲ୍:</strong> {item.titleOdia}
                        </div>
                      )}

                      {item.reason && (
                        <div style={{ fontSize: "0.85rem", color: "#fbbf24", fontStyle: "italic", marginBottom: "8px" }}>
                          📌 Why suggested: {item.reason}
                        </div>
                      )}
                      {item.groundingData?.externalNewsUrl && (
                        <div style={{ marginBottom: "8px" }}>
                          <a
                            href={item.groundingData.externalNewsUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              color: "#60a5fa",
                              fontSize: "0.8rem",
                              textDecoration: "none",
                              background: "rgba(59, 130, 246, 0.1)",
                              padding: "3px 10px",
                              borderRadius: "6px",
                              border: "1px solid rgba(59, 130, 246, 0.2)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            🔗 Read Source Post / Article ({item.groundingData.externalNewsSource || "Web / Instagram"}) ↗
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div>
                    <span
                      style={{
                        padding: "4px 12px",
                        borderRadius: "20px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        background:
                          item.status === "approved"
                            ? "rgba(59, 130, 246, 0.2)"
                            : item.status === "converted"
                            ? "rgba(16, 185, 129, 0.2)"
                            : item.status === "dismissed"
                            ? "rgba(239, 68, 68, 0.2)"
                            : "rgba(245, 158, 11, 0.2)",
                        color:
                          item.status === "approved"
                            ? "#60a5fa"
                            : item.status === "converted"
                            ? "#34d399"
                            : item.status === "dismissed"
                            ? "#f87171"
                            : "#fbbf24",
                        border: `1px solid ${
                          item.status === "approved"
                            ? "rgba(59, 130, 246, 0.4)"
                            : item.status === "converted"
                            ? "rgba(16, 185, 129, 0.4)"
                            : item.status === "dismissed"
                            ? "rgba(239, 68, 68, 0.4)"
                            : "rgba(245, 158, 11, 0.4)"
                        }`,
                      }}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>

                {/* Synopsis / Angle */}
                <p style={{ color: "#cbd5e1", fontSize: "0.9rem", lineHeight: 1.5, margin: "8px 0 12px 0" }}>
                  {item.synopsis}
                </p>

                {/* Keywords Chips */}
                {item.keywords?.length > 0 && (
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "14px" }}>
                    {item.keywords.map((kw, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          color: "#94a3b8",
                          fontSize: "0.75rem",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        #{kw}
                      </span>
                    ))}
                  </div>
                )}

                {/* Expandable Section: Outline & Key Points */}
                {isExpanded && (
                  <div
                    style={{
                      background: "rgba(15, 23, 42, 0.6)",
                      borderRadius: "10px",
                      padding: "16px",
                      marginTop: "12px",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                      <div>
                        <h4 style={{ color: "#60a5fa", margin: "0 0 8px 0", fontSize: "0.85rem", textTransform: "uppercase" }}>
                          📋 Proposed Outline
                        </h4>
                        <ol style={{ margin: 0, paddingLeft: "20px", color: "#cbd5e1", fontSize: "0.85rem", lineHeight: 1.6 }}>
                          {item.outline?.map((sec, idx) => (
                            <li key={idx}>{sec}</li>
                          ))}
                        </ol>
                      </div>

                      <div>
                        <h4 style={{ color: "#34d399", margin: "0 0 8px 0", fontSize: "0.85rem", textTransform: "uppercase" }}>
                          🔑 Key Facts & Talking Points
                        </h4>
                        <ul style={{ margin: 0, paddingLeft: "20px", color: "#cbd5e1", fontSize: "0.85rem", lineHeight: 1.6 }}>
                          {item.keyPoints?.map((pt, idx) => (
                            <li key={idx}>{pt}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {item.groundingData?.sourceInfo && (
                      <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: "0.78rem", color: "#64748b" }}>
                        🔍 Grounding Source: {item.groundingData.sourceInfo}
                      </div>
                    )}
                  </div>
                )}

                {/* Card Action Footer */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "16px",
                    paddingTop: "12px",
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    flexWrap: "wrap",
                    gap: "10px",
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedCardId(isExpanded ? null : item._id);
                    }}
                    style={{
                      background: "transparent",
                      color: "#94a3b8",
                      border: "none",
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      padding: 0,
                      fontWeight: 500,
                    }}
                  >
                    {isExpanded ? "▲ Hide Outline & Details" : "▼ Show Outline & Facts"}
                  </button>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {/* ✨ AI Prompt Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPromptModal(item);
                      }}
                      style={{
                        background: "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        padding: "6px 14px",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(168, 85, 247, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      ✨ View AI Prompt
                    </button>

                    {item.status !== "converted" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConvertToDraft(item._id);
                        }}
                        style={{
                          background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "8px",
                          padding: "6px 14px",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          boxShadow: "0 2px 8px rgba(5, 150, 105, 0.3)",
                        }}
                      >
                        🚀 Convert to Blog Draft
                      </button>
                    )}

                    {item.status !== "approved" && item.status !== "converted" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusUpdate(item._id, "approved");
                        }}
                        style={{
                          background: "rgba(59, 130, 246, 0.15)",
                          color: "#60a5fa",
                          border: "1px solid rgba(59, 130, 246, 0.3)",
                          borderRadius: "8px",
                          padding: "6px 12px",
                          fontSize: "0.82rem",
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        👍 Approve
                      </button>
                    )}

                    {item.status !== "dismissed" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusUpdate(item._id, "dismissed");
                        }}
                        style={{
                          background: "rgba(239, 68, 68, 0.15)",
                          color: "#f87171",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          borderRadius: "8px",
                          padding: "6px 12px",
                          fontSize: "0.82rem",
                          fontWeight: 500,
                          cursor: "pointer",
                        }}
                      >
                        ❌ Dismiss
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(item._id);
                      }}
                      style={{
                        background: "transparent",
                        color: "#64748b",
                        border: "none",
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        padding: "6px 8px",
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ✨ AI Prompt & Auto-Article Generation Modal */}
      {promptModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(6px)",
            zIndex: 9990,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setPromptModal(null)}
        >
          <div
            style={{
              background: "linear-gradient(145deg, #1e293b 0%, #0f172a 100%)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "16px",
              padding: "24px",
              maxWidth: "720px",
              width: "100%",
              maxHeight: "88vh",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ color: "#f8fafc", margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>
                ✨ AI Article Generation Prompt
              </h3>
              <button
                onClick={() => setPromptModal(null)}
                style={{ background: "none", border: "none", color: "#94a3b8", fontSize: "1.4rem", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: "0.9rem", color: "#cbd5e1" }}>
              Topic: <strong style={{ color: "#fbbf24" }}>{promptModal.title}</strong>
            </div>

            {/* Prompt Code Block */}
            <textarea
              readOnly
              value={
                promptModal.aiPrompt ||
                `Write a detailed blog article for Ollypedia on '${promptModal.title}'. Category: ${promptModal.category}. Key points: ${(promptModal.keyPoints || []).join(", ")}`
              }
              style={{
                width: "100%",
                height: "260px",
                background: "#090d16",
                color: "#34d399",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "10px",
                padding: "14px",
                fontFamily: "monospace",
                fontSize: "0.85rem",
                lineHeight: 1.5,
                resize: "none",
              }}
            />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <button
                onClick={() => {
                  const promptText =
                    promptModal.aiPrompt ||
                    `Write a detailed blog article for Ollypedia on '${promptModal.title}'. Category: ${promptModal.category}. Key points: ${(promptModal.keyPoints || []).join(", ")}`;
                  navigator.clipboard.writeText(promptText);
                  showToast("📋 AI Prompt copied to clipboard!", "success");
                }}
                style={{
                  background: "rgba(59, 130, 246, 0.2)",
                  color: "#60a5fa",
                  border: "1px solid rgba(59, 130, 246, 0.4)",
                  borderRadius: "8px",
                  padding: "10px 18px",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                📋 Copy Prompt to Clipboard
              </button>

              <button
                onClick={async () => {
                  setArticleGenerating(true);
                  try {
                    const res = await fetch(`${API_BASE}/blog-suggestions/${promptModal._id}/generate-article`, {
                      method: "POST",
                      headers,
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Failed to generate article");

                    showToast("🚀 Full Article generated & saved as Draft Blog!", "success");
                    setPromptModal(null);
                    fetchSuggestions();
                    fetchCronStatus();
                  } catch (e) {
                    showToast(`Error: ${e.message}`, "error");
                  } finally {
                    setArticleGenerating(false);
                  }
                }}
                disabled={articleGenerating}
                style={{
                  background: articleGenerating ? "#475569" : "linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "10px 20px",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  cursor: articleGenerating ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 14px rgba(168, 85, 247, 0.4)",
                }}
              >
                {articleGenerating ? "⏳ Generating Full Article..." : "⚡ Auto-Generate Full Article with AI"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
