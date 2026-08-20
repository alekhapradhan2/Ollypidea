import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useMemo } from "react";
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
function getAvatarColor(str = "") {
  const colors = [
    { bg: "rgba(201, 151, 58, 0.18)", border: "rgba(201, 151, 58, 0.5)", text: "#f5c518" },
    { bg: "rgba(59, 130, 246, 0.18)", border: "rgba(59, 130, 246, 0.5)", text: "#60a5fa" },
    { bg: "rgba(16, 185, 129, 0.18)", border: "rgba(16, 185, 129, 0.5)", text: "#34d399" },
    { bg: "rgba(168, 85, 247, 0.18)", border: "rgba(168, 85, 247, 0.5)", text: "#c084fc" },
    { bg: "rgba(236, 72, 153, 0.18)", border: "rgba(236, 72, 153, 0.5)", text: "#f472b6" },
    { bg: "rgba(249, 115, 22, 0.18)", border: "rgba(249, 115, 22, 0.5)", text: "#fb923c" }
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
function UserReviewsPanel({ movies = [], onToast, defaultMode = "users" }) {
  const [activeTab, setActiveTab] = useState(defaultMode === "reviews" ? "reviews" : "reviewers");
  useEffect(() => {
    setActiveTab(defaultMode === "reviews" ? "reviews" : "reviewers");
  }, [defaultMode]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedReviewModal, setSelectedReviewModal] = useState(null);
  const [selectedUserModal, setSelectedUserModal] = useState(null);
  const [expandedReviews, setExpandedReviews] = useState(/* @__PURE__ */ new Set());
  const [reviewerSearch, setReviewerSearch] = useState("");
  const [reviewerTier, setReviewerTier] = useState("");
  const [reviewerRatingFilter, setReviewerRatingFilter] = useState("");
  const [reviewerSort, setReviewerSort] = useState("most_reviews");
  const [reviewerPage, setReviewerPage] = useState(1);
  const REVIEWERS_PER_PAGE = 12;
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
  const allReviewers = useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    reviews.forEach((rev, idx) => {
      const userName = (rev.user || "Anonymous").trim();
      const userEmail = (rev.email || "").trim().toLowerCase();
      const userKey = userEmail || `user_${userName.toLowerCase().replace(/\s+/g, "_")}`;
      if (!map.has(userKey)) {
        map.set(userKey, {
          userKey,
          name: userName,
          email: userEmail,
          reviews: [],
          totalLikes: 0,
          ratingSum: 0,
          ratings: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        });
      }
      const u = map.get(userKey);
      if (userName && userName !== "Anonymous") u.name = userName;
      if (userEmail && !u.email) u.email = userEmail;
      const rawRating = typeof rev.rating === "number" ? rev.rating : 5;
      const normalizedStar = Math.max(1, Math.min(5, Math.round(rawRating > 5 ? rawRating / 2 : rawRating)));
      u.ratingSum += rawRating;
      u.totalLikes += rev.likes || 0;
      u.ratings[normalizedStar] = (u.ratings[normalizedStar] || 0) + 1;
      u.reviews.push({
        ...rev,
        normalizedStar
      });
    });
    return Array.from(map.values()).map((u) => {
      const count = u.reviews.length;
      const avg = count > 0 ? (u.ratingSum / count).toFixed(1) : "0.0";
      u.reviews.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      const dates = u.reviews.map((r) => r.date).filter(Boolean).sort();
      const firstDate = dates[0] || "";
      const lastDate = dates[dates.length - 1] || "";
      let highestReview = u.reviews[0];
      let lowestReview = u.reviews[0];
      u.reviews.forEach((r) => {
        if (r.rating > highestReview.rating) highestReview = r;
        if (r.rating < lowestReview.rating) lowestReview = r;
      });
      const positiveCount = (u.ratings[5] || 0) + (u.ratings[4] || 0);
      const positivePct = count > 0 ? Math.round(positiveCount / count * 100) : 0;
      let tier = "First-timer";
      if (u.role === "admin") tier = "Admin";
      else if (count >= 5) tier = "Cinephile";
      else if (count >= 2) tier = "Regular";
      else if (u.isRegisteredCommunity) tier = "Community Member";
      return {
        userKey: u.userKey,
        name: u.name,
        email: u.email,
        totalReviews: count,
        avgRating: avg,
        totalLikes: u.totalLikes,
        ratingsDistribution: u.ratings,
        positivePercentage: positivePct,
        firstReviewDate: firstDate,
        lastReviewDate: lastDate,
        tier,
        highestRatedMovie: highestReview ? {
          title: highestReview.movieTitle,
          rating: highestReview.rating,
          posterUrl: highestReview.moviePoster
        } : null,
        lowestRatedMovie: lowestReview ? {
          title: lowestReview.movieTitle,
          rating: lowestReview.rating,
          posterUrl: lowestReview.moviePoster
        } : null,
        movies: u.reviews.map((r) => ({
          movieId: r.movieId,
          movieTitle: r.movieTitle,
          moviePoster: r.moviePoster,
          rating: r.rating,
          date: r.date
        })),
        reviews: u.reviews
      };
    });
  }, [reviews]);
  const filteredReviewers = useMemo(() => {
    let list = allReviewers;
    if (reviewerSearch.trim()) {
      const q = reviewerSearch.trim().toLowerCase();
      list = list.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.movies.some((m) => m.movieTitle.toLowerCase().includes(q))
      );
    }
    if (reviewerTier) {
      list = list.filter((u) => u.tier.toLowerCase() === reviewerTier.toLowerCase());
    }
    if (reviewerRatingFilter) {
      if (reviewerRatingFilter === "high") list = list.filter((u) => Number(u.avgRating) >= 4);
      else if (reviewerRatingFilter === "medium") list = list.filter((u) => Number(u.avgRating) >= 3 && Number(u.avgRating) < 4);
      else if (reviewerRatingFilter === "low") list = list.filter((u) => Number(u.avgRating) < 3);
    }
    list.sort((a, b) => {
      if (reviewerSort === "most_reviews") return b.totalReviews - a.totalReviews;
      if (reviewerSort === "highest_rating") return Number(b.avgRating) - Number(a.avgRating);
      if (reviewerSort === "lowest_rating") return Number(a.avgRating) - Number(b.avgRating);
      if (reviewerSort === "oldest") return new Date(a.lastReviewDate || 0).getTime() - new Date(b.lastReviewDate || 0).getTime();
      if (reviewerSort === "name") return a.name.localeCompare(b.name);
      const dateDiff = new Date(b.lastReviewDate || 0).getTime() - new Date(a.lastReviewDate || 0).getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.totalReviews - a.totalReviews;
    });
    return list;
  }, [allReviewers, reviewerSearch, reviewerTier, reviewerRatingFilter, reviewerSort]);
  const pagedReviewers = useMemo(() => {
    return filteredReviewers.slice((reviewerPage - 1) * REVIEWERS_PER_PAGE, reviewerPage * REVIEWERS_PER_PAGE);
  }, [filteredReviewers, reviewerPage]);
  const totalReviewerPages = Math.ceil(filteredReviewers.length / REVIEWERS_PER_PAGE);
  const globalStats = useMemo(() => {
    const totalReviews = reviews.length;
    const totalReviewers = allReviewers.length;
    const overallAvgRating = totalReviews > 0 ? (reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / totalReviews).toFixed(1) : "0.0";
    const superReviewersCount = allReviewers.filter((u) => u.totalReviews >= 3).length;
    const movieCounts = {};
    reviews.forEach((r) => {
      if (r.movieTitle) movieCounts[r.movieTitle] = (movieCounts[r.movieTitle] || 0) + 1;
    });
    let topMovie = "N/A";
    let max = 0;
    Object.entries(movieCounts).forEach(([m, c]) => {
      if (c > max) {
        max = c;
        topMovie = m;
      }
    });
    return {
      totalReviews,
      totalReviewers,
      overallAvgRating,
      superReviewersCount,
      topMovie
    };
  }, [reviews, allReviewers]);
  useEffect(() => {
    if (selectedUserModal) {
      const refreshed = allReviewers.find((u) => u.userKey === selectedUserModal.userKey);
      if (refreshed) setSelectedUserModal(refreshed);
    }
  }, [allReviewers]);
  const handleFilterChange = (setter, val) => {
    setter(val);
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
  const handleClearReviewerFilters = () => {
    setReviewerSearch("");
    setReviewerTier("");
    setReviewerRatingFilter("");
    setReviewerSort("most_reviews");
    setReviewerPage(1);
  };
  const handleExportReviewersCSV = () => {
    if (!filteredReviewers.length) {
      onToast == null ? void 0 : onToast("No reviewer data to export", "error");
      return;
    }
    const headers = [
      "User Name",
      "Email ID",
      "Tier",
      "Total Reviews",
      "Avg Rating",
      "Positive %",
      "Total Likes",
      "First Review Date",
      "Last Review Date",
      "Movies Reviewed"
    ];
    const rows = filteredReviewers.map((u) => [
      `"${(u.name || "").replace(/"/g, '""')}"`,
      `"${(u.email || "N/A").replace(/"/g, '""')}"`,
      `"${u.tier}"`,
      u.totalReviews,
      u.avgRating,
      `${u.positivePercentage}%`,
      u.totalLikes,
      `"${u.firstReviewDate || ""}"`,
      `"${u.lastReviewDate || ""}"`,
      `"${u.movies.map((m) => m.movieTitle).join("; ").replace(/"/g, '""')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ollypedia_reviewers_analytics_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onToast == null ? void 0 : onToast("Exported Reviewers Analytics CSV!");
  };
  const handleExportSingleUserCSV = (userObj) => {
    var _a;
    if (!((_a = userObj == null ? void 0 : userObj.reviews) == null ? void 0 : _a.length)) return;
    const headers = ["Movie Title", "Star Rating", "Submitted Date", "Likes", "Review Text"];
    const rows = userObj.reviews.map((r) => [
      `"${(r.movieTitle || "").replace(/"/g, '""')}"`,
      r.rating || 5,
      `"${r.date || ""}"`,
      r.likes || 0,
      `"${(r.text || "").replace(/"/g, '""')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const sanitizedName = userObj.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    link.setAttribute("download", `reviews_${sanitizedName}_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onToast == null ? void 0 : onToast(`Exported reviews for ${userObj.name}!`);
  };
  const handleExportReviewsCSV = () => {
    if (!reviews.length) {
      onToast == null ? void 0 : onToast("No review data available to export", "error");
      return;
    }
    const headers = [
      "Review ID",
      "User Name",
      "Email ID",
      "Movie Title",
      "Star Rating",
      "Submitted Date",
      "Review Text",
      "Likes"
    ];
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
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
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
          onToast == null ? void 0 : onToast("User review permanently deleted.");
          fetchReviews();
        } catch (err) {
          console.error("Delete review error:", err);
          onToast == null ? void 0 : onToast(err.message || "Failed to delete review", "error");
        }
      }
    });
  };
  const handleDownloadPoster = async (rev) => {
    setDownloadingId(rev.reviewId);
    onToast == null ? void 0 : onToast("Generating review poster card…");
    try {
      const CARD_W = 540;
      const CARD_H = 675;
      const PAD = 28;
      const INNER_W = CARD_W - PAD * 2;
      const canvas = document.createElement("canvas");
      canvas.width = CARD_W * 2;
      canvas.height = CARD_H * 2;
      const ctx = canvas.getContext("2d");
      ctx.scale(2, 2);
      ctx.fillStyle = "#0d0d12";
      ctx.fillRect(0, 0, CARD_W, CARD_H);
      const topGlow = ctx.createRadialGradient(CARD_W / 2, 0, 10, CARD_W / 2, 0, CARD_W * 0.75);
      topGlow.addColorStop(0, "rgba(201, 151, 58, 0.18)");
      topGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, CARD_W, CARD_H);
      ctx.strokeStyle = "rgba(201, 151, 58, 0.4)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, 8, 8, CARD_W - 16, CARD_H - 16, 12);
      ctx.stroke();
      const posterImg = await loadProxiedImage(rev.moviePoster);
      let curY = PAD;
      ctx.fillStyle = "#c9973a";
      ctx.font = "bold 13px 'Georgia', serif";
      ctx.textAlign = "center";
      ctx.fillText("O L L Y P E D I A", CARD_W / 2, curY + 6);
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "9.5px 'Segoe UI', sans-serif";
      ctx.fillText("AUDIENCE REVIEW CARD", CARD_W / 2, curY + 21);
      ctx.textAlign = "left";
      curY += 34;
      ctx.strokeStyle = "rgba(201,151,58,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, curY);
      ctx.lineTo(CARD_W - PAD, curY);
      ctx.stroke();
      curY += 16;
      const POSTER_W = 76;
      const POSTER_H = 108;
      if (posterImg) {
        ctx.save();
        roundRect(ctx, PAD, curY, POSTER_W, POSTER_H, 6);
        ctx.clip();
        ctx.drawImage(posterImg, PAD, curY, POSTER_W, POSTER_H);
        ctx.restore();
        ctx.strokeStyle = "rgba(201, 151, 58, 0.6)";
        ctx.lineWidth = 1;
        roundRect(ctx, PAD, curY, POSTER_W, POSTER_H, 6);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#181820";
        roundRect(ctx, PAD, curY, POSTER_W, POSTER_H, 6);
        ctx.fill();
        ctx.fillStyle = "#c9973a";
        ctx.font = "26px sans-serif";
        ctx.fillText("🎬", PAD + 24, curY + 62);
      }
      const textX = PAD + POSTER_W + 16;
      const textW = INNER_W - POSTER_W - 16;
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 17px 'Georgia', serif";
      const titleLines = [];
      const words = (rev.movieTitle || "Movie Review").split(" ");
      let line = "";
      for (let w of words) {
        const test = line + (line ? " " : "") + w;
        if (ctx.measureText(test).width <= textW) line = test;
        else {
          if (line) titleLines.push(line);
          line = w;
        }
      }
      if (line) titleLines.push(line);
      titleLines.slice(0, 2).forEach((tl, i) => {
        ctx.fillText(tl, textX, curY + 22 + i * 22);
      });
      const ratingVal = rev.rating || 5;
      const displayStars = ratingVal > 5 ? Math.round(ratingVal / 2) : Math.round(ratingVal);
      const starY = curY + 26 + Math.min(titleLines.length, 2) * 22;
      for (let i = 0; i < 5; i++) {
        drawStar(ctx, textX + i * 19 + 8, starY, 7.5, "#c9973a", i < displayStars ? "#c9973a" : "none");
      }
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(`${ratingVal} / ${ratingVal > 5 ? 10 : 5}`, textX + 110, starY + 4);
      curY += POSTER_H + 18;
      const BOX_X = PAD;
      const BOX_Y = curY;
      const BOX_W = INNER_W;
      const BOX_H = CARD_H - curY - 50;
      ctx.fillStyle = "rgba(24, 24, 32, 0.85)";
      roundRect(ctx, BOX_X, BOX_Y, BOX_W, BOX_H, 10);
      ctx.fill();
      ctx.strokeStyle = "rgba(201, 151, 58, 0.25)";
      ctx.lineWidth = 1;
      roundRect(ctx, BOX_X, BOX_Y, BOX_W, BOX_H, 10);
      ctx.stroke();
      ctx.fillStyle = "#f1f5f9";
      ctx.font = "italic 13.5px 'Georgia', serif";
      const qWords = (rev.text || "").split(" ");
      const qLines = [];
      let qLine = "";
      const maxTextW = BOX_W - 36;
      for (let w of qWords) {
        const test = qLine + (qLine ? " " : "") + w;
        if (ctx.measureText(test).width <= maxTextW) qLine = test;
        else {
          if (qLine) qLines.push(qLine);
          qLine = w;
        }
      }
      if (qLine) qLines.push(qLine);
      const maxLines = Math.floor((BOX_H - 65) / 22);
      const renderLines = qLines.slice(0, maxLines);
      renderLines.forEach((ln, i) => {
        const prefix = i === 0 ? "“" : "";
        const suffix = i === renderLines.length - 1 && qLines.length > maxLines ? "…”" : i === renderLines.length - 1 ? "”" : "";
        ctx.fillText(`${prefix}${ln}${suffix}`, BOX_X + 18, BOX_Y + 34 + i * 22);
      });
      const attrY = BOX_Y + BOX_H - 18;
      ctx.fillStyle = "#c9973a";
      ctx.font = "bold 13px 'Georgia', serif";
      ctx.fillText(`— ${rev.user || "Anonymous"}`, BOX_X + 18, attrY);
      if (rev.date) {
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.font = "11px sans-serif";
        ctx.fillText(` · ${rev.date.split("T")[0]}`, BOX_X + 18 + ctx.measureText(`— ${rev.user || "Anonymous"}`).width, attrY);
      }
      ctx.fillStyle = "rgba(201, 151, 58, 0.6)";
      ctx.font = "10.5px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ollypedia.in · The Odia Cinema Encyclopedia", CARD_W / 2, CARD_H - 18);
      ctx.textAlign = "left";
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      const sanitizeTitle = (rev.movieTitle || "movie").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      a.download = `${sanitizeTitle}-review-poster.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      onToast == null ? void 0 : onToast("Downloaded Review Poster PNG!");
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
    padding: "7px 10px"
  };
  return /* @__PURE__ */ jsxs("div", { style: { padding: "28px 28px 40px" }, children: [
    /* @__PURE__ */ jsxs("div", { style: { marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }, children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
          /* @__PURE__ */ jsx("h2", { style: { fontSize: "1.6rem", fontWeight: 900, margin: 0, letterSpacing: "-0.02em" }, children: activeTab === "reviewers" ? "Users & Reviewers" : "Reviews Feed" }),
          /* @__PURE__ */ jsx("span", { style: { fontSize: "0.72rem", background: "rgba(201,151,58,0.12)", color: "var(--gold)", border: "1px solid rgba(201,151,58,0.3)", padding: "3px 9px", borderRadius: 12, fontWeight: 700 }, children: activeTab === "reviewers" ? "User Analytics Module" : "Live Audience Feed" })
        ] }),
        /* @__PURE__ */ jsx("p", { style: { color: "var(--muted)", fontSize: "0.85rem", margin: "4px 0 0" }, children: activeTab === "reviewers" ? "All users who have given reviews. Click any user to inspect their analytical breakdown and all submitted reviews." : "All user submitted movie reviews listed in chronological order (newest to oldest), with advanced filters and poster generation." })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, padding: 3, gap: 4 }, children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setActiveTab("reviewers"),
            style: {
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 16px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: "0.84rem",
              fontWeight: activeTab === "reviewers" ? 800 : 500,
              background: activeTab === "reviewers" ? "var(--gold)" : "transparent",
              color: activeTab === "reviewers" ? "#000" : "var(--muted)",
              transition: "all 0.15s ease"
            },
            children: [
              /* @__PURE__ */ jsx("span", { children: "👥" }),
              /* @__PURE__ */ jsx("span", { children: "Reviewer Users" }),
              /* @__PURE__ */ jsx("span", { style: {
                fontSize: "0.7rem",
                background: activeTab === "reviewers" ? "rgba(0,0,0,0.2)" : "var(--bg3)",
                color: activeTab === "reviewers" ? "#000" : "var(--gold)",
                padding: "1px 6px",
                borderRadius: 8,
                fontWeight: 700
              }, children: allReviewers.length })
            ]
          }
        ),
        /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setActiveTab("reviews"),
            style: {
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 16px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: "0.84rem",
              fontWeight: activeTab === "reviews" ? 800 : 500,
              background: activeTab === "reviews" ? "var(--gold)" : "transparent",
              color: activeTab === "reviews" ? "#000" : "var(--muted)",
              transition: "all 0.15s ease"
            },
            children: [
              /* @__PURE__ */ jsx("span", { children: "💬" }),
              /* @__PURE__ */ jsx("span", { children: "All Reviews Feed" }),
              /* @__PURE__ */ jsx("span", { style: {
                fontSize: "0.7rem",
                background: activeTab === "reviews" ? "rgba(0,0,0,0.2)" : "var(--bg3)",
                color: activeTab === "reviews" ? "#000" : "var(--gold)",
                padding: "1px 6px",
                borderRadius: 8,
                fontWeight: 700
              }, children: reviews.length })
            ]
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16, marginBottom: 28 }, children: [
      /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
          /* @__PURE__ */ jsx("span", { style: { fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }, children: "Unique Reviewers" }),
          /* @__PURE__ */ jsx("span", { style: { fontSize: "1.4rem" }, children: "👥" })
        ] }),
        /* @__PURE__ */ jsx("div", { style: { fontSize: "1.9rem", fontWeight: 900, color: "#4caf82", marginTop: 6 }, children: globalStats.totalReviewers }),
        /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }, children: "Distinct verified reviewer profiles" })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
          /* @__PURE__ */ jsx("span", { style: { fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }, children: "Total Reviews Given" }),
          /* @__PURE__ */ jsx("span", { style: { fontSize: "1.4rem" }, children: "💬" })
        ] }),
        /* @__PURE__ */ jsx("div", { style: { fontSize: "1.9rem", fontWeight: 900, color: "var(--gold)", marginTop: 6 }, children: globalStats.totalReviews }),
        /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }, children: "Audience reviews across all movies" })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
          /* @__PURE__ */ jsx("span", { style: { fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }, children: "Overall Avg Rating" }),
          /* @__PURE__ */ jsx("span", { style: { fontSize: "1.4rem" }, children: "⭐" })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { fontSize: "1.9rem", fontWeight: 900, color: "var(--gold)", marginTop: 6 }, children: [
          globalStats.overallAvgRating,
          " ",
          /* @__PURE__ */ jsx("span", { style: { fontSize: "0.9rem", color: "var(--muted)", fontWeight: 400 }, children: "/ 5" })
        ] }),
        /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }, children: "General audience reception" })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
          /* @__PURE__ */ jsx("span", { style: { fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }, children: "Power Reviewers (3+ reviews)" }),
          /* @__PURE__ */ jsx("span", { style: { fontSize: "1.4rem" }, children: "🌟" })
        ] }),
        /* @__PURE__ */ jsx("div", { style: { fontSize: "1.9rem", fontWeight: 900, color: "#60a5fa", marginTop: 6 }, children: globalStats.superReviewersCount }),
        /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }, children: "Frequent movie commentators" })
      ] })
    ] }),
    activeTab === "reviewers" && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", marginBottom: 20 }, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 14 }, children: [
          /* @__PURE__ */ jsxs("div", { style: { fontWeight: 800, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 8 }, children: [
            /* @__PURE__ */ jsx("span", { children: "🔍 Reviewer Filters & Search" }),
            filteredReviewers.length !== allReviewers.length && /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.72rem", background: "rgba(201,151,58,0.12)", color: "var(--gold)", border: "1px solid rgba(201,151,58,0.3)", padding: "2px 8px", borderRadius: 10 }, children: [
              filteredReviewers.length,
              " result",
              filteredReviewers.length !== 1 ? "s" : ""
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, alignItems: "center" }, children: [
            /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", onClick: handleClearReviewerFilters, style: { fontSize: "0.78rem" }, children: "↺ Reset" }),
            /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: handleExportReviewersCSV, style: { display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }, children: "📥 Export Reviewers CSV" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }, children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { style: { display: "block", fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4, fontWeight: 600 }, children: "Search Name, Email, Film" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                className: "form-input",
                style: { width: "100%", fontSize: "0.82rem", background: "#1c1c21", color: "#f4f4f5" },
                placeholder: "Search reviewer or movie title…",
                value: reviewerSearch,
                onChange: (e) => {
                  setReviewerSearch(e.target.value);
                  setReviewerPage(1);
                }
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { style: { display: "block", fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4, fontWeight: 600 }, children: "Reviewer Tier" }),
            /* @__PURE__ */ jsxs(
              "select",
              {
                style: darkSelectStyle,
                value: reviewerTier,
                onChange: (e) => {
                  setReviewerTier(e.target.value);
                  setReviewerPage(1);
                },
                children: [
                  /* @__PURE__ */ jsx("option", { value: "", style: { background: "#1c1c21", color: "#ffffff" }, children: "All Tiers" }),
                  /* @__PURE__ */ jsx("option", { value: "cinephile", style: { background: "#1c1c21", color: "#ffffff" }, children: "🌟 Cinephile (5+ Reviews)" }),
                  /* @__PURE__ */ jsx("option", { value: "regular", style: { background: "#1c1c21", color: "#ffffff" }, children: "🎬 Regular (2–4 Reviews)" }),
                  /* @__PURE__ */ jsx("option", { value: "first-timer", style: { background: "#1c1c21", color: "#ffffff" }, children: "👤 First-timer (1 Review)" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { style: { display: "block", fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4, fontWeight: 600 }, children: "Average Rating Bracket" }),
            /* @__PURE__ */ jsxs(
              "select",
              {
                style: darkSelectStyle,
                value: reviewerRatingFilter,
                onChange: (e) => {
                  setReviewerRatingFilter(e.target.value);
                  setReviewerPage(1);
                },
                children: [
                  /* @__PURE__ */ jsx("option", { value: "", style: { background: "#1c1c21", color: "#ffffff" }, children: "All Rating Brackets" }),
                  /* @__PURE__ */ jsx("option", { value: "high", style: { background: "#1c1c21", color: "#ffffff" }, children: "🟢 High Rating (4.0 – 5.0★)" }),
                  /* @__PURE__ */ jsx("option", { value: "medium", style: { background: "#1c1c21", color: "#ffffff" }, children: "🟡 Medium Rating (3.0 – 3.9★)" }),
                  /* @__PURE__ */ jsx("option", { value: "low", style: { background: "#1c1c21", color: "#ffffff" }, children: "🔴 Critical Reviewer (< 3.0★)" })
                ]
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { style: { display: "block", fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4, fontWeight: 600 }, children: "Sort Reviewers By" }),
            /* @__PURE__ */ jsxs(
              "select",
              {
                style: darkSelectStyle,
                value: reviewerSort,
                onChange: (e) => {
                  setReviewerSort(e.target.value);
                  setReviewerPage(1);
                },
                children: [
                  /* @__PURE__ */ jsx("option", { value: "most_reviews", style: { background: "#1c1c21", color: "#ffffff" }, children: "Most Reviews Submitted" }),
                  /* @__PURE__ */ jsx("option", { value: "highest_rating", style: { background: "#1c1c21", color: "#ffffff" }, children: "Highest Avg Rating" }),
                  /* @__PURE__ */ jsx("option", { value: "lowest_rating", style: { background: "#1c1c21", color: "#ffffff" }, children: "Lowest Avg Rating" }),
                  /* @__PURE__ */ jsx("option", { value: "newest", style: { background: "#1c1c21", color: "#ffffff" }, children: "Most Recent Review Date" }),
                  /* @__PURE__ */ jsx("option", { value: "name", style: { background: "#1c1c21", color: "#ffffff" }, children: "Name (A–Z)" })
                ]
              }
            )
          ] })
        ] })
      ] }),
      loading ? /* @__PURE__ */ jsx("div", { style: { padding: 60, textAlign: "center", color: "var(--muted)", fontSize: "1.1rem" }, children: "⏳ Loading reviewer analytics data…" }) : filteredReviewers.length === 0 ? /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 50, textAlign: "center" }, children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: "3rem", marginBottom: 12 }, children: "👥" }),
        /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, fontSize: "1.1rem", marginBottom: 6 }, children: "No Reviewers Found" }),
        /* @__PURE__ */ jsx("p", { style: { color: "var(--muted)", fontSize: "0.85rem", maxWidth: 400, margin: "0 auto 16px" }, children: "No reviewer users match your search criteria." }),
        /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", onClick: handleClearReviewerFilters, children: "Clear Filters" })
      ] }) : /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }, children: [
        /* @__PURE__ */ jsx("div", { style: { overflowX: "auto" }, children: /* @__PURE__ */ jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }, children: [
          /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { style: { background: "var(--bg3)", color: "var(--muted)", borderBottom: "1px solid var(--border)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.06em" }, children: [
            /* @__PURE__ */ jsx("th", { style: { padding: "14px 18px", width: "230px" }, children: "Reviewer Profile" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "14px 18px", width: "120px" }, children: "Tier / Status" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "14px 18px", width: "110px" }, children: "Total Reviews" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "14px 18px", width: "130px" }, children: "Avg Rating" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "14px 18px", minWidth: "220px" }, children: "Movies Reviewed" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "14px 18px", width: "120px" }, children: "Sentiment" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "14px 18px", width: "130px" }, children: "Latest Activity" }),
            /* @__PURE__ */ jsx("th", { style: { padding: "14px 18px", textAlign: "right", width: "150px" }, children: "Actions" })
          ] }) }),
          /* @__PURE__ */ jsx("tbody", { children: pagedReviewers.map((userObj) => {
            const avatarColors = getAvatarColor(userObj.name);
            const initials = (userObj.name || "U").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
            const isCinephile = userObj.tier === "Cinephile";
            const isRegular = userObj.tier === "Regular";
            const avgNum = Number(userObj.avgRating) || 0;
            const ratingColor = avgNum >= 4 ? "#4caf82" : avgNum >= 3 ? "var(--gold)" : "var(--red)";
            return /* @__PURE__ */ jsxs(
              "tr",
              {
                onClick: () => setSelectedUserModal(userObj),
                style: {
                  borderBottom: "1px solid var(--border)",
                  cursor: "pointer",
                  transition: "background 0.15s ease"
                },
                onMouseEnter: (e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.025)";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.background = "transparent";
                },
                children: [
                  /* @__PURE__ */ jsx("td", { style: { padding: "14px 18px", verticalAlign: "middle" }, children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [
                    /* @__PURE__ */ jsx(
                      "div",
                      {
                        style: {
                          width: 42,
                          height: 42,
                          borderRadius: "50%",
                          background: avatarColors.bg,
                          border: `2px solid ${avatarColors.border}`,
                          color: avatarColors.text,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 900,
                          fontSize: "0.95rem",
                          flexShrink: 0,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
                        },
                        children: initials
                      }
                    ),
                    /* @__PURE__ */ jsxs("div", { style: { minWidth: 0 }, children: [
                      /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, color: "var(--text)", fontSize: "0.92rem", lineHeight: 1.2 }, children: userObj.name }),
                      userObj.email ? /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.74rem", color: "var(--gold)", marginTop: 3, fontWeight: 500, wordBreak: "break-all" }, children: [
                        "✉️ ",
                        userObj.email
                      ] }) : /* @__PURE__ */ jsx("div", { style: { fontSize: "0.7rem", color: "var(--muted)", marginTop: 2 }, children: "No email profile" })
                    ] })
                  ] }) }),
                  /* @__PURE__ */ jsx("td", { style: { padding: "14px 18px", verticalAlign: "middle" }, children: /* @__PURE__ */ jsx(
                    "span",
                    {
                      style: {
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 10,
                        background: isCinephile ? "rgba(168, 85, 247, 0.15)" : isRegular ? "rgba(59, 130, 246, 0.15)" : "rgba(255,255,255,0.06)",
                        color: isCinephile ? "#c084fc" : isRegular ? "#60a5fa" : "var(--muted)",
                        border: isCinephile ? "1px solid rgba(168, 85, 247, 0.4)" : isRegular ? "1px solid rgba(59, 130, 246, 0.4)" : "1px solid var(--border)"
                      },
                      children: isCinephile ? "🌟 Cinephile" : isRegular ? "🎬 Regular" : "👤 First-timer"
                    }
                  ) }),
                  /* @__PURE__ */ jsx("td", { style: { padding: "14px 18px", verticalAlign: "middle" }, children: /* @__PURE__ */ jsxs("div", { style: { display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(201,151,58,0.12)", color: "var(--gold)", padding: "4px 10px", borderRadius: 8, fontWeight: 800, fontSize: "0.88rem" }, children: [
                    "💬 ",
                    userObj.totalReviews
                  ] }) }),
                  /* @__PURE__ */ jsxs("td", { style: { padding: "14px 18px", verticalAlign: "middle" }, children: [
                    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "baseline", gap: 4 }, children: [
                      /* @__PURE__ */ jsxs("span", { style: { color: ratingColor, fontWeight: 900, fontSize: "1.05rem" }, children: [
                        "⭐ ",
                        userObj.avgRating
                      ] }),
                      /* @__PURE__ */ jsx("span", { style: { fontSize: "0.7rem", color: "var(--muted)" }, children: "/ 5" })
                    ] }),
                    /* @__PURE__ */ jsx("div", { style: { fontSize: "0.68rem", color: "var(--muted)", marginTop: 2 }, children: userObj.totalLikes > 0 ? `❤️ ${userObj.totalLikes} likes` : "No likes yet" })
                  ] }),
                  /* @__PURE__ */ jsx("td", { style: { padding: "14px 18px", verticalAlign: "middle" }, children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }, children: [
                    userObj.movies.slice(0, 3).map((m, mIdx) => /* @__PURE__ */ jsxs(
                      "div",
                      {
                        title: `${m.movieTitle} (${m.rating}★)`,
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          background: "var(--bg3)",
                          border: "1px solid var(--border)",
                          borderRadius: 6,
                          padding: "2px 6px",
                          fontSize: "0.72rem",
                          maxWidth: 160
                        },
                        children: [
                          m.moviePoster ? /* @__PURE__ */ jsx(
                            "img",
                            {
                              src: m.moviePoster,
                              alt: m.movieTitle,
                              style: { width: 16, height: 22, objectFit: "cover", borderRadius: 2 },
                              onError: (e) => {
                                e.target.style.display = "none";
                              }
                            }
                          ) : /* @__PURE__ */ jsx("span", { children: "🎬" }),
                          /* @__PURE__ */ jsx("span", { style: { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--text)", fontWeight: 600 }, children: m.movieTitle })
                        ]
                      },
                      mIdx
                    )),
                    userObj.movies.length > 3 && /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.7rem", color: "var(--gold)", fontWeight: 700, padding: "2px 5px", background: "rgba(201,151,58,0.1)", borderRadius: 4 }, children: [
                      "+",
                      userObj.movies.length - 3,
                      " more"
                    ] })
                  ] }) }),
                  /* @__PURE__ */ jsx("td", { style: { padding: "14px 18px", verticalAlign: "middle" }, children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 3 }, children: [
                    /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.76rem", fontWeight: 700, color: userObj.positivePercentage >= 70 ? "#4caf82" : userObj.positivePercentage >= 40 ? "var(--gold)" : "var(--red)" }, children: [
                      userObj.positivePercentage,
                      "% Positive"
                    ] }),
                    /* @__PURE__ */ jsx("div", { style: { height: 4, width: 70, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }, children: /* @__PURE__ */ jsx(
                      "div",
                      {
                        style: {
                          height: "100%",
                          width: `${userObj.positivePercentage}%`,
                          background: userObj.positivePercentage >= 70 ? "#4caf82" : userObj.positivePercentage >= 40 ? "var(--gold)" : "var(--red)"
                        }
                      }
                    ) })
                  ] }) }),
                  /* @__PURE__ */ jsx("td", { style: { padding: "14px 18px", verticalAlign: "middle", color: "var(--muted)", fontSize: "0.78rem", whiteSpace: "nowrap" }, children: userObj.lastReviewDate ? userObj.lastReviewDate.split("T")[0] : "—" }),
                  /* @__PURE__ */ jsx("td", { style: { padding: "14px 18px", verticalAlign: "middle", textAlign: "right" }, children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }, onClick: (e) => e.stopPropagation(), children: [
                    /* @__PURE__ */ jsxs(
                      "button",
                      {
                        className: "btn btn-gold btn-sm",
                        onClick: () => setSelectedUserModal(userObj),
                        style: {
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          padding: "5px 10px",
                          display: "flex",
                          alignItems: "center",
                          gap: 5
                        },
                        children: [
                          /* @__PURE__ */ jsx("span", { children: "📊" }),
                          /* @__PURE__ */ jsx("span", { children: "Analytics" })
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        className: "btn btn-ghost btn-sm",
                        onClick: () => handleExportSingleUserCSV(userObj),
                        title: "Export this user's reviews as CSV",
                        style: { fontSize: "0.75rem", padding: "5px 8px" },
                        children: "📥"
                      }
                    )
                  ] }) })
                ]
              },
              userObj.userKey
            );
          }) })
        ] }) }),
        totalReviewerPages > 1 && /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "var(--bg3)", borderTop: "1px solid var(--border)" }, children: [
          /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.78rem", color: "var(--muted)" }, children: [
            "Showing ",
            (reviewerPage - 1) * REVIEWERS_PER_PAGE + 1,
            "–",
            Math.min(reviewerPage * REVIEWERS_PER_PAGE, filteredReviewers.length),
            " of ",
            filteredReviewers.length,
            " reviewer users"
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6 }, children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                className: "btn btn-ghost btn-sm",
                disabled: reviewerPage <= 1,
                onClick: () => setReviewerPage((p) => Math.max(1, p - 1)),
                children: "← Prev"
              }
            ),
            /* @__PURE__ */ jsxs("span", { style: { padding: "4px 10px", fontSize: "0.8rem", fontWeight: 700, color: "var(--gold)" }, children: [
              "Page ",
              reviewerPage,
              " of ",
              totalReviewerPages
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                className: "btn btn-ghost btn-sm",
                disabled: reviewerPage >= totalReviewerPages,
                onClick: () => setReviewerPage((p) => Math.min(totalReviewerPages, p + 1)),
                children: "Next →"
              }
            )
          ] })
        ] })
      ] })
    ] }),
    activeTab === "reviews" && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", marginBottom: 24 }, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 14 }, children: [
          /* @__PURE__ */ jsxs("div", { style: { fontWeight: 800, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 8 }, children: [
            /* @__PURE__ */ jsx("span", { children: "🔍 Filter All Reviews Feed" }),
            reviews.length !== globalStats.totalReviews && /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.72rem", background: "rgba(201,151,58,0.12)", color: "var(--gold)", border: "1px solid rgba(201,151,58,0.3)", padding: "2px 8px", borderRadius: 10 }, children: [
              reviews.length,
              " result",
              reviews.length !== 1 ? "s" : ""
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, alignItems: "center" }, children: [
            /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", onClick: handleClearFilters, style: { fontSize: "0.78rem" }, children: "↺ Reset" }),
            /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: handleExportReviewsCSV, style: { display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }, children: "📥 Export Reviews CSV" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }, children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { style: { display: "block", fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4, fontWeight: 600 }, children: "Search Keyword / User" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                className: "form-input",
                style: { width: "100%", fontSize: "0.82rem", background: "#1c1c21", color: "#f4f4f5" },
                placeholder: "Search user, email, text…",
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
            /* @__PURE__ */ jsx("label", { style: { display: "block", fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4, fontWeight: 600 }, children: "Date Range" }),
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
        /* @__PURE__ */ jsx("p", { style: { color: "var(--muted)", fontSize: "0.85rem", maxWidth: 400, margin: "0 auto 16px" }, children: "No user reviews match your currently applied filters." }),
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
                    children: isDownloading ? "⏳ Saving…" : "🖼️ Poster"
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
      ] })
    ] }),
    selectedUserModal && /* @__PURE__ */ jsx(
      "div",
      {
        style: {
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.82)",
          backdropFilter: "blur(6px)",
          zIndex: 1050,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 20
        },
        onClick: (e) => {
          if (e.target === e.currentTarget) setSelectedUserModal(null);
        },
        children: /* @__PURE__ */ jsxs(
          "div",
          {
            style: {
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              width: "100%",
              maxWidth: 820,
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
              display: "flex",
              flexDirection: "column"
            },
            children: [
              /* @__PURE__ */ jsxs(
                "div",
                {
                  style: {
                    padding: "24px 28px 20px",
                    borderBottom: "1px solid var(--border)",
                    background: "linear-gradient(135deg, rgba(201,151,58,0.1) 0%, rgba(24,24,32,0.6) 100%)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                    backdropFilter: "blur(12px)"
                  },
                  children: [
                    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 16 }, children: [
                      /* @__PURE__ */ jsx(
                        "div",
                        {
                          style: {
                            width: 56,
                            height: 56,
                            borderRadius: "50%",
                            background: getAvatarColor(selectedUserModal.name).bg,
                            border: `2px solid ${getAvatarColor(selectedUserModal.name).border}`,
                            color: getAvatarColor(selectedUserModal.name).text,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 900,
                            fontSize: "1.3rem",
                            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
                            flexShrink: 0
                          },
                          children: (selectedUserModal.name || "U").split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
                        }
                      ),
                      /* @__PURE__ */ jsxs("div", { children: [
                        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }, children: [
                          /* @__PURE__ */ jsx("h3", { style: { fontSize: "1.35rem", fontWeight: 900, margin: 0, color: "var(--text)" }, children: selectedUserModal.name }),
                          /* @__PURE__ */ jsx(
                            "span",
                            {
                              style: {
                                fontSize: "0.72rem",
                                fontWeight: 800,
                                padding: "2px 9px",
                                borderRadius: 10,
                                background: selectedUserModal.tier === "Cinephile" ? "rgba(168, 85, 247, 0.2)" : selectedUserModal.tier === "Regular" ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.08)",
                                color: selectedUserModal.tier === "Cinephile" ? "#c084fc" : selectedUserModal.tier === "Regular" ? "#60a5fa" : "var(--muted)",
                                border: selectedUserModal.tier === "Cinephile" ? "1px solid rgba(168, 85, 247, 0.4)" : selectedUserModal.tier === "Regular" ? "1px solid rgba(59, 130, 246, 0.4)" : "1px solid var(--border)"
                              },
                              children: selectedUserModal.tier === "Cinephile" ? "🌟 Cinephile VIP" : selectedUserModal.tier === "Regular" ? "🎬 Regular Reviewer" : "👤 First-time Reviewer"
                            }
                          )
                        ] }),
                        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 14, marginTop: 4, flexWrap: "wrap", fontSize: "0.78rem", color: "var(--muted)" }, children: [
                          selectedUserModal.email && /* @__PURE__ */ jsxs("span", { style: { color: "var(--gold)", fontWeight: 500 }, children: [
                            "✉️ ",
                            selectedUserModal.email
                          ] }),
                          selectedUserModal.firstReviewDate && /* @__PURE__ */ jsxs("span", { children: [
                            "🗓️ Active: ",
                            selectedUserModal.firstReviewDate.split("T")[0],
                            selectedUserModal.lastReviewDate && selectedUserModal.lastReviewDate !== selectedUserModal.firstReviewDate ? ` → ${selectedUserModal.lastReviewDate.split("T")[0]}` : ""
                          ] })
                        ] })
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
                      /* @__PURE__ */ jsxs(
                        "button",
                        {
                          className: "btn btn-ghost btn-sm",
                          onClick: () => handleExportSingleUserCSV(selectedUserModal),
                          style: { fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 5 },
                          children: [
                            /* @__PURE__ */ jsx("span", { children: "📥" }),
                            /* @__PURE__ */ jsx("span", { children: "Export History" })
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          className: "btn btn-ghost btn-sm",
                          onClick: () => setSelectedUserModal(null),
                          style: { fontSize: "1.2rem", padding: "2px 8px" },
                          children: "✕"
                        }
                      )
                    ] })
                  ]
                }
              ),
              /* @__PURE__ */ jsxs("div", { style: { padding: "24px 28px 32px", display: "flex", flexDirection: "column", gap: 24 }, children: [
                /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }, children: [
                  /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }, children: [
                    /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }, children: "Total Reviews" }),
                    /* @__PURE__ */ jsx("div", { style: { fontSize: "1.6rem", fontWeight: 900, color: "var(--gold)", marginTop: 4 }, children: selectedUserModal.totalReviews }),
                    /* @__PURE__ */ jsx("div", { style: { fontSize: "0.68rem", color: "var(--muted)", marginTop: 2 }, children: "Lifetime submitted" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }, children: [
                    /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }, children: "Average Rating" }),
                    /* @__PURE__ */ jsxs("div", { style: { fontSize: "1.6rem", fontWeight: 900, color: "#4caf82", marginTop: 4 }, children: [
                      "⭐ ",
                      selectedUserModal.avgRating
                    ] }),
                    /* @__PURE__ */ jsx("div", { style: { fontSize: "0.68rem", color: "var(--muted)", marginTop: 2 }, children: "Score on 5-point scale" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }, children: [
                    /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }, children: "Total Likes" }),
                    /* @__PURE__ */ jsxs("div", { style: { fontSize: "1.6rem", fontWeight: 900, color: "#f472b6", marginTop: 4 }, children: [
                      "❤️ ",
                      selectedUserModal.totalLikes
                    ] }),
                    /* @__PURE__ */ jsx("div", { style: { fontSize: "0.68rem", color: "var(--muted)", marginTop: 2 }, children: "Community appreciation" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }, children: [
                    /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }, children: "Sentiment Tone" }),
                    /* @__PURE__ */ jsxs("div", { style: { fontSize: "1.6rem", fontWeight: 900, color: selectedUserModal.positivePercentage >= 70 ? "#4caf82" : "var(--gold)", marginTop: 4 }, children: [
                      selectedUserModal.positivePercentage,
                      "%"
                    ] }),
                    /* @__PURE__ */ jsx("div", { style: { fontSize: "0.68rem", color: "var(--muted)", marginTop: 2 }, children: "Positive ratings (4-5★)" })
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }, children: [
                  /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }, children: [
                    /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, fontSize: "0.88rem", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }, children: /* @__PURE__ */ jsx("span", { children: "📊 Rating Distribution" }) }),
                    /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [5, 4, 3, 2, 1].map((star) => {
                      const count = selectedUserModal.ratingsDistribution[star] || 0;
                      const pct = selectedUserModal.totalReviews > 0 ? Math.round(count / selectedUserModal.totalReviews * 100) : 0;
                      const barColors = {
                        5: "#10b981",
                        4: "#34d399",
                        3: "var(--gold)",
                        2: "#fb923c",
                        1: "#ef4444"
                      };
                      return /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, fontSize: "0.78rem" }, children: [
                        /* @__PURE__ */ jsxs("span", { style: { width: 44, color: "var(--gold)", fontWeight: 700, flexShrink: 0 }, children: [
                          star,
                          " ★"
                        ] }),
                        /* @__PURE__ */ jsx("div", { style: { flex: 1, height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }, children: /* @__PURE__ */ jsx(
                          "div",
                          {
                            style: {
                              height: "100%",
                              width: `${pct}%`,
                              background: barColors[star],
                              borderRadius: 4,
                              transition: "width 0.4s ease"
                            }
                          }
                        ) }),
                        /* @__PURE__ */ jsxs("span", { style: { width: 60, textAlign: "right", color: "var(--muted)", fontSize: "0.72rem", flexShrink: 0 }, children: [
                          count,
                          " (",
                          pct,
                          "%)"
                        ] })
                      ] }, star);
                    }) })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 14 }, children: [
                    /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 6 }, children: /* @__PURE__ */ jsx("span", { children: "🎯 Reviewer Highlights" }) }),
                    selectedUserModal.highestRatedMovie && /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12, background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", padding: "10px 12px", borderRadius: 8 }, children: [
                      selectedUserModal.highestRatedMovie.posterUrl ? /* @__PURE__ */ jsx(
                        "img",
                        {
                          src: selectedUserModal.highestRatedMovie.posterUrl,
                          alt: "",
                          style: { width: 28, height: 38, objectFit: "cover", borderRadius: 3 }
                        }
                      ) : /* @__PURE__ */ jsx("div", { style: { fontSize: "1.2rem" }, children: "🥇" }),
                      /* @__PURE__ */ jsxs("div", { style: { minWidth: 0, flex: 1 }, children: [
                        /* @__PURE__ */ jsx("div", { style: { fontSize: "0.68rem", color: "#34d399", fontWeight: 700, textTransform: "uppercase" }, children: "Highest Rated Movie" }),
                        /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, fontSize: "0.84rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: selectedUserModal.highestRatedMovie.title })
                      ] }),
                      /* @__PURE__ */ jsxs("div", { style: { color: "#34d399", fontWeight: 900, fontSize: "0.95rem" }, children: [
                        "⭐ ",
                        selectedUserModal.highestRatedMovie.rating
                      ] })
                    ] }),
                    selectedUserModal.lowestRatedMovie && /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12, background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", padding: "10px 12px", borderRadius: 8 }, children: [
                      selectedUserModal.lowestRatedMovie.posterUrl ? /* @__PURE__ */ jsx(
                        "img",
                        {
                          src: selectedUserModal.lowestRatedMovie.posterUrl,
                          alt: "",
                          style: { width: 28, height: 38, objectFit: "cover", borderRadius: 3 }
                        }
                      ) : /* @__PURE__ */ jsx("div", { style: { fontSize: "1.2rem" }, children: "🔻" }),
                      /* @__PURE__ */ jsxs("div", { style: { minWidth: 0, flex: 1 }, children: [
                        /* @__PURE__ */ jsx("div", { style: { fontSize: "0.68rem", color: "#f87171", fontWeight: 700, textTransform: "uppercase" }, children: "Lowest Rated Movie" }),
                        /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, fontSize: "0.84rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: selectedUserModal.lowestRatedMovie.title })
                      ] }),
                      /* @__PURE__ */ jsxs("div", { style: { color: "#f87171", fontWeight: 900, fontSize: "0.95rem" }, children: [
                        "⭐ ",
                        selectedUserModal.lowestRatedMovie.rating
                      ] })
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ jsxs("div", { children: [
                  /* @__PURE__ */ jsx("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }, children: /* @__PURE__ */ jsxs("div", { style: { fontWeight: 800, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 6 }, children: [
                    /* @__PURE__ */ jsx("span", { children: "📝 Submitted Reviews History" }),
                    /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.75rem", background: "var(--bg3)", color: "var(--gold)", padding: "2px 8px", borderRadius: 10 }, children: [
                      selectedUserModal.reviews.length,
                      " total"
                    ] })
                  ] }) }),
                  /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 12 }, children: selectedUserModal.reviews.map((rev) => {
                    const isDownloading = downloadingId === rev.reviewId;
                    return /* @__PURE__ */ jsxs(
                      "div",
                      {
                        style: {
                          background: "var(--bg3)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          padding: "16px 18px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 12
                        },
                        children: [
                          /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }, children: [
                            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [
                              rev.moviePoster ? /* @__PURE__ */ jsx(
                                "img",
                                {
                                  src: rev.moviePoster,
                                  alt: rev.movieTitle,
                                  style: { width: 38, height: 52, objectFit: "cover", borderRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.5)" },
                                  onError: (e) => {
                                    e.target.style.display = "none";
                                  }
                                }
                              ) : /* @__PURE__ */ jsx("div", { style: { width: 38, height: 52, background: "var(--bg2)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }, children: "🎬" }),
                              /* @__PURE__ */ jsxs("div", { children: [
                                /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, fontSize: "0.98rem", color: "var(--text)" }, children: rev.movieTitle }),
                                /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, marginTop: 3 }, children: [
                                  /* @__PURE__ */ jsxs("span", { style: { color: "var(--gold)", fontWeight: 700, fontSize: "0.82rem" }, children: [
                                    "★".repeat(rev.normalizedStar),
                                    /* @__PURE__ */ jsx("span", { style: { color: "rgba(255,255,255,0.2)" }, children: "★".repeat(5 - rev.normalizedStar) }),
                                    " ",
                                    "(",
                                    rev.rating,
                                    "/5)"
                                  ] }),
                                  /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.72rem", color: "var(--muted)" }, children: [
                                    "🗓️ ",
                                    rev.date ? rev.date.split("T")[0] : "N/A"
                                  ] }),
                                  rev.movieSlug && /* @__PURE__ */ jsx(
                                    "a",
                                    {
                                      href: `${SITE_URL}/movie/${rev.movieSlug}`,
                                      target: "_blank",
                                      rel: "noreferrer",
                                      style: { fontSize: "0.72rem", color: "var(--muted)", textDecoration: "none" },
                                      onMouseEnter: (e) => e.currentTarget.style.color = "var(--gold)",
                                      onMouseLeave: (e) => e.currentTarget.style.color = "var(--muted)",
                                      children: "View movie ↗"
                                    }
                                  )
                                ] })
                              ] })
                            ] }),
                            /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
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
                                    fontSize: "0.74rem",
                                    fontWeight: 700,
                                    padding: "4px 9px"
                                  },
                                  children: isDownloading ? "⏳ Saving…" : "🖼️ Poster"
                                }
                              ),
                              /* @__PURE__ */ jsx(
                                "button",
                                {
                                  className: "btn btn-ghost btn-sm",
                                  onClick: () => handleDeleteReview(rev),
                                  style: { color: "var(--red)", fontSize: "0.78rem", padding: "4px 8px" },
                                  title: "Delete this review",
                                  children: "🗑️"
                                }
                              )
                            ] })
                          ] }),
                          /* @__PURE__ */ jsxs(
                            "div",
                            {
                              style: {
                                color: "var(--text)",
                                lineHeight: 1.6,
                                fontSize: "0.86rem",
                                fontStyle: "italic",
                                background: "rgba(0,0,0,0.25)",
                                padding: "12px 14px",
                                borderRadius: 8,
                                border: "1px solid rgba(255,255,255,0.05)",
                                whiteSpace: "pre-wrap"
                              },
                              children: [
                                '"',
                                rev.text,
                                '"'
                              ]
                            }
                          ),
                          rev.likes > 0 && /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.72rem", color: "var(--gold)", fontWeight: 600 }, children: [
                            "❤️ ",
                            rev.likes,
                            " user appreciation likes"
                          ] })
                        ]
                      },
                      rev.reviewId
                    );
                  }) })
                ] })
              ] })
            ]
          }
        )
      }
    ),
    selectedReviewModal && /* @__PURE__ */ jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }, children: /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, maxWidth: 560, width: "100%", maxHeight: "80vh", overflowY: "auto" }, children: [
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
    confirmDelete && /* @__PURE__ */ jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }, children: /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: 24, maxWidth: 440, width: "100%" }, children: [
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
