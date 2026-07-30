import { jsxs, jsx } from "react/jsx-runtime";
import { useState, useRef, useCallback, useEffect } from "react";
import { A as API } from "../entry-server.js";
import "react-dom/server";
import "react-router-dom/server.mjs";
import "react-helmet-async";
import "react-router-dom";
const SITE_URL = "https://ollypedia.in";
const FORMATS = [
  { key: "portrait", label: "Portrait 4:5", w: 1080, h: 1350 },
  { key: "square", label: "Square 1:1", w: 1080, h: 1080 },
  { key: "story", label: "Story 9:16", w: 1080, h: 1920 }
];
const POSTER_TYPES = [
  { key: "review", label: "🌟 Review Poster" }
  // Future: { key: "boxoffice", label: "📊 Box Office Poster" }, etc.
];
const verdictColor = (v) => {
  if (["Hit", "Super Hit", "Blockbuster"].includes(v)) return { bg: "#5DCAA5", text: "#04342C" };
  if (v === "Upcoming") return { bg: "#FAC775", text: "#412402" };
  if (v === "Average") return { bg: "#D3D1C7", text: "#2C2C2A" };
  return { bg: "#F09595", text: "#501313" };
};
const movieLink = (m) => `${SITE_URL}/movie/${(m == null ? void 0 : m.slug) || (m == null ? void 0 : m._id) || ""}`;
function publicRatingFromReviews(reviews) {
  const valid = (reviews || []).map((r) => Number(r.rating)).filter((n) => !isNaN(n) && n > 0);
  if (!valid.length) return { avg: null, count: 0 };
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
  return { avg: Math.round(avg * 10) / 10, count: valid.length };
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function wrapLines(ctx, text, maxWidth) {
  const words = String(text || "").split(" ");
  const lines = [];
  let cur = "";
  words.forEach((w) => {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  });
  if (cur) lines.push(cur);
  return lines.slice(0, 2);
}
function drawCover(ctx, img, w, h) {
  const ir = img.width / img.height;
  const cr = w / h;
  let sw, sh, sx, sy;
  if (ir > cr) {
    sh = img.height;
    sw = sh * cr;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / cr;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}
function drawReviewPoster(canvas, opts) {
  const { w, h, posterUrl, title, year, ratingText, reviewCount, verdict, link, showVerdict, imageOk } = opts;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const scale = w / 1080;
  ctx.fillStyle = "#15151a";
  ctx.fillRect(0, 0, w, h);
  const finishOverlay = () => {
    const grad = ctx.createLinearGradient(0, h * 0.42, 0, h);
    grad.addColorStop(0, "rgba(10,10,12,0)");
    grad.addColorStop(1, "rgba(10,10,12,0.92)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, h * 0.42, w, h * 0.58);
    const pad = 56 * scale;
    if (showVerdict && verdict) {
      const vc = verdictColor(verdict);
      ctx.font = `${600} ${28 * scale}px sans-serif`;
      const tw = ctx.measureText(verdict).width;
      const tagW = tw + 44 * scale;
      const tagH = 56 * scale;
      ctx.fillStyle = vc.bg;
      roundRect(ctx, pad, pad, tagW, tagH, tagH / 2);
      ctx.fill();
      ctx.fillStyle = vc.text;
      ctx.textBaseline = "middle";
      ctx.fillText(verdict, pad + 22 * scale, pad + tagH / 2 + 2 * scale);
    }
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    ctx.font = `700 ${30 * scale}px Cinzel, serif`;
    ctx.fillStyle = "#C9973A";
    ctx.fillText("OLLY", w - pad - ctx.measureText("PEDIA").width, pad + 28 * scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillText("PEDIA", w - pad, pad + 28 * scale);
    ctx.textAlign = "left";
    let cursorY = h - pad - 18 * scale;
    const linkSize = 24 * scale;
    ctx.font = `400 ${linkSize}px sans-serif`;
    ctx.fillStyle = "#cfcfcf";
    ctx.fillText(link, pad, cursorY);
    cursorY -= linkSize + 36 * scale;
    const badgeText = `★ ${ratingText}`;
    ctx.font = `700 ${36 * scale}px sans-serif`;
    const badgeTextW = ctx.measureText(badgeText).width;
    const badgeH = 70 * scale;
    const badgeW = badgeTextW + 56 * scale;
    const badgeY = cursorY - badgeH + 12 * scale;
    ctx.fillStyle = "#FAC775";
    roundRect(ctx, pad, badgeY, badgeW, badgeH, badgeH / 2);
    ctx.fill();
    ctx.fillStyle = "#412402";
    ctx.textBaseline = "middle";
    ctx.fillText(badgeText, pad + 28 * scale, badgeY + badgeH / 2 + 2 * scale);
    if (reviewCount > 0) {
      ctx.font = `400 ${24 * scale}px sans-serif`;
      ctx.fillStyle = "#b9b9b9";
      ctx.fillText(
        `based on ${reviewCount} public review${reviewCount === 1 ? "" : "s"}`,
        pad + badgeW + 18 * scale,
        badgeY + badgeH / 2 + 2 * scale
      );
    }
    cursorY = badgeY - 22 * scale;
    ctx.font = `700 ${58 * scale}px sans-serif`;
    ctx.fillStyle = "#ffffff";
    const fullTitle = year ? `${title} (${year})` : title;
    const lines = wrapLines(ctx, fullTitle, w - pad * 2);
    const lineH = 66 * scale;
    let titleTop = cursorY - lines.length * lineH;
    lines.forEach((ln, i) => {
      ctx.fillText(ln, pad, titleTop + i * lineH + lineH / 2);
    });
    ctx.font = `400 ${24 * scale}px sans-serif`;
    ctx.fillStyle = "#d6d6d6";
    ctx.fillText("AUDIENCE RATING", pad, titleTop - 24 * scale);
  };
  if (imageOk && posterUrl) {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        drawCover(ctx, img, w, h);
      } catch (e) {
      }
      finishOverlay();
    };
    img.onerror = () => finishOverlay();
    img.src = posterUrl;
  } else {
    finishOverlay();
  }
}
function MoviePicker({ movies, value, onSelect }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = (movies || []).filter((m) => {
    var _a;
    return !q.trim() || ((_a = m.title) == null ? void 0 : _a.toLowerCase().includes(q.toLowerCase()));
  }).slice(0, 12);
  return /* @__PURE__ */ jsxs("div", { style: { position: "relative" }, children: [
    /* @__PURE__ */ jsx(
      "input",
      {
        className: "form-input",
        value: open ? q : (value == null ? void 0 : value.title) || q,
        onChange: (e) => {
          setQ(e.target.value);
          setOpen(true);
        },
        onFocus: () => {
          setOpen(true);
          setQ("");
        },
        placeholder: "Type to search a movie…",
        autoComplete: "off"
      }
    ),
    open && /* @__PURE__ */ jsxs("div", { style: {
      position: "absolute",
      top: "100%",
      left: 0,
      right: 0,
      background: "var(--bg2)",
      border: "1px solid var(--border)",
      borderRadius: 7,
      zIndex: 60,
      maxHeight: 260,
      overflowY: "auto",
      boxShadow: "0 4px 20px rgba(0,0,0,0.4)"
    }, children: [
      filtered.length === 0 && /* @__PURE__ */ jsx("div", { style: { padding: "12px", fontSize: "0.8rem", color: "var(--muted)" }, children: "No movies found" }),
      filtered.map((m) => /* @__PURE__ */ jsxs(
        "div",
        {
          onClick: () => {
            onSelect(m);
            setOpen(false);
            setQ("");
          },
          style: { display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", cursor: "pointer", borderBottom: "1px solid rgba(255,255,255,0.04)" },
          onMouseEnter: (e) => e.currentTarget.style.background = "rgba(201,151,58,0.08)",
          onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
          children: [
            (m.posterUrl || m.thumbnailUrl) && /* @__PURE__ */ jsx("img", { src: m.posterUrl || m.thumbnailUrl, alt: m.title, style: { width: 26, height: 36, objectFit: "cover", borderRadius: 3, flexShrink: 0 }, onError: (e) => e.target.style.display = "none" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("div", { style: { fontWeight: 600, fontSize: "0.86rem" }, children: m.title }),
              /* @__PURE__ */ jsx("div", { style: { fontSize: "0.68rem", color: "var(--muted)" }, children: m.releaseDate ? new Date(m.releaseDate).getFullYear() : "TBA" })
            ] })
          ]
        },
        m._id
      ))
    ] })
  ] });
}
function PosterGeneratorPanel({ movies, onToast }) {
  const [posterType, setPosterType] = useState("review");
  const [format, setFormat] = useState("portrait");
  const [movie, setMovie] = useState(null);
  const [loadingMovie, setLoadingMovie] = useState(false);
  const [ratingText, setRatingText] = useState("");
  const [reviewCount, setReviewCount] = useState(0);
  const [showVerdict, setShowVerdict] = useState(true);
  const [imageOk, setImageOk] = useState(true);
  const [generating, setGenerating] = useState(false);
  const canvasRef = useRef(null);
  const handleSelectMovie = async (picked) => {
    if (!picked || !picked._id) {
      setMovie(null);
      setRatingText("");
      setReviewCount(0);
      return;
    }
    setLoadingMovie(true);
    setImageOk(true);
    try {
      const full = await API.getMovie(picked._id);
      setMovie(full);
      const { avg, count } = publicRatingFromReviews(full == null ? void 0 : full.reviews);
      setRatingText(avg !== null ? `${avg.toFixed(1)}/10` : "");
      setReviewCount(count);
    } catch (e) {
      onToast == null ? void 0 : onToast("Couldn't load public reviews for this movie — using basic info only.");
      setMovie(picked);
      setRatingText("");
      setReviewCount(0);
    } finally {
      setLoadingMovie(false);
    }
  };
  const fmt = FORMATS.find((f) => f.key === format) || FORMATS[0];
  const link = movie ? movieLink(movie) : `${SITE_URL}/movies/your-movie-slug`;
  const year = (movie == null ? void 0 : movie.releaseDate) ? new Date(movie.releaseDate).getFullYear() : "";
  const redraw = useCallback(() => {
    if (!canvasRef.current) return;
    setGenerating(true);
    drawReviewPoster(canvasRef.current, {
      w: fmt.w,
      h: fmt.h,
      posterUrl: (movie == null ? void 0 : movie.posterUrl) || (movie == null ? void 0 : movie.thumbnailUrl) || "",
      title: (movie == null ? void 0 : movie.title) || "Select a movie",
      year,
      ratingText: ratingText || "—/10",
      reviewCount,
      verdict: (movie == null ? void 0 : movie.verdict) || "",
      link,
      showVerdict,
      imageOk
    });
    setGenerating(false);
  }, [fmt, movie, year, ratingText, reviewCount, link, showVerdict, imageOk]);
  useEffect(() => {
    redraw();
  }, [redraw]);
  const handleImgError = () => {
    setImageOk(false);
    onToast == null ? void 0 : onToast("Couldn't load the poster image (likely a CORS restriction on the image host) — generating with a flat background instead.");
  };
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          onToast == null ? void 0 : onToast("Download failed — try again.");
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${((movie == null ? void 0 : movie.slug) || (movie == null ? void 0 : movie.title) || "review-poster").toString().replace(/\s+/g, "-").toLowerCase()}-poster.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        onToast == null ? void 0 : onToast("Poster downloaded.");
      }, "image/png");
    } catch (e) {
      onToast == null ? void 0 : onToast("Couldn't export this image — the poster host may be blocking cross-origin export (CORS). Try a different image source.");
    }
  };
  const handleCopyLink = () => {
    var _a;
    (_a = navigator.clipboard) == null ? void 0 : _a.writeText(link);
    onToast == null ? void 0 : onToast("Link copied.");
  };
  return /* @__PURE__ */ jsxs("div", { style: { padding: 28, display: "grid", gridTemplateColumns: "360px 1fr", gap: 28, alignItems: "start" }, children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("h2", { style: { marginBottom: 18, fontSize: "1.4rem" }, children: "🖼️ Poster Generator" }),
      /* @__PURE__ */ jsxs("div", { style: { marginBottom: 18 }, children: [
        /* @__PURE__ */ jsx("label", { style: { fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: 6 }, children: "Poster type" }),
        /* @__PURE__ */ jsx("select", { className: "form-input", value: posterType, onChange: (e) => setPosterType(e.target.value), children: POSTER_TYPES.map((t) => /* @__PURE__ */ jsx("option", { value: t.key, children: t.label }, t.key)) })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { marginBottom: 18 }, children: [
        /* @__PURE__ */ jsx("label", { style: { fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: 6 }, children: "Movie" }),
        /* @__PURE__ */ jsx(MoviePicker, { movies, value: movie, onSelect: handleSelectMovie })
      ] }),
      loadingMovie && /* @__PURE__ */ jsx("div", { style: { marginBottom: 18, fontSize: "0.8rem", color: "var(--muted)" }, children: "Loading public reviews…" }),
      movie && !loadingMovie && /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, alignItems: "center", marginBottom: 18, padding: 10, background: "var(--bg2)", borderRadius: 8, border: "1px solid var(--border)" }, children: [
        (movie.posterUrl || movie.thumbnailUrl) && /* @__PURE__ */ jsx(
          "img",
          {
            src: movie.posterUrl || movie.thumbnailUrl,
            alt: movie.title,
            style: { width: 44, height: 62, objectFit: "cover", borderRadius: 4 },
            onError: handleImgError
          }
        ),
        /* @__PURE__ */ jsxs("div", { style: { minWidth: 0 }, children: [
          /* @__PURE__ */ jsx("div", { style: { fontWeight: 600, fontSize: "0.86rem" }, children: movie.title }),
          /* @__PURE__ */ jsx("div", { style: { fontSize: "0.7rem", color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: link })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { marginBottom: 18 }, children: [
        /* @__PURE__ */ jsx("label", { style: { fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: 6 }, children: "Rating (avg. of public reviews, out of 5 — editable)" }),
        /* @__PURE__ */ jsx("input", { className: "form-input", value: ratingText, onChange: (e) => setRatingText(e.target.value), placeholder: "4.2/10" }),
        movie && !loadingMovie && /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: "var(--muted)", marginTop: 6 }, children: reviewCount > 0 ? `Based on ${reviewCount} public review${reviewCount === 1 ? "" : "s"}` : "No public reviews yet for this movie — enter a rating manually" })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { marginBottom: 18 }, children: [
        /* @__PURE__ */ jsx("label", { style: { fontSize: "0.78rem", color: "var(--muted)", display: "block", marginBottom: 6 }, children: "Format" }),
        /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 8 }, children: FORMATS.map((f) => /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setFormat(f.key),
            className: format === f.key ? "btn btn-gold btn-sm" : "btn btn-outline btn-sm",
            style: { flex: 1, fontSize: "0.72rem" },
            children: f.label
          },
          f.key
        )) })
      ] }),
      /* @__PURE__ */ jsxs("label", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 24, fontSize: "0.82rem", cursor: "pointer" }, children: [
        /* @__PURE__ */ jsx("input", { type: "checkbox", checked: showVerdict, onChange: (e) => setShowVerdict(e.target.checked) }),
        "Show verdict tag ",
        (movie == null ? void 0 : movie.verdict) ? `(${movie.verdict})` : ""
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10 }, children: [
        /* @__PURE__ */ jsx("button", { className: "btn btn-gold", onClick: handleDownload, disabled: !movie || generating || loadingMovie, style: { flex: 1 }, children: "⬇ Download PNG" }),
        /* @__PURE__ */ jsx("button", { className: "btn btn-outline", onClick: handleCopyLink, disabled: !movie || loadingMovie, children: "🔗 Copy link" })
      ] }),
      !imageOk && movie && /* @__PURE__ */ jsx("div", { style: { marginTop: 14, fontSize: "0.74rem", color: "var(--red)" }, children: "Poster image couldn't be loaded for export (CORS). The download will use a flat background instead of the artwork." })
    ] }),
    /* @__PURE__ */ jsx("div", { style: { display: "flex", justifyContent: "center" }, children: /* @__PURE__ */ jsx("div", { style: {
      background: "var(--bg2)",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: 16,
      display: "inline-block"
    }, children: /* @__PURE__ */ jsx(
      "canvas",
      {
        ref: canvasRef,
        style: {
          width: fmt.key === "story" ? 220 : fmt.key === "square" ? 320 : 280,
          height: "auto",
          display: "block",
          borderRadius: 6
        }
      }
    ) }) })
  ] });
}
export {
  PosterGeneratorPanel as default
};
