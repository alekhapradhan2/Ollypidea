/**
 * merge_title_year_duplicates.js
 * ─────────────────────────────
 * Merges "MovieName (YYYY)" into "MovieName" for all duplicate pairs.
 * SKIPS pairs that are genuinely different films (marked manually).
 *
 * Strategy:
 *  - KEEP the plain-name doc (no year suffix)
 *  - DELETE the "(YEAR)" doc(s)
 *  - MERGE best fields from (YEAR) doc → plain doc where plain is weaker
 *
 * Usage:
 *   node scripts/merge_title_year_duplicates.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) { console.error("❌  MONGO_URI missing"); process.exit(1); }

// ── Normalised titles to SKIP — these are genuinely DIFFERENT films ───────────
// Abhiman 1977 ≠ 2019 | Nijhum Ratira Sathi 1979 ≠ 2017
// Maa O Mamata 1980 ≠ 1999 | Suna Sansar 1978 ≠ 1997 | Agni Parikshya 1980 ≠ 2005
const SKIP_BASES = new Set([
  "abhiman",
  "nijhum ratira sathi",
  "maa o mamata",
  "suna sansar",
  "agni parikshya",
]);

function stripYear(t) { return t.replace(/\s*\(\d{4}\)\s*$/, "").trim(); }
function norm(t) {
  return t.toLowerCase().replace(/[^a-z0-9\u0B00-\u0B7F]/g, " ").replace(/\s+/g, " ").trim();
}

/** Pick the "better" release date — prefer specific over placeholder */
function betterDate(a, b) {
  const isPlaceholder = d => !d || /\d{4}-01-01$/.test(d) || /\d{4}-12-31$/.test(d) || /^01\/01\//.test(d);
  if (!a && b) return b;
  if (a && !b) return a;
  if (isPlaceholder(a) && !isPlaceholder(b)) return b;
  if (!isPlaceholder(a) && isPlaceholder(b)) return a;
  return a; // both specific or both placeholder — keep existing (plain) value
}

/** Merge videos: combine without ytId duplicates */
function mergeVideos(existing, incoming) {
  const merged = [...(existing || [])];
  for (const v of (incoming || [])) {
    if (v.ytId && !merged.some(m => m.ytId === v.ytId)) merged.push(v);
  }
  return merged;
}

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("✅  Connected to MongoDB\n");

  const col = mongoose.connection.collection("movies");
  const all = await col.find({}, {
    projection: { title: 1, releaseDate: 1, posterUrl: 1, bannerUrl: 1,
                  synopsis: 1, cast: 1, "media.videos": 1, imdbId: 1,
                  director: 1, producer: 1, genre: 1, runtime: 1,
                  contentRating: 1, thumbnailUrl: 1 }
  }).toArray();

  // Group by normalised base title
  const map = new Map();
  for (const d of all) {
    const base = norm(stripYear(d.title || ""));
    if (!base) continue;
    if (!map.has(base)) map.set(base, []);
    map.get(base).push(d);
  }

  let merged = 0, skipped = 0, deleted = 0;

  for (const [base, docs] of map) {
    if (docs.length < 2) continue;

    const hasYearSuffix = docs.some(d => /\(\d{4}\)/.test(d.title));
    const hasPlain      = docs.some(d => !/\(\d{4}\)/.test(d.title));
    if (!hasYearSuffix || !hasPlain) continue;

    // ── Skip genuinely different films ──────────────────────────────────────
    if (SKIP_BASES.has(base)) {
      console.log(`⏭️   SKIPPED (different films): "${docs.map(d => d.title).join('" | "')}"`);
      skipped++;
      continue;
    }

    // ── Identify plain doc (the one to keep) ────────────────────────────────
    const plainDocs  = docs.filter(d => !/\(\d{4}\)/.test(d.title));
    const yearDocs   = docs.filter(d => /\(\d{4}\)/.test(d.title));

    // If multiple plain docs somehow exist, take the one with best data
    const plainDoc = plainDocs.sort((a, b) =>
      (b.cast?.length || 0) - (a.cast?.length || 0)
    )[0];

    // ── Build merged update from all year-suffix docs ───────────────────────
    const $set = {};

    let bestReleaseDate = plainDoc.releaseDate || "";
    let bestPoster      = plainDoc.posterUrl || "";
    let bestBanner      = plainDoc.bannerUrl || "";
    let bestThumbnail   = plainDoc.thumbnailUrl || "";
    let bestSynopsis    = plainDoc.synopsis || "";
    let bestDirector    = plainDoc.director || "";
    let bestProducer    = plainDoc.producer || "";
    let bestRuntime     = plainDoc.runtime || "";
    let bestImdbId      = plainDoc.imdbId || "";
    let bestContentRating = plainDoc.contentRating || "";
    let bestGenre       = plainDoc.genre || [];
    let bestVideos      = plainDoc.media?.videos || [];
    let bestCast        = plainDoc.cast || [];

    for (const yd of yearDocs) {
      bestReleaseDate   = betterDate(bestReleaseDate, yd.releaseDate);
      if (!bestPoster    && yd.posterUrl)     bestPoster    = yd.posterUrl;
      if (!bestBanner    && yd.bannerUrl)     bestBanner    = yd.bannerUrl;
      if (!bestThumbnail && yd.thumbnailUrl)  bestThumbnail = yd.thumbnailUrl;
      if (!bestSynopsis  && yd.synopsis)      bestSynopsis  = yd.synopsis;
      if (yd.synopsis && yd.synopsis.length > bestSynopsis.length) bestSynopsis = yd.synopsis;
      if (!bestDirector  && yd.director)      bestDirector  = yd.director;
      if (!bestProducer  && yd.producer)      bestProducer  = yd.producer;
      if (!bestRuntime   && yd.runtime)       bestRuntime   = yd.runtime;
      if (!bestImdbId    && yd.imdbId)        bestImdbId    = yd.imdbId;
      if (!bestContentRating && yd.contentRating) bestContentRating = yd.contentRating;
      if (bestGenre.length === 0 && (yd.genre || []).length > 0) bestGenre = yd.genre;
      bestVideos = mergeVideos(bestVideos, yd.media?.videos);
      // Take cast from whichever doc has more entries
      if ((yd.cast || []).length > bestCast.length) bestCast = yd.cast;
    }

    // Only set fields that have a value
    if (bestReleaseDate)   $set.releaseDate   = bestReleaseDate;
    if (bestPoster)        $set.posterUrl     = bestPoster;
    if (bestBanner)        $set.bannerUrl     = bestBanner;
    if (bestThumbnail)     $set.thumbnailUrl  = bestThumbnail;
    if (bestSynopsis)      $set.synopsis      = bestSynopsis;
    if (bestDirector)      $set.director      = bestDirector;
    if (bestProducer)      $set.producer      = bestProducer;
    if (bestRuntime)       $set.runtime       = bestRuntime;
    if (bestImdbId)        $set.imdbId        = bestImdbId;
    if (bestContentRating) $set.contentRating = bestContentRating;
    if (bestGenre.length)  $set.genre         = bestGenre;
    if (bestVideos.length) $set["media.videos"] = bestVideos;
    if (bestCast.length)   $set.cast          = bestCast;

    // ── Update the plain-name doc ────────────────────────────────────────────
    if (Object.keys($set).length > 0) {
      await col.updateOne({ _id: plainDoc._id }, { $set });
    }

    // ── Delete all year-suffix docs ──────────────────────────────────────────
    const deleteIds = yearDocs.map(d => d._id);
    // Also delete any extra plain docs (keep only plainDoc)
    const extraPlainIds = plainDocs.filter(d => String(d._id) !== String(plainDoc._id)).map(d => d._id);
    const allDeleteIds = [...deleteIds, ...extraPlainIds];

    await col.deleteMany({ _id: { $in: allDeleteIds } });
    deleted += allDeleteIds.length;
    merged++;

    console.log(`✅  Merged: "${plainDoc.title}" ← ${yearDocs.map(d => `"${d.title}"`).join(", ")} (deleted ${allDeleteIds.length} dup(s))`);
  }

  console.log("\n════════════════════════════════════════");
  console.log(`✅  Groups merged   : ${merged}`);
  console.log(`🗑️   Docs deleted    : ${deleted}`);
  console.log(`⏭️   Groups skipped  : ${skipped}`);
  console.log("════════════════════════════════════════");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(e => { console.error("❌", e); process.exit(1); });
