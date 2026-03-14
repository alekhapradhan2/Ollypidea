/**
 * ═══════════════════════════════════════════════════════════════════
 *  scrape_news.js  —  Ollipedia News / Article Scraper  v2
 *
 *  SOURCES (no API key required):
 *    1. Google News RSS — searched PER MOVIE TITLE (guaranteed match)
 *    2. Wikipedia       — per-movie article sections
 *    3. General Ollywood RSS feeds (strict matching + general news)
 *
 *  Usage:
 *    node scrape_news.js                       # all sources, all movies
 *    node scrape_news.js --movie "Daman"       # one movie only
 *    node scrape_news.js --source google       # Google News per-movie
 *    node scrape_news.js --source wikipedia    # Wikipedia only
 *    node scrape_news.js --source rss          # RSS feeds only
 *    node scrape_news.js --limit 30            # max movies for Google/Wiki
 *    node scrape_news.js --dry-run             # print, don't save
 *    node scrape_news.js --overwrite           # re-save duplicates
 *
 *  Required .env:
 *    MONGO_URI
 * ═══════════════════════════════════════════════════════════════════
 */

import dotenv   from "dotenv";
import mongoose from "mongoose";
dotenv.config();

if (typeof fetch === "undefined") {
  console.error("Node 18+ required (built-in fetch)");
  process.exit(1);
}

// ── CLI ───────────────────────────────────────────────────────────
const argv          = process.argv.slice(2);
const DRY_RUN       = argv.includes("--dry-run");
const OVERWRITE     = argv.includes("--overwrite");
const MOVIE_FILTER  = argv.includes("--movie")  ? argv[argv.indexOf("--movie")  + 1] : null;
const SOURCE_FILTER = argv.includes("--source") ? argv[argv.indexOf("--source") + 1].toLowerCase() : "all";
const LIMIT         = argv.includes("--limit")  ? parseInt(argv[argv.indexOf("--limit") + 1], 10) : 100;

// ── Schemas — registered ONCE at module level ─────────────────────
const NewsSchema = new mongoose.Schema({
  movieId:    { type: mongoose.Schema.Types.ObjectId, ref: "Movie" },
  movieTitle: { type: String, default: "" },
  title:      { type: String, required: true },
  content:    { type: String, required: true },
  category:   { type: String, default: "Update" },
  imageUrl:   { type: String, default: "" },
  published:  { type: Boolean, default: true },
  sourceUrl:  { type: String, default: "" },
}, { timestamps: true });

const MovieSchema = new mongoose.Schema({
  title:       String,
  language:    String,
  releaseDate: String,
  posterUrl:   String,
  news:        [{ type: mongoose.Schema.Types.ObjectId, ref: "News" }],
}, { strict: false });

// Prevent "Cannot overwrite model" — check if already registered
const News  = mongoose.models.News  || mongoose.model("News",  NewsSchema);
const Movie = mongoose.models.Movie || mongoose.model("Movie", MovieSchema);

// ── Utilities ─────────────────────────────────────────────────────
const sleep    = (ms) => new Promise(r => setTimeout(r, ms));
const truncate = (s, n = 1800) => s && s.length > n ? s.slice(0, n) + "..." : (s || "");

function cleanHtml(raw) {
  return (raw || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, "").replace(/&[a-z]+;/g, " ")
    .replace(/\s+/g, " ").trim();
}

async function fetchSafe(url, opts, retries) {
  opts    = opts    || {};
  retries = retries || 3;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const ctrl = new AbortController();
      const t    = setTimeout(() => ctrl.abort(), 15000);
      const res  = await fetch(url, {
        ...opts,
        signal: ctrl.signal,
        headers: Object.assign(
          { "User-Agent": "OllipediaNewsScraper/1.0 (educational)" },
          opts.headers || {}
        ),
      });
      clearTimeout(t);
      return res;
    } catch (e) {
      if (attempt === retries) throw e;
      await sleep(1500 * (attempt + 1));
    }
  }
}

function detectCategory(title, content) {
  title   = title   || "";
  content = content || "";
  const t = (title + " " + content).toLowerCase();
  if (/\btrailer\b|\bteaser\b|first look/i.test(t))                  return "Trailer";
  if (/\bsong\b|\bsongs\b|\bmusic\b|\baudio\b|\balbum\b/i.test(t))  return "Song";
  if (/\baward\b|\bwins\b|box.?office|crore|collection/i.test(t))    return "Award";
  if (/\binterview\b|\bexclusive\b|\bopens up\b|\btalks\b/i.test(t)) return "Interview";
  if (/release date|\bin cinemas\b|\bhit screen|\bopening\b/i.test(t)) return "Release";
  return "Update";
}

/**
 * STRICT matcher — article title must contain the FULL movie title as
 * an exact phrase. Titles < 5 chars are never used (too ambiguous).
 * Returns the longest-matching movie (most specific), or null.
 */
function strictMatch(articleTitle, articleContent, movies) {
  const hay = (articleTitle + " " + (articleContent || "")).toLowerCase();
  let best = null, bestLen = 0;
  for (const m of movies) {
    const t = (m.title || "").trim();
    if (t.length < 5) continue;
    if (hay.includes(t.toLowerCase()) && t.length > bestLen) {
      bestLen = t.length;
      best    = m;
    }
  }
  return best;
}

// Session dedup
const seenTitles = new Set();
function isDupe(title) {
  const k = (title || "").toLowerCase().replace(/\s+/g, " ").trim();
  if (seenTitles.has(k)) return true;
  seenTitles.add(k);
  return false;
}

// ── RSS parser ────────────────────────────────────────────────────
function parseRss(xml) {
  const items  = [];
  const itemRe = /<(?:item|entry)[\s>]([\s\S]*?)<\/(?:item|entry)>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block  = m[1];
    const getTag = (tag) => {
      const r = block.match(
        new RegExp("<" + tag + "(?:[^>]*)>\\s*(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?\\s*<\\/" + tag + ">", "i")
      );
      return r ? cleanHtml(r[1]).trim() : "";
    };
    const title  = getTag("title");
    const link   = getTag("link") || ((block.match(/href="([^"]+)"/) || [])[1]) || "";
    const desc   = getTag("description") || getTag("summary") || getTag("content");
    const imgM   = block.match(/url="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i)
                || block.match(/src="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
    if (!title || title.length < 5) continue;
    items.push({
      title:    truncate(title, 200),
      content:  truncate(desc || title, 1800),
      imageUrl: imgM ? imgM[1] : "",
      link,
    });
  }
  return items;
}

// ════════════════════════════════════════════════════════════════
// SOURCE 1 — GOOGLE NEWS RSS per movie title
// Articles are ALREADY bound to the movie — no matching needed.
// ════════════════════════════════════════════════════════════════
async function scrapeGoogleNewsPerMovie(movies) {
  console.log("\n[Source 1] Google News RSS — per movie title");
  const articles = [];

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    const query = '"' + movie.title + '" Odia film OR Ollywood';
    const url   = "https://news.google.com/rss/search?q=" + encodeURIComponent(query) + "&hl=en-IN&gl=IN&ceid=IN:en";

    process.stdout.write("  [" + String(i+1).padStart(3) + "/" + movies.length + "] " + movie.title.slice(0,40).padEnd(40) + " ");

    try {
      const res = await fetchSafe(url, {
        headers: { Accept: "application/rss+xml,application/xml,text/xml,*/*" }
      });
      if (!res.ok) { console.log("! " + res.status); await sleep(600); continue; }

      const xml   = await res.text();
      const items = parseRss(xml);
      let added   = 0;

      for (const item of items) {
        articles.push({
          title:      item.title,
          content:    item.content || item.title,
          category:   detectCategory(item.title, item.content),
          imageUrl:   item.imageUrl || movie.posterUrl || "",
          movieId:    movie._id,
          movieTitle: movie.title,
          sourceUrl:  item.link,
          source:     "Google News",
        });
        added++;
      }
      console.log("OK  " + added + " articles");
    } catch (e) {
      console.log("ERR " + e.message.slice(0, 50));
    }

    await sleep(1200); // polite delay
  }

  return articles;
}

// ════════════════════════════════════════════════════════════════
// SOURCE 2 — WIKIPEDIA per-movie article sections
// ════════════════════════════════════════════════════════════════
async function wikiFindPage(movieTitle) {
  const queries = [
    movieTitle + " Odia film",
    movieTitle + " Ollywood film",
    movieTitle + " film",
    movieTitle,
  ];
  for (const q of queries) {
    await sleep(200);
    const url = "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" +
      encodeURIComponent(q) + "&srlimit=3&format=json&origin=*";
    try {
      const res  = await fetchSafe(url);
      if (!res.ok) continue;
      const data = await res.json();
      const hits = (data && data.query && data.query.search) || [];
      const match = hits.find(function(r) {
        return r.title.toLowerCase().includes(movieTitle.toLowerCase()) &&
          (r.title.toLowerCase().includes("film") ||
           r.snippet.toLowerCase().includes("odia") ||
           r.snippet.toLowerCase().includes("ollywood"));
      }) || hits[0];
      if (match) return match.title;
    } catch (e) { continue; }
  }
  return null;
}

async function wikiGetSections(pageTitle) {
  const url = "https://en.wikipedia.org/w/api.php?action=parse&page=" +
    encodeURIComponent(pageTitle) + "&prop=text&format=json&origin=*";
  try {
    const res  = await fetchSafe(url);
    if (!res.ok) return [];
    const data = await res.json();
    const html = (data && data.parse && data.parse.text && data.parse.text["*"]) || "";
    if (!html) return [];

    const targets = [
      { name: "Plot",               cat: "Update"  },
      { name: "Production",         cat: "Update"  },
      { name: "Filming",            cat: "Update"  },
      { name: "Release",            cat: "Release" },
      { name: "Reception",          cat: "Award"   },
      { name: "Critical reception", cat: "Award"   },
      { name: "Box office",         cat: "Award"   },
      { name: "Soundtrack",         cat: "Song"    },
      { name: "Accolades",          cat: "Award"   },
    ];

    const sections = [];
    for (const target of targets) {
      const re = new RegExp(
        "<h[23][^>]*>\\s*(?:<[^>]+>)*\\s*" + target.name + "\\s*(?:<\\/[^>]+>)*\\s*<\\/h[23]>([\\s\\S]*?)(?=<h[23]|$)", "i"
      );
      const m = html.match(re);
      if (m) {
        const text = cleanHtml(m[1]);
        if (text.length > 80) sections.push({ name: target.name, cat: target.cat, text: truncate(text, 1600) });
      }
    }
    return sections;
  } catch (e) { return []; }
}

async function scrapeWikipedia(movies) {
  console.log("\n[Source 2] Wikipedia — per-movie sections");
  const articles = [];

  for (const movie of movies) {
    process.stdout.write("  " + movie.title.slice(0,45).padEnd(45) + " ");
    await sleep(500);

    const wikiTitle = await wikiFindPage(movie.title);
    if (!wikiTitle) { console.log("(no page)"); continue; }

    await sleep(500);
    const sections = await wikiGetSections(wikiTitle);
    if (!sections.length) { console.log('"' + wikiTitle + '" — no sections'); continue; }

    console.log('"' + wikiTitle + '" -> ' + sections.length + " sections");

    for (const s of sections) {
      articles.push({
        title:      movie.title + " — " + s.name + " (Wikipedia)",
        content:    s.text,
        category:   s.cat,
        imageUrl:   movie.posterUrl || "",
        movieId:    movie._id,
        movieTitle: movie.title,
        sourceUrl:  "https://en.wikipedia.org/wiki/" + encodeURIComponent(wikiTitle),
        source:     "Wikipedia",
      });
    }

    await sleep(400);
  }

  return articles;
}

// ════════════════════════════════════════════════════════════════
// SOURCE 3 — GENERAL OLLYWOOD RSS FEEDS
// ════════════════════════════════════════════════════════════════
const GENERAL_FEEDS = [
  { name: "Odisha Post Entertainment",  url: "https://odishapost.com/category/entertainment/feed/" },
  { name: "OTV Entertainment",          url: "https://www.odishatv.in/entertainment/feed" },
  { name: "Kalinga TV Entertainment",   url: "https://kalingatv.com/entertainment/feed/" },
  { name: "Pragativadi Entertainment",  url: "https://pragativadi.com/category/entertainment/feed/" },
  { name: "Sambad English",             url: "https://sambadenglish.com/category/entertainment/feed/" },
  { name: "Google News Ollywood",       url: "https://news.google.com/rss/search?q=Ollywood+Odia+film+news&hl=en-IN&gl=IN&ceid=IN:en" },
  { name: "Google News Odia trailer",   url: "https://news.google.com/rss/search?q=Odia+film+trailer+teaser+2025&hl=en-IN&gl=IN&ceid=IN:en" },
  { name: "Google News Odia song",      url: "https://news.google.com/rss/search?q=Odia+movie+song+album+2025&hl=en-IN&gl=IN&ceid=IN:en" },
  { name: "Google News Odia release",   url: "https://news.google.com/rss/search?q=Odia+film+release+box+office+2025&hl=en-IN&gl=IN&ceid=IN:en" },
];

async function scrapeGeneralFeeds(movies) {
  console.log("\n[Source 3] General Ollywood RSS Feeds");
  const articles = [];
  const isOdia   = function(t, c) { return /odia|ollywood|odisha/i.test((t||"") + " " + (c||"")); };

  for (const feed of GENERAL_FEEDS) {
    console.log("  Feed: " + feed.name);
    try {
      const res = await fetchSafe(feed.url, {
        headers: { Accept: "application/rss+xml,application/xml,text/xml,*/*" }
      });
      if (!res.ok) { console.log("    ! " + res.status); continue; }

      const xml   = await res.text();
      const items = parseRss(xml);
      let linked = 0, general = 0, dropped = 0;

      for (const item of items) {
        if (!item.title) continue;
        const movie = strictMatch(item.title, item.content, movies);

        if (movie) {
          articles.push({
            title:      item.title,
            content:    item.content || item.title,
            category:   detectCategory(item.title, item.content),
            imageUrl:   item.imageUrl || movie.posterUrl || "",
            movieId:    movie._id,
            movieTitle: movie.title,
            sourceUrl:  item.link,
            source:     feed.name,
          });
          linked++;
        } else if (isOdia(item.title, item.content)) {
          articles.push({
            title:      item.title,
            content:    item.content || item.title,
            category:   detectCategory(item.title, item.content),
            imageUrl:   item.imageUrl || "",
            movieId:    null,
            movieTitle: "",
            sourceUrl:  item.link,
            source:     feed.name,
          });
          general++;
        } else {
          dropped++;
        }
      }
      console.log("    -> " + linked + " movie-linked | " + general + " general | " + dropped + " discarded");
    } catch (e) {
      console.log("    ERR " + e.message.slice(0, 60));
    }

    await sleep(900);
  }

  return articles;
}

// ════════════════════════════════════════════════════════════════
// SAVE TO MONGODB
// ════════════════════════════════════════════════════════════════
async function saveArticles(articles) {
  let saved = 0, dupes = 0, errors = 0;

  for (const a of articles) {
    if (!a.title || !a.title.trim() || !a.content || !a.content.trim()) continue;
    if (isDupe(a.title)) { dupes++; continue; }

    if (!OVERWRITE) {
      try {
        const exists = await News.findOne({ title: a.title.trim() }).lean();
        if (exists) { dupes++; continue; }
      } catch (e) { /* continue */ }
    }

    try {
      const doc = {
        title:     a.title.trim(),
        content:   a.content.trim(),
        category:  a.category  || "Update",
        imageUrl:  a.imageUrl  || "",
        published: true,
        sourceUrl: a.sourceUrl || "",
      };
      if (a.movieId)    doc.movieId    = a.movieId;
      if (a.movieTitle) doc.movieTitle = a.movieTitle;

      const news = await News.create(doc);

      if (a.movieId) {
        await Movie.findByIdAndUpdate(a.movieId, { $addToSet: { news: news._id } });
      }

      const label = a.movieTitle
        ? ("Movie: " + a.movieTitle.slice(0,22).padEnd(22))
        : "General                 ";
      console.log("  OK [" + (a.category||"Update").padEnd(9) + "] " + label + " | " + truncate(a.title, 55));
      saved++;
    } catch (e) {
      console.log("  ERR " + e.message.slice(0, 80));
      errors++;
    }
  }

  return { saved, dupes, errors };
}

// ════════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════════
async function main() {
  console.log("=== Ollipedia News Scraper v2 ===");
  console.log("Dry run  : " + DRY_RUN);
  console.log("Overwrite: " + OVERWRITE);
  console.log("Source   : " + SOURCE_FILTER);
  console.log("Movie    : " + (MOVIE_FILTER || "all"));
  console.log("Limit    : " + LIMIT + " movies (Google/Wiki)");
  console.log("");

  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI not set in .env");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected\n");

  let movies = await Movie.find({}, "title language releaseDate posterUrl _id news").lean();
  if (!movies.length) {
    console.error("No movies in DB. Run scrape.js first.");
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log(movies.length + " movies loaded\n");

  if (MOVIE_FILTER) {
    movies = movies.filter(function(m) {
      return (m.title || "").toLowerCase().includes(MOVIE_FILTER.toLowerCase());
    });
    if (!movies.length) {
      console.error("No movies matching: " + MOVIE_FILTER);
      await mongoose.disconnect();
      process.exit(1);
    }
    console.log("Filtered to " + movies.length + " movie(s)\n");
  }

  let allArticles = [];
  const run = function(s) { return SOURCE_FILTER === "all" || SOURCE_FILTER === s; };

  if (run("google")) {
    const gMovies = MOVIE_FILTER ? movies : movies.slice(0, LIMIT);
    const arts = await scrapeGoogleNewsPerMovie(gMovies);
    console.log("\nGoogle News: " + arts.length + " articles");
    allArticles = allArticles.concat(arts);
  }

  if (run("wikipedia")) {
    const wMovies = MOVIE_FILTER ? movies : movies.slice(0, Math.min(LIMIT, 60));
    const arts = await scrapeWikipedia(wMovies);
    console.log("\nWikipedia: " + arts.length + " sections");
    allArticles = allArticles.concat(arts);
  }

  if (run("rss")) {
    const arts = await scrapeGeneralFeeds(movies);
    console.log("\nRSS feeds: " + arts.length + " articles");
    allArticles = allArticles.concat(arts);
  }

  // Dedup across sources
  const seenX = new Set();
  const unique = allArticles.filter(function(a) {
    const k = (a.title || "").toLowerCase().trim();
    if (seenX.has(k)) return false;
    seenX.add(k); return true;
  });

  const linked  = unique.filter(function(a) { return a.movieId; }).length;
  const general = unique.filter(function(a) { return !a.movieId; }).length;
  console.log("\nTotal unique: " + unique.length + "  (" + linked + " movie-linked, " + general + " general)");

  if (DRY_RUN) {
    console.log("\n[DRY RUN] Sample (first 30):");
    unique.slice(0, 30).forEach(function(a, i) {
      const label = a.movieTitle ? ("Movie: " + a.movieTitle) : "General";
      console.log("  " + String(i+1).padStart(3) + ". [" + (a.category||"").padEnd(9) + "] " + label + " — " + truncate(a.title, 55));
    });
    if (unique.length > 30) console.log("  ... and " + (unique.length - 30) + " more");
  } else {
    console.log("\nSaving to MongoDB...\n");
    const stats = await saveArticles(unique);
    console.log("\n=== Final Report ===");
    console.log("Articles found  : " + unique.length);
    console.log("Saved to DB     : " + stats.saved);
    console.log("Skipped (dupes) : " + stats.dupes);
    console.log("Errors          : " + stats.errors);
    console.log("Movie-linked    : " + linked);
    console.log("General news    : " + general);
  }

  await mongoose.disconnect();
  console.log("\nDone!");
}

main().catch(function(e) {
  console.error("Fatal: " + e.message);
  process.exit(1);
});