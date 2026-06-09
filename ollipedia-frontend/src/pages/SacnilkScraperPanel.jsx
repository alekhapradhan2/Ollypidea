// src/components/admin/SacnilkScraperPanel.jsx
// ─────────────────────────────────────────────────────────────────────────────
//  Sacnilk Box Office Scraper Panel
//
//  Features:
//  1. List all movies — choose which ones to track (stored via sacnilkUrl field)
//  2. For each tracked movie: set its sacnilkUrl + toggle active/inactive
//  3. Manual "Scrape Now" per movie (or all at once) — fetches India Net from Sacnilk
//  4. Scraped number auto-stored as next boxOfficeDay + blog generated (same
//     style as BoxOfficePanel per-day blog)
//  5. Cron schedule shown: every day at 8:00 AM IST
//  6. Last scrape log visible per movie
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from "react";
import { API, getAdminToken } from "../api/api";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const statusColor = (s) =>
  s === "success" ? "#4caf82" : s === "error" ? "#e8876a" : s === "running" ? "#c9973a" : "#666";

const statusIcon = (s) =>
  s === "success" ? "✅" : s === "error" ? "❌" : s === "running" ? "⏳" : "○";

// ─── Main Panel ───────────────────────────────────────────────────────────────
export default function SacnilkScraperPanel({ movies = [], onToast }) {
  const [configs, setConfigs]         = useState([]);   // SacnilkConfig docs
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState({});   // { movieId: bool }
  const [scraping, setScraping]       = useState({});   // { movieId: bool }
  const [scrapingAll, setScrapingAll] = useState(false);
  const [logs, setLogs]               = useState({});   // { movieId: [log, ...] }
  const [expanded, setExpanded]       = useState({});   // { movieId: bool } — show log
  const [editUrl, setEditUrl]         = useState({});   // { movieId: string }
  const [search, setSearch]           = useState("");

  // ── Load configs ────────────────────────────────────────────────────────────
  const loadConfigs = useCallback(async () => {
    try {
      const data = await fetch(`${BASE}/admin/sacnilk/configs`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      }).then(r => r.json());
      setConfigs(Array.isArray(data) ? data : []);
    } catch (e) {
      onToast?.("Failed to load scraper configs: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLogs = useCallback(async (movieId) => {
    try {
      const data = await fetch(`${BASE}/admin/sacnilk/logs/${movieId}`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      }).then(r => r.json());
      setLogs(prev => ({ ...prev, [movieId]: Array.isArray(data) ? data : [] }));
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  // ── Derived: which movies have a config ─────────────────────────────────────
  const configByMovieId = Object.fromEntries(configs.map(c => [String(c.movieId), c]));

  // Tracked movies (have a config doc)
  const trackedMovies = movies.filter(m => configByMovieId[String(m._id)]);
  // All movies for adding new ones
  const untrackedMovies = movies.filter(m => !configByMovieId[String(m._id)]);

  const filteredTracked = trackedMovies.filter(m =>
    !search.trim() || m.title.toLowerCase().includes(search.toLowerCase())
  );
  const filteredUntracked = untrackedMovies.filter(m =>
    !search.trim() || m.title.toLowerCase().includes(search.toLowerCase())
  );

  // ── Save / update config ─────────────────────────────────────────────────────
  const saveConfig = async (movieId, payload) => {
    setSaving(prev => ({ ...prev, [movieId]: true }));
    try {
      const res = await fetch(`${BASE}/admin/sacnilk/configs/${movieId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onToast?.("Config saved ✓", "success");
      await loadConfigs();
      setEditUrl(prev => ({ ...prev, [movieId]: undefined }));
    } catch (e) {
      onToast?.("Save failed: " + e.message, "error");
    } finally {
      setSaving(prev => ({ ...prev, [movieId]: false }));
    }
  };

  // ── Toggle active ────────────────────────────────────────────────────────────
  const toggleActive = async (movieId, currentlyActive) => {
    await saveConfig(movieId, { active: !currentlyActive });
  };

  // ── Add new tracking ─────────────────────────────────────────────────────────
  const addTracking = async (movieId, sacnilkUrl) => {
    if (!sacnilkUrl.trim()) { onToast?.("Enter a Sacnilk URL first", "error"); return; }
    await saveConfig(movieId, { sacnilkUrl: sacnilkUrl.trim(), active: true });
  };

  // ── Remove tracking ──────────────────────────────────────────────────────────
  const removeTracking = async (movieId) => {
    setSaving(prev => ({ ...prev, [movieId]: true }));
    try {
      const res = await fetch(`${BASE}/admin/sacnilk/configs/${movieId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      onToast?.("Tracking removed", "success");
      await loadConfigs();
    } catch (e) {
      onToast?.("Delete failed: " + e.message, "error");
    } finally {
      setSaving(prev => ({ ...prev, [movieId]: false }));
    }
  };

  // ── Manual scrape ────────────────────────────────────────────────────────────
  const scrapeOne = async (movieId) => {
    setScraping(prev => ({ ...prev, [movieId]: true }));
    try {
      const res = await fetch(`${BASE}/admin/sacnilk/scrape/${movieId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scrape failed");
      onToast?.(
        data.message || `Scraped ₹${data.netCollection} for Day ${data.day} ✓`,
        "success"
      );
      await loadConfigs();
      await loadLogs(movieId);
      if (expanded[movieId]) setExpanded(prev => ({ ...prev, [movieId]: true }));
    } catch (e) {
      onToast?.("Scrape failed: " + e.message, "error");
    } finally {
      setScraping(prev => ({ ...prev, [movieId]: false }));
    }
  };

  const scrapeAll = async () => {
    setScrapingAll(true);
    try {
      const res = await fetch(`${BASE}/admin/sacnilk/scrape-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Batch scrape failed");
      onToast?.(
        `Batch scrape done: ${data.success} success, ${data.failed} failed`,
        data.failed === 0 ? "success" : "warn"
      );
      await loadConfigs();
    } catch (e) {
      onToast?.("Batch scrape failed: " + e.message, "error");
    } finally {
      setScrapingAll(false);
    }
  };

  // ── Toggle log expansion ─────────────────────────────────────────────────────
  const toggleLog = async (movieId) => {
    const nowExpanded = !expanded[movieId];
    setExpanded(prev => ({ ...prev, [movieId]: nowExpanded }));
    if (nowExpanded && !logs[movieId]) await loadLogs(movieId);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: "1.5rem" }}>
        ⏳ Loading scraper configs…
      </div>
    );
  }

  const activeCount  = configs.filter(c => c.active).length;
  const trackedCount = configs.length;

  return (
    <div style={{ padding: "0 28px 60px" }}>

      {/* ── Header ── */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--bg1)", padding: "13px 28px",
        margin: "0 -28px 28px",
        boxShadow: "0 2px 16px rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
      }}>
        <h2 style={{ fontSize: "1.35rem", margin: 0, fontWeight: 800 }}>🕷️ Sacnilk Scraper</h2>

        {/* Stats */}
        <span style={{ fontSize: "0.7rem", color: "var(--muted)", background: "var(--bg3)", padding: "2px 9px", borderRadius: 12, fontWeight: 600 }}>
          {trackedCount} tracked · {activeCount} active
        </span>

        {/* Cron badge */}
        <span style={{ fontSize: "0.68rem", color: "#4caf82", background: "rgba(76,175,130,0.1)", padding: "3px 10px", borderRadius: 10, border: "1px solid rgba(76,175,130,0.25)", fontWeight: 700 }}>
          ⏰ Auto-runs 8:00 AM IST daily
        </span>

        <div style={{ flex: 1 }} />

        {/* Search */}
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: "0.8rem", color: "var(--muted)", pointerEvents: "none" }}>🔍</span>
          <input
            className="form-input"
            style={{ paddingLeft: 30, width: 200 }}
            placeholder="Search movies…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Scrape All */}
        <button
          className="btn btn-gold btn-sm"
          onClick={scrapeAll}
          disabled={scrapingAll || activeCount === 0}
          style={{ opacity: activeCount === 0 ? 0.4 : 1 }}
        >
          {scrapingAll ? "⏳ Scraping…" : `⚡ Scrape All (${activeCount})`}
        </button>
      </div>

      {/* ── Info Banner ── */}
      <div style={{
        background: "rgba(201,151,58,0.06)", border: "1px solid rgba(201,151,58,0.2)",
        borderRadius: 12, padding: "14px 20px", marginBottom: 28,
        display: "flex", gap: 12, alignItems: "flex-start",
      }}>
        <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>ℹ️</span>
        <div style={{ fontSize: "0.83rem", color: "var(--muted)", lineHeight: 1.7 }}>
          <strong style={{ color: "var(--text)" }}>How it works:</strong> Add a Sacnilk URL for each movie (e.g. <code style={{ background: "var(--bg3)", padding: "1px 6px", borderRadius: 4, fontSize: "0.78rem" }}>https://www.sacnilk.com/movie/Mantra_Muugdha_2026</code>). Every morning at <strong style={{ color: "#c9973a" }}>8:00 AM IST</strong> the server scrapes the <strong>India Net</strong> collection, stores it as the next <code style={{ background: "var(--bg3)", padding: "1px 6px", borderRadius: 4, fontSize: "0.78rem" }}>boxOfficeDays</code> entry, and auto-publishes a box office blog — exactly like the manual Box Office panel workflow.
        </div>
      </div>

      {/* ── Tracked Movies ── */}
      {filteredTracked.length > 0 && (
        <section style={{ marginBottom: 36 }}>
          <h3 style={{ fontSize: "0.85rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--gold)", marginBottom: 14 }}>
            Tracked Movies ({filteredTracked.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filteredTracked.map(movie => {
              const cfg     = configByMovieId[String(movie._id)];
              const midStr  = String(movie._id);
              const isSaving  = saving[midStr];
              const isScraping = scraping[midStr];
              const isExpanded = expanded[midStr];
              const movieLogs  = logs[midStr] || [];
              const lastLog    = cfg.lastLog;
              const inEdit     = editUrl[midStr] !== undefined;
              const urlDraft   = inEdit ? editUrl[midStr] : cfg.sacnilkUrl || "";

              return (
                <div key={midStr} style={{
                  background: "var(--bg2)", border: `1px solid ${cfg.active ? "rgba(201,151,58,0.3)" : "var(--border)"}`,
                  borderRadius: 14, overflow: "hidden",
                  transition: "border-color 0.2s",
                }}>
                  {/* ── Card header ── */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", flexWrap: "wrap" }}>
                    {/* Poster */}
                    <div style={{ width: 42, height: 58, borderRadius: 6, overflow: "hidden", flexShrink: 0, background: "var(--bg3)" }}>
                      {movie.posterUrl || movie.thumbnailUrl
                        ? <img src={movie.posterUrl || movie.thumbnailUrl} alt={movie.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} />
                        : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>🎬</div>
                      }
                    </div>

                    {/* Title + meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{movie.title}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>
                        {movie.releaseDate ? new Date(movie.releaseDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "TBA"}
                        {" · "}
                        {(movie.boxOfficeDays || []).length} days recorded
                      </div>
                      {lastLog && (
                        <div style={{ fontSize: "0.7rem", marginTop: 3 }}>
                          <span style={{ color: statusColor(lastLog.status) }}>
                            {statusIcon(lastLog.status)} Last run: {fmtDate(lastLog.runAt)}
                          </span>
                          {lastLog.status === "success" && lastLog.net
                            ? <span style={{ color: "#c9973a", marginLeft: 6 }}>· Net: {lastLog.net} (Day {lastLog.day})</span>
                            : lastLog.status === "error"
                            ? <span style={{ color: "#e8876a", marginLeft: 6 }}>· {lastLog.error}</span>
                            : null
                          }
                        </div>
                      )}
                    </div>

                    {/* Active toggle */}
                    <div
                      onClick={() => !isSaving && toggleActive(midStr, cfg.active)}
                      style={{
                        cursor: "pointer", flexShrink: 0,
                        display: "flex", alignItems: "center", gap: 6,
                        background: cfg.active ? "rgba(76,175,130,0.12)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${cfg.active ? "rgba(76,175,130,0.35)" : "rgba(255,255,255,0.1)"}`,
                        borderRadius: 8, padding: "5px 10px", fontSize: "0.72rem",
                        fontWeight: 700, color: cfg.active ? "#4caf82" : "var(--muted)",
                        transition: "all 0.15s",
                      }}
                    >
                      <div style={{
                        width: 28, height: 14, borderRadius: 999,
                        background: cfg.active ? "#4caf82" : "#333",
                        position: "relative", transition: "background 0.2s",
                        flexShrink: 0,
                      }}>
                        <div style={{
                          position: "absolute", top: 2,
                          left: cfg.active ? 16 : 2,
                          width: 10, height: 10, borderRadius: "50%",
                          background: "#fff", transition: "left 0.2s",
                        }} />
                      </div>
                      {cfg.active ? "Active" : "Paused"}
                    </div>

                    {/* Scrape Now */}
                    <button
                      onClick={() => scrapeOne(midStr)}
                      disabled={isScraping || !cfg.sacnilkUrl}
                      className="btn btn-sm"
                      style={{
                        background: "rgba(201,151,58,0.12)", color: "#c9973a",
                        border: "1px solid rgba(201,151,58,0.3)", borderRadius: 8,
                        padding: "6px 14px", fontSize: "0.78rem", fontWeight: 700,
                        cursor: isScraping || !cfg.sacnilkUrl ? "not-allowed" : "pointer",
                        opacity: !cfg.sacnilkUrl ? 0.4 : 1,
                        flexShrink: 0,
                      }}
                    >
                      {isScraping ? "⏳ Scraping…" : "⚡ Scrape Now"}
                    </button>

                    {/* Logs toggle */}
                    <button
                      onClick={() => toggleLog(midStr)}
                      style={{
                        background: "none", border: "1px solid var(--border)",
                        borderRadius: 8, padding: "6px 10px", fontSize: "0.73rem",
                        color: "var(--muted)", cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      {isExpanded ? "▲ Logs" : "▼ Logs"}
                    </button>

                    {/* Remove */}
                    <button
                      onClick={() => removeTracking(midStr)}
                      disabled={isSaving}
                      style={{
                        background: "none", border: "none",
                        color: "var(--red)", cursor: "pointer",
                        fontSize: "0.8rem", padding: "4px 6px",
                        borderRadius: 6, flexShrink: 0,
                      }}
                      title="Remove tracking"
                    >
                      ✕
                    </button>
                  </div>

                  {/* ── Sacnilk URL row ── */}
                  <div style={{
                    borderTop: "1px solid var(--border)",
                    padding: "10px 18px",
                    display: "flex", alignItems: "center", gap: 10,
                    background: "rgba(0,0,0,0.2)",
                  }}>
                    <span style={{ fontSize: "0.72rem", color: "var(--muted)", flexShrink: 0 }}>Sacnilk URL:</span>
                    {inEdit ? (
                      <>
                        <input
                          className="form-input"
                          style={{ flex: 1, fontSize: "0.8rem", padding: "5px 10px" }}
                          value={urlDraft}
                          onChange={e => setEditUrl(prev => ({ ...prev, [midStr]: e.target.value }))}
                          placeholder="https://www.sacnilk.com/movie/MovieName_2026"
                          onKeyDown={e => e.key === "Enter" && saveConfig(midStr, { sacnilkUrl: urlDraft })}
                        />
                        <button
                          className="btn btn-sm btn-gold"
                          onClick={() => saveConfig(midStr, { sacnilkUrl: urlDraft })}
                          disabled={isSaving}
                          style={{ fontSize: "0.75rem", padding: "5px 12px" }}
                        >
                          {isSaving ? "…" : "Save"}
                        </button>
                        <button
                          onClick={() => setEditUrl(prev => ({ ...prev, [midStr]: undefined }))}
                          style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.8rem" }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span style={{
                          flex: 1, fontSize: "0.78rem",
                          color: cfg.sacnilkUrl ? "#7ec8e3" : "var(--muted)",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {cfg.sacnilkUrl
                            ? <a href={cfg.sacnilkUrl} target="_blank" rel="noreferrer" style={{ color: "#7ec8e3", textDecoration: "none" }}>{cfg.sacnilkUrl}</a>
                            : "— not set —"
                          }
                        </span>
                        <button
                          onClick={() => setEditUrl(prev => ({ ...prev, [midStr]: cfg.sacnilkUrl || "" }))}
                          style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, color: "var(--muted)", cursor: "pointer", fontSize: "0.72rem", padding: "3px 10px" }}
                        >
                          ✏️ Edit
                        </button>
                      </>
                    )}
                  </div>

                  {/* ── Log rows ── */}
                  {isExpanded && (
                    <div style={{ borderTop: "1px solid var(--border)", padding: "12px 18px" }}>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                        Recent Scrape Logs
                      </div>
                      {movieLogs.length === 0 ? (
                        <div style={{ color: "var(--muted)", fontSize: "0.8rem", padding: "8px 0" }}>No logs yet.</div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {movieLogs.slice(0, 10).map((log, i) => (
                            <div key={i} style={{
                              display: "flex", alignItems: "center", gap: 10,
                              background: "var(--bg3)", borderRadius: 8, padding: "8px 12px",
                              fontSize: "0.78rem",
                            }}>
                              <span style={{ color: statusColor(log.status), flexShrink: 0 }}>{statusIcon(log.status)}</span>
                              <span style={{ color: "var(--muted)", flexShrink: 0, minWidth: 140 }}>{fmtDate(log.runAt)}</span>
                              {log.status === "success" ? (
                                <span style={{ color: "#4caf82" }}>
                                  Day {log.day} → Net: <strong style={{ color: "#c9973a" }}>{log.net}</strong>
                                  {log.blogSlug && <> · <a href={`/blog/${log.blogSlug}`} target="_blank" rel="noreferrer" style={{ color: "#7ec8e3", textDecoration: "none" }}>Blog ↗</a></>}
                                </span>
                              ) : (
                                <span style={{ color: "#e8876a" }}>{log.error || "Error"}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Add new movies to track ── */}
      {filteredUntracked.length > 0 && (
        <section>
          <h3 style={{ fontSize: "0.85rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 14 }}>
            Add Movie to Track ({filteredUntracked.length} untracked)
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredUntracked.map(movie => {
              const midStr = String(movie._id);
              const urlVal = editUrl[midStr] || "";
              const isSav  = saving[midStr];

              return (
                <div key={midStr} style={{
                  background: "var(--bg2)", border: "1px solid var(--border)",
                  borderRadius: 12, padding: "12px 18px",
                  display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                }}>
                  {/* Poster */}
                  <div style={{ width: 36, height: 50, borderRadius: 5, overflow: "hidden", flexShrink: 0, background: "var(--bg3)" }}>
                    {movie.posterUrl || movie.thumbnailUrl
                      ? <img src={movie.posterUrl || movie.thumbnailUrl} alt={movie.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => e.target.style.display = "none"} />
                      : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>🎬</div>
                    }
                  </div>

                  <div style={{ flex: "0 0 auto", minWidth: 160 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{movie.title}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>
                      {movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "TBA"}
                    </div>
                  </div>

                  <input
                    className="form-input"
                    style={{ flex: 1, minWidth: 240, fontSize: "0.8rem", padding: "6px 12px" }}
                    placeholder="https://www.sacnilk.com/movie/MovieName_2026"
                    value={urlVal}
                    onChange={e => setEditUrl(prev => ({ ...prev, [midStr]: e.target.value }))}
                    onKeyDown={e => e.key === "Enter" && addTracking(midStr, urlVal)}
                  />

                  <button
                    className="btn btn-sm btn-gold"
                    onClick={() => addTracking(midStr, urlVal)}
                    disabled={isSav || !urlVal.trim()}
                    style={{ fontSize: "0.78rem", opacity: !urlVal.trim() ? 0.4 : 1 }}
                  >
                    {isSav ? "…" : "+ Track"}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {movies.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>🎬</div>
          No movies found. Add movies first from the Movies tab.
        </div>
      )}
    </div>
  );
}
