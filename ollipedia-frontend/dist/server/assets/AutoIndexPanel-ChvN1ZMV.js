import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { g as getAdminToken } from "../entry-server.js";
import "react-dom/server";
import "react-router-dom/server.mjs";
import "react-helmet-async";
import "react-router-dom";
const BASE = "http://localhost:4000/api";
const adminPost = async (path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAdminToken()}`
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
};
function AutoIndexPanel({ onToast }) {
  const [singleUrl, setSingleUrl] = useState("");
  const [batchText, setBatchText] = useState("");
  const [mode, setMode] = useState("single");
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState([]);
  const addLog = (url, ok) => setLog((prev) => [{ url, ok, time: (/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN") }, ...prev].slice(0, 30));
  const handleIndex = async () => {
    const urls = mode === "batch" ? batchText.split("\n").map((u) => u.trim()).filter(Boolean) : [singleUrl.trim()].filter(Boolean);
    if (!urls.length) {
      onToast == null ? void 0 : onToast("Enter at least one URL", "error");
      return;
    }
    setLoading(true);
    try {
      const data = await adminPost("/admin/auto-index", { urls });
      urls.forEach((u) => addLog(u, true));
      onToast == null ? void 0 : onToast(`✅ Indexed ${data.indexed} URL${data.indexed > 1 ? "s" : ""}`, "success");
      if (mode === "single") setSingleUrl("");
      else setBatchText("");
    } catch (e) {
      urls.forEach((u) => addLog(u, false));
      onToast == null ? void 0 : onToast("❌ " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };
  const s = {
    card: { background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px", marginBottom: 18 },
    label: { fontSize: "0.72rem", color: "var(--muted)", marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 },
    input: { width: "100%", boxSizing: "border-box", background: "rgba(0,0,0,0.25)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", color: "var(--text)", fontSize: "0.83rem", fontFamily: "monospace", outline: "none" },
    btn: { background: "var(--gold)", color: "#000", border: "none", borderRadius: 8, padding: "10px 22px", fontWeight: 800, fontSize: "0.82rem", cursor: "pointer", marginTop: 12 },
    btnGhost: { background: "rgba(255,255,255,0.05)", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 12px", fontSize: "0.7rem", cursor: "pointer" },
    code: { background: "rgba(0,0,0,0.35)", borderRadius: 8, padding: "12px 14px", fontFamily: "monospace", fontSize: "0.76rem", overflowX: "auto", lineHeight: 1.7, whiteSpace: "pre" },
    dot: (ok) => ({ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: ok ? "#4caf7d" : "#e87a6a", marginRight: 6, flexShrink: 0 })
  };
  return /* @__PURE__ */ jsxs("div", { style: { padding: "4px 0", color: "var(--text)", fontFamily: "inherit" }, children: [
    /* @__PURE__ */ jsxs("div", { style: { marginBottom: 20 }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, fontSize: "1.12rem", marginBottom: 4 }, children: "📡 Auto-Indexing" }),
      /* @__PURE__ */ jsx("div", { style: { fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.6 }, children: "Ping Google & Bing instantly after publishing — no Search Console clicking needed." })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { ...s.card, background: "rgba(201,151,58,0.05)", border: "1px solid rgba(201,151,58,0.2)" }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, color: "var(--gold)", marginBottom: 10, fontSize: "0.85rem" }, children: "🔧 Add to your .env (one-time)" }),
      /* @__PURE__ */ jsx("div", { style: s.code, children: `SITE_URL=https://www.ollypedia.in
GOOGLE_KEY_FILE=./google-service-account.json
BING_API_KEY=your_bing_api_key_here` }),
      /* @__PURE__ */ jsxs("div", { style: { marginTop: 10, fontSize: "0.73rem", color: "var(--muted)", lineHeight: 1.7 }, children: [
        "Google key →",
        " ",
        /* @__PURE__ */ jsx("a", { href: "https://console.cloud.google.com", target: "_blank", rel: "noreferrer", style: { color: "var(--gold)" }, children: "console.cloud.google.com" }),
        " ",
        "→ Enable Indexing API → Service Accounts → Download JSON → add email as OWNER in Search Console",
        /* @__PURE__ */ jsx("br", {}),
        "Bing key →",
        " ",
        /* @__PURE__ */ jsx("a", { href: "https://www.bing.com/webmasters", target: "_blank", rel: "noreferrer", style: { color: "var(--gold)" }, children: "bing.com/webmasters" }),
        " ",
        "→ Settings → API Access → Generate Key"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: s.card, children: [
      /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, fontSize: "0.85rem", marginBottom: 10 }, children: "✅ Add this inside POST /api/admin/movies/:id/boxoffice-days in server.js" }),
      /* @__PURE__ */ jsx("div", { style: s.code, children: `// After  await movie.save({ validateBeforeSave: false });
// Add this one line:
autoIndexUrl(\`/\${movie.slug}-day-\${dayNum}-box-office-collection\`).catch(() => {});` }),
      /* @__PURE__ */ jsx("div", { style: { fontSize: "0.73rem", color: "var(--muted)", marginTop: 8 }, children: "This pings Google every time you add a new day's collection — no extra clicks needed." })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: s.card, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }, children: [
        /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, fontSize: "0.85rem" }, children: mode === "batch" ? "📦 Batch index" : "🔗 Manual re-index" }),
        /* @__PURE__ */ jsxs("button", { style: s.btnGhost, onClick: () => setMode((m) => m === "single" ? "batch" : "single"), children: [
          "Switch to ",
          mode === "single" ? "batch" : "single"
        ] })
      ] }),
      mode === "batch" ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("span", { style: s.label, children: "One URL per line" }),
        /* @__PURE__ */ jsx(
          "textarea",
          {
            rows: 5,
            value: batchText,
            onChange: (e) => setBatchText(e.target.value),
            placeholder: "/mehermunda-2026-day-1-box-office-collection\n/mehermunda-2026-day-2-box-office-collection",
            style: { ...s.input, resize: "vertical" }
          }
        )
      ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("span", { style: s.label, children: "Slug or full URL" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            value: singleUrl,
            onChange: (e) => setSingleUrl(e.target.value),
            onKeyDown: (e) => e.key === "Enter" && handleIndex(),
            placeholder: "/mehermunda-2026-day-25-box-office-collection",
            style: s.input
          }
        )
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: handleIndex,
          disabled: loading,
          style: { ...s.btn, opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer" },
          children: loading ? "⏳ Pinging…" : "📡 Index Now"
        }
      )
    ] }),
    log.length > 0 && /* @__PURE__ */ jsxs("div", { style: s.card, children: [
      /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, fontSize: "0.85rem", marginBottom: 12 }, children: "Recent Pings" }),
      /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: log.map((entry, i) => /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", fontSize: "0.77rem", gap: 6 }, children: [
        /* @__PURE__ */ jsx("span", { style: s.dot(entry.ok) }),
        /* @__PURE__ */ jsx("span", { style: { fontFamily: "monospace", color: "var(--muted)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: entry.url }),
        /* @__PURE__ */ jsx("span", { style: { color: "var(--muted)", fontSize: "0.68rem", flexShrink: 0 }, children: entry.time })
      ] }, i)) })
    ] })
  ] });
}
export {
  AutoIndexPanel as default
};
