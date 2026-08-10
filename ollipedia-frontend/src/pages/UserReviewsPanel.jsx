import React, { useState, useEffect, useCallback } from "react";
import { API } from "../api/api";

const SITE_URL = "https://ollypedia.in";
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

// ── CANVAS HELPERS FOR REVIEW POSTER ──
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
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
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

// Robust image loader using backend proxy to eliminate CORS canvas tainting
const loadProxiedImage = (srcUrl) =>
  new Promise((resolve) => {
    if (!srcUrl) return resolve(null);
    
    // Construct proxy URL if external, or use direct URL
    const proxyUrl = srcUrl.startsWith("data:") || srcUrl.startsWith("blob:")
      ? srcUrl
      : `${API_BASE}/img-proxy?url=${encodeURIComponent(srcUrl)}`;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Direct fallback if proxy is unreachable
      const img2 = new Image();
      img2.crossOrigin = "anonymous";
      img2.onload = () => resolve(img2);
      img2.onerror = () => resolve(null);
      img2.src = srcUrl;
    };
    img.src = proxyUrl;
  });

export default function UserReviewsPanel({ movies = [], onToast }) {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({
    totalReviews: 0,
    uniqueUsers: 0,
    avgRating: "0.0",
    topMovie: "N/A",
  });
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedReviewModal, setSelectedReviewModal] = useState(null);

  // Expandable review text set
  const [expandedReviews, setExpandedReviews] = useState(new Set());

  // Dynamic Filters State
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

  // Load reviews from backend
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
        const todayStr = new Date().toISOString().split("T")[0];
        fDate = todayStr;
        tDate = todayStr;
      } else if (datePreset === "week") {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        fDate = d.toISOString().split("T")[0];
      } else if (datePreset === "month") {
        const d = new Date();
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
      onToast?.(e.message || "Failed to load user reviews", "error");
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

  // Export CSV Report
  const handleExportCSV = () => {
    if (!reviews.length) {
      onToast?.("No review data available to export", "error");
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
      r.likes || 0,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ollypedia_user_reviews_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onToast?.("Exported user reviews report CSV!");
  };

  // Delete review handler
  const handleDeleteReview = (rev) => {
    setConfirmDelete({
      review: rev,
      onConfirm: async () => {
        setConfirmDelete(null);
        try {
          await API.adminDeleteReview(rev.movieId, rev.reviewIndex);
          onToast?.(`Review by ${rev.user} deleted.`);
          fetchReviews();
        } catch (e) {
          onToast?.(e.message || "Failed to delete review", "error");
        }
      },
    });
  };

  // ── POSTER GENERATOR & DOWNLOAD HANDLER ──
  const handleDownloadPoster = async (rev) => {
    setDownloadingId(rev.reviewId);
    try {
      const SCALE = 1.8;
      const CARD_W = 600;
      const CARD_H = 750;
      const PAD = 32;

      // Load website logo and movie poster via proxy
      const [siteLogoImg, posterImg] = await Promise.all([
        loadProxiedImage("/logo.png"),
        rev.moviePoster ? loadProxiedImage(rev.moviePoster) : Promise.resolve(null),
      ]);

      // Measure review quote text
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

      // Background Gradient - Simple, sleek dark slate palette
      const bgGrad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
      bgGrad.addColorStop(0, "#0f172a");
      bgGrad.addColorStop(0.5, "#0b0f19");
      bgGrad.addColorStop(1, "#020617");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CARD_W, CARD_H);

      // Gold Accent Bars (Top & Bottom)
      const barGrad = ctx.createLinearGradient(0, 0, CARD_W, 0);
      barGrad.addColorStop(0, "transparent");
      barGrad.addColorStop(0.15, "#f59e0b");
      barGrad.addColorStop(0.5, "#fde68a");
      barGrad.addColorStop(0.85, "#f59e0b");
      barGrad.addColorStop(1, "transparent");
      ctx.fillStyle = barGrad;
      ctx.fillRect(0, 0, CARD_W, 4);
      ctx.fillRect(0, CARD_H - 4, CARD_W, 4);

      // Header Zone — Website Logo
      let curY = 4;
      const LOGO_X = PAD;

      if (siteLogoImg && siteLogoImg.width > 0) {
        const aspect = siteLogoImg.width / siteLogoImg.height;
        if (aspect > 1.3) {
          // Horizontal brand logo (logo.png)
          const drawH = 44;
          const drawW = Math.min(drawH * aspect, 240);
          const drawY = curY + (HDR_H - drawH) / 2;
          ctx.drawImage(siteLogoImg, LOGO_X, drawY, drawW, drawH);
        } else {
          // Icon/square logo
          const iconSize = 44;
          const iconY = curY + (HDR_H - iconSize) / 2;
          ctx.save();
          ctx.beginPath();
          roundRect(ctx, LOGO_X, iconY, iconSize, iconSize, 10);
          ctx.clip();
          ctx.drawImage(siteLogoImg, LOGO_X, iconY, iconSize, iconSize);
          ctx.restore();

          const WM_X = LOGO_X + iconSize + 12;
          ctx.fillStyle = "#f59e0b";
          ctx.font = "bold 19px 'Georgia', serif";
          ctx.fillText("OLLYPEDIA", WM_X, iconY + 24);
          ctx.fillStyle = "rgba(245,158,11,0.6)";
          ctx.font = "10.5px 'Georgia', serif";
          ctx.fillText("Your Odia Cinema Universe", WM_X, iconY + 39);
        }
      } else {
        // Fallback logo
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

        const WM_X = LOGO_X + 54;
        ctx.fillStyle = "#f59e0b";
        ctx.font = "bold 19px 'Georgia', serif";
        ctx.fillText("OLLYPEDIA", WM_X, LOGO_Y + 26);
        ctx.fillStyle = "rgba(245,158,11,0.6)";
        ctx.font = "10.5px 'Georgia', serif";
        ctx.fillText("Your Odia Cinema Universe", WM_X, LOGO_Y + 40);
      }

      // "USER REVIEW" Badge
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
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(PAD, y);
        ctx.lineTo(CARD_W - PAD, y);
        ctx.stroke();
      };
      divider(curY);
      curY += DIV;

      // Poster Row Zone
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
          // Fallback if drawImage fails
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

      // Movie Info Column
      const RX = POSTER_X + POSTER_W + 18;
      const RW = CARD_W - RX - PAD;
      let ry = POSTER_Y + 8;

      ctx.fillStyle = "rgba(245,158,11,0.7)";
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

      // Stars
      const displayStarsVal = rev.rating > 5 ? Math.round(rev.rating / 2) : Math.round(rev.rating);
      const SS = 22;
      const SG = 4;
      let sx2 = RX;
      for (let s = 1; s <= 5; s++) {
        drawStar(ctx, sx2 + SS / 2, ry + SS / 2, SS / 2, s <= displayStarsVal ? "#f59e0b" : "#2a2a2a", s <= displayStarsVal ? "#f59e0b" : "none");
        sx2 += SS + SG;
      }
      ry += SS + 12;

      // Rating Score Badge - Shows rating out of 5 stars
      const rateTxt = `${displayStarsVal} / 5 Stars`;
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

      // Quote Text Box
      const BOX_X = PAD;
      const BOX_W = CARD_W - PAD * 2;
      const BOX_Y = curY;

      ctx.fillStyle = "rgba(255,255,255,0.035)";
      ctx.beginPath();
      roundRect(ctx, BOX_X, BOX_Y, BOX_W, BOX_H, 14);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.09)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Gold vertical accent bar
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      roundRect(ctx, BOX_X, BOX_Y + 12, 3.5, BOX_H - 24, 2);
      ctx.fill();

      // Large subtle quotation mark
      ctx.fillStyle = "rgba(245,158,11,0.08)";
      ctx.font = "bold 72px 'Georgia', serif";
      ctx.fillText("\u201C", BOX_X + 14, BOX_Y + 58);

      // Quote text in clean white
      ctx.fillStyle = "#f1f5f9";
      ctx.font = `italic ${FONT_SIZE}px 'Georgia', serif`;
      qLines.forEach((ln, i) => {
        const prefix = i === 0 ? "\u201C" : "";
        const suffix = i === qLines.length - 1 ? "\u201D" : "";
        ctx.fillText(`${prefix}${ln}${suffix}`, BOX_X + BOX_PAD + 6, BOX_Y + BOX_PAD + 12 + i * lineH);
      });

      // Prominent User Name Attribution
      const attrY = BOX_Y + BOX_H - 18;
      const avatarX = BOX_X + BOX_PAD + 14;
      const avatarY = attrY - 5;

      // Avatar Circle Badge
      ctx.fillStyle = "rgba(245, 158, 11, 0.18)";
      ctx.beginPath();
      ctx.arc(avatarX, avatarY, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(245, 158, 11, 0.45)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Avatar Icon
      ctx.fillStyle = "#f59e0b";
      ctx.font = "11px sans-serif";
      ctx.fillText("👤", avatarX - 5, avatarY + 4);

      // User Name (Bright Pure White & Bold)
      const userNameStr = rev.user || "Anonymous";
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px 'Georgia', serif";
      ctx.fillText(userNameStr, avatarX + 18, attrY);

      // Date & Site tag in soft gold
      const userNameW = ctx.measureText(userNameStr).width;
      const dtStr = rev.date ? ` · ${rev.date.split("T")[0]}` : "";
      ctx.fillStyle = "rgba(245, 158, 11, 0.75)";
      ctx.font = "12px 'Georgia', serif";
      ctx.fillText(`${dtStr} · ollypedia.in`, avatarX + 18 + userNameW + 4, attrY);

      curY += BOX_H + 16 + gap;
      divider(curY);
      curY += DIV;

      // Footer
      ctx.fillStyle = "rgba(245,158,11,0.4)";
      ctx.font = "11.5px 'Georgia', serif";
      ctx.textAlign = "center";
      ctx.fillText("ollypedia.in  ·  Your Odia Cinema Universe", CARD_W / 2, curY + FOT_H / 2 + 5);
      ctx.textAlign = "left";

      // Export PNG using data URL or toBlob
      try {
        const dataUrl = canvas.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = dataUrl;
        const sanitizeTitle = (rev.movieTitle || "movie").toLowerCase().replace(/[^a-z0-9]+/g, "-");
        a.download = `${sanitizeTitle}-review-poster.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        onToast?.("Downloaded Review Poster PNG!");
      } catch (exportErr) {
        console.warn("Canvas export error, falling back to toBlob:", exportErr);
        canvas.toBlob((blob) => {
          if (!blob) {
            onToast?.("Poster export failed. Try again.", "error");
            return;
          }
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          const sanitizeTitle = (rev.movieTitle || "movie").toLowerCase().replace(/[^a-z0-9]+/g, "-");
          a.download = `${sanitizeTitle}-review-poster.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          onToast?.("Downloaded Review Poster PNG!");
        }, "image/png");
      }
    } catch (err) {
      console.error("Poster download error:", err);
      onToast?.("Failed to generate review poster", "error");
    } finally {
      setDownloadingId(null);
    }
  };

  const pagedReviews = reviews.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(reviews.length / PER_PAGE);

  // Styled Dropdown Style Helper for Dark Mode readability
  const darkSelectStyle = {
    width: "100%",
    fontSize: "0.82rem",
    background: "#1c1c21",
    color: "#f4f4f5",
    colorScheme: "dark",
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "6px 10px",
  };

  return (
    <div style={{ padding: "28px 28px 40px" }}>
      {/* ── HEADER & METRICS SUMMARY CARDS ── */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "0 0 6px" }}>Users & Reviews</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: 0 }}>
          Manage user submitted reviews, filter user reports, and download frontend-matching review poster cards.
        </p>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginTop: 20 }}>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }}>Total Reviews</span>
              <span style={{ fontSize: "1.4rem" }}>💬</span>
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--gold)", marginTop: 6 }}>{stats.totalReviews}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>{reviews.length} shown in filter</div>
          </div>

          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }}>Unique Reviewers</span>
              <span style={{ fontSize: "1.4rem" }}>👥</span>
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#4caf82", marginTop: 6 }}>{stats.uniqueUsers}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>Verified user email profiles</div>
          </div>

          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }}>Average Rating</span>
              <span style={{ fontSize: "1.4rem" }}>⭐</span>
            </div>
            <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "var(--gold)", marginTop: 6 }}>{stats.avgRating} <span style={{ fontSize: "0.9rem", color: "var(--muted)", fontWeight: 400 }}>/ 5</span></div>
            <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>Overall user sentiment</div>
          </div>

          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }}>Top Reviewed Film</span>
              <span style={{ fontSize: "1.4rem" }}>🏆</span>
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text)", marginTop: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {stats.topMovie}
            </div>
            <div style={{ fontSize: "0.72rem", color: "var(--gold)", marginTop: 2 }}>Most discussed movie</div>
          </div>
        </div>
      </div>

      {/* ── DYNAMIC FILTERS & REPORT TOOLBAR ── */}
      <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          <div style={{ fontWeight: 800, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 8 }}>
            <span>🔍 Dynamic Filters & Reports</span>
            {reviews.length !== stats.totalReviews && (
              <span style={{ fontSize: "0.72rem", background: "rgba(201,151,58,0.12)", color: "var(--gold)", border: "1px solid rgba(201,151,58,0.3)", padding: "2px 8px", borderRadius: 10 }}>
                {reviews.length} result{reviews.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button className="btn btn-ghost btn-sm" onClick={handleClearFilters} style={{ fontSize: "0.78rem" }}>
              ↺ Reset
            </button>
            <button className="btn btn-gold btn-sm" onClick={handleExportCSV} style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
              📥 Export CSV Report
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {/* Keyword Search */}
          <div>
            <label style={{ display: "block", fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4, fontWeight: 600 }}>Search User / Email / Movie</label>
            <input
              type="text"
              className="form-input"
              style={{ width: "100%", fontSize: "0.82rem", background: "#1c1c21", color: "#f4f4f5" }}
              placeholder="Search by name, email, text…"
              value={search}
              onChange={(e) => handleFilterChange(setSearch, e.target.value)}
            />
          </div>

          {/* Movie Filter */}
          <div>
            <label style={{ display: "block", fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4, fontWeight: 600 }}>Movie Filter</label>
            <select
              style={darkSelectStyle}
              value={selectedMovie}
              onChange={(e) => handleFilterChange(setSelectedMovie, e.target.value)}
            >
              <option value="" style={{ background: "#1c1c21", color: "#ffffff" }}>All Movies ({movies.length})</option>
              {movies.map((m) => (
                <option key={m._id} value={m._id} style={{ background: "#1c1c21", color: "#ffffff" }}>{m.title}</option>
              ))}
            </select>
          </div>

          {/* Star Rating Filter */}
          <div>
            <label style={{ display: "block", fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4, fontWeight: 600 }}>Rating Filter</label>
            <select
              style={darkSelectStyle}
              value={selectedRating}
              onChange={(e) => handleFilterChange(setSelectedRating, e.target.value)}
            >
              <option value="" style={{ background: "#1c1c21", color: "#ffffff" }}>All Ratings</option>
              <option value="5" style={{ background: "#1c1c21", color: "#ffffff" }}>⭐⭐⭐⭐⭐ 5 Stars</option>
              <option value="4" style={{ background: "#1c1c21", color: "#ffffff" }}>⭐⭐⭐⭐ 4 Stars</option>
              <option value="3" style={{ background: "#1c1c21", color: "#ffffff" }}>⭐⭐⭐ 3 Stars</option>
              <option value="2" style={{ background: "#1c1c21", color: "#ffffff" }}>⭐⭐ 2 Stars</option>
              <option value="1" style={{ background: "#1c1c21", color: "#ffffff" }}>⭐ 1 Star</option>
              <option value="-1" style={{ background: "#1c1c21", color: "#ffffff" }}>⚠️ Low Ratings (≤ 2 Stars)</option>
            </select>
          </div>

          {/* Date Presets */}
          <div>
            <label style={{ display: "block", fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4, fontWeight: 600 }}>Date Filter</label>
            <select
              style={darkSelectStyle}
              value={datePreset}
              onChange={(e) => handleFilterChange(setDatePreset, e.target.value)}
            >
              <option value="all" style={{ background: "#1c1c21", color: "#ffffff" }}>All Time</option>
              <option value="today" style={{ background: "#1c1c21", color: "#ffffff" }}>Today</option>
              <option value="week" style={{ background: "#1c1c21", color: "#ffffff" }}>Last 7 Days</option>
              <option value="month" style={{ background: "#1c1c21", color: "#ffffff" }}>Last 30 Days</option>
              <option value="custom" style={{ background: "#1c1c21", color: "#ffffff" }}>Custom Date Range</option>
            </select>
          </div>

          {/* Sort Selector */}
          <div>
            <label style={{ display: "block", fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4, fontWeight: 600 }}>Sort Order</label>
            <select
              style={darkSelectStyle}
              value={sort}
              onChange={(e) => handleFilterChange(setSort, e.target.value)}
            >
              <option value="newest" style={{ background: "#1c1c21", color: "#ffffff" }}>Newest First</option>
              <option value="oldest" style={{ background: "#1c1c21", color: "#ffffff" }}>Oldest First</option>
              <option value="highest_rating" style={{ background: "#1c1c21", color: "#ffffff" }}>Highest Rating</option>
              <option value="lowest_rating" style={{ background: "#1c1c21", color: "#ffffff" }}>Lowest Rating</option>
            </select>
          </div>
        </div>

        {/* Custom Date Inputs */}
        {datePreset === "custom" && (
          <div style={{ display: "flex", gap: 12, marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--border)" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4 }}>From Date</label>
              <input
                type="date"
                className="form-input"
                style={{ width: "100%", fontSize: "0.82rem", background: "#1c1c21", color: "#f4f4f5", colorScheme: "dark" }}
                value={fromDate}
                onChange={(e) => handleFilterChange(setFromDate, e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4 }}>To Date</label>
              <input
                type="date"
                className="form-input"
                style={{ width: "100%", fontSize: "0.82rem", background: "#1c1c21", color: "#f4f4f5", colorScheme: "dark" }}
                value={toDate}
                onChange={(e) => handleFilterChange(setToDate, e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── REVIEWS DATA TABLE ── */}
      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "var(--muted)", fontSize: "1.1rem" }}>⏳ Loading user reviews data…</div>
      ) : reviews.length === 0 ? (
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 50, textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>💬</div>
          <div style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: 6 }}>No Reviews Found</div>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", maxWidth: 400, margin: "0 auto 16px" }}>
            No user reviews match your currently applied filters or search criteria.
          </p>
          <button className="btn btn-ghost btn-sm" onClick={handleClearFilters}>Clear Filters</button>
        </div>
      ) : (
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "var(--bg3)", color: "var(--muted)", borderBottom: "1px solid var(--border)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.06em" }}>
                  <th style={{ padding: "12px 16px", width: "180px" }}>User & Email</th>
                  <th style={{ padding: "12px 16px", width: "160px" }}>Movie</th>
                  <th style={{ padding: "12px 16px", width: "110px" }}>Rating</th>
                  <th style={{ padding: "12px 16px", width: "110px" }}>Submitted Date</th>
                  <th style={{ padding: "12px 16px", minWidth: "280px" }}>Review Text</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", width: "170px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedReviews.map((rev) => {
                  const displayStarsVal = rev.rating > 5 ? Math.round(rev.rating / 2) : Math.round(rev.rating);
                  const isDownloading = downloadingId === rev.reviewId;
                  const isExpanded = expandedReviews.has(rev.reviewId);
                  const isLongText = (rev.text || "").length > 110;
                  const displayText = isLongText && !isExpanded
                    ? `${(rev.text || "").slice(0, 110)}…`
                    : rev.text;

                  return (
                    <tr key={rev.reviewId} style={{ borderBottom: "1px solid var(--border)" }}>
                      {/* User & Email */}
                      <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                        <div style={{ fontWeight: 700, color: "var(--text)" }}>{rev.user || "Anonymous"}</div>
                        {rev.email ? (
                          <div style={{ fontSize: "0.74rem", color: "var(--gold)", display: "inline-block", background: "rgba(201,151,58,0.1)", padding: "2px 7px", borderRadius: 4, marginTop: 4, fontWeight: 500, wordBreak: "break-all" }}>
                            ✉️ {rev.email}
                          </div>
                        ) : (
                          <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>No Email Provided</div>
                        )}
                      </td>

                      {/* Movie Poster & Title */}
                      <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                          {rev.moviePoster ? (
                            <img
                              src={rev.moviePoster}
                              alt={rev.movieTitle}
                              style={{ width: 36, height: 50, objectFit: "cover", borderRadius: 4, flexShrink: 0, boxShadow: "0 2px 6px rgba(0,0,0,0.5)" }}
                              onError={(e) => { e.target.style.display = "none"; }}
                            />
                          ) : (
                            <div style={{ width: 36, height: 50, background: "var(--bg3)", borderRadius: 4, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem" }}>
                              🎬
                            </div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, color: "var(--text)", lineHeight: 1.3 }}>{rev.movieTitle}</div>
                            {rev.movieSlug && (
                              <a
                                href={`${SITE_URL}/movie/${rev.movieSlug}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ fontSize: "0.72rem", color: "var(--muted)", textDecoration: "none", display: "inline-block", marginTop: 2 }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold)")}
                                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                              >
                                View page ↗
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Rating */}
                      <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                        <div style={{ color: "var(--gold)", fontWeight: 700, fontSize: "0.85rem", letterSpacing: "1px" }}>
                          {"★".repeat(displayStarsVal)}
                          <span style={{ color: "rgba(255,255,255,0.2)" }}>{"★".repeat(5 - displayStarsVal)}</span>
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2, fontWeight: 600 }}>
                          {rev.rating} / {rev.rating > 5 ? 10 : 5}
                        </div>
                      </td>

                      {/* Date */}
                      <td style={{ padding: "14px 16px", verticalAlign: "top", color: "var(--muted)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                        {rev.date ? rev.date.split("T")[0] : "—"}
                      </td>

                      {/* Review Text with Truncation & View More Toggle */}
                      <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                        <div style={{ color: "var(--text)", lineHeight: 1.55, fontSize: "0.84rem", fontStyle: "italic", wordBreak: "break-word" }}>
                          "{displayText}"
                        </div>

                        {/* View More / Show Less Button */}
                        {isLongText && (
                          <div style={{ marginTop: 6, display: "flex", gap: 10, alignItems: "center" }}>
                            <button
                              type="button"
                              onClick={() => toggleExpand(rev.reviewId)}
                              style={{
                                background: "none",
                                border: "none",
                                padding: 0,
                                color: "var(--gold)",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                textDecoration: "underline",
                              }}
                            >
                              {isExpanded ? "▲ Show Less" : "▼ View More"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedReviewModal(rev)}
                              style={{
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid var(--border)",
                                borderRadius: 4,
                                padding: "2px 6px",
                                color: "var(--text)",
                                fontSize: "0.7rem",
                                cursor: "pointer",
                              }}
                            >
                              🔍 Read Full
                            </button>
                          </div>
                        )}

                        {rev.likes > 0 && (
                          <div style={{ fontSize: "0.7rem", color: "var(--gold)", marginTop: 6, fontWeight: 600 }}>
                            ❤️ {rev.likes} likes
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 16px", verticalAlign: "top", textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }}>
                          {/* Download Poster Button */}
                          <button
                            className="btn btn-ghost btn-sm"
                            disabled={isDownloading}
                            onClick={() => handleDownloadPoster(rev)}
                            style={{
                              background: "rgba(201,151,58,0.12)",
                              border: "1px solid rgba(201,151,58,0.3)",
                              color: "var(--gold)",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              padding: "5px 10px",
                            }}
                            title="Download PNG review poster card"
                          >
                            {isDownloading ? "⏳ Saving…" : "🖼️ Download Poster"}
                          </button>

                          {/* Delete Review Button */}
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleDeleteReview(rev)}
                            style={{ color: "var(--red)", fontSize: "0.8rem", padding: "5px 8px" }}
                            title="Delete review"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "var(--bg3)", borderTop: "1px solid var(--border)" }}>
              <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, reviews.length)} of {reviews.length} reviews
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ← Prev
                </button>
                <span style={{ padding: "4px 10px", fontSize: "0.8rem", fontWeight: 700, color: "var(--gold)" }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Review Text Modal */}
      {selectedReviewModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, maxWidth: 560, width: "100%", maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: "1.1rem" }}>{selectedReviewModal.movieTitle}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--gold)", marginTop: 2 }}>
                  Reviewed by {selectedReviewModal.user} {selectedReviewModal.email ? `(${selectedReviewModal.email})` : ""}
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSelectedReviewModal(null)}
                style={{ fontSize: "1.2rem", padding: "2px 8px" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, background: "var(--bg3)", padding: "10px 14px", borderRadius: 8 }}>
              <div style={{ color: "var(--gold)", fontWeight: 700 }}>
                {"★".repeat(selectedReviewModal.rating > 5 ? Math.round(selectedReviewModal.rating / 2) : Math.round(selectedReviewModal.rating))}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                Score: {selectedReviewModal.rating} / {selectedReviewModal.rating > 5 ? 10 : 5}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginLeft: "auto" }}>
                Date: {selectedReviewModal.date ? selectedReviewModal.date.split("T")[0] : "N/A"}
              </div>
            </div>

            <div style={{ color: "var(--text)", lineHeight: 1.7, fontSize: "0.92rem", fontStyle: "italic", whiteSpace: "pre-wrap", background: "rgba(0,0,0,0.3)", padding: 16, borderRadius: 10, border: "1px solid var(--border)" }}>
              "{selectedReviewModal.text}"
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <button
                className="btn btn-gold btn-sm"
                onClick={() => {
                  const rev = selectedReviewModal;
                  setSelectedReviewModal(null);
                  handleDownloadPoster(rev);
                }}
              >
                🖼️ Download Poster
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedReviewModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, maxWidth: 440, width: "100%" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: 10 }}>⚠️</div>
            <div style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: 8 }}>Delete User Review?</div>
            <p style={{ color: "var(--muted)", fontSize: "0.85rem", lineHeight: 1.5, marginBottom: 20 }}>
              Are you sure you want to delete the review by <strong>{confirmDelete.review.user}</strong> for <strong>{confirmDelete.review.movieTitle}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-sm" style={{ background: "var(--red)", color: "#fff", border: "none", fontWeight: 700 }} onClick={confirmDelete.onConfirm}>
                Delete Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
