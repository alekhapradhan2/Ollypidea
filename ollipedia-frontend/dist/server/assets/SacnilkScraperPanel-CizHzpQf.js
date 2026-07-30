import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { A as API } from "../entry-server.js";
import "react-dom/server";
import "react-router-dom/server.mjs";
import "react-helmet-async";
import "react-router-dom";
const fmtDate = (d) => d ? new Date(d).toLocaleString("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
}) : "—";
const fmtDateShort = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";
const STATUS_COLOR = { success: "#4caf82", error: "#e8876a", running: "#c9973a", skipped: "#7ec8e3", default: "#666" };
const STATUS_ICON = { success: "✅", error: "❌", running: "⏳", skipped: "⏭", default: "○" };
const sc = (s) => STATUS_COLOR[s] || STATUS_COLOR.default;
const si = (s) => STATUS_ICON[s] || STATUS_ICON.default;
const cfgMovieId = (c) => {
  var _a;
  return String(((_a = c.movieId) == null ? void 0 : _a._id) ?? c.movieId ?? "");
};
function MiniBarChart({ days }) {
  if (!days || days.length === 0) return null;
  const vals = days.map((d) => parseFloat(String(d.net || "0").replace(/[^0-9.]/g, "")) || 0);
  const max = Math.max(...vals, 1);
  return /* @__PURE__ */ jsx("div", { style: { display: "flex", alignItems: "flex-end", gap: 3, height: 44, marginTop: 12 }, children: vals.map((v, i) => /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flex: 1, minWidth: 8 }, children: [
    /* @__PURE__ */ jsx(
      "div",
      {
        title: `Day ${days[i].day}: ${days[i].net}`,
        style: {
          width: "100%",
          height: `${Math.max(4, v / max * 38)}px`,
          background: `linear-gradient(180deg, rgba(201,151,58,${0.5 + 0.5 * (v / max)}) 0%, rgba(201,151,58,0.2) 100%)`,
          borderRadius: "3px 3px 0 0",
          transition: "height 0.3s"
        }
      }
    ),
    days.length <= 14 && /* @__PURE__ */ jsx("span", { style: { fontSize: "0.52rem", color: "var(--muted)", whiteSpace: "nowrap" }, children: days[i].day })
  ] }, i)) });
}
function Poster({ movie, size = 44 }) {
  const h = Math.round(size * 1.42);
  return /* @__PURE__ */ jsx("div", { style: { width: size, height: h, borderRadius: 7, overflow: "hidden", flexShrink: 0, background: "var(--bg3)" }, children: movie.posterUrl || movie.thumbnailUrl ? /* @__PURE__ */ jsx(
    "img",
    {
      src: movie.posterUrl || movie.thumbnailUrl,
      alt: "",
      style: { width: "100%", height: "100%", objectFit: "cover" },
      onError: (e) => {
        e.target.style.display = "none";
      }
    }
  ) : /* @__PURE__ */ jsx("div", { style: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size > 40 ? "1.3rem" : "1rem" }, children: "🎬" }) });
}
function SectionHeader({ icon, title, subtitle, badge, badgeColor = "#c9973a", badgeBg = "rgba(201,151,58,0.1)", iconBg = "rgba(201,151,58,0.12)", iconBorder = "rgba(201,151,58,0.35)" }) {
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 11, marginBottom: 18 }, children: [
    /* @__PURE__ */ jsx("div", { style: {
      width: 34,
      height: 34,
      borderRadius: "50%",
      background: iconBg,
      border: `1px solid ${iconBorder}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      fontSize: "1rem"
    }, children: icon }),
    /* @__PURE__ */ jsxs("div", { style: { flex: 1 }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, fontSize: "0.96rem" }, children: title }),
      subtitle && /* @__PURE__ */ jsx("div", { style: { fontSize: "0.71rem", color: "var(--muted)", marginTop: 1 }, children: subtitle })
    ] }),
    badge != null && /* @__PURE__ */ jsx("span", { style: {
      fontSize: "0.68rem",
      fontWeight: 700,
      color: badgeColor,
      background: badgeBg,
      border: `1px solid ${badgeColor}33`,
      padding: "3px 12px",
      borderRadius: 10
    }, children: badge })
  ] });
}
const Divider = ({ label }) => /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12, margin: "30px 0" }, children: [
  /* @__PURE__ */ jsx("div", { style: { flex: 1, height: 1, background: "var(--border)" } }),
  label && /* @__PURE__ */ jsx("span", { style: { fontSize: "0.63rem", fontWeight: 700, letterSpacing: "0.12em", color: "var(--muted)", textTransform: "uppercase" }, children: label }),
  /* @__PURE__ */ jsx("div", { style: { flex: 1, height: 1, background: "var(--border)" } })
] });
function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = "Confirm", confirmColor = "var(--red)", icon = "⚠️", cancelLabel = "Cancel", extraButton = null }) {
  return /* @__PURE__ */ jsx(
    "div",
    {
      onClick: onCancel,
      style: {
        position: "fixed",
        inset: 0,
        zIndex: 1e3,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20
      },
      children: /* @__PURE__ */ jsxs(
        "div",
        {
          onClick: (e) => e.stopPropagation(),
          style: {
            background: "var(--bg2)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 28,
            maxWidth: 420,
            width: "100%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)"
          },
          children: [
            /* @__PURE__ */ jsx("div", { style: { fontSize: "2rem", marginBottom: 10 }, children: icon }),
            /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, fontSize: "1rem", marginBottom: 8 }, children: title }),
            /* @__PURE__ */ jsx("p", { style: { color: "var(--muted)", fontSize: "0.84rem", lineHeight: 1.6, marginBottom: 22, whiteSpace: "pre-wrap" }, children: message }),
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, justifyContent: "flex-end" }, children: [
              extraButton && /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: extraButton.onClick,
                  style: { padding: "8px 20px", borderRadius: 9, background: extraButton.color || "var(--bg3)", border: "none", color: "#fff", cursor: "pointer", fontSize: "0.82rem", fontWeight: 700 },
                  children: extraButton.label
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: onCancel,
                  style: { padding: "8px 18px", borderRadius: 9, background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 },
                  children: cancelLabel
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: onConfirm,
                  style: { padding: "8px 20px", borderRadius: 9, background: confirmColor, border: "none", color: "#fff", cursor: "pointer", fontSize: "0.82rem", fontWeight: 700 },
                  children: confirmLabel
                }
              )
            ] })
          ]
        }
      )
    }
  );
}
function Toast({ toasts }) {
  return /* @__PURE__ */ jsx("div", { style: { position: "fixed", bottom: 28, right: 28, zIndex: 2e3, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }, children: toasts.map((t) => {
    const colors = {
      success: { bg: "rgba(76,175,130,0.95)", border: "#4caf82" },
      error: { bg: "rgba(220,60,60,0.95)", border: "#e8876a" },
      warn: { bg: "rgba(201,151,58,0.95)", border: "#c9973a" },
      info: { bg: "rgba(126,200,227,0.95)", border: "#7ec8e3" }
    };
    const c = colors[t.type] || colors.info;
    return /* @__PURE__ */ jsx("div", { style: {
      background: c.bg,
      border: `1px solid ${c.border}`,
      color: "#fff",
      borderRadius: 10,
      padding: "11px 18px",
      fontSize: "0.82rem",
      fontWeight: 600,
      boxShadow: "0 6px 24px rgba(0,0,0,0.4)",
      animation: "fadeInUp 0.2s ease",
      maxWidth: 340
    }, children: t.message }, t.id);
  }) });
}
function HistoryPanel({ movie, logs, onClose }) {
  const [tab, setTab] = useState("days");
  String(movie._id);
  const sortedDays = [...movie.boxOfficeDays || []].sort((a, b) => a.day - b.day);
  const movieLogs = logs || [];
  return /* @__PURE__ */ jsx(
    "div",
    {
      onClick: onClose,
      style: {
        position: "fixed",
        inset: 0,
        zIndex: 900,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "20px 20px 0"
      },
      children: /* @__PURE__ */ jsxs(
        "div",
        {
          onClick: (e) => e.stopPropagation(),
          style: {
            background: "var(--bg1)",
            border: "1px solid var(--border)",
            borderRadius: "16px 16px 0 0",
            width: "100%",
            maxWidth: 760,
            maxHeight: "75vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 -16px 60px rgba(0,0,0,0.5)"
          },
          children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12, padding: "18px 22px", borderBottom: "1px solid var(--border)", flexShrink: 0 }, children: [
              /* @__PURE__ */ jsx(Poster, { movie, size: 38 }),
              /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
                /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: movie.title }),
                /* @__PURE__ */ jsx("div", { style: { fontSize: "0.7rem", color: "var(--muted)", marginTop: 1 }, children: "Tracking History" })
              ] }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: onClose,
                  style: { background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--muted)", cursor: "pointer", fontSize: "1.1rem", padding: "5px 10px", lineHeight: 1 },
                  children: "✕"
                }
              )
            ] }),
            /* @__PURE__ */ jsx("div", { style: { display: "flex", padding: "0 22px", borderBottom: "1px solid var(--border)", flexShrink: 0 }, children: [
              { key: "days", label: `📊 Box Office Days`, count: sortedDays.length },
              { key: "logs", label: `🕷️ Scrape Logs`, count: movieLogs.length }
            ].map(({ key, label, count }) => /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: () => setTab(key),
                style: {
                  background: "none",
                  border: "none",
                  borderBottom: tab === key ? "2px solid #c9973a" : "2px solid transparent",
                  color: tab === key ? "#c9973a" : "var(--muted)",
                  padding: "12px 14px",
                  fontSize: "0.78rem",
                  fontWeight: tab === key ? 700 : 500,
                  cursor: "pointer",
                  marginBottom: -1,
                  display: "flex",
                  alignItems: "center",
                  gap: 6
                },
                children: [
                  label,
                  /* @__PURE__ */ jsx("span", { style: {
                    background: tab === key ? "rgba(201,151,58,0.2)" : "var(--bg3)",
                    color: tab === key ? "#c9973a" : "var(--muted)",
                    borderRadius: 10,
                    padding: "1px 8px",
                    fontSize: "0.65rem",
                    fontWeight: 700
                  }, children: count })
                ]
              },
              key
            )) }),
            /* @__PURE__ */ jsxs("div", { style: { flex: 1, overflowY: "auto", padding: "20px 22px" }, children: [
              tab === "days" && (sortedDays.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { icon: "📊", message: "No box office data recorded yet.", sub: "Use ⚡ Manual Trigger to collect the first entry." }) : /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx(MiniBarChart, { days: sortedDays }),
                /* @__PURE__ */ jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 }, children: sortedDays.map((d, i) => /* @__PURE__ */ jsxs("div", { style: {
                  background: "var(--bg2)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: "9px 14px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  minWidth: 80
                }, children: [
                  /* @__PURE__ */ jsxs("span", { style: { color: "var(--muted)", fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }, children: [
                    "Day ",
                    d.day
                  ] }),
                  /* @__PURE__ */ jsx("span", { style: { color: "#c9973a", fontWeight: 800, fontSize: "0.88rem" }, children: d.net || "—" }),
                  d.gross && /* @__PURE__ */ jsx("span", { style: { color: "#7ec8e3", fontWeight: 600, fontSize: "0.75rem" }, children: d.gross }),
                  d.date && /* @__PURE__ */ jsx("span", { style: { color: "var(--muted)", fontSize: "0.6rem" }, children: fmtDateShort(d.date) || d.date }),
                  d.note && d.note.includes("Sacnilk") && /* @__PURE__ */ jsx("span", { style: { color: "#555", fontSize: "0.55rem", letterSpacing: "0.04em" }, children: "auto" })
                ] }, i)) }),
                sortedDays.length > 0 && (() => {
                  var _a, _b;
                  const fmtVal = (raw) => parseFloat(String(raw || "0").replace(/[^0-9.]/g, "")) || 0;
                  const totalNet = sortedDays.reduce((s, d) => s + fmtVal(d.net), 0);
                  const totalGross = sortedDays.reduce((s, d) => s + fmtVal(d.gross), 0);
                  const unit = ((_b = (_a = sortedDays[0]) == null ? void 0 : _a.net) == null ? void 0 : _b.includes("Cr")) ? "Cr" : "L";
                  const bestDay = sortedDays.reduce((b, d) => {
                    const v = fmtVal(d.net);
                    return v > b.v ? { v, day: d.day } : b;
                  }, { v: 0, day: "—" });
                  return /* @__PURE__ */ jsxs("div", { style: { marginTop: 18, padding: "12px 16px", background: "rgba(201,151,58,0.07)", border: "1px solid rgba(201,151,58,0.2)", borderRadius: 10, display: "flex", gap: 24, flexWrap: "wrap" }, children: [
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx("div", { style: { fontSize: "0.65rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }, children: "Total Days" }),
                      /* @__PURE__ */ jsx("div", { style: { fontSize: "1.1rem", fontWeight: 800, color: "#c9973a" }, children: sortedDays.length })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx("div", { style: { fontSize: "0.65rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }, children: "Total Net" }),
                      /* @__PURE__ */ jsxs("div", { style: { fontSize: "1.1rem", fontWeight: 800, color: "#4caf82" }, children: [
                        totalNet.toFixed(2),
                        " ",
                        unit
                      ] })
                    ] }),
                    totalGross > 0 && /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx("div", { style: { fontSize: "0.65rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }, children: "Total Gross" }),
                      /* @__PURE__ */ jsxs("div", { style: { fontSize: "1.1rem", fontWeight: 800, color: "#7ec8e3" }, children: [
                        totalGross.toFixed(2),
                        " ",
                        unit
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx("div", { style: { fontSize: "0.65rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }, children: "Best Day" }),
                      /* @__PURE__ */ jsxs("div", { style: { fontSize: "1.1rem", fontWeight: 800, color: "#7ec8e3" }, children: [
                        "Day ",
                        bestDay.day
                      ] })
                    ] })
                  ] });
                })()
              ] })),
              tab === "logs" && (movieLogs.length === 0 ? /* @__PURE__ */ jsx(EmptyState, { icon: "🕷️", message: "No scrape logs yet.", sub: "Logs appear after the first manual trigger or scheduled run." }) : /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: movieLogs.map((log, i) => /* @__PURE__ */ jsxs("div", { style: {
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                background: "var(--bg2)",
                borderRadius: 9,
                padding: "10px 14px",
                fontSize: "0.78rem",
                borderLeft: `3px solid ${sc(log.status)}`
              }, children: [
                /* @__PURE__ */ jsx("span", { style: { color: sc(log.status), flexShrink: 0, fontSize: "0.9rem", marginTop: 1 }, children: si(log.status) }),
                /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
                  /* @__PURE__ */ jsx("div", { style: { color: "var(--muted)", fontSize: "0.72rem", marginBottom: 3 }, children: fmtDate(log.runAt) }),
                  log.status === "success" ? /* @__PURE__ */ jsxs("div", { style: { color: "#4caf82" }, children: [
                    "Day ",
                    log.day,
                    " → Net: ",
                    /* @__PURE__ */ jsx("strong", { style: { color: "#c9973a" }, children: log.net }),
                    log.gross && /* @__PURE__ */ jsxs("span", { style: { color: "#7ec8e3", marginLeft: 4 }, children: [
                      "· Gross ",
                      log.gross
                    ] }),
                    log.blogSlug && /* @__PURE__ */ jsxs(Fragment, { children: [
                      " · ",
                      /* @__PURE__ */ jsx("a", { href: `/blog/${log.blogSlug}`, target: "_blank", rel: "noreferrer", style: { color: "#7ec8e3", textDecoration: "none" }, children: "Blog ↗" })
                    ] })
                  ] }) : log.status === "skipped" ? /* @__PURE__ */ jsxs("div", { style: { color: "#7ec8e3", fontSize: "0.72rem" }, children: [
                    "⏭ No new data — Sacnilk hadn't updated yet.",
                    log.error && /* @__PURE__ */ jsx("span", { style: { color: "#555", marginLeft: 4 }, children: log.error })
                  ] }) : /* @__PURE__ */ jsx("div", { style: { color: "#e8876a" }, children: log.error || "Scrape failed" })
                ] })
              ] }, i)) }))
            ] })
          ]
        }
      )
    }
  );
}
function EmptyState({ icon, message, sub }) {
  return /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", padding: "44px 20px", color: "var(--muted)" }, children: [
    /* @__PURE__ */ jsx("div", { style: { fontSize: "2.4rem", marginBottom: 10 }, children: icon }),
    /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, fontSize: "0.88rem", marginBottom: 6 }, children: message }),
    sub && /* @__PURE__ */ jsx("div", { style: { fontSize: "0.76rem" }, children: sub })
  ] });
}
function SacnilkScraperPanel({ movies = [], onToast: parentToast }) {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [scraping, setScraping] = useState({});
  const [scrapingAll, setScrapingAll] = useState(false);
  const [logs, setLogs] = useState({});
  const [editUrl, setEditUrl] = useState({});
  const [blogDraft, setBlogDraft] = useState(null);
  const [generatingBlog, setGeneratingBlog] = useState({});
  const [query, setQuery] = useState("");
  const [dropResults, setDropResults] = useState([]);
  const [staged, setStaged] = useState({});
  const inputRef = useRef(null);
  const [toasts, setToasts] = useState([]);
  const parentToastRef = useRef(parentToast);
  const addToastRef = useRef(null);
  useEffect(() => {
    parentToastRef.current = parentToast;
  }, [parentToast]);
  const addToast = useCallback((message, type = "info") => {
    var _a;
    const id = Date.now();
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4e3);
    (_a = parentToastRef.current) == null ? void 0 : _a.call(parentToastRef, message, type);
  }, []);
  addToastRef.current = addToast;
  const [confirm, setConfirm] = useState(null);
  const [historyMovie, setHistoryMovie] = useState(null);
  const loadConfigs = useCallback(async () => {
    var _a;
    try {
      const data = await API.sacnilkGetConfigs();
      setConfigs(Array.isArray(data) ? data : []);
    } catch (e) {
      (_a = addToastRef.current) == null ? void 0 : _a.call(addToastRef, "Failed to load configs: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);
  const loadLogs = useCallback(async (movieId) => {
    try {
      const data = await API.sacnilkGetLogs(movieId);
      setLogs((p) => ({ ...p, [movieId]: Array.isArray(data) ? data : [] }));
    } catch {
    }
  }, []);
  const didMount = useRef(false);
  useEffect(() => {
    if (didMount.current) return;
    didMount.current = true;
    loadConfigs();
  }, []);
  const configByMovieId = useMemo(() => {
    const map = {};
    for (const c of configs) map[cfgMovieId(c)] = c;
    return map;
  }, [configs]);
  const movieById = useMemo(() => {
    const map = {};
    for (const m of movies) map[String(m._id)] = m;
    return map;
  }, [movies]);
  const trackedMovies = useMemo(
    () => configs.map((c) => {
      const mid = cfgMovieId(c).trim();
      const found = movieById[mid];
      return found || {
        _id: mid,
        title: c.movieTitle || `Movie (${mid.slice(-6)})`,
        boxOfficeDays: [],
        posterUrl: "",
        releaseDate: null
      };
    }),
    [configs, movieById]
  );
  const trackedIds = useMemo(() => new Set(configs.map(cfgMovieId)), [configs]);
  const untrackedMovies = useMemo(() => {
    const stagedIds = new Set(Object.keys(staged));
    return movies.filter(
      (m) => !trackedIds.has(String(m._id)) && !stagedIds.has(String(m._id))
    );
  }, [movies, trackedIds, staged]);
  const activeCount = configs.filter((c) => c.active).length;
  const trackedCount = configs.length;
  const pausedCount = trackedCount - activeCount;
  const stagedList = Object.values(staged);
  const totalDays = configs.reduce((s, c) => {
    var _a, _b;
    return s + (((_b = (_a = movieById[cfgMovieId(c)]) == null ? void 0 : _a.boxOfficeDays) == null ? void 0 : _b.length) || 0);
  }, 0);
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setDropResults([]);
      return;
    }
    setDropResults(
      untrackedMovies.filter((m) => m.title.toLowerCase().includes(q)).slice(0, 8)
    );
  }, [query, untrackedMovies]);
  const pickMovie = (movie) => {
    var _a;
    setStaged((p) => ({ ...p, [String(movie._id)]: { movie, url: movie.sacnilkUrl || "" } }));
    setQuery("");
    setDropResults([]);
    (_a = inputRef.current) == null ? void 0 : _a.focus();
  };
  const removeFromStaged = (id) => setStaged((p) => {
    const n = { ...p };
    delete n[id];
    return n;
  });
  const saveConfig = async (movieId, payload) => {
    setSaving((p) => ({ ...p, [movieId]: true }));
    try {
      await API.sacnilkSaveConfig(movieId, payload);
      addToast("Saved ✓", "success");
      await loadConfigs();
      setEditUrl((p) => {
        const n = { ...p };
        delete n[movieId];
        return n;
      });
    } catch (e) {
      addToast("Save failed: " + e.message, "error");
    } finally {
      setSaving((p) => ({ ...p, [movieId]: false }));
    }
  };
  const toggleActive = (movieId, cur) => saveConfig(movieId, { active: !cur });
  const confirmTracking = async (movieId) => {
    const entry = staged[movieId];
    if (!entry) return;
    const url = (entry.url || "").trim();
    if (!url) {
      addToast("Enter the Sacnilk URL first", "error");
      return;
    }
    if (!url.startsWith("http")) {
      addToast("URL must start with http:// or https://", "error");
      return;
    }
    setSaving((p) => ({ ...p, [movieId]: true }));
    try {
      await API.sacnilkSaveConfig(movieId, { sacnilkUrl: url, active: true });
      addToast(`Now tracking "${entry.movie.title}" ✓`, "success");
      removeFromStaged(movieId);
      await loadConfigs();
      await loadLogs(movieId);
    } catch (e) {
      addToast("Failed: " + e.message, "error");
    } finally {
      setSaving((p) => ({ ...p, [movieId]: false }));
    }
  };
  const stopTracking = (movieId, title) => {
    setConfirm({
      title: "Stop Scraping?",
      message: `Do you also want to generate the Final Box Office Analysis Blog for this movie?

This will create a comprehensive SEO-optimized article using the complete day-wise box office data stored in the database.`,
      icon: "⏸",
      cancelLabel: "Cancel",
      confirmLabel: "Yes, Generate Blog",
      confirmColor: "#4caf82",
      extraButton: {
        label: "No, Just Stop",
        color: "#888",
        onClick: async () => {
          setConfirm(null);
          await saveConfig(movieId, { active: false });
          addToast(`Tracking paused for "${title}"`, "warn");
        }
      },
      onConfirm: async () => {
        setConfirm(null);
        await saveConfig(movieId, { active: false });
        addToast(`Tracking paused for "${title}"`, "warn");
        setGeneratingBlog((p) => ({ ...p, [movieId]: true }));
        try {
          const draft = await API.sacnilkGenerateFinalBlogDraft(movieId);
          setBlogDraft(draft);
        } catch (e) {
          addToast("Failed to generate blog: " + e.message, "error");
        } finally {
          setGeneratingBlog((p) => ({ ...p, [movieId]: false }));
        }
      }
    });
  };
  const removeTracking = (movieId, title) => {
    setConfirm({
      title: "Remove from Tracking",
      message: `Remove "${title}" from the tracking list? Existing data is kept but the config will be deleted.`,
      icon: "🗑",
      confirmLabel: "Remove",
      confirmColor: "var(--red)",
      onConfirm: async () => {
        setConfirm(null);
        setSaving((p) => ({ ...p, [movieId]: true }));
        try {
          await API.sacnilkDeleteConfig(movieId);
          addToast(`Removed "${title}" from tracking`, "success");
          setLogs((p) => {
            const n = { ...p };
            delete n[movieId];
            return n;
          });
          await loadConfigs();
        } catch (e) {
          addToast("Delete failed: " + e.message, "error");
        } finally {
          setSaving((p) => ({ ...p, [movieId]: false }));
        }
      }
    });
  };
  const scrapeOne = async (movieId, title) => {
    setScraping((p) => ({ ...p, [movieId]: true }));
    try {
      const data = await API.sacnilkScrapeOne(movieId);
      if (data.skipped) {
        addToast(
          data.message || `⏭ "${title}" skipped — Sacnilk hasn't updated yet. Try again later.`,
          "warn"
        );
      } else {
        const netPart = data.netRaw ? `Net ${data.netRaw}` : "";
        const grossPart = data.grossRaw ? ` · Gross ${data.grossRaw}` : "";
        const datePart = data.date ? ` (${data.date})` : "";
        const msg = data.message || `✅ Day ${data.day}${datePart} — ${netPart}${grossPart}. Blog: /blog/${data.blogSlug}`;
        addToast(msg, "success");
      }
      await loadConfigs();
      await loadLogs(movieId);
    } catch (e) {
      addToast(`Scrape failed for "${title}": ` + e.message, "error");
    } finally {
      setScraping((p) => ({ ...p, [movieId]: false }));
    }
  };
  const trackAllActive = async () => {
    if (activeCount === 0) {
      addToast("No active movies to track", "warn");
      return;
    }
    setConfirm({
      title: "Track All Active Movies Now",
      message: `Immediately trigger scraping for all ${activeCount} active movie${activeCount > 1 ? "s" : ""}? This runs outside the scheduled 8:00 AM cycle.`,
      icon: "⚡",
      confirmLabel: `Run ${activeCount} Scrapes`,
      confirmColor: "#c9973a",
      onConfirm: async () => {
        setConfirm(null);
        setScrapingAll(true);
        try {
          const data = await API.sacnilkScrapeAll();
          addToast(
            `Batch done: ${data.success} success, ${data.failed} failed`,
            data.failed === 0 ? "success" : "warn"
          );
          await loadConfigs();
          for (const mid of Object.keys(logs)) await loadLogs(mid);
        } catch (e) {
          addToast("Batch scrape failed: " + e.message, "error");
        } finally {
          setScrapingAll(false);
        }
      }
    });
  };
  const openHistory = async (movie) => {
    const mid = String(movie._id);
    if (!logs[mid]) await loadLogs(mid);
    setHistoryMovie(movie);
  };
  if (loading) {
    return /* @__PURE__ */ jsxs("div", { style: { padding: 60, textAlign: "center", color: "var(--muted)" }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontSize: "2rem", marginBottom: 12 }, children: "⏳" }),
      /* @__PURE__ */ jsx("div", { style: { fontSize: "0.9rem" }, children: "Loading tracker configs…" })
    ] });
  }
  return /* @__PURE__ */ jsxs("div", { style: { padding: "0 28px 80px" }, children: [
    /* @__PURE__ */ jsx("style", { children: `
        @keyframes fadeInUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        .ssp-row-btn { background:none; border:1px solid var(--border); color:var(--muted); cursor:pointer; border-radius:8px; padding:7px 13px; font-size:0.74rem; font-weight:600; transition:all 0.15s; }
        .ssp-row-btn:hover { border-color:#c9973a; color:#c9973a; background:rgba(201,151,58,0.06); }
        .ssp-row-btn.danger:hover { border-color:#e8876a; color:#e8876a; background:rgba(232,135,106,0.06); }
        .ssp-row-btn.stop:hover { border-color:#888; color:#ccc; background:rgba(255,255,255,0.04); }
        .ssp-row-btn:disabled { opacity:0.35; cursor:not-allowed; }
        .ssp-scrape-btn { background:rgba(201,151,58,0.12); color:#c9973a; border:1px solid rgba(201,151,58,0.3); border-radius:8px; padding:7px 14px; font-size:0.78rem; font-weight:700; cursor:pointer; transition:all 0.15s; }
        .ssp-scrape-btn:hover:not(:disabled) { background:rgba(201,151,58,0.22); }
        .ssp-scrape-btn:disabled { opacity:0.35; cursor:not-allowed; }
      ` }),
    /* @__PURE__ */ jsxs("div", { style: {
      position: "sticky",
      top: 0,
      zIndex: 50,
      background: "var(--bg1)",
      padding: "14px 28px",
      margin: "0 -28px 28px",
      boxShadow: "0 2px 24px rgba(0,0,0,0.55)",
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap"
    }, children: [
      /* @__PURE__ */ jsx("h2", { style: { fontSize: "1.3rem", margin: 0, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }, children: "🕷️ Sacnilk Tracker" }),
      /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.69rem", color: "var(--muted)", background: "var(--bg3)", padding: "3px 10px", borderRadius: 12, fontWeight: 600 }, children: [
        trackedCount,
        " tracked · ",
        activeCount,
        " active"
      ] }),
      /* @__PURE__ */ jsx("span", { style: { fontSize: "0.67rem", color: "#4caf82", background: "rgba(76,175,130,0.08)", padding: "3px 10px", borderRadius: 10, border: "1px solid rgba(76,175,130,0.2)", fontWeight: 700 }, children: "⏰ 8:00 AM IST daily" }),
      stagedList.length > 0 && /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.67rem", color: "#c9973a", background: "rgba(201,151,58,0.1)", padding: "3px 10px", borderRadius: 10, border: "1px solid rgba(201,151,58,0.25)", fontWeight: 700 }, children: [
        "📋 ",
        stagedList.length,
        " pending"
      ] }),
      /* @__PURE__ */ jsx("div", { style: { flex: 1 } }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: trackAllActive,
          disabled: scrapingAll || activeCount === 0,
          style: {
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "9px 18px",
            borderRadius: 9,
            background: scrapingAll ? "rgba(201,151,58,0.08)" : "linear-gradient(135deg, rgba(201,151,58,0.18) 0%, rgba(201,151,58,0.1) 100%)",
            border: "1px solid rgba(201,151,58,0.4)",
            color: "#c9973a",
            fontWeight: 700,
            fontSize: "0.82rem",
            cursor: activeCount === 0 ? "not-allowed" : "pointer",
            opacity: activeCount === 0 ? 0.4 : 1,
            transition: "all 0.15s"
          },
          children: scrapingAll ? /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx("span", { style: { display: "inline-block", animation: "spin 1s linear infinite" }, children: "⚙️" }),
            "Running all…"
          ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
            "⚡ Track All Active Now (",
            activeCount,
            ")"
          ] })
        }
      )
    ] }),
    trackedCount > 0 && /* @__PURE__ */ jsx("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(130px,1fr))", gap: 10, marginBottom: 30 }, children: [
      { label: "Tracked", value: trackedCount, icon: "🎬", color: "#c9973a" },
      { label: "Active", value: activeCount, icon: "✅", color: "#4caf82" },
      { label: "Paused", value: pausedCount, icon: "⏸", color: "#888" },
      { label: "Days Recorded", value: totalDays, icon: "📊", color: "#7ec8e3" }
    ].map(({ label, value, icon, color }) => /* @__PURE__ */ jsxs("div", { style: {
      background: "var(--bg2)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "14px 16px"
    }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontSize: "1.1rem", marginBottom: 4 }, children: icon }),
      /* @__PURE__ */ jsx("div", { style: { fontSize: "1.45rem", fontWeight: 800, color, lineHeight: 1 }, children: value }),
      /* @__PURE__ */ jsx("div", { style: { fontSize: "0.67rem", color: "var(--muted)", fontWeight: 600, marginTop: 4 }, children: label })
    ] }, label)) }),
    /* @__PURE__ */ jsxs("section", { style: { marginBottom: 32 }, children: [
      /* @__PURE__ */ jsx(
        SectionHeader,
        {
          icon: "🔍",
          title: "Add Movie to Track",
          subtitle: "Search your movie database, enter the Sacnilk URL, and start tracking",
          badge: `${untrackedMovies.length} available`
        }
      ),
      /* @__PURE__ */ jsxs("div", { style: { position: "relative" }, children: [
        /* @__PURE__ */ jsx("span", { style: { position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }, children: "🔍" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            ref: inputRef,
            className: "form-input",
            style: { paddingLeft: 38, width: "100%", fontSize: "0.9rem" },
            placeholder: "Search movies by name…",
            value: query,
            onChange: (e) => setQuery(e.target.value)
          }
        ),
        query && /* @__PURE__ */ jsx("button", { onClick: () => {
          setQuery("");
          setDropResults([]);
        }, style: { position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "1rem" }, children: "✕" })
      ] }),
      dropResults.length > 0 && /* @__PURE__ */ jsx("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", marginTop: 6, boxShadow: "0 8px 32px rgba(0,0,0,0.45)" }, children: dropResults.map((movie, idx) => /* @__PURE__ */ jsxs(
        "div",
        {
          onClick: () => pickMovie(movie),
          style: {
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 16px",
            cursor: "pointer",
            borderTop: idx > 0 ? "1px solid var(--border)" : "none",
            transition: "background 0.1s"
          },
          onMouseEnter: (e) => e.currentTarget.style.background = "var(--bg3)",
          onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
          children: [
            /* @__PURE__ */ jsx(Poster, { movie, size: 30 }),
            /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
              /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, fontSize: "0.88rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: movie.title }),
              /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.7rem", color: "var(--muted)", display: "flex", gap: 8 }, children: [
                /* @__PURE__ */ jsx("span", { children: movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "TBA" }),
                movie.sacnilkUrl && /* @__PURE__ */ jsx("span", { style: { color: "#4caf82", fontWeight: 600 }, children: "✓ URL saved" })
              ] })
            ] }),
            /* @__PURE__ */ jsx("span", { style: { fontSize: "0.72rem", fontWeight: 700, color: "#c9973a", background: "rgba(201,151,58,0.1)", border: "1px solid rgba(201,151,58,0.25)", borderRadius: 8, padding: "3px 10px", flexShrink: 0 }, children: "+ Select" })
          ]
        },
        String(movie._id)
      )) }),
      query.trim() && dropResults.length === 0 && /* @__PURE__ */ jsxs("div", { style: { padding: "10px 14px", color: "var(--muted)", fontSize: "0.82rem", background: "var(--bg2)", borderRadius: 10, border: "1px solid var(--border)", marginTop: 6 }, children: [
        'No untracked movies match "',
        query,
        '"'
      ] })
    ] }),
    stagedList.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(Divider, { label: "Pending Confirmation" }),
      /* @__PURE__ */ jsxs("section", { style: { marginBottom: 32 }, children: [
        /* @__PURE__ */ jsx(
          SectionHeader,
          {
            icon: "📋",
            title: "Selected Movies",
            subtitle: "Enter the Sacnilk URL and confirm to begin tracking",
            badge: `${stagedList.length} pending`,
            badgeColor: "#c9973a",
            iconBg: "rgba(201,151,58,0.12)",
            iconBorder: "rgba(201,151,58,0.35)"
          }
        ),
        /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: stagedList.map(({ movie, url }) => {
          const id = String(movie._id);
          const isSav = saving[id];
          const autoFilled = !!movie.sacnilkUrl && url === movie.sacnilkUrl;
          const urlValid = url.trim().startsWith("http");
          return /* @__PURE__ */ jsxs("div", { style: {
            background: "var(--bg2)",
            border: "1px solid rgba(201,151,58,0.3)",
            borderRadius: 13,
            overflow: "hidden",
            animation: "fadeInUp 0.2s ease"
          }, children: [
            /* @__PURE__ */ jsx("div", { style: { height: 2, background: "linear-gradient(90deg,rgba(201,151,58,0.7) 0%,transparent 70%)" } }),
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", flexWrap: "wrap" }, children: [
              /* @__PURE__ */ jsx(Poster, { movie, size: 44 }),
              /* @__PURE__ */ jsxs("div", { style: { flex: "0 0 auto", minWidth: 120 }, children: [
                /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, fontSize: "0.92rem" }, children: movie.title }),
                /* @__PURE__ */ jsx("div", { style: { fontSize: "0.7rem", color: "var(--muted)", marginTop: 2 }, children: movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "TBA" })
              ] }),
              /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 240 }, children: [
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    className: "form-input",
                    style: {
                      width: "100%",
                      fontSize: "0.8rem",
                      padding: "8px 12px",
                      borderColor: url && urlValid ? "rgba(76,175,130,0.5)" : url && !urlValid ? "rgba(232,135,106,0.5)" : void 0
                    },
                    placeholder: "https://www.sacnilk.com/movie/MovieName_2026",
                    value: url,
                    onChange: (e) => setStaged((p) => ({ ...p, [id]: { ...p[id], url: e.target.value } })),
                    onKeyDown: (e) => e.key === "Enter" && confirmTracking(id)
                  }
                ),
                autoFilled && /* @__PURE__ */ jsx("div", { style: { fontSize: "0.67rem", color: "#4caf82", marginTop: 3 }, children: "✓ Auto-filled from movie data" }),
                url && !urlValid && /* @__PURE__ */ jsx("div", { style: { fontSize: "0.67rem", color: "#e8876a", marginTop: 3 }, children: "⚠ URL must start with https://" })
              ] }),
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }, children: [
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    className: "btn btn-sm btn-gold",
                    onClick: () => confirmTracking(id),
                    disabled: isSav || !urlValid,
                    style: { opacity: !urlValid ? 0.4 : 1, padding: "8px 16px", fontSize: "0.8rem" },
                    children: isSav ? "⏳ Saving…" : "✓ Start Tracking"
                  }
                ),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => removeFromStaged(id),
                    className: "ssp-row-btn danger",
                    children: "✕ Remove"
                  }
                )
              ] })
            ] })
          ] }, id);
        }) })
      ] })
    ] }),
    /* @__PURE__ */ jsx(Divider, { label: "Currently Tracking" }),
    /* @__PURE__ */ jsxs("section", { children: [
      /* @__PURE__ */ jsx(
        SectionHeader,
        {
          icon: "📡",
          title: "Currently Tracking",
          subtitle: "Stop Tracking pauses scheduled runs while keeping all history. Remove deletes the config.",
          badge: `${trackedCount} movies · ${activeCount} active`,
          badgeColor: "#4caf82",
          badgeBg: "rgba(76,175,130,0.08)",
          iconBg: "rgba(76,175,130,0.12)",
          iconBorder: "rgba(76,175,130,0.3)"
        }
      ),
      trackedMovies.length === 0 ? /* @__PURE__ */ jsx(
        EmptyState,
        {
          icon: "📡",
          message: "No movies being tracked yet.",
          sub: "Use the search above to add your first movie."
        }
      ) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }, children: [
          /* @__PURE__ */ jsxs("div", { style: {
            display: "grid",
            gridTemplateColumns: "2fr 2.2fr 110px 1.6fr auto",
            gap: 0,
            padding: "10px 18px",
            background: "rgba(0,0,0,0.2)",
            borderBottom: "1px solid var(--border)",
            fontSize: "0.67rem",
            fontWeight: 700,
            color: "var(--muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em"
          }, children: [
            /* @__PURE__ */ jsx("span", { children: "Movie" }),
            /* @__PURE__ */ jsx("span", { children: "Sacnilk URL" }),
            /* @__PURE__ */ jsx("span", { children: "Status" }),
            /* @__PURE__ */ jsx("span", { children: "Last Tracked" }),
            /* @__PURE__ */ jsx("span", { style: { textAlign: "right" }, children: "Actions" })
          ] }),
          /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column" }, children: trackedMovies.map((movie, rowIdx) => {
            const mid = String(movie._id).trim();
            const cfg = configByMovieId[mid] || configs.find((c) => cfgMovieId(c).trim() === mid);
            if (!cfg) return null;
            const isSav = saving[mid];
            const isScrp = scraping[mid];
            const lastLog = cfg == null ? void 0 : cfg.lastLog;
            const daysCount = (movie.boxOfficeDays || []).length;
            const inEdit = editUrl[mid] !== void 0;
            const urlVal = inEdit ? editUrl[mid] : (cfg == null ? void 0 : cfg.sacnilkUrl) || "";
            const statusPill = !cfg.sacnilkUrl ? { label: "No URL", color: "#e8876a", bg: "rgba(232,135,106,0.1)", border: "rgba(232,135,106,0.3)" } : cfg.active ? { label: "Active", color: "#4caf82", bg: "rgba(76,175,130,0.1)", border: "rgba(76,175,130,0.3)" } : { label: "Paused", color: "#888", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.12)" };
            return /* @__PURE__ */ jsxs(
              "div",
              {
                style: { borderTop: rowIdx > 0 ? "1px solid var(--border)" : "none", transition: "background 0.1s" },
                onMouseEnter: (e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.015)";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.background = "transparent";
                },
                children: [
                  cfg.active && rowIdx === 0 && /* @__PURE__ */ jsx("div", { style: { height: 2, background: "linear-gradient(90deg,#4caf82 0%,transparent 60%)" } }),
                  /* @__PURE__ */ jsxs("div", { style: {
                    display: "grid",
                    gridTemplateColumns: "2fr 2.2fr 110px 1.6fr auto",
                    gap: 0,
                    alignItems: "center",
                    padding: "14px 18px"
                  }, children: [
                    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, minWidth: 0, paddingRight: 12 }, children: [
                      /* @__PURE__ */ jsx(Poster, { movie, size: 36 }),
                      /* @__PURE__ */ jsxs("div", { style: { minWidth: 0 }, children: [
                        /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, fontSize: "0.88rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: movie.title }),
                        /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.67rem", color: "var(--muted)", marginTop: 2, display: "flex", gap: 6 }, children: [
                          movie.releaseDate && /* @__PURE__ */ jsx("span", { children: new Date(movie.releaseDate).getFullYear() }),
                          daysCount > 0 && /* @__PURE__ */ jsxs("span", { style: { color: "#c9973a", fontWeight: 600 }, children: [
                            daysCount,
                            "d"
                          ] })
                        ] })
                      ] })
                    ] }),
                    /* @__PURE__ */ jsx("div", { style: { paddingRight: 12, minWidth: 0 }, children: inEdit ? /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, alignItems: "center" }, children: [
                      /* @__PURE__ */ jsx(
                        "input",
                        {
                          autoFocus: true,
                          className: "form-input",
                          style: { flex: 1, fontSize: "0.74rem", padding: "5px 9px" },
                          value: urlVal,
                          onChange: (e) => setEditUrl((p) => ({ ...p, [mid]: e.target.value })),
                          placeholder: "https://www.sacnilk.com/movie/…",
                          onKeyDown: (e) => e.key === "Enter" && saveConfig(mid, { sacnilkUrl: urlVal })
                        }
                      ),
                      /* @__PURE__ */ jsx("button", { className: "btn btn-sm btn-gold", onClick: () => saveConfig(mid, { sacnilkUrl: urlVal }), disabled: isSav, style: { fontSize: "0.72rem", padding: "5px 10px", flexShrink: 0 }, children: isSav ? "…" : "Save" }),
                      /* @__PURE__ */ jsx("button", { onClick: () => setEditUrl((p) => {
                        const n = { ...p };
                        delete n[mid];
                        return n;
                      }), style: { background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.8rem", flexShrink: 0 }, children: "✕" })
                    ] }) : /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
                      cfg.sacnilkUrl ? /* @__PURE__ */ jsx(
                        "a",
                        {
                          href: cfg.sacnilkUrl,
                          target: "_blank",
                          rel: "noreferrer",
                          style: { color: "#7ec8e3", textDecoration: "none", fontSize: "0.74rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1, maxWidth: 200 },
                          title: cfg.sacnilkUrl,
                          children: cfg.sacnilkUrl.replace("https://www.sacnilk.com/", "…/")
                        }
                      ) : /* @__PURE__ */ jsx("span", { style: { color: "#e8876a", fontSize: "0.72rem", fontWeight: 600 }, children: "⚠ No URL" }),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          onClick: () => setEditUrl((p) => ({ ...p, [mid]: cfg.sacnilkUrl || "" })),
                          style: { background: "none", border: "1px solid var(--border)", borderRadius: 5, color: "var(--muted)", cursor: "pointer", fontSize: "0.67rem", padding: "2px 8px", flexShrink: 0 },
                          children: "✏️"
                        }
                      )
                    ] }) }),
                    /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsxs(
                      "div",
                      {
                        onClick: () => !isSav && cfg.sacnilkUrl && toggleActive(mid, cfg.active),
                        title: cfg.active ? "Click to pause" : cfg.sacnilkUrl ? "Click to activate" : "Set URL first",
                        style: {
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          background: statusPill.bg,
                          border: `1px solid ${statusPill.border}`,
                          borderRadius: 8,
                          padding: "4px 10px",
                          fontSize: "0.71rem",
                          fontWeight: 700,
                          color: statusPill.color,
                          cursor: isSav || !cfg.sacnilkUrl ? "default" : "pointer",
                          opacity: isSav ? 0.5 : 1,
                          userSelect: "none"
                        },
                        children: [
                          cfg.sacnilkUrl && /* @__PURE__ */ jsx("div", { style: { width: 22, height: 11, borderRadius: 999, background: cfg.active ? "#4caf82" : "#444", position: "relative", flexShrink: 0 }, children: /* @__PURE__ */ jsx("div", { style: { position: "absolute", top: 2, left: cfg.active ? 12 : 2, width: 7, height: 7, borderRadius: "50%", background: "#fff", transition: "left 0.2s" } }) }),
                          statusPill.label
                        ]
                      }
                    ) }),
                    /* @__PURE__ */ jsx("div", { style: { paddingRight: 12 }, children: (lastLog == null ? void 0 : lastLog.runAt) ? /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.7rem", color: sc(lastLog.status), display: "flex", alignItems: "center", gap: 4 }, children: [
                        /* @__PURE__ */ jsx("span", { children: si(lastLog.status) }),
                        /* @__PURE__ */ jsx("span", { children: fmtDate(lastLog.runAt) })
                      ] }),
                      lastLog.status === "success" && lastLog.net && /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.67rem", color: "#c9973a", marginTop: 2 }, children: [
                        "Day ",
                        lastLog.day,
                        " → Net ",
                        lastLog.net,
                        lastLog.gross && /* @__PURE__ */ jsxs("span", { style: { color: "#7ec8e3", marginLeft: 4 }, children: [
                          "· Gross ",
                          lastLog.gross
                        ] })
                      ] }),
                      lastLog.status === "error" && /* @__PURE__ */ jsx("div", { style: { fontSize: "0.67rem", color: "#e8876a", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }, children: lastLog.error })
                    ] }) : /* @__PURE__ */ jsx("span", { style: { color: "var(--muted)", fontSize: "0.73rem" }, children: "Never scraped" }) }),
                    /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end", flexWrap: "nowrap" }, children: [
                      /* @__PURE__ */ jsxs(
                        "button",
                        {
                          className: "ssp-row-btn",
                          onClick: () => openHistory(movie),
                          title: "View tracking history",
                          disabled: isSav,
                          children: [
                            "📈 History",
                            daysCount > 0 ? ` (${daysCount})` : ""
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          className: "ssp-scrape-btn",
                          onClick: () => scrapeOne(mid, movie.title),
                          disabled: isScrp || !cfg.sacnilkUrl || isSav,
                          title: !cfg.sacnilkUrl ? "Set URL first" : "Scrape now",
                          children: isScrp ? /* @__PURE__ */ jsxs(Fragment, { children: [
                            /* @__PURE__ */ jsx("span", { style: { display: "inline-block", animation: "spin 1s linear infinite" }, children: "⚙️" }),
                            " Running…"
                          ] }) : "⚡ Trigger"
                        }
                      ),
                      cfg.active ? /* @__PURE__ */ jsx(
                        "button",
                        {
                          className: "ssp-row-btn stop",
                          onClick: () => stopTracking(mid, movie.title),
                          disabled: isSav,
                          title: "Pause scheduled tracking (keep history)",
                          children: "⏸ Stop"
                        }
                      ) : /* @__PURE__ */ jsx(
                        "button",
                        {
                          className: "ssp-row-btn",
                          onClick: () => cfg.sacnilkUrl && toggleActive(mid, false),
                          disabled: isSav || !cfg.sacnilkUrl,
                          title: "Resume tracking",
                          style: { color: "#4caf82", borderColor: "rgba(76,175,130,0.3)" },
                          children: "▶ Resume"
                        }
                      ),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          className: "ssp-row-btn danger",
                          onClick: () => removeTracking(mid, movie.title),
                          disabled: isSav,
                          title: "Remove config entirely",
                          children: "🗑"
                        }
                      )
                    ] })
                  ] })
                ]
              },
              mid
            );
          }) })
        ] }),
        /* @__PURE__ */ jsxs("p", { style: { fontSize: "0.68rem", color: "var(--muted)", marginTop: 10, textAlign: "right" }, children: [
          trackedCount,
          " movie",
          trackedCount !== 1 ? "s" : "",
          " tracked · ",
          totalDays,
          " days recorded"
        ] })
      ] })
    ] }),
    movies.length === 0 && /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", padding: "60px 0", color: "var(--muted)", marginTop: 32 }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontSize: "3rem", marginBottom: 12 }, children: "🎬" }),
      "No movies in the database. Add movies from the Movies tab first."
    ] }),
    confirm && /* @__PURE__ */ jsx(
      ConfirmDialog,
      {
        title: confirm.title,
        message: confirm.message,
        icon: confirm.icon,
        confirmLabel: confirm.confirmLabel,
        confirmColor: confirm.confirmColor,
        onConfirm: confirm.onConfirm,
        onCancel: () => setConfirm(null)
      }
    ),
    historyMovie && /* @__PURE__ */ jsx(
      HistoryPanel,
      {
        movie: historyMovie,
        logs: logs[String(historyMovie._id)],
        onClose: () => setHistoryMovie(null)
      }
    ),
    blogDraft && /* @__PURE__ */ jsx(
      "div",
      {
        style: {
          position: "fixed",
          inset: 0,
          zIndex: 1e3,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20
        },
        children: /* @__PURE__ */ jsxs(
          "div",
          {
            style: {
              background: "var(--bg1)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              width: "100%",
              maxWidth: 800,
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)"
            },
            children: [
              /* @__PURE__ */ jsxs("div", { style: { padding: "18px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
                /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: 8 }, children: "📝 Final Box Office Analysis Draft" }),
                /* @__PURE__ */ jsx("button", { onClick: () => setBlogDraft(null), style: { background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "1.2rem" }, children: "✕" })
              ] }),
              /* @__PURE__ */ jsxs("div", { style: { flex: 1, overflowY: "auto", padding: "20px 24px" }, children: [
                /* @__PURE__ */ jsxs("div", { style: { marginBottom: 16 }, children: [
                  /* @__PURE__ */ jsx("div", { style: { fontSize: "0.75rem", color: "var(--muted)", fontWeight: 700, marginBottom: 4 }, children: "SEO TITLE" }),
                  /* @__PURE__ */ jsx("div", { style: { background: "var(--bg2)", padding: "10px 14px", borderRadius: 8, fontSize: "0.95rem", fontWeight: 800 }, children: blogDraft.seoTitle })
                ] }),
                /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }, children: [
                  /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 200 }, children: [
                    /* @__PURE__ */ jsx("div", { style: { fontSize: "0.75rem", color: "var(--muted)", fontWeight: 700, marginBottom: 4 }, children: "URL SLUG" }),
                    /* @__PURE__ */ jsx("div", { style: { background: "var(--bg2)", padding: "10px 14px", borderRadius: 8, fontSize: "0.85rem", color: "#4caf82", wordBreak: "break-all" }, children: blogDraft.slug })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 200 }, children: [
                    /* @__PURE__ */ jsx("div", { style: { fontSize: "0.75rem", color: "var(--muted)", fontWeight: 700, marginBottom: 4 }, children: "KEYWORDS" }),
                    /* @__PURE__ */ jsx("div", { style: { background: "var(--bg2)", padding: "10px 14px", borderRadius: 8, fontSize: "0.8rem", color: "var(--muted)" }, children: (blogDraft.keywords || []).join(", ") })
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { style: { marginBottom: 16 }, children: [
                  /* @__PURE__ */ jsx("div", { style: { fontSize: "0.75rem", color: "var(--muted)", fontWeight: 700, marginBottom: 4 }, children: "META DESCRIPTION" }),
                  /* @__PURE__ */ jsx("div", { style: { background: "var(--bg2)", padding: "10px 14px", borderRadius: 8, fontSize: "0.85rem", color: "var(--text)" }, children: blogDraft.metaDescription })
                ] }),
                /* @__PURE__ */ jsx("div", { style: { fontSize: "0.75rem", color: "var(--muted)", fontWeight: 700, marginBottom: 8, marginTop: 24 }, children: "ARTICLE PREVIEW (HTML)" }),
                /* @__PURE__ */ jsx(
                  "div",
                  {
                    style: { background: "var(--bg2)", padding: "20px 24px", borderRadius: 12, border: "1px solid var(--border)", color: "#eee", fontSize: "0.95rem" },
                    dangerouslySetInnerHTML: { __html: blogDraft.htmlContent }
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs("div", { style: { padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 12, justifyContent: "flex-end", background: "var(--bg2)", borderRadius: "0 0 16px 16px" }, children: [
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: () => setBlogDraft(null),
                    style: { padding: "9px 20px", borderRadius: 9, background: "var(--bg3)", border: "1px solid var(--border)", color: "var(--text)", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 },
                    children: "Discard"
                  }
                ),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    onClick: async () => {
                      try {
                        const res = await API.sacnilkPublishFinalBlog(blogDraft.movieId, blogDraft);
                        addToast("Final Blog published successfully!", "success");
                        setBlogDraft(null);
                      } catch (e) {
                        addToast("Failed to publish blog: " + e.message, "error");
                      }
                    },
                    style: { padding: "9px 24px", borderRadius: 9, background: "#4caf82", border: "none", color: "#fff", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700 },
                    children: "Approve & Publish"
                  }
                )
              ] })
            ]
          }
        )
      }
    ),
    /* @__PURE__ */ jsx(Toast, { toasts })
  ] });
}
export {
  SacnilkScraperPanel as default
};
