/**
 * slugs.js — src/utils/slugs.js
 *
 * URL format: /movie/daman-2024-686abc123ef
 *             /cast/abhishek-sharma-686abc123ef
 *             /news/daman-box-office-hits-686abc123ef
 *             /song/daman-2024-686abc123ef/2
 *
 * The MongoDB _id is always the LAST segment after the final hyphen.
 * This means:
 *  - URLs look clean and SEO-friendly
 *  - We always extract the real _id for API calls
 *  - Old /:id-only links auto-redirect to the new slug URL
 *  - No backend changes needed
 */

/**
 * Convert a title to a URL slug.
 * "Daman (2024)" → "daman-2024"
 * "Hero No 1" → "hero-no-1"
 */
export function toSlug(str = "") {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")   // remove special chars except hyphens
    .replace(/\s+/g, "-")        // spaces to hyphens
    .replace(/-{2,}/g, "-")      // collapse multiple hyphens
    .replace(/^-|-$/g, "")       // trim leading/trailing hyphens
    .slice(0, 60);               // max 60 chars
}

/**
 * Build a full slug-id string.
 * movieSlugId(movie) → "daman-2024-686abc123ef"
 */
export function movieSlugId(movie) {
  if (!movie) return "";
  const year = movie.releaseDate ? `-${new Date(movie.releaseDate).getFullYear()}` : "";
  return `${toSlug(movie.title)}${year}-${movie._id}`;
}

export function castSlugId(person) {
  if (!person) return "";
  return `${toSlug(person.name)}-${person._id}`;
}

export function newsSlugId(item) {
  if (!item) return "";
  return `${toSlug(item.title)}-${item._id}`;
}

/**
 * Extract the MongoDB _id from a slug param.
 * "daman-2024-686abc123ef456def789012" → "686abc123ef456def789012"
 *
 * MongoDB ObjectIds are exactly 24 hex characters.
 * We match the last 24-char hex segment in the string.
 *
 * Also handles bare _id params (old links): "686abc123ef456def789012"
 */
export function extractId(slugParam = "") {
  if (!slugParam) return "";
  // Match last 24-char hex string (MongoDB ObjectId)
  const match = slugParam.match(/([a-f0-9]{24})(?:[^a-f0-9].*)?$/i);
  return match ? match[1] : slugParam; // fallback: return as-is (bare _id)
}

/**
 * Navigate helpers — use these instead of navigate(`/movie/${id}`)
 */
export const moviePath = (movie) => `/movie/${movieSlugId(movie)}`;
export const castPath  = (person) => `/cast/${castSlugId(person)}`;
export const newsPath  = (item)   => `/news/${newsSlugId(item)}`;
export const songPath  = (movie, songIndex) => `/song/${movieSlugId(movie)}/${songIndex}`;
