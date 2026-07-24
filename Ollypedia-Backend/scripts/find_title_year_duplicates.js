/**
 * find_title_year_duplicates.js
 * Finds movies where both "Moviename (1976)" and "Moviename" exist as separate docs.
 * Run: node scripts/find_title_year_duplicates.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

async function main() {
  await mongoose.connect(MONGO_URI);
  const col = mongoose.connection.collection("movies");
  const all = await col.find({}, { projection: { title: 1, releaseDate: 1, _id: 1 } }).toArray();

  // Strip trailing " (YYYY)" from a title
  function stripYear(t) {
    return t.replace(/\s*\(\d{4}\)\s*$/, "").trim();
  }

  // Normalize for comparison
  function norm(t) {
    return t.toLowerCase().replace(/[^a-z0-9\u0B00-\u0B7F]/g, " ").replace(/\s+/g, " ").trim();
  }

  // Build a map: normalized base title → list of docs
  const map = new Map();
  for (const doc of all) {
    const base = norm(stripYear(doc.title || ""));
    if (!base) continue;
    if (!map.has(base)) map.set(base, []);
    map.get(base).push(doc);
  }

  const dupes = [];
  for (const [base, docs] of map) {
    if (docs.length < 2) continue;
    // Check if at least one has a "(YYYY)" suffix and one doesn't
    const hasYearSuffix = docs.some(d => /\(\d{4}\)/.test(d.title));
    const hasPlain     = docs.some(d => !/\(\d{4}\)/.test(d.title));
    if (hasYearSuffix && hasPlain) {
      dupes.push(docs.sort((a, b) => (a.title > b.title ? 1 : -1)));
    }
  }

  if (dupes.length === 0) {
    console.log("✅  No title/year duplicates found.");
  } else {
    console.log(`Found ${dupes.length} duplicate groups:\n`);
    for (const group of dupes) {
      console.log("─────────────────────────────────────────────");
      for (const d of group) {
        console.log(`  "${d.title}"   date: ${d.releaseDate || "N/A"}   id: ${d._id}`);
      }
    }
    console.log("\n─────────────────────────────────────────────");
    console.log(`Total groups: ${dupes.length}`);
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
