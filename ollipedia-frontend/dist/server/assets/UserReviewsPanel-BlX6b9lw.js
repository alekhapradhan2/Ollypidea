import { jsxs, jsx } from "react/jsx-runtime";
import { useState, useCallback, useEffect } from "react";
import { A as API } from "../entry-server.js";
import "react-dom/server";
import "react-router-dom/server.mjs";
import "react-helmet-async";
import "react-router-dom";
const SITE_URL = "https://ollypedia.in";
const API_BASE = "http://localhost:4000/api";
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
function drawStar(ctx, cx, cy, r, stroke, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = i * Math.PI / 5 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.42;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  if (fill !== "none") {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}
const loadProxiedImage = (srcUrl) => new Promise((resolve) => {
  if (!srcUrl) return resolve(null);
  const proxyUrl = srcUrl.startsWith("data:") || srcUrl.startsWith("blob:") ? srcUrl : `${API_BASE}/img-proxy?url=${encodeURIComponent(srcUrl)}`;
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => resolve(img);
  img.onerror = () => {
    const img2 = new Image();
    img2.crossOrigin = "anonymous";
    img2.onload = () => resolve(img2);
    img2.onerror = () => resolve(null);
    img2.src = srcUrl;
  };
  img.src = proxyUrl;
});
function UserReviewsPanel({ movies = [], onToast }) {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    totalReviews: 0,
    uniqueUsers: 0,
    avgRating: "0.0",
    topMovie: "N/A"
  });
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedReviewModal, setSelectedReviewModal] = useState(null);
  const [expandedReviews, setExpandedReviews] = useState(/* @__PURE__ */ new Set());
  const [search, setSearch] = useState("");
  const [selectedMovie, setSelectedMovie] = useState("");
  const [selectedRating, setSelectedRating] = useState("");
  const [datePreset, setDatePreset] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;
  const toggleExpand = (reviewId) => {
    setExpandedReviews((prev) => {
      const next = new Set(prev);
      if (next.has(reviewId)) next.delete(reviewId);
      else next.add(reviewId);
      return next;
    });
  };
  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      let params = {};
      if (search.trim()) params.search = search.trim();
      if (selectedMovie) params.movieId = selectedMovie;
      if (selectedRating) params.rating = selectedRating;
      if (sort) params.sort = sort;
      let fDate = fromDate;
      let tDate = toDate;
      if (datePreset === "today") {
        const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        fDate = todayStr;
        tDate = todayStr;
      } else if (datePreset === "week") {
        const d = /* @__PURE__ */ new Date();
        d.setDate(d.getDate() - 7);
        fDate = d.toISOString().split("T")[0];
      } else if (datePreset === "month") {
        const d = /* @__PURE__ */ new Date();
        d.setDate(d.getDate() - 30);
        fDate = d.toISOString().split("T")[0];
      }
      if (fDate) params.fromDate = fDate;
      if (tDate) params.toDate = tDate;
      const data = await API.adminGetReviews(params);
      setReviews(data.reviews || []);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (e) {
      console.error("Error fetching reviews:", e);
      onToast == null ? void 0 : onToast(e.message || "Failed to load user reviews", "error");
    } finally {
      setLoading(false);
    }
  }, [search, selectedMovie, selectedRating, datePreset, fromDate, toDate, sort, onToast]);
  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);
  const handleFilterChange = (setter, value) => {
    setter(value);
    setPage(1);
  };
  const handleClearFilters = () => {
    setSearch("");
    setSelectedMovie("");
    setSelectedRating("");
    setDatePreset("all");
    setFromDate("");
    setToDate("");
    setSort("newest");
    setPage(1);
  };
  const handleExportCSV = () => {
    if (!reviews.length) {
      onToast == null ? void 0 : onToast("No review data available to export", "error");
      return;
    }
    const headers = ["Review ID", "User Name", "Email ID", "Movie Title", "Star Rating", "Submitted Date", "Review Text", "Likes"];
    const rows = reviews.map((r) => [
      `"${r.reviewId || ""}"`,
      `"${(r.user || "Anonymous").replace(/"/g, '""')}"`,
      `"${(r.email || "N/A").replace(/"/g, '""')}"`,
      `"${(r.movieTitle || "").replace(/"/g, '""')}"`,
      r.rating || 5,
      `"${r.date || ""}"`,
      `"${(r.text || "").replace(/"/g, '""')}"`,
      r.likes || 0
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ollypedia_user_reviews_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onToast == null ? void 0 : onToast("Exported user reviews report CSV!");
  };
  const handleDeleteReview = (rev) => {
    setConfirmDelete({
      review: rev,
      onConfirm: async () => {
        setConfirmDelete(null);
        try {
          await API.adminDeleteReview(rev.movieId, rev.reviewIndex);
          onToast == null ? void 0 : onToast(`Review by ${rev.user} deleted.`);
          fetchReviews();
        } catch (e) {
          onToast == null ? void 0 : onToast(e.message || "Failed to delete review", "error");
        }
      }
    });
  };
  const handleDownloadPoster = async (rev) => {
    setDownloadingId(rev.reviewId);
    try {
      const SCALE = 1.8;
      const CARD_W = 600;
      const CARD_H = 750;
      const PAD = 32;
      let posterImg = null;
      if (rev.moviePoster) {
        posterImg = await loadProxiedImage(rev.moviePoster);
      }
      const FONT_SIZE = 16;
      const BOX_PAD = 20;
      const MAX_Q_LINES = 8;
      const tmp = document.createElement("canvas");
      tmp.width = CARD_W;
      tmp.height = 10;
      const tc = tmp.getContext("2d");
      tc.font = `italic ${FONT_SIZE}px 'Georgia', serif`;
      const qMaxW = CARD_W - PAD * 2 - BOX_PAD * 2 - 8;
      const qWords = (rev.text || "").split(" ");
      const qLines = [];
      let qLine = "";
      for (const w of qWords) {
        const test = qLine ? `${qLine} ${w}` : w;
        if (tc.measureText(test).width > qMaxW) {
          qLines.push(qLine);
          qLine = w;
          if (qLines.length >= MAX_Q_LINES) break;
        } else {
          qLine = test;
        }
      }
      if (qLine && qLines.length < MAX_Q_LINES) qLines.push(qLine);
      if (qLines.length === MAX_Q_LINES && qLine !== qLines[MAX_Q_LINES - 1]) qLines[MAX_Q_LINES - 1] += "…";
      const lineH = FONT_SIZE * 1.75;
      const BOX_H = Math.max(120, qLines.length * lineH + BOX_PAD * 2 + 32);
      const HDR_H = 86;
      const DIV = 1;
      const ROW_H = 230;
      const FOT_H = 52;
      const content_H = 4 + HDR_H + DIV + 16 + ROW_H + DIV + 16 + BOX_H + 16 + DIV + FOT_H + 4;
      const extra = Math.max(0, CARD_H - content_H);
      const gap = extra / 3;
      const canvas = document.createElement("canvas");
      canvas.width = CARD_W * SCALE;
      canvas.height = CARD_H * SCALE;
      const ctx = canvas.getContext("2d");
      ctx.scale(SCALE, SCALE);
      const bgGrad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
      bgGrad.addColorStop(0, "#18100a");
      bgGrad.addColorStop(0.4, "#0f0b06");
      bgGrad.addColorStop(1, "#090909");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CARD_W, CARD_H);
      for (let i = 0; i < 1e4; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.015})`;
        ctx.fillRect(Math.random() * CARD_W, Math.random() * CARD_H, 1, 1);
      }
      const barGrad = ctx.createLinearGradient(0, 0, CARD_W, 0);
      barGrad.addColorStop(0, "transparent");
      barGrad.addColorStop(0.15, "#f59e0b");
      barGrad.addColorStop(0.5, "#fde68a");
      barGrad.addColorStop(0.85, "#f59e0b");
      barGrad.addColorStop(1, "transparent");
      ctx.fillStyle = barGrad;
      ctx.fillRect(0, 0, CARD_W, 4);
      ctx.fillRect(0, CARD_H - 4, CARD_W, 4);
      let curY = 4;
      const LOGO_X = PAD;
      const LOGO_Y = curY + (HDR_H - 42) / 2;
      const lg = ctx.createLinearGradient(LOGO_X, LOGO_Y, LOGO_X + 42, LOGO_Y + 42);
      lg.addColorStop(0, "#f59e0b");
      lg.addColorStop(1, "#b45309");
      ctx.fillStyle = lg;
      ctx.beginPath();
      roundRect(ctx, LOGO_X, LOGO_Y, 42, 42, 10);
      ctx.fill();
      ctx.font = "22px serif";
      ctx.fillText("🎬", LOGO_X + 8, LOGO_Y + 30);
      const WM_X = LOGO_X + 52;
      ctx.fillStyle = "#f59e0b";
      ctx.font = "bold 19px 'Georgia', serif";
      ctx.fillText("OLLYPEDIA", WM_X, LOGO_Y + 26);
      ctx.fillStyle = "rgba(245,158,11,0.5)";
      ctx.font = "10.5px 'Georgia', serif";
      ctx.fillText("Your Odia Cinema Universe", WM_X, LOGO_Y + 40);
      ctx.font = "bold 9.5px 'Georgia', serif";
      const bdgTxt = "✦ USER REVIEW";
      const bdgW = ctx.measureText(bdgTxt).width + 22;
      const bdgX = CARD_W - PAD - bdgW;
      const bdgY = curY + (HDR_H - 24) / 2;
      ctx.fillStyle = "rgba(245,158,11,0.12)";
      ctx.beginPath();
      roundRect(ctx, bdgX, bdgY, bdgW, 24, 12);
      ctx.fill();
      ctx.strokeStyle = "rgba(245,158,11,0.4)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#f59e0b";
      ctx.fillText(bdgTxt, bdgX + 11, bdgY + 16);
      curY += HDR_H + gap;
      const divider = (y) => {
        ctx.strokeStyle = "rgba(245,158,11,0.15)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PAD, y);
        ctx.lineTo(CARD_W - PAD, y);
        ctx.stroke();
      };
      divider(curY);
      curY += DIV;
      curY += 16;
      const POSTER_W = 148;
      const POSTER_H = 196;
      const POSTER_X = PAD;
      const POSTER_Y = curY;
      if (posterImg) {
        try {
          ctx.save();
          ctx.beginPath();
          roundRect(ctx, POSTER_X, POSTER_Y, POSTER_W, POSTER_H, 12);
          ctx.clip();
          ctx.drawImage(posterImg, POSTER_X, POSTER_Y, POSTER_W, POSTER_H);
          ctx.restore();
          ctx.strokeStyle = "rgba(245,158,11,0.4)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          roundRect(ctx, POSTER_X, POSTER_Y, POSTER_W, POSTER_H, 12);
          ctx.stroke();
        } catch (e) {
          ctx.fillStyle = "rgba(245,158,11,0.08)";
          ctx.beginPath();
          roundRect(ctx, POSTER_X, POSTER_Y, POSTER_W, POSTER_H, 12);
          ctx.fill();
          ctx.font = "40px serif";
          ctx.fillText("🎬", POSTER_X + 54, POSTER_Y + 110);
        }
      } else {
        ctx.fillStyle = "rgba(245,158,11,0.08)";
        ctx.beginPath();
        roundRect(ctx, POSTER_X, POSTER_Y, POSTER_W, POSTER_H, 12);
        ctx.fill();
        ctx.strokeStyle = "rgba(245,158,11,0.2)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        roundRect(ctx, POSTER_X, POSTER_Y, POSTER_W, POSTER_H, 12);
        ctx.stroke();
        ctx.font = "40px serif";
        ctx.fillText("🎬", POSTER_X + 54, POSTER_Y + 110);
      }
      const RX = POSTER_X + POSTER_W + 18;
      const RW = CARD_W - RX - PAD;
      let ry = POSTER_Y + 8;
      ctx.fillStyle = "rgba(245,158,11,0.6)";
      ctx.font = "bold 9px 'Georgia', serif";
      ctx.fillText("AUDIENCE REVIEW", RX, ry);
      ry += 24;
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 20px 'Georgia', serif";
      const titleWords = (rev.movieTitle || "Movie Review").split(" ");
      let titleLine = "";
      const titleLines = [];
      for (let i = 0; i < titleWords.length; i++) {
        const testLine = titleLine ? titleLine + " " + titleWords[i] : titleWords[i];
        if (ctx.measureText(testLine).width > RW && titleLine) {
          titleLines.push(titleLine);
          titleLine = titleWords[i];
          if (titleLines.length === 2) break;
        } else {
          titleLine = testLine;
        }
      }
      if (titleLine && titleLines.length < 2) titleLines.push(titleLine);
      titleLines.forEach((l, i) => {
        ctx.fillText(l, RX, ry + i * 24);
      });
      ry += titleLines.length * 24 + 14;
      const starsVal = rev.rating > 5 ? Math.round(rev.rating / 2) : Math.round(rev.rating);
      const SS = 22;
      const SG = 4;
      let sx2 = RX;
      for (let s = 1; s <= 5; s++) {
        drawStar(ctx, sx2 + SS / 2, ry + SS / 2, SS / 2, s <= starsVal ? "#f59e0b" : "#2a2a2a", s <= starsVal ? "#f59e0b" : "none");
        sx2 += SS + SG;
      }
      ry += SS + 12;
      const rateTxt = `${rev.rating} / ${rev.rating > 5 ? 10 : 5} Stars`;
      ctx.font = "bold 12px 'Georgia', serif";
      const rateW = ctx.measureText(rateTxt).width + 18;
      ctx.fillStyle = "rgba(245,158,11,0.12)";
      ctx.beginPath();
      roundRect(ctx, RX, ry, rateW, 22, 6);
      ctx.fill();
      ctx.strokeStyle = "rgba(245,158,11,0.3)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "#f59e0b";
      ctx.fillText(rateTxt, RX + 9, ry + 15);
      curY += ROW_H + gap;
      divider(curY);
      curY += DIV + 16;
      const BOX_X = PAD;
      const BOX_W = CARD_W - PAD * 2;
      const BOX_Y = curY;
      ctx.fillStyle = "rgba(255,255,255,0.025)";
      ctx.beginPath();
      roundRect(ctx, BOX_X, BOX_Y, BOX_W, BOX_H, 14);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "rgba(245,158,11,0.6)";
      ctx.beginPath();
      roundRect(ctx, BOX_X, BOX_Y + 12, 3, BOX_H - 24, 2);
      ctx.fill();
      ctx.fillStyle = "rgba(245,158,11,0.08)";
      ctx.font = "bold 72px 'Georgia', serif";
      ctx.fillText("“", BOX_X + 14, BOX_Y + 58);
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.font = `italic ${FONT_SIZE}px 'Georgia', serif`;
      qLines.forEach((ln, i) => {
        const prefix = i === 0 ? "“" : "";
        const suffix = i === qLines.length - 1 ? "”" : "";
        ctx.fillText(`${prefix}${ln}${suffix}`, BOX_X + BOX_PAD + 6, BOX_Y + BOX_PAD + 12 + i * lineH);
      });
      ctx.fillStyle = "rgba(255,255,255,0.38)";
      ctx.font = "12px 'Georgia', serif";
      const dtStr = rev.date ? ` · ${rev.date.split("T")[0]}` : "";
      ctx.fillText(`— ${rev.user || "Anonymous"}${dtStr} · ollypedia.in`, BOX_X + BOX_PAD + 6, BOX_Y + BOX_H - 14);
      curY += BOX_H + 16 + gap;
      divider(curY);
      curY += DIV;
      ctx.fillStyle = "rgba(245,158,11,0.4)";
      ctx.font = "11.5px 'Georgia', serif";
      ctx.textAlign = "center";
      ctx.fillText("ollypedia.in  ·  Your Odia Cinema Universe", CARD_W / 2, curY + FOT_H / 2 + 5);
      ctx.textAlign = "left";
      try {
        const dataUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = dataUrl;
        const sanitizeTitle = (rev.movieTitle || "movie").toLowerCase().replace(/[^a-z0-9]+/g, "-");
        a.download = `${sanitizeTitle}-review-poster.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        onToast == null ? void 0 : onToast("Downloaded Review Poster PNG!");
      } catch (exportErr) {
        console.warn("Canvas export error, falling back to toBlob:", exportErr);
        canvas.toBlob((blob) => {
          if (!blob) {
            onToast == null ? void 0 : onToast("Poster export failed. Try again.", "error");
            return;
          }
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          const sanitizeTitle = (rev.movieTitle || "movie").toLowerCase().replace(/[^a-z0-9]+/g, "-");
          a.download = `${sanitizeTitle}-review-poster.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          onToast == null ? void 0 : onToast("Downloaded Review Poster PNG!");
        }, "image/png");
      }
    } catch (err) {
      console.error("Poster download error:", err);
      onToast == null ? void 0 : onToast("Failed to generate review poster", "error");
    } finally {
      setDownloadingId(null);
    }
  };
  const pagedReviews = reviews.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(reviews.length / PER_PAGE);
  const darkSelectStyle = {
    width: "100%",
    fontSize: "0.82rem",
    background: "#1c1c21",
    color: "#f4f4f5",
    colorScheme: "dark",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "6px 10px"
  };
  return /* @__PURE__ */ jsxs("div", { style: { padding: "28px 28px 40px" }, children: [
    /* @__PURE__ */ jsxs("div", { style: { marginBottom: 28 }, children: [
      /* @__PURE__ */ jsx("h2", { style: { fontSize: "1.5rem", fontWeight: 800, margin: "0 0 6px" }, children: "Users & Reviews" }),
      /* @__PURE__ */ jsx("p", { style: { color: "var(--muted)", fontSize: "0.85rem", margin: 0 }, children: "Manage user submitted reviews, filter user reports, and download frontend-matching review poster cards." }),
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginTop: 20 }, children: [
        /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }, children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
            /* @__PURE__ */ jsx("span", { style: { fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }, children: "Total Reviews" }),
            /* @__PURE__ */ jsx("span", { style: { fontSize: "1.4rem" }, children: "💬" })
          ] }),
          /* @__PURE__ */ jsx("div", { style: { fontSize: "1.8rem", fontWeight: 900, color: "var(--gold)", marginTop: 6 }, children: stats.totalReviews }),
          /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }, children: [
            reviews.length,
            " shown in filter"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }, children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
            /* @__PURE__ */ jsx("span", { style: { fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }, children: "Unique Reviewers" }),
            /* @__PURE__ */ jsx("span", { style: { fontSize: "1.4rem" }, children: "👥" })
          ] }),
          /* @__PURE__ */ jsx("div", { style: { fontSize: "1.8rem", fontWeight: 900, color: "#4caf82", marginTop: 6 }, children: stats.uniqueUsers }),
          /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }, children: "Verified user email profiles" })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }, children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
            /* @__PURE__ */ jsx("span", { style: { fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }, children: "Average Rating" }),
            /* @__PURE__ */ jsx("span", { style: { fontSize: "1.4rem" }, children: "⭐" })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { fontSize: "1.8rem", fontWeight: 900, color: "var(--gold)", marginTop: 6 }, children: [
            stats.avgRating,
            " ",
            /* @__PURE__ */ jsx("span", { style: { fontSize: "0.9rem", color: "var(--muted)", fontWeight: 400 }, children: "/ 5" })
          ] }),
          /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }, children: "Overall user sentiment" })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }, children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
            /* @__PURE__ */ jsx("span", { style: { fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }, children: "Top Reviewed Film" }),
            /* @__PURE__ */ jsx("span", { style: { fontSize: "1.4rem" }, children: "🏆" })
          ] }),
          /* @__PURE__ */ jsx("div", { style: { fontSize: "1.2rem", fontWeight: 800, color: "var(--text)", marginTop: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: stats.topMovie }),
          /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: "var(--gold)", marginTop: 2 }, children: "Most discussed movie" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", marginBottom: 24 }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 14 }, children: [
        /* @__PURE__ */ jsxs("div", { style: { fontWeight: 800, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 8 }, children: [
          /* @__PURE__ */ jsx("span", { children: "🔍 Dynamic Filters & Reports" }),
          reviews.length !== stats.totalReviews && /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.72rem", background: "rgba(201,151,58,0.12)", color: "var(--gold)", border: "1px solid rgba(201,151,58,0.3)", padding: "2px 8px", borderRadius: 10 }, children: [
            reviews.length,
            " result",
            reviews.length !== 1 ? "s" : ""
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, alignItems: "center" }, children: [
          /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", onClick: handleClearFilters, style: { fontSize: "0.78rem" }, children: "↺ Reset" }),
          /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: handleExportCSV, style: { display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }, children: "📥 Export CSV Report" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }, children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { style: { display: "block", fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4, fontWeight: 600 }, children: "Search User / Email / Movie" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              className: "form-input",
              style: { width: "100%", fontSize: "0.82rem", background: "#1c1c21", color: "#f4f4f5" },
              placeholder: "Search by name, email, text…",
              value: search,
              onChange: (e) => handleFilterChange(setSearch, e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { style: { display: "block", fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4, fontWeight: 600 }, children: "Movie Filter" }),
          /* @__PURE__ */ jsxs(
            "select",
            {
              style: darkSelectStyle,
              value: selectedMovie,
              onChange: (e) => handleFilterChange(setSelectedMovie, e.target.value),
              children: [
                /* @__PURE__ */ jsxs("option", { value: "", style: { background: "#1c1c21", color: "#ffffff" }, children: [
                  "All Movies (",
                  movies.length,
                  ")"
                ] }),
                movies.map((m) => /* @__PURE__ */ jsx("option", { value: m._id, style: { background: "#1c1c21", color: "#ffffff" }, children: m.title }, m._id))
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { style: { display: "block", fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4, fontWeight: 600 }, children: "Rating Filter" }),
          /* @__PURE__ */ jsxs(
            "select",
            {
              style: darkSelectStyle,
              value: selectedRating,
              onChange: (e) => handleFilterChange(setSelectedRating, e.target.value),
              children: [
                /* @__PURE__ */ jsx("option", { value: "", style: { background: "#1c1c21", color: "#ffffff" }, children: "All Ratings" }),
                /* @__PURE__ */ jsx("option", { value: "5", style: { background: "#1c1c21", color: "#ffffff" }, children: "⭐⭐⭐⭐⭐ 5 Stars" }),
                /* @__PURE__ */ jsx("option", { value: "4", style: { background: "#1c1c21", color: "#ffffff" }, children: "⭐⭐⭐⭐ 4 Stars" }),
                /* @__PURE__ */ jsx("option", { value: "3", style: { background: "#1c1c21", color: "#ffffff" }, children: "⭐⭐⭐ 3 Stars" }),
                /* @__PURE__ */ jsx("option", { value: "2", style: { background: "#1c1c21", color: "#ffffff" }, children: "⭐⭐ 2 Stars" }),
                /* @__PURE__ */ jsx("option", { value: "1", style: { background: "#1c1c21", color: "#ffffff" }, children: "⭐ 1 Star" }),
                /* @__PURE__ */ jsx("option", { value: "-1", style: { background: "#1c1c21", color: "#ffffff" }, children: "⚠️ Low Ratings (≤ 2 Stars)" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { style: { display: "block", fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4, fontWeight: 600 }, children: "Date Filter" }),
          /* @__PURE__ */ jsxs(
            "select",
            {
              style: darkSelectStyle,
              value: datePreset,
              onChange: (e) => handleFilterChange(setDatePreset, e.target.value),
              children: [
                /* @__PURE__ */ jsx("option", { value: "all", style: { background: "#1c1c21", color: "#ffffff" }, children: "All Time" }),
                /* @__PURE__ */ jsx("option", { value: "today", style: { background: "#1c1c21", color: "#ffffff" }, children: "Today" }),
                /* @__PURE__ */ jsx("option", { value: "week", style: { background: "#1c1c21", color: "#ffffff" }, children: "Last 7 Days" }),
                /* @__PURE__ */ jsx("option", { value: "month", style: { background: "#1c1c21", color: "#ffffff" }, children: "Last 30 Days" }),
                /* @__PURE__ */ jsx("option", { value: "custom", style: { background: "#1c1c21", color: "#ffffff" }, children: "Custom Date Range" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { style: { display: "block", fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4, fontWeight: 600 }, children: "Sort Order" }),
          /* @__PURE__ */ jsxs(
            "select",
            {
              style: darkSelectStyle,
              value: sort,
              onChange: (e) => handleFilterChange(setSort, e.target.value),
              children: [
                /* @__PURE__ */ jsx("option", { value: "newest", style: { background: "#1c1c21", color: "#ffffff" }, children: "Newest First" }),
                /* @__PURE__ */ jsx("option", { value: "oldest", style: { background: "#1c1c21", color: "#ffffff" }, children: "Oldest First" }),
                /* @__PURE__ */ jsx("option", { value: "highest_rating", style: { background: "#1c1c21", color: "#ffffff" }, children: "Highest Rating" }),
                /* @__PURE__ */ jsx("option", { value: "lowest_rating", style: { background: "#1c1c21", color: "#ffffff" }, children: "Lowest Rating" })
              ]
            }
          )
        ] })
      ] }),
      datePreset === "custom" && /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 12, marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--border)" }, children: [
        /* @__PURE__ */ jsxs("div", { style: { flex: 1 }, children: [
          /* @__PURE__ */ jsx("label", { style: { display: "block", fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4 }, children: "From Date" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "date",
              className: "form-input",
              style: { width: "100%", fontSize: "0.82rem", background: "#1c1c21", color: "#f4f4f5", colorScheme: "dark" },
              value: fromDate,
              onChange: (e) => handleFilterChange(setFromDate, e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { flex: 1 }, children: [
          /* @__PURE__ */ jsx("label", { style: { display: "block", fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4 }, children: "To Date" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "date",
              className: "form-input",
              style: { width: "100%", fontSize: "0.82rem", background: "#1c1c21", color: "#f4f4f5", colorScheme: "dark" },
              value: toDate,
              onChange: (e) => handleFilterChange(setToDate, e.target.value)
            }
          )
        ] })
      ] })
    ] }),
    loading ? /* @__PURE__ */ jsx("div", { style: { padding: 60, textAlign: "center", color: "var(--muted)", fontSize: "1.1rem" }, children: "⏳ Loading user reviews data…" }) : reviews.length === 0 ? /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 50, textAlign: "center" }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontSize: "3rem", marginBottom: 12 }, children: "💬" }),
      /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, fontSize: "1.1rem", marginBottom: 6 }, children: "No Reviews Found" }),
      /* @__PURE__ */ jsx("p", { style: { color: "var(--muted)", fontSize: "0.85rem", maxWidth: 400, margin: "0 auto 16px" }, children: "No user reviews match your currently applied filters or search criteria." }),
      /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", onClick: handleClearFilters, children: "Clear Filters" })
    ] }) : /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }, children: [
      /* @__PURE__ */ jsx("div", { style: { overflowX: "auto" }, children: /* @__PURE__ */ jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }, children: [
        /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { style: { background: "var(--bg3)", color: "var(--muted)", borderBottom: "1px solid var(--border)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.06em" }, children: [
          /* @__PURE__ */ jsx("th", { style: { padding: "12px 16px", width: "180px" }, children: "User & Email" }),
          /* @__PURE__ */ jsx("th", { style: { padding: "12px 16px", width: "160px" }, children: "Movie" }),
          /* @__PURE__ */ jsx("th", { style: { padding: "12px 16px", width: "110px" }, children: "Rating" }),
          /* @__PURE__ */ jsx("th", { style: { padding: "12px 16px", width: "110px" }, children: "Submitted Date" }),
          /* @__PURE__ */ jsx("th", { style: { padding: "12px 16px", minWidth: "280px" }, children: "Review Text" }),
          /* @__PURE__ */ jsx("th", { style: { padding: "12px 16px", textAlign: "right", width: "170px" }, children: "Actions" })
        ] }) }),
        /* @__PURE__ */ jsx("tbody", { children: pagedReviews.map((rev) => {
          const displayStarsVal = rev.rating > 5 ? Math.round(rev.rating / 2) : Math.round(rev.rating);
          const isDownloading = downloadingId === rev.reviewId;
          const isExpanded = expandedReviews.has(rev.reviewId);
          const isLongText = (rev.text || "").length > 110;
          const displayText = isLongText && !isExpanded ? `${(rev.text || "").slice(0, 110)}…` : rev.text;
          return /* @__PURE__ */ jsxs("tr", { style: { borderBottom: "1px solid var(--border)" }, children: [
            /* @__PURE__ */ jsxs("td", { style: { padding: "14px 16px", verticalAlign: "top" }, children: [
              /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, color: "var(--text)" }, children: rev.user || "Anonymous" }),
              rev.email ? /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.74rem", color: "var(--gold)", display: "inline-block", background: "rgba(201,151,58,0.1)", padding: "2px 7px", borderRadius: 4, marginTop: 4, fontWeight: 500, wordBreak: "break-all" }, children: [
                "✉️ ",
                rev.email
              ] }) : /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }, children: "No Email Provided" })
            ] }),
            /* @__PURE__ */ jsx("td", { style: { padding: "14px 16px", verticalAlign: "top" }, children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "flex-start", gap: 10 }, children: [
              rev.moviePoster ? /* @__PURE__ */ jsx(
                "img",
                {
                  src: rev.moviePoster,
                  alt: rev.movieTitle,
                  style: { width: 36, height: 50, objectFit: "cover", borderRadius: 4, flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.5)" },
                  onError: (e) => {
                    e.target.style.display = "none";
                  }
                }
              ) : /* @__PURE__ */ jsx("div", { style: { width: 36, height: 50, background: "var(--bg3)", borderRadius: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }, children: "🎬" }),
              /* @__PURE__ */ jsxs("div", { style: { minWidth: 0 }, children: [
                /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, color: "var(--text)", lineHeight: 1.3 }, children: rev.movieTitle }),
                rev.movieSlug && /* @__PURE__ */ jsx(
                  "a",
                  {
                    href: `${SITE_URL}/movie/${rev.movieSlug}`,
                    target: "_blank",
                    rel: "noreferrer",
                    style: { fontSize: "0.72rem", color: "var(--muted)", textDecoration: "none", display: "inline-block", marginTop: 2 },
                    onMouseEnter: (e) => e.currentTarget.style.color = "var(--gold)",
                    onMouseLeave: (e) => e.currentTarget.style.color = "var(--muted)",
                    children: "View page ↗"
                  }
                )
              ] })
            ] }) }),
            /* @__PURE__ */ jsxs("td", { style: { padding: "14px 16px", verticalAlign: "top" }, children: [
              /* @__PURE__ */ jsxs("div", { style: { color: "var(--gold)", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "1px" }, children: [
                "★".repeat(displayStarsVal),
                /* @__PURE__ */ jsx("span", { style: { color: "rgba(255,255,255,0.2)" }, children: "★".repeat(5 - displayStarsVal) })
              ] }),
              /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.72rem", color: "var(--muted)", marginTop: 2, fontWeight: 600 }, children: [
                rev.rating,
                " / ",
                rev.rating > 5 ? 10 : 5
              ] })
            ] }),
            /* @__PURE__ */ jsx("td", { style: { padding: "14px 16px", verticalAlign: "top", color: "var(--muted)", fontSize: "0.8rem", whiteSpace: "nowrap" }, children: rev.date ? rev.date.split("T")[0] : "—" }),
            /* @__PURE__ */ jsxs("td", { style: { padding: "14px 16px", verticalAlign: "top" }, children: [
              /* @__PURE__ */ jsxs("div", { style: { color: "var(--text)", lineHeight: 1.55, fontSize: "0.84rem", fontStyle: "italic", wordBreak: "break-word" }, children: [
                '"',
                displayText,
                '"'
              ] }),
              isLongText && /* @__PURE__ */ jsxs("div", { style: { marginTop: 6, display: "flex", gap: 10, alignItems: "center" }, children: [
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => toggleExpand(rev.reviewId),
                    style: {
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "var(--gold)",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      textDecoration: "underline"
                    },
                    children: isExpanded ? "▲ Show Less" : "▼ View More"
                  }
                ),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => setSelectedReviewModal(rev),
                    style: {
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid var(--border)",
                      borderRadius: 4,
                      padding: "2px 6px",
                      color: "var(--text)",
                      fontSize: "0.7rem",
                      cursor: "pointer"
                    },
                    children: "🔍 Read Full"
                  }
                )
              ] }),
              rev.likes > 0 && /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.7rem", color: "var(--gold)", marginTop: 6, fontWeight: 600 }, children: [
                "❤️ ",
                rev.likes,
                " likes"
              ] })
            ] }),
            /* @__PURE__ */ jsx("td", { style: { padding: "14px 16px", verticalAlign: "top", textAlign: "right" }, children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }, children: [
              /* @__PURE__ */ jsx(
                "button",
                {
                  className: "btn btn-ghost btn-sm",
                  disabled: isDownloading,
                  onClick: () => handleDownloadPoster(rev),
                  style: {
                    background: "rgba(201,151,58,0.12)",
                    border: "1px solid rgba(201,151,58,0.3)",
                    color: "var(--gold)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    padding: "5px 10px"
                  },
                  title: "Download PNG review poster card",
                  children: isDownloading ? "⏳ Saving…" : "🖼️ Download Poster"
                }
              ),
              /* @__PURE__ */ jsx(
                "button",
                {
                  className: "btn btn-ghost btn-sm",
                  onClick: () => handleDeleteReview(rev),
                  style: { color: "var(--red)", fontSize: "0.8rem", padding: "5px 8px" },
                  title: "Delete review",
                  children: "🗑️"
                }
              )
            ] }) })
          ] }, rev.reviewId);
        }) })
      ] }) }),
      totalPages > 1 && /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "var(--bg3)", borderTop: "1px solid var(--border)" }, children: [
        /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.78rem", color: "var(--muted)" }, children: [
          "Showing ",
          (page - 1) * PER_PAGE + 1,
          "–",
          Math.min(page * PER_PAGE, reviews.length),
          " of ",
          reviews.length,
          " reviews"
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6 }, children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              className: "btn btn-ghost btn-sm",
              disabled: page <= 1,
              onClick: () => setPage((p) => Math.max(1, p - 1)),
              children: "← Prev"
            }
          ),
          /* @__PURE__ */ jsxs("span", { style: { padding: "4px 10px", fontSize: "0.8rem", fontWeight: 700, color: "var(--gold)" }, children: [
            "Page ",
            page,
            " of ",
            totalPages
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              className: "btn btn-ghost btn-sm",
              disabled: page >= totalPages,
              onClick: () => setPage((p) => Math.min(totalPages, p + 1)),
              children: "Next →"
            }
          )
        ] })
      ] })
    ] }),
    selectedReviewModal && /* @__PURE__ */ jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1e3, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }, children: /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, maxWidth: 560, width: "100%", maxHeight: "80vh", overflowY: "auto" }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }, children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, fontSize: "1.1rem" }, children: selectedReviewModal.movieTitle }),
          /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.78rem", color: "var(--gold)", marginTop: 2 }, children: [
            "Reviewed by ",
            selectedReviewModal.user,
            " ",
            selectedReviewModal.email ? `(${selectedReviewModal.email})` : ""
          ] })
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            className: "btn btn-ghost btn-sm",
            onClick: () => setSelectedReviewModal(null),
            style: { fontSize: "1.2rem", padding: "2px 8px" },
            children: "✕"
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 12, alignItems: "center", marginBottom: 16, background: "var(--bg3)", padding: "10px 14px", borderRadius: 8 }, children: [
        /* @__PURE__ */ jsx("div", { style: { color: "var(--gold)", fontWeight: 700 }, children: "★".repeat(selectedReviewModal.rating > 5 ? Math.round(selectedReviewModal.rating / 2) : Math.round(selectedReviewModal.rating)) }),
        /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.8rem", color: "var(--muted)" }, children: [
          "Score: ",
          selectedReviewModal.rating,
          " / ",
          selectedReviewModal.rating > 5 ? 10 : 5
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.8rem", color: "var(--muted)", marginLeft: "auto" }, children: [
          "Date: ",
          selectedReviewModal.date ? selectedReviewModal.date.split("T")[0] : "N/A"
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { color: "var(--text)", lineHeight: 1.7, fontSize: "0.92rem", fontStyle: "italic", whiteSpace: "pre-wrap", background: "rgba(0,0,0,0.3)", padding: 16, borderRadius: 10, border: "1px solid var(--border)" }, children: [
        '"',
        selectedReviewModal.text,
        '"'
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }, children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            className: "btn btn-gold btn-sm",
            onClick: () => {
              const rev = selectedReviewModal;
              setSelectedReviewModal(null);
              handleDownloadPoster(rev);
            },
            children: "🖼️ Download Poster"
          }
        ),
        /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", onClick: () => setSelectedReviewModal(null), children: "Close" })
      ] })
    ] }) }),
    confirmDelete && /* @__PURE__ */ jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1e3, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }, children: /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, maxWidth: 440, width: "100%" }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontSize: "1.8rem", marginBottom: 10 }, children: "⚠️" }),
      /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, fontSize: "1.1rem", marginBottom: 8 }, children: "Delete User Review?" }),
      /* @__PURE__ */ jsxs("p", { style: { color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.5, marginBottom: 20 }, children: [
        "Are you sure you want to delete the review by ",
        /* @__PURE__ */ jsx("strong", { children: confirmDelete.review.user }),
        " for ",
        /* @__PURE__ */ jsx("strong", { children: confirmDelete.review.movieTitle }),
        "? This action cannot be undone."
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, justifyContent: "flex-end" }, children: [
        /* @__PURE__ */ jsx("button", { className: "btn btn-ghost", onClick: () => setConfirmDelete(null), children: "Cancel" }),
        /* @__PURE__ */ jsx("button", { className: "btn btn-sm", style: { background: "var(--red)", color: "#fff", border: "none", fontWeight: 700 }, onClick: confirmDelete.onConfirm, children: "Delete Review" })
      ] })
    ] }) })
  ] });
}
export {
  UserReviewsPanel as default
};
