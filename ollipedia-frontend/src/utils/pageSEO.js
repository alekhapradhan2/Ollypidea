/**
 * pageSEO.js — helpers that build SEO props for each page type.
 * Import these in your page components.
 *
 * Usage:
 *   import { movieSEO, castSEO, homeSEO } from "../utils/pageSEO";
 *   <SEO {...movieSEO(movie)} />
 */

const SITE_URL  = "https://ollypedia.in"; // ← your domain
const SITE_NAME = "Ollipedia";

const truncate = (str = "", n = 160) =>
  str.length > n ? str.slice(0, n - 1) + "…" : str;

const ytThumbHQ = id =>
  id ? `https://img.youtube.com/vi/${id}/maxresdefault.jpg` : null;

// ── Home ──────────────────────────────────────────────────────────
export function homeSEO() {
  return {
    title:       null, // shows "Ollipedia" only
    description: "The complete Odia film encyclopedia — movies, cast, songs, trailers, box office and more.",
    url:         "/",
    keywords:    "Odia film, Ollywood, Odia cinema, Odia movies, Odia actors",
  };
}

// ── Movie detail ──────────────────────────────────────────────────
export function movieSEO(movie) {
  if (!movie) return {};
  const year  = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const title = `${movie.title}${year ? ` (${year})` : ""}`;

  const desc = movie.synopsis
    ? truncate(movie.synopsis)
    : `${movie.title} — ${movie.language || "Odia"} ${movie.category || "film"}${year ? ` (${year})` : ""}.${movie.director ? ` Directed by ${movie.director}.` : ""}${movie.verdict && movie.verdict !== "Upcoming" ? ` Verdict: ${movie.verdict}.` : ""}`;

  // Best image: poster → thumbnail → trailer thumb → default
  const image =
    movie.posterUrl ||
    movie.thumbnailUrl ||
    ytThumbHQ(movie.media?.trailer?.ytId) ||
    `${SITE_URL}/og-default.jpg`;

  return {
    title,
    description: desc,
    image,
    url:         `/movie/${movie._id}`,
    type:        "article",
    publishDate: movie.releaseDate || undefined,
    keywords:    [
      movie.title,
      movie.language || "Odia",
      movie.director,
      movie.genre?.join(", "),
      "film", "movie", "Ollywood",
    ].filter(Boolean).join(", "),
  };
}

// ── Cast / person ─────────────────────────────────────────────────
export function castSEO(person) {
  if (!person) return {};
  const movies = person.moviesList || [];
  const count  = movies.length;

  const desc = person.bio
    ? truncate(person.bio)
    : `${person.name} — ${person.type || "Actor"} in Odia cinema.${count ? ` Featured in ${count} film${count !== 1 ? "s" : ""}.` : ""}`;

  return {
    title:       `${person.name} — ${person.type || "Actor"}`,
    description: desc,
    image:       person.photo || `${SITE_URL}/og-default.jpg`,
    url:         `/cast/${person._id}`,
    keywords:    `${person.name}, ${person.type || "Actor"}, Odia film, Ollywood`,
  };
}

// ── Songs page ────────────────────────────────────────────────────
export function songsSEO() {
  return {
    title:       "Songs",
    description: "Browse all Odia film songs — singers, music directors, lyricists and YouTube links.",
    url:         "/songs",
    keywords:    "Odia songs, Ollywood music, Odia film songs",
  };
}

// ── Song detail ───────────────────────────────────────────────────
export function songDetailSEO(song, movie) {
  if (!song) return {};
  const parts = [song.title];
  if (movie?.title) parts.push(movie.title);
  if (song.singer)  parts.push(song.singer);

  const desc = [
    `"${song.title}"`,
    movie?.title  ? `from ${movie.title}`          : null,
    song.singer   ? `sung by ${song.singer}`        : null,
    song.musicDirector ? `music by ${song.musicDirector}` : null,
  ].filter(Boolean).join(", ") + ".";

  const image =
    song.thumbnailUrl ||
    (song.ytId ? ytThumbHQ(song.ytId) : null) ||
    movie?.posterUrl ||
    `${SITE_URL}/og-default.jpg`;

  return {
    title:       parts.join(" — "),
    description: truncate(desc),
    image,
    url:         `/song/${movie?._id}/${song.songIndex ?? ""}`,
    keywords:    `${song.title}, ${song.singer || ""}, Odia song, Ollywood music`,
  };
}

// ── Movies list ───────────────────────────────────────────────────
export function moviesSEO() {
  return {
    title:       "Films",
    description: `Browse all Odia films on ${SITE_NAME} — filter by year, genre, verdict and more.`,
    url:         "/movies",
    keywords:    "Odia films, Ollywood movies list, Odia cinema",
  };
}

// ── Cast list ─────────────────────────────────────────────────────
export function castListSEO() {
  return {
    title:       "Cast & Crew",
    description: `Explore Odia film actors, directors, music directors and crew on ${SITE_NAME}.`,
    url:         "/cast",
    keywords:    "Odia actors, Odia directors, Ollywood cast, Odia film crew",
  };
}

// ── News ──────────────────────────────────────────────────────────
export function newsSEO() {
  return {
    title:       "News",
    description: "Latest news and updates from Odia cinema and Ollywood.",
    url:         "/news",
    keywords:    "Odia film news, Ollywood news, Odia cinema updates",
  };
}

export function newsItemSEO(item) {
  if (!item) return {};
  return {
    title:       item.title,
    description: truncate(item.content || item.title),
    image:       item.imageUrl || `${SITE_URL}/og-default.jpg`,
    url:         `/news/${item._id}`,
    type:        "article",
    publishDate: item.createdAt,
    keywords:    `${item.category || "news"}, Odia cinema, Ollywood`,
  };
}