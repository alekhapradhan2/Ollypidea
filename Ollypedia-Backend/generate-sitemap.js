/**
 * generate-sitemap.js — run this from your BACKEND after deploying
 * It fetches all movies + cast from your API and writes sitemap.xml
 * to the frontend public/ folder.
 *
 * Usage (from Ollypedia-Backend folder):
 *   node generate-sitemap.js
 *
 * Then commit the generated sitemap.xml and robots.txt
 * to ollipedia-frontend/public/
 *
 * Or add to your build script:
 *   "build": "node generate-sitemap.js && vite build"
 *
 * Install dependency:
 *   npm install node-fetch  (if not already)
 */

import fs   from "fs";
import path from "path";

const API_URL      = process.env.VITE_API_URL || "http://localhost:4000/api";
const SITE_URL     = "https://ollipedia-frontend.onrender.com"; // ← your domain
const OUTPUT_DIR   = "../ollipedia-frontend/public";            // ← path to frontend public/

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

function xmlEscape(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function urlEntry({ loc, lastmod, priority = "0.7", changefreq = "weekly" }) {
  const date = lastmod ? new Date(lastmod).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  return `  <url>
    <loc>${SITE_URL}${xmlEscape(loc)}</loc>
    <lastmod>${date}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

async function generate() {
  console.log("🗺  Generating sitemap…");

  const [movies, castList] = await Promise.all([
    fetchJSON(`${API_URL}/movies`).catch(() => []),
    fetchJSON(`${API_URL}/cast`).catch(()   => []),
  ]);

  const urls = [];

  // Static pages
  urls.push(urlEntry({ loc: "/",        priority: "1.0", changefreq: "daily"  }));
  urls.push(urlEntry({ loc: "/movies",  priority: "0.9", changefreq: "daily"  }));
  urls.push(urlEntry({ loc: "/cast",    priority: "0.8", changefreq: "weekly" }));
  urls.push(urlEntry({ loc: "/songs",   priority: "0.7", changefreq: "weekly" }));
  urls.push(urlEntry({ loc: "/news",    priority: "0.7", changefreq: "daily"  }));

  // Movie pages
  movies.forEach(m => {
    urls.push(urlEntry({
      loc:      `/movie/${m._id}`,
      lastmod:  m.updatedAt || m.releaseDate,
      priority: m.verdict && !["Upcoming","Flop","Disaster"].includes(m.verdict) ? "0.8" : "0.6",
      changefreq: "monthly",
    }));
  });

  // Cast pages
  castList.forEach(c => {
    urls.push(urlEntry({
      loc:      `/cast/${c._id}`,
      lastmod:  c.updatedAt,
      priority: (c.movies?.length || 0) >= 5 ? "0.7" : "0.5",
      changefreq: "monthly",
    }));
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  const sitemapPath = path.join(OUTPUT_DIR, "sitemap.xml");
  fs.writeFileSync(sitemapPath, xml, "utf8");
  console.log(`✅  sitemap.xml → ${sitemapPath}  (${urls.length} URLs)`);

  // robots.txt
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml

# Block admin routes from indexing
Disallow: /admin
Disallow: /admin/
Disallow: /dashboard
Disallow: /dashboard/
`;

  const robotsPath = path.join(OUTPUT_DIR, "robots.txt");
  fs.writeFileSync(robotsPath, robotsTxt, "utf8");
  console.log(`✅  robots.txt  → ${robotsPath}`);
}

generate().catch(e => { console.error("❌", e.message); process.exit(1); });
