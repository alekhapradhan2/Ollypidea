import React, { useState, useEffect, useCallback, useMemo } from "react";
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

    const proxyUrl = srcUrl.startsWith("data:") || srcUrl.startsWith("blob:")
      ? srcUrl
      : `${API_BASE}/img-proxy?url=${encodeURIComponent(srcUrl)}`;

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

// Avatar color generator based on user name string
function getAvatarColor(str = "") {
  const colors = [
    { bg: "rgba(201, 151, 58, 0.18)", border: "rgba(201, 151, 58, 0.5)", text: "#f5c518" },
    { bg: "rgba(59, 130, 246, 0.18)", border: "rgba(59, 130, 246, 0.5)", text: "#60a5fa" },
    { bg: "rgba(16, 185, 129, 0.18)", border: "rgba(16, 185, 129, 0.5)", text: "#34d399" },
    { bg: "rgba(168, 85, 247, 0.18)", border: "rgba(168, 85, 247, 0.5)", text: "#c084fc" },
    { bg: "rgba(236, 72, 153, 0.18)", border: "rgba(236, 72, 153, 0.5)", text: "#f472b6" },
    { bg: "rgba(249, 115, 22, 0.18)", border: "rgba(249, 115, 22, 0.5)", text: "#fb923c" },
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function UserReviewsPanel({ movies = [], onToast, defaultMode = "users" }) {
  // Active Main View Tab: "reviewers" (User Table Module) vs "reviews" (All Reviews Feed)
  const [activeTab, setActiveTab] = useState(defaultMode === "reviews" ? "reviews" : "reviewers");

  useEffect(() => {
    setActiveTab(defaultMode === "reviews" ? "reviews" : "reviewers");
  }, [defaultMode]);

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedReviewModal, setSelectedReviewModal] = useState(null);

  // Selected User Analytics Modal
  const [selectedUserModal, setSelectedUserModal] = useState(null);

  // Expandable review text set
  const [expandedReviews, setExpandedReviews] = useState(new Set());

  // ── Reviewers Tab Filter State ──
  const [reviewerSearch, setReviewerSearch] = useState("");
  const [reviewerTier, setReviewerTier] = useState("");
  const [reviewerRatingFilter, setReviewerRatingFilter] = useState("");
  const [reviewerSort, setReviewerSort] = useState("most_reviews");
  const [reviewerPage, setReviewerPage] = useState(1);
  const REVIEWERS_PER_PAGE = 12;

  // ── Individual Reviews Tab Filter State ──
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

  // ── Derived Analytical Aggregation of Reviewers ──
  const allReviewers = useMemo(() => {
    const map = new Map();

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
          ratings: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        });
      }

      const u = map.get(userKey);
      if (userName && userName !== "Anonymous") u.name = userName;
      if (userEmail && !u.email) u.email = userEmail;

      const rawRating = typeof rev.rating === "number" ? rev.rating : 5;
      const normalizedStar = Math.max(1, Math.min(5, Math.round(rawRating > 5 ? rawRating / 2 : rawRating)));

      u.ratingSum += rawRating;
      u.totalLikes += (rev.likes || 0);
      u.ratings[normalizedStar] = (u.ratings[normalizedStar] || 0) + 1;

      u.reviews.push({
        ...rev,
        normalizedStar,
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
      const positivePct = count > 0 ? Math.round((positiveCount / count) * 100) : 0;

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
        highestRatedMovie: highestReview
          ? {
              title: highestReview.movieTitle,
              rating: highestReview.rating,
              posterUrl: highestReview.moviePoster,
            }
          : null,
        lowestRatedMovie: lowestReview
          ? {
              title: lowestReview.movieTitle,
              rating: lowestReview.rating,
              posterUrl: lowestReview.moviePoster,
            }
          : null,
        movies: u.reviews.map((r) => ({
          movieId: r.movieId,
          movieTitle: r.movieTitle,
          moviePoster: r.moviePoster,
          rating: r.rating,
          date: r.date,
        })),
        reviews: u.reviews,
      };
    });
  }, [reviews]);

  // Filtered & Sorted Reviewers
  const filteredReviewers = useMemo(() => {
    let list = allReviewers;

    if (reviewerSearch.trim()) {
      const q = reviewerSearch.trim().toLowerCase();
      list = list.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.movies.some((m) => m.movieTitle.toLowerCase().includes(q))
      );
    }

    if (reviewerTier) {
      list = list.filter((u) => u.tier.toLowerCase() === reviewerTier.toLowerCase());
    }

    if (reviewerRatingFilter) {
      if (reviewerRatingFilter === "high") list = list.filter((u) => Number(u.avgRating) >= 4.0);
      else if (reviewerRatingFilter === "medium") list = list.filter((u) => Number(u.avgRating) >= 3.0 && Number(u.avgRating) < 4.0);
      else if (reviewerRatingFilter === "low") list = list.filter((u) => Number(u.avgRating) < 3.0);
    }

    list.sort((a, b) => {
      if (reviewerSort === "most_reviews") return b.totalReviews - a.totalReviews;
      if (reviewerSort === "highest_rating") return Number(b.avgRating) - Number(a.avgRating);
      if (reviewerSort === "lowest_rating") return Number(a.avgRating) - Number(b.avgRating);
      if (reviewerSort === "oldest") return new Date(a.lastReviewDate || 0).getTime() - new Date(b.lastReviewDate || 0).getTime();
      if (reviewerSort === "name") return a.name.localeCompare(b.name);
      // Default: newest activity
      const dateDiff = new Date(b.lastReviewDate || 0).getTime() - new Date(a.lastReviewDate || 0).getTime();
      if (dateDiff !== 0) return dateDiff;
      return b.totalReviews - a.totalReviews;
    });

    return list;
  }, [allReviewers, reviewerSearch, reviewerTier, reviewerRatingFilter, reviewerSort]);

  // Reviewers pagination
  const pagedReviewers = useMemo(() => {
    return filteredReviewers.slice((reviewerPage - 1) * REVIEWERS_PER_PAGE, reviewerPage * REVIEWERS_PER_PAGE);
  }, [filteredReviewers, reviewerPage]);

  const totalReviewerPages = Math.ceil(filteredReviewers.length / REVIEWERS_PER_PAGE);

  // Overall Global Stats
  const globalStats = useMemo(() => {
    const totalReviews = reviews.length;
    const totalReviewers = allReviewers.length;
    const overallAvgRating =
      totalReviews > 0
        ? (reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / totalReviews).toFixed(1)
        : "0.0";
    const superReviewersCount = allReviewers.filter((u) => u.totalReviews >= 3).length;

    // Top discussed movie
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
      topMovie,
    };
  }, [reviews, allReviewers]);

  // Keep selected user modal in sync if reviews update
  useEffect(() => {
    if (selectedUserModal) {
      const refreshed = allReviewers.find((u) => u.userKey === selectedUserModal.userKey);
      if (refreshed) setSelectedUserModal(refreshed);
    }
  }, [allReviewers]);

  // ── Handlers ──
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

  // Export All Reviewers CSV
  const handleExportReviewersCSV = () => {
    if (!filteredReviewers.length) {
      onToast?.("No reviewer data to export", "error");
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
      "Movies Reviewed",
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
      `"${u.movies.map((m) => m.movieTitle).join("; ").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ollypedia_reviewers_analytics_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onToast?.("Exported Reviewers Analytics CSV!");
  };

  // Export Single User Reviews CSV
  const handleExportSingleUserCSV = (userObj) => {
    if (!userObj?.reviews?.length) return;
    const headers = ["Movie Title", "Star Rating", "Submitted Date", "Likes", "Review Text"];
    const rows = userObj.reviews.map((r) => [
      `"${(r.movieTitle || "").replace(/"/g, '""')}"`,
      r.rating || 5,
      `"${r.date || ""}"`,
      r.likes || 0,
      `"${(r.text || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const sanitizedName = userObj.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    link.setAttribute("download", `reviews_${sanitizedName}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onToast?.(`Exported reviews for ${userObj.name}!`);
  };

  // Export All Reviews CSV
  const handleExportReviewsCSV = () => {
    if (!reviews.length) {
      onToast?.("No review data available to export", "error");
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
      "Likes",
    ];

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

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
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
          onToast?.("User review permanently deleted.");
          fetchReviews();
        } catch (err) {
          console.error("Delete review error:", err);
          onToast?.(err.message || "Failed to delete review", "error");
        }
      },
    });
  };

  // Download review poster card
  const handleDownloadPoster = async (rev) => {
    setDownloadingId(rev.reviewId);
    onToast?.("Generating review poster card…");

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

      // Background
      ctx.fillStyle = "#0d0d12";
      ctx.fillRect(0, 0, CARD_W, CARD_H);

      // Top background glow
      const topGlow = ctx.createRadialGradient(CARD_W / 2, 0, 10, CARD_W / 2, 0, CARD_W * 0.75);
      topGlow.addColorStop(0, "rgba(201, 151, 58, 0.18)");
      topGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = topGlow;
      ctx.fillRect(0, 0, CARD_W, CARD_H);

      // Gold Outer Border
      ctx.strokeStyle = "rgba(201, 151, 58, 0.4)";
      ctx.lineWidth = 1.5;
      roundRect(ctx, 8, 8, CARD_W - 16, CARD_H - 16, 12);
      ctx.stroke();

      const posterImg = await loadProxiedImage(rev.moviePoster);

      // Header Brand
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

      // Divider line
      ctx.strokeStyle = "rgba(201,151,58,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, curY);
      ctx.lineTo(CARD_W - PAD, curY);
      ctx.stroke();
      curY += 16;

      // Movie banner section
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

      // Movie Details Text
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

      // Review Quote Box
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

      // Quote text
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

      // User Attribution
      const attrY = BOX_Y + BOX_H - 18;
      ctx.fillStyle = "#c9973a";
      ctx.font = "bold 13px 'Georgia', serif";
      ctx.fillText(`— ${rev.user || "Anonymous"}`, BOX_X + 18, attrY);

      if (rev.date) {
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.font = "11px sans-serif";
        ctx.fillText(` · ${rev.date.split("T")[0]}`, BOX_X + 18 + ctx.measureText(`— ${rev.user || "Anonymous"}`).width, attrY);
      }

      // Footer
      ctx.fillStyle = "rgba(201, 151, 58, 0.6)";
      ctx.font = "10.5px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("ollypedia.in · The Odia Cinema Encyclopedia", CARD_W / 2, CARD_H - 18);
      ctx.textAlign = "left";

      // Download
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      const sanitizeTitle = (rev.movieTitle || "movie").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      a.download = `${sanitizeTitle}-review-poster.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      onToast?.("Downloaded Review Poster PNG!");
    } catch (err) {
      console.error("Poster download error:", err);
      onToast?.("Failed to generate review poster", "error");
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
    padding: "7px 10px",
  };

  return (
    <div style={{ padding: "28px 28px 40px" }}>
      {/* ── HEADER & NAVIGATION VIEW TOGGLE ── */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ fontSize: "1.6rem", fontWeight: 900, margin: 0, letterSpacing: "-0.02em" }}>
              {activeTab === "reviewers" ? "Users & Reviewers" : "Reviews Feed"}
            </h2>
            <span style={{ fontSize: "0.72rem", background: "rgba(201,151,58,0.12)", color: "var(--gold)", border: "1px solid rgba(201,151,58,0.3)", padding: "3px 9px", borderRadius: 12, fontWeight: 700 }}>
              {activeTab === "reviewers" ? "User Analytics Module" : "Live Audience Feed"}
            </span>
          </div>
          <p style={{ color: "var(--muted)", fontSize: "0.85rem", margin: "4px 0 0" }}>
            {activeTab === "reviewers"
              ? "All users who have given reviews. Click any user to inspect their analytical breakdown and all submitted reviews."
              : "All user submitted movie reviews listed in chronological order (newest to oldest), with advanced filters and poster generation."}
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div style={{ display: "flex", background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, padding: 3, gap: 4 }}>
          <button
            onClick={() => setActiveTab("reviewers")}
            style={{
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
              transition: "all 0.15s ease",
            }}
          >
            <span>👥</span>
            <span>Reviewer Users</span>
            <span style={{
              fontSize: "0.7rem",
              background: activeTab === "reviewers" ? "rgba(0,0,0,0.2)" : "var(--bg3)",
              color: activeTab === "reviewers" ? "#000" : "var(--gold)",
              padding: "1px 6px",
              borderRadius: 8,
              fontWeight: 700
            }}>
              {allReviewers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("reviews")}
            style={{
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
              transition: "all 0.15s ease",
            }}
          >
            <span>💬</span>
            <span>All Reviews Feed</span>
            <span style={{
              fontSize: "0.7rem",
              background: activeTab === "reviews" ? "rgba(0,0,0,0.2)" : "var(--bg3)",
              color: activeTab === "reviews" ? "#000" : "var(--gold)",
              padding: "1px 6px",
              borderRadius: 8,
              fontWeight: 700
            }}>
              {reviews.length}
            </span>
          </button>
        </div>
      </div>

      {/* ── KPI METRICS CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16, marginBottom: 28 }}>
        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }}>Unique Reviewers</span>
            <span style={{ fontSize: "1.4rem" }}>👥</span>
          </div>
          <div style={{ fontSize: "1.9rem", fontWeight: 900, color: "#4caf82", marginTop: 6 }}>
            {globalStats.totalReviewers}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>Distinct verified reviewer profiles</div>
        </div>

        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }}>Total Reviews Given</span>
            <span style={{ fontSize: "1.4rem" }}>💬</span>
          </div>
          <div style={{ fontSize: "1.9rem", fontWeight: 900, color: "var(--gold)", marginTop: 6 }}>
            {globalStats.totalReviews}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>Audience reviews across all movies</div>
        </div>

        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }}>Overall Avg Rating</span>
            <span style={{ fontSize: "1.4rem" }}>⭐</span>
          </div>
          <div style={{ fontSize: "1.9rem", fontWeight: 900, color: "var(--gold)", marginTop: 6 }}>
            {globalStats.overallAvgRating} <span style={{ fontSize: "0.9rem", color: "var(--muted)", fontWeight: 400 }}>/ 5</span>
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>General audience reception</div>
        </div>

        <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--muted)", fontWeight: 600 }}>Power Reviewers (3+ reviews)</span>
            <span style={{ fontSize: "1.4rem" }}>🌟</span>
          </div>
          <div style={{ fontSize: "1.9rem", fontWeight: 900, color: "#60a5fa", marginTop: 6 }}>
            {globalStats.superReviewersCount}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }}>Frequent movie commentators</div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          VIEW 1: REVIEWERS (USER TABLE MODULE)
          ══════════════════════════════════════════════════════════════ */}
      {activeTab === "reviewers" && (
        <>
          {/* Reviewers Filter Bar */}
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 8 }}>
                <span>🔍 Reviewer Filters & Search</span>
                {filteredReviewers.length !== allReviewers.length && (
                  <span style={{ fontSize: "0.72rem", background: "rgba(201,151,58,0.12)", color: "var(--gold)", border: "1px solid rgba(201,151,58,0.3)", padding: "2px 8px", borderRadius: 10 }}>
                    {filteredReviewers.length} result{filteredReviewers.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button className="btn btn-ghost btn-sm" onClick={handleClearReviewerFilters} style={{ fontSize: "0.78rem" }}>
                  ↺ Reset
                </button>
                <button className="btn btn-gold btn-sm" onClick={handleExportReviewersCSV} style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
                  📥 Export Reviewers CSV
                </button>
              </div>
            </div>

            {/* Filter grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              {/* Search User / Email / Film */}
              <div>
                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4, fontWeight: 600 }}>Search Name, Email, Film</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: "100%", fontSize: "0.82rem", background: "#1c1c21", color: "#f4f4f5" }}
                  placeholder="Search reviewer or movie title…"
                  value={reviewerSearch}
                  onChange={(e) => {
                    setReviewerSearch(e.target.value);
                    setReviewerPage(1);
                  }}
                />
              </div>

              {/* Reviewer Tier Filter */}
              <div>
                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4, fontWeight: 600 }}>Reviewer Tier</label>
                <select
                  style={darkSelectStyle}
                  value={reviewerTier}
                  onChange={(e) => {
                    setReviewerTier(e.target.value);
                    setReviewerPage(1);
                  }}
                >
                  <option value="" style={{ background: "#1c1c21", color: "#ffffff" }}>All Tiers</option>
                  <option value="cinephile" style={{ background: "#1c1c21", color: "#ffffff" }}>🌟 Cinephile (5+ Reviews)</option>
                  <option value="regular" style={{ background: "#1c1c21", color: "#ffffff" }}>🎬 Regular (2–4 Reviews)</option>
                  <option value="first-timer" style={{ background: "#1c1c21", color: "#ffffff" }}>👤 First-timer (1 Review)</option>
                </select>
              </div>

              {/* Avg Rating Filter */}
              <div>
                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4, fontWeight: 600 }}>Average Rating Bracket</label>
                <select
                  style={darkSelectStyle}
                  value={reviewerRatingFilter}
                  onChange={(e) => {
                    setReviewerRatingFilter(e.target.value);
                    setReviewerPage(1);
                  }}
                >
                  <option value="" style={{ background: "#1c1c21", color: "#ffffff" }}>All Rating Brackets</option>
                  <option value="high" style={{ background: "#1c1c21", color: "#ffffff" }}>🟢 High Rating (4.0 – 5.0★)</option>
                  <option value="medium" style={{ background: "#1c1c21", color: "#ffffff" }}>🟡 Medium Rating (3.0 – 3.9★)</option>
                  <option value="low" style={{ background: "#1c1c21", color: "#ffffff" }}>🔴 Critical Reviewer (&lt; 3.0★)</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4, fontWeight: 600 }}>Sort Reviewers By</label>
                <select
                  style={darkSelectStyle}
                  value={reviewerSort}
                  onChange={(e) => {
                    setReviewerSort(e.target.value);
                    setReviewerPage(1);
                  }}
                >
                  <option value="most_reviews" style={{ background: "#1c1c21", color: "#ffffff" }}>Most Reviews Submitted</option>
                  <option value="highest_rating" style={{ background: "#1c1c21", color: "#ffffff" }}>Highest Avg Rating</option>
                  <option value="lowest_rating" style={{ background: "#1c1c21", color: "#ffffff" }}>Lowest Avg Rating</option>
                  <option value="newest" style={{ background: "#1c1c21", color: "#ffffff" }}>Most Recent Review Date</option>
                  <option value="name" style={{ background: "#1c1c21", color: "#ffffff" }}>Name (A–Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Reviewers Data Table */}
          {loading ? (
            <div style={{ padding: 60, textAlign: "center", color: "var(--muted)", fontSize: "1.1rem" }}>⏳ Loading reviewer analytics data…</div>
          ) : filteredReviewers.length === 0 ? (
            <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 50, textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: 12 }}>👥</div>
              <div style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: 6 }}>No Reviewers Found</div>
              <p style={{ color: "var(--muted)", fontSize: "0.85rem", maxWidth: 400, margin: "0 auto 16px" }}>
                No reviewer users match your search criteria.
              </p>
              <button className="btn btn-ghost btn-sm" onClick={handleClearReviewerFilters}>Clear Filters</button>
            </div>
          ) : (
            <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "var(--bg3)", color: "var(--muted)", borderBottom: "1px solid var(--border)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.06em" }}>
                      <th style={{ padding: "14px 18px", width: "230px" }}>Reviewer Profile</th>
                      <th style={{ padding: "14px 18px", width: "120px" }}>Tier / Status</th>
                      <th style={{ padding: "14px 18px", width: "110px" }}>Total Reviews</th>
                      <th style={{ padding: "14px 18px", width: "130px" }}>Avg Rating</th>
                      <th style={{ padding: "14px 18px", minWidth: "220px" }}>Movies Reviewed</th>
                      <th style={{ padding: "14px 18px", width: "120px" }}>Sentiment</th>
                      <th style={{ padding: "14px 18px", width: "130px" }}>Latest Activity</th>
                      <th style={{ padding: "14px 18px", textAlign: "right", width: "150px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedReviewers.map((userObj) => {
                      const avatarColors = getAvatarColor(userObj.name);
                      const initials = (userObj.name || "U")
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();

                      const isCinephile = userObj.tier === "Cinephile";
                      const isRegular = userObj.tier === "Regular";

                      const avgNum = Number(userObj.avgRating) || 0;
                      const ratingColor = avgNum >= 4.0 ? "#4caf82" : avgNum >= 3.0 ? "var(--gold)" : "var(--red)";

                      return (
                        <tr
                          key={userObj.userKey}
                          onClick={() => setSelectedUserModal(userObj)}
                          style={{
                            borderBottom: "1px solid var(--border)",
                            cursor: "pointer",
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.025)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          {/* Reviewer Profile */}
                          <td style={{ padding: "14px 18px", verticalAlign: "middle" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div
                                style={{
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
                                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                                }}
                              >
                                {initials}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 800, color: "var(--text)", fontSize: "0.92rem", lineHeight: 1.2 }}>
                                  {userObj.name}
                                </div>
                                {userObj.email ? (
                                  <div style={{ fontSize: "0.74rem", color: "var(--gold)", marginTop: 3, fontWeight: 500, wordBreak: "break-all" }}>
                                    ✉️ {userObj.email}
                                  </div>
                                ) : (
                                  <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginTop: 2 }}>
                                    No email profile
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Tier */}
                          <td style={{ padding: "14px 18px", verticalAlign: "middle" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                padding: "3px 8px",
                                borderRadius: 10,
                                background: isCinephile
                                  ? "rgba(168, 85, 247, 0.15)"
                                  : isRegular
                                  ? "rgba(59, 130, 246, 0.15)"
                                  : "rgba(255,255,255,0.06)",
                                color: isCinephile ? "#c084fc" : isRegular ? "#60a5fa" : "var(--muted)",
                                border: isCinephile
                                  ? "1px solid rgba(168, 85, 247, 0.4)"
                                  : isRegular
                                  ? "1px solid rgba(59, 130, 246, 0.4)"
                                  : "1px solid var(--border)",
                              }}
                            >
                              {isCinephile ? "🌟 Cinephile" : isRegular ? "🎬 Regular" : "👤 First-timer"}
                            </span>
                          </td>

                          {/* Total Reviews */}
                          <td style={{ padding: "14px 18px", verticalAlign: "middle" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(201,151,58,0.12)", color: "var(--gold)", padding: "4px 10px", borderRadius: 8, fontWeight: 800, fontSize: "0.88rem" }}>
                              💬 {userObj.totalReviews}
                            </div>
                          </td>

                          {/* Avg Rating */}
                          <td style={{ padding: "14px 18px", verticalAlign: "middle" }}>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                              <span style={{ color: ratingColor, fontWeight: 900, fontSize: "1.05rem" }}>
                                ⭐ {userObj.avgRating}
                              </span>
                              <span style={{ fontSize: "0.7rem", color: "var(--muted)" }}>/ 5</span>
                            </div>
                            <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 2 }}>
                              {userObj.totalLikes > 0 ? `❤️ ${userObj.totalLikes} likes` : "No likes yet"}
                            </div>
                          </td>

                          {/* Movies Reviewed Mini Posters */}
                          <td style={{ padding: "14px 18px", verticalAlign: "middle" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              {userObj.movies.slice(0, 3).map((m, mIdx) => (
                                <div
                                  key={mIdx}
                                  title={`${m.movieTitle} (${m.rating}★)`}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                    background: "var(--bg3)",
                                    border: "1px solid var(--border)",
                                    borderRadius: 6,
                                    padding: "2px 6px",
                                    fontSize: "0.72rem",
                                    maxWidth: 160,
                                  }}
                                >
                                  {m.moviePoster ? (
                                    <img
                                      src={m.moviePoster}
                                      alt={m.movieTitle}
                                      style={{ width: 16, height: 22, objectFit: "cover", borderRadius: 2 }}
                                      onError={(e) => { e.target.style.display = "none"; }}
                                    />
                                  ) : (
                                    <span>🎬</span>
                                  )}
                                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--text)", fontWeight: 600 }}>
                                    {m.movieTitle}
                                  </span>
                                </div>
                              ))}
                              {userObj.movies.length > 3 && (
                                <span style={{ fontSize: "0.7rem", color: "var(--gold)", fontWeight: 700, padding: "2px 5px", background: "rgba(201,151,58,0.1)", borderRadius: 4 }}>
                                  +{userObj.movies.length - 3} more
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Sentiment */}
                          <td style={{ padding: "14px 18px", verticalAlign: "middle" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              <div style={{ fontSize: "0.76rem", fontWeight: 700, color: userObj.positivePercentage >= 70 ? "#4caf82" : userObj.positivePercentage >= 40 ? "var(--gold)" : "var(--red)" }}>
                                {userObj.positivePercentage}% Positive
                              </div>
                              {/* Mini progress bar */}
                              <div style={{ height: 4, width: 70, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${userObj.positivePercentage}%`,
                                    background: userObj.positivePercentage >= 70 ? "#4caf82" : userObj.positivePercentage >= 40 ? "var(--gold)" : "var(--red)",
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Latest Activity */}
                          <td style={{ padding: "14px 18px", verticalAlign: "middle", color: "var(--muted)", fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                            {userObj.lastReviewDate ? userObj.lastReviewDate.split("T")[0] : "—"}
                          </td>

                          {/* Actions */}
                          <td style={{ padding: "14px 18px", verticalAlign: "middle", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
                              <button
                                className="btn btn-gold btn-sm"
                                onClick={() => setSelectedUserModal(userObj)}
                                style={{
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  padding: "5px 10px",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 5,
                                }}
                              >
                                <span>📊</span>
                                <span>Analytics</span>
                              </button>

                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleExportSingleUserCSV(userObj)}
                                title="Export this user's reviews as CSV"
                                style={{ fontSize: "0.75rem", padding: "5px 8px" }}
                              >
                                📥
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Reviewers Pagination */}
              {totalReviewerPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "var(--bg3)", borderTop: "1px solid var(--border)" }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
                    Showing {(reviewerPage - 1) * REVIEWERS_PER_PAGE + 1}–{Math.min(reviewerPage * REVIEWERS_PER_PAGE, filteredReviewers.length)} of {filteredReviewers.length} reviewer users
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={reviewerPage <= 1}
                      onClick={() => setReviewerPage((p) => Math.max(1, p - 1))}
                    >
                      ← Prev
                    </button>
                    <span style={{ padding: "4px 10px", fontSize: "0.8rem", fontWeight: 700, color: "var(--gold)" }}>
                      Page {reviewerPage} of {totalReviewerPages}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={reviewerPage >= totalReviewerPages}
                      onClick={() => setReviewerPage((p) => Math.min(totalReviewerPages, p + 1))}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          VIEW 2: ALL REVIEWS FEED (CHRONOLOGICAL TABLE)
          ══════════════════════════════════════════════════════════════ */}
      {activeTab === "reviews" && (
        <>
          {/* Feed Filters */}
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 8 }}>
                <span>🔍 Filter All Reviews Feed</span>
                {reviews.length !== globalStats.totalReviews && (
                  <span style={{ fontSize: "0.72rem", background: "rgba(201,151,58,0.12)", color: "var(--gold)", border: "1px solid rgba(201,151,58,0.3)", padding: "2px 8px", borderRadius: 10 }}>
                    {reviews.length} result{reviews.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button className="btn btn-ghost btn-sm" onClick={handleClearFilters} style={{ fontSize: "0.78rem" }}>
                  ↺ Reset
                </button>
                <button className="btn btn-gold btn-sm" onClick={handleExportReviewsCSV} style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
                  📥 Export Reviews CSV
                </button>
              </div>
            </div>

            {/* Filter Controls Row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              {/* Search */}
              <div>
                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4, fontWeight: 600 }}>Search Keyword / User</label>
                <input
                  type="text"
                  className="form-input"
                  style={{ width: "100%", fontSize: "0.82rem", background: "#1c1c21", color: "#f4f4f5" }}
                  placeholder="Search user, email, text…"
                  value={search}
                  onChange={(e) => handleFilterChange(setSearch, e.target.value)}
                />
              </div>

              {/* Movie */}
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

              {/* Star Rating */}
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
                <label style={{ display: "block", fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4, fontWeight: 600 }}>Date Range</label>
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

              {/* Sort */}
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

          {/* Reviews Table */}
          {loading ? (
            <div style={{ padding: 60, textAlign: "center", color: "var(--muted)", fontSize: "1.1rem" }}>⏳ Loading user reviews data…</div>
          ) : reviews.length === 0 ? (
            <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, padding: 50, textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: 12 }}>💬</div>
              <div style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: 6 }}>No Reviews Found</div>
              <p style={{ color: "var(--muted)", fontSize: "0.85rem", maxWidth: 400, margin: "0 auto 16px" }}>
                No user reviews match your currently applied filters.
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
                      const displayText = isLongText && !isExpanded ? `${(rev.text || "").slice(0, 110)}…` : rev.text;

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

                          {/* Review Text */}
                          <td style={{ padding: "14px 16px", verticalAlign: "top" }}>
                            <div style={{ color: "var(--text)", lineHeight: 1.55, fontSize: "0.84rem", fontStyle: "italic", wordBreak: "break-word" }}>
                              "{displayText}"
                            </div>

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
                                {isDownloading ? "⏳ Saving…" : "🖼️ Poster"}
                              </button>

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
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════
          MODAL: DEEP USER ANALYTICS & REVIEW HISTORY PROFILE
          ══════════════════════════════════════════════════════════════ */}
      {selectedUserModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.82)",
            backdropFilter: "blur(6px)",
            zIndex: 1050,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedUserModal(null);
          }}
        >
          <div
            style={{
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              width: "100%",
              maxWidth: 820,
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Modal Header Profile Banner */}
            <div
              style={{
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
                backdropFilter: "blur(12px)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {/* Large Profile Avatar */}
                <div
                  style={{
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
                    flexShrink: 0,
                  }}
                >
                  {(selectedUserModal.name || "U")
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <h3 style={{ fontSize: "1.35rem", fontWeight: 900, margin: 0, color: "var(--text)" }}>
                      {selectedUserModal.name}
                    </h3>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        padding: "2px 9px",
                        borderRadius: 10,
                        background:
                          selectedUserModal.tier === "Cinephile"
                            ? "rgba(168, 85, 247, 0.2)"
                            : selectedUserModal.tier === "Regular"
                            ? "rgba(59, 130, 246, 0.2)"
                            : "rgba(255,255,255,0.08)",
                        color:
                          selectedUserModal.tier === "Cinephile"
                            ? "#c084fc"
                            : selectedUserModal.tier === "Regular"
                            ? "#60a5fa"
                            : "var(--muted)",
                        border:
                          selectedUserModal.tier === "Cinephile"
                            ? "1px solid rgba(168, 85, 247, 0.4)"
                            : selectedUserModal.tier === "Regular"
                            ? "1px solid rgba(59, 130, 246, 0.4)"
                            : "1px solid var(--border)",
                      }}
                    >
                      {selectedUserModal.tier === "Cinephile"
                        ? "🌟 Cinephile VIP"
                        : selectedUserModal.tier === "Regular"
                        ? "🎬 Regular Reviewer"
                        : "👤 First-time Reviewer"}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 4, flexWrap: "wrap", fontSize: "0.78rem", color: "var(--muted)" }}>
                    {selectedUserModal.email && (
                      <span style={{ color: "var(--gold)", fontWeight: 500 }}>
                        ✉️ {selectedUserModal.email}
                      </span>
                    )}
                    {selectedUserModal.firstReviewDate && (
                      <span>
                        🗓️ Active: {selectedUserModal.firstReviewDate.split("T")[0]}
                        {selectedUserModal.lastReviewDate && selectedUserModal.lastReviewDate !== selectedUserModal.firstReviewDate
                          ? ` → ${selectedUserModal.lastReviewDate.split("T")[0]}`
                          : ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleExportSingleUserCSV(selectedUserModal)}
                  style={{ fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 5 }}
                >
                  <span>📥</span>
                  <span>Export History</span>
                </button>

                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSelectedUserModal(null)}
                  style={{ fontSize: "1.2rem", padding: "2px 8px" }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "24px 28px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
              {/* ── Analytical KPI Metric Cards ── */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
                <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                    Total Reviews
                  </div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--gold)", marginTop: 4 }}>
                    {selectedUserModal.totalReviews}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 2 }}>Lifetime submitted</div>
                </div>

                <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                    Average Rating
                  </div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#4caf82", marginTop: 4 }}>
                    ⭐ {selectedUserModal.avgRating}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 2 }}>Score on 5-point scale</div>
                </div>

                <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                    Total Likes
                  </div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#f472b6", marginTop: 4 }}>
                    ❤️ {selectedUserModal.totalLikes}
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 2 }}>Community appreciation</div>
                </div>

                <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>
                    Sentiment Tone
                  </div>
                  <div style={{ fontSize: "1.6rem", fontWeight: 900, color: selectedUserModal.positivePercentage >= 70 ? "#4caf82" : "var(--gold)", marginTop: 4 }}>
                    {selectedUserModal.positivePercentage}%
                  </div>
                  <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 2 }}>Positive ratings (4-5★)</div>
                </div>
              </div>

              {/* ── Star Distribution & Highlights Chart ── */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
                {/* Rating Distribution Bar Chart */}
                <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px" }}>
                  <div style={{ fontWeight: 800, fontSize: "0.88rem", marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>📊 Rating Distribution</span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = selectedUserModal.ratingsDistribution[star] || 0;
                      const pct = selectedUserModal.totalReviews > 0 ? Math.round((count / selectedUserModal.totalReviews) * 100) : 0;
                      const barColors = {
                        5: "#10b981",
                        4: "#34d399",
                        3: "var(--gold)",
                        2: "#fb923c",
                        1: "#ef4444",
                      };

                      return (
                        <div key={star} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.78rem" }}>
                          <span style={{ width: 44, color: "var(--gold)", fontWeight: 700, flexShrink: 0 }}>
                            {star} ★
                          </span>
                          <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
                            <div
                              style={{
                                height: "100%",
                                width: `${pct}%`,
                                background: barColors[star],
                                borderRadius: 4,
                                transition: "width 0.4s ease",
                              }}
                            />
                          </div>
                          <span style={{ width: 60, textAlign: "right", color: "var(--muted)", fontSize: "0.72rem", flexShrink: 0 }}>
                            {count} ({pct}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Rating Highlights & Extremes */}
                <div style={{ background: "var(--bg3)", border: "1px solid var(--border)", borderRadius: 12, padding: "18px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 6 }}>
                    <span>🎯 Reviewer Highlights</span>
                  </div>

                  {/* Highest Rated */}
                  {selectedUserModal.highestRatedMovie && (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)", padding: "10px 12px", borderRadius: 8 }}>
                      {selectedUserModal.highestRatedMovie.posterUrl ? (
                        <img
                          src={selectedUserModal.highestRatedMovie.posterUrl}
                          alt=""
                          style={{ width: 28, height: 38, objectFit: "cover", borderRadius: 3 }}
                        />
                      ) : (
                        <div style={{ fontSize: "1.2rem" }}>🥇</div>
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: "0.68rem", color: "#34d399", fontWeight: 700, textTransform: "uppercase" }}>
                          Highest Rated Movie
                        </div>
                        <div style={{ fontWeight: 800, fontSize: "0.84rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {selectedUserModal.highestRatedMovie.title}
                        </div>
                      </div>
                      <div style={{ color: "#34d399", fontWeight: 900, fontSize: "0.95rem" }}>
                        ⭐ {selectedUserModal.highestRatedMovie.rating}
                      </div>
                    </div>
                  )}

                  {/* Lowest Rated */}
                  {selectedUserModal.lowestRatedMovie && (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", padding: "10px 12px", borderRadius: 8 }}>
                      {selectedUserModal.lowestRatedMovie.posterUrl ? (
                        <img
                          src={selectedUserModal.lowestRatedMovie.posterUrl}
                          alt=""
                          style={{ width: 28, height: 38, objectFit: "cover", borderRadius: 3 }}
                        />
                      ) : (
                        <div style={{ fontSize: "1.2rem" }}>🔻</div>
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: "0.68rem", color: "#f87171", fontWeight: 700, textTransform: "uppercase" }}>
                          Lowest Rated Movie
                        </div>
                        <div style={{ fontWeight: 800, fontSize: "0.84rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {selectedUserModal.lowestRatedMovie.title}
                        </div>
                      </div>
                      <div style={{ color: "#f87171", fontWeight: 900, fontSize: "0.95rem" }}>
                        ⭐ {selectedUserModal.lowestRatedMovie.rating}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Complete Review Submissions History ── */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 6 }}>
                    <span>📝 Submitted Reviews History</span>
                    <span style={{ fontSize: "0.75rem", background: "var(--bg3)", color: "var(--gold)", padding: "2px 8px", borderRadius: 10 }}>
                      {selectedUserModal.reviews.length} total
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {selectedUserModal.reviews.map((rev) => {
                    const isDownloading = downloadingId === rev.reviewId;
                    return (
                      <div
                        key={rev.reviewId}
                        style={{
                          background: "var(--bg3)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          padding: "16px 18px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                        }}
                      >
                        {/* Header: Movie info & Rating */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            {rev.moviePoster ? (
                              <img
                                src={rev.moviePoster}
                                alt={rev.movieTitle}
                                style={{ width: 38, height: 52, objectFit: "cover", borderRadius: 4, boxShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
                                onError={(e) => { e.target.style.display = "none"; }}
                              />
                            ) : (
                              <div style={{ width: 38, height: 52, background: "var(--bg2)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                🎬
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: 800, fontSize: "0.98rem", color: "var(--text)" }}>
                                {rev.movieTitle}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 3 }}>
                                <span style={{ color: "var(--gold)", fontWeight: 700, fontSize: "0.82rem" }}>
                                  {"★".repeat(rev.normalizedStar)}
                                  <span style={{ color: "rgba(255,255,255,0.2)" }}>{"★".repeat(5 - rev.normalizedStar)}</span>
                                  {" "}({rev.rating}/5)
                                </span>
                                <span style={{ fontSize: "0.72rem", color: "var(--muted)" }}>
                                  🗓️ {rev.date ? rev.date.split("T")[0] : "N/A"}
                                </span>
                                {rev.movieSlug && (
                                  <a
                                    href={`${SITE_URL}/movie/${rev.movieSlug}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ fontSize: "0.72rem", color: "var(--muted)", textDecoration: "none" }}
                                    onMouseEnter={(e) => (e.currentTarget.style.color = "var(--gold)")}
                                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
                                  >
                                    View movie ↗
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick Actions */}
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              disabled={isDownloading}
                              onClick={() => handleDownloadPoster(rev)}
                              style={{
                                background: "rgba(201,151,58,0.12)",
                                border: "1px solid rgba(201,151,58,0.3)",
                                color: "var(--gold)",
                                fontSize: "0.74rem",
                                fontWeight: 700,
                                padding: "4px 9px",
                              }}
                            >
                              {isDownloading ? "⏳ Saving…" : "🖼️ Poster"}
                            </button>

                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleDeleteReview(rev)}
                              style={{ color: "var(--red)", fontSize: "0.78rem", padding: "4px 8px" }}
                              title="Delete this review"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {/* Review text */}
                        <div
                          style={{
                            color: "var(--text)",
                            lineHeight: 1.6,
                            fontSize: "0.86rem",
                            fontStyle: "italic",
                            background: "rgba(0,0,0,0.25)",
                            padding: "12px 14px",
                            borderRadius: 8,
                            border: "1px solid rgba(255,255,255,0.05)",
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          "{rev.text}"
                        </div>

                        {rev.likes > 0 && (
                          <div style={{ fontSize: "0.72rem", color: "var(--gold)", fontWeight: 600 }}>
                            ❤️ {rev.likes} user appreciation likes
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Review Text Modal */}
      {selectedReviewModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
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
