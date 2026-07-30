import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useState, useRef, useEffect, useCallback } from "react";
import { A as API } from "../entry-server.js";
import "react-dom/server";
import "react-router-dom/server.mjs";
import "react-helmet-async";
import "react-router-dom";
function slugify(str) {
  return String(str || "").toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}
function fmtDate(d) {
  if (!d) return "TBA";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "TBA";
  }
}
function fmtMs(ms) {
  if (!ms) return "";
  return ms < 1e3 ? `${ms}ms` : `${(ms / 1e3).toFixed(1)}s`;
}
function wordCount(txt) {
  return txt.split(/\s+/).filter(Boolean).length;
}
function readTime(txt) {
  return Math.max(1, Math.ceil(wordCount(txt) / 200));
}
function sanitize(html) {
  return (html || "").replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<iframe[\s\S]*?<\/iframe>/gi, "").replace(/\s+on\w+\s*=\s*(['"])[^'"]*\1/gi, "").replace(/javascript\s*:/gi, "");
}
const ARTICLE_TYPES = [
  {
    id: "movie-review",
    label: "🎬 Movie Review",
    emoji: "🎬",
    desc: "Complete film review covering story, cast, direction, music and verdict",
    prompt: `Write a comprehensive, professional MOVIE REVIEW article for this Odia film.

STRUCTURE (use these exact sections in order):
1. Introduction — hook the reader with the film's premise and why it matters
2. Story & Plot Overview — summarize without spoilers, highlight the narrative arc
3. Direction & Screenplay — analyze the director's vision, pacing, storytelling choices
4. Cast Performances — evaluate each key performer's role and impact
5. Cinematography & Visual Style — discuss visual language, color grading, shot choices
6. Music & Songs — review the soundtrack, standout tracks, background score
7. Production Design — sets, costumes, locations, period accuracy
8. Emotional Resonance — what the film makes you feel and why
9. Strengths & Weaknesses — honest critique of what works and what doesn't
10. Comparison with Director's Previous Work (if data available)
11. Final Verdict — concise recommendation with star context (without using the word "verdict")
12. Audience Suitability — who will love this film and why

TONE: Authoritative, engaging, like a senior film critic at a major publication.
LENGTH: 1400-1800 words.
FORMAT: Clean HTML sections with <h2> headings, <p> paragraphs. No FAQs.`
  },
  {
    id: "research-paper",
    label: "📄 Research Paper",
    emoji: "📄",
    desc: "Academic-style in-depth analysis with cultural, historical and cinematic context",
    prompt: `Write a RESEARCH PAPER-STYLE article about this Odia film for Ollypedia.

This should read like a scholarly entertainment analysis piece — rigorous, well-structured, citation-aware.

STRUCTURE:
1. Abstract — 3-4 sentence summary of the film and its significance in Odia cinema
2. Introduction — contextual background of the film within the Ollywood landscape
3. Historical & Cultural Context — place the film within Odia cinema history and the social moment it captures
4. Narrative Analysis — deep examination of story structure, themes, subtext, symbolism
5. Cinematic Language — technical analysis of direction, cinematography, editing rhythms
6. Performance Studies — analysis of acting choices and character development
7. Sound Design & Music — musicological analysis of the soundtrack's role
8. Production Ecology — behind-the-scenes context (budget, locations, production challenges)
9. Industry Impact — what this film means for Ollywood economics and creative direction
10. Reception & Discourse — critical reception, audience response, social media narrative
11. Comparative Analysis — how it compares to landmark Odia films of its era
12. Conclusion — synthesis and lasting significance

TONE: Analytical, authoritative, academic but readable. Use precise film terminology.
LENGTH: 1800-2200 words.
FORMAT: Clean HTML. Use <h2> for main sections, <h3> for sub-sections. Include a data table for key film facts.`
  },
  {
    id: "box-office-analysis",
    label: "📊 Full Box Office Analysis",
    emoji: "📊",
    desc: "Day-by-day collection data, trend analysis, industry comparison, lifetime projection",
    prompt: `Write a COMPREHENSIVE BOX OFFICE ANALYSIS article for this Odia film.

Use ALL the day-wise collection data available in the movie database.

STRUCTURE:
1. Introduction — opening verdict: did this film succeed commercially?
2. Opening Day & Weekend Performance — first-day buzz, opening weekend figures, occupancy
3. Day-Wise Collection Breakdown — present the full day-wise data in an HTML table (Day | Net | Gross | Cumulative)
4. Weekly Performance Segmentation — Week 1, Week 2, Week 3+ analysis with percentage drops
5. Trend Analysis — is the film holding, declining or recovering? What drives each phase?
6. Screen Count & Occupancy Trajectory — how many screens and at what fill rate
7. Territory-wise Performance — Odisha districts, non-Odia markets, NRI markets (use available data)
8. Competition Impact — how did other releases affect this film's run?
9. Budget vs Collection — ROI analysis, break-even analysis (if budget data available)
10. Milestone Moments — first ₹1 Cr, ₹5 Cr, ₹10 Cr days; special achievement dates
11. Comparison with Recent Odia Films — benchmark against other Ollywood releases
12. Lifetime Collection Projection — based on current trajectory, what is the expected lifetime?
13. Industry Implications — what these numbers mean for future Odia productions

TONE: Trade publication style — precise, data-driven, insightful.
LENGTH: 1600-2000 words.
FORMAT: Use HTML tables for box office data. Use <h2> sections. Include a summary box with key figures.
CRITICAL: Only use real figures from the database. Do not invent collection data.`
  },
  {
    id: "comparison",
    label: "⚖️ Comparison Article",
    emoji: "⚖️",
    desc: "Compare this film with similar Odia/Indian films across multiple dimensions",
    prompt: `Write a COMPARISON ARTICLE positioning this film within the broader Odia and Indian cinema landscape.

STRUCTURE:
1. Introduction — establish the comparison framework: why this film invites comparison
2. Thematic Parallels — films with similar themes, stories or social commentary
3. Director's Evolution — compare with the director's own filmography (if director data available)
4. Star Power Comparison — how the cast stacks up against other current Odia films
5. Budget & Production Scale Comparison — how the production values compare
6. Box Office Comparison — how the commercial performance compares to benchmarks
7. Narrative Structure Comparison — how the storytelling approach differs from convention
8. Music Comparison — soundtrack compared to recent Odia film music trends
9. Audience Demographic Comparison — who watched this vs who watches comparable films
10. Critical Reception Comparison — how critics treated this vs similar films
11. OTT Performance Outlook — based on comparable films' OTT trajectories
12. Legacy Potential — will this be remembered the way landmark Odia films are?
13. Final Positioning — where exactly does this film sit in the Odia cinema spectrum?

TONE: Balanced, analytical, comparative. Use phrases like "unlike", "similar to", "where X failed, this film".
LENGTH: 1400-1800 words.
FORMAT: Clean HTML. Use comparison tables where possible. <h2> sections throughout.`
  },
  {
    id: "audience-reaction",
    label: "👥 Audience Reaction",
    emoji: "👥",
    desc: "Deep dive into audience sentiment, demographics, word of mouth and social response",
    prompt: `Write an AUDIENCE REACTION & SENTIMENT ANALYSIS article about this Odia film.

Focus entirely on HOW audiences have responded — not the film's technical quality, but the lived experience of watching it.

STRUCTURE:
1. The First Wave — what audiences said in the first 24-72 hours (opening day reactions)
2. Word-of-Mouth Velocity — how fast did positive/negative buzz spread?
3. Demographic Breakdown — who is watching: families, youth, couples, senior citizens, diaspora
4. Urban vs Rural Audience Split — how Bhubaneswar/Cuttack audiences differ from B/C centers
5. Repeat Viewing Culture — is this a one-time watch or repeat-viewing phenomenon?
6. Viral Moments — specific scenes, dialogues, songs that went viral
7. Social Media Sentiment Timeline — how the discourse evolved week by week
8. Fan Community Response — fan clubs, celebration events, organized shows
9. Critic vs Audience Divide — where critics and general audiences disagreed
10. NRI & Non-Odia Audience Response — how the film played outside Odisha
11. Emotional Impact Stories — the types of emotional responses the film generated
12. Long-Term Audience Memory — will audiences remember this film? What will they remember most?
13. The Audience Verdict — a synthesis of what the collective audience experience tells us

TONE: Vivid, human-centered, journalistic. Focus on people's reactions, not just numbers.
LENGTH: 1400-1700 words.
FORMAT: Clean HTML <h2> sections. Use descriptive, evocative language about audience behavior.`
  },
  {
    id: "cast-spotlight",
    label: "⭐ Cast Spotlight",
    emoji: "⭐",
    desc: "In-depth spotlight on the film's lead cast with performance analysis and career context",
    prompt: `Write a CAST SPOTLIGHT article focusing on the performances and careers of the lead actors in this Odia film.

STRUCTURE:
1. Introduction — the ensemble and what makes this cast choice significant
2. Lead Actor Deep Dive — career trajectory, preparation for this role, what they bring
3. Lead Actress Deep Dive — career arc, performance nuances, screen presence
4. Supporting Cast Spotlight — key supporting performances that elevate the film
5. Chemistry & Ensemble Dynamics — how the cast works together on screen
6. First-Time Collaborations — are any cast pairings new? What energy does that bring?
7. Physical Transformations — any significant look changes for the role
8. Method & Approach — what we know about how the cast prepared
9. Standout Scenes — specific moments where the acting shines
10. Career Impact — how this role may define or redefine each actor's career
11. Audience & Critic Consensus — how reviewers are rating the performances
12. Comparison to Career-Best Performances — how this ranks in each actor's body of work

TONE: Warm, insightful, fan-engaging but critically grounded.
LENGTH: 1300-1700 words.
FORMAT: Clean HTML. One <h2> section per major cast member. Include a cast table.`
  },
  {
    id: "music-review",
    label: "🎵 Music & Songs Review",
    emoji: "🎵",
    desc: "Complete analysis of the soundtrack, individual songs, background score and music direction",
    prompt: `Write a comprehensive MUSIC & SOUNDTRACK REVIEW for this Odia film.

STRUCTURE:
1. Music Direction Overview — who composed? What is their musical style and legacy in Odia music?
2. Album First Listen — the overall sonic identity of the album
3. Track-by-Track Review — for each song in the database:
   - Song title and singer(s)
   - Musical genre and mood
   - Lyrical theme and language style
   - Picturization quality (if known)
   - Standout musical moments
   - Rating out of 5
4. Background Score Analysis — how the background music serves the narrative
5. Recording & Production Quality — production values, mixing, sound design
6. Singer Performances — vocal highlights and notable performances
7. Lyrical Craftsmanship — best lyrics, poetic moments, vernacular authenticity
8. Chart Performance — if any tracks became popular, how they trended
9. Cultural Resonance — how the music reflects or shapes Odia musical culture
10. Comparison with Music Director's Catalog — how this album fits their body of work
11. Playlist Worthiness — which tracks will stand the test of time?
12. Final Album Verdict — overall rating and recommendation

TONE: Passionate about music, detailed but accessible. Like Pitchfork meets Bollywood Hungama.
LENGTH: 1200-1600 words.
FORMAT: Clean HTML. Use a table for the track listing. <h2> sections throughout.`
  },
  {
    id: "ott-streaming",
    label: "📱 OTT Release Guide",
    emoji: "📱",
    desc: "Complete OTT streaming guide with platform details, viewing recommendations and context",
    prompt: `Write a comprehensive OTT STREAMING GUIDE & ARRIVAL article for this Odia film.

This article is for audiences discovering the film on streaming platforms.

STRUCTURE:
1. The OTT Arrival — where is it streaming, when, and why this matters
2. Theatrical Context — a brief recap of the film's theatrical journey for new viewers
3. The Film in Brief — 3-4 paragraph spoiler-light synopsis for those who missed the cinema run
4. Why You Should Watch — the strongest reasons to stream this film right now
5. What the Film is Really About — deeper thematic layers beneath the surface story
6. Best Viewing Experience — watch it alone or with family? What atmosphere enhances it?
7. Streaming Platform Deep Dive — quality, subtitles, audio options, playlist features
8. Watch or Skip? — honest, direct recommendation for different types of viewers
9. Perfect For — specific audience segments who will love this
10. Not For — audiences who might not enjoy it (honest, non-judgmental)
11. Post-Watch Recommendations — similar films to watch next on the same platform
12. Cultural Context for Non-Odia Viewers — what you need to know to appreciate it

TONE: Helpful, conversational, direct. Like a knowledgeable friend recommending a film.
LENGTH: 1200-1500 words.
FORMAT: Clean HTML with <h2> sections. Include a quick-facts box at the top.`
  },
  {
    id: "movie-update",
    label: "🔄 Movie Update",
    emoji: "🔄",
    desc: "News, updates, or announcements about the movie. Combine with custom prompt for specifics.",
    prompt: `Write a MOVIE UPDATE or NEWS ANNOUNCEMENT article for this Odia film.

STRUCTURE:
1. The Big News — open immediately with the core update or announcement
2. Context — why this update matters for the film's trajectory
3. Fan/Industry Reaction — how audiences or the industry are responding to this news
4. Film Recap — brief reminder of the film's premise, cast, and status for context
5. What's Next — upcoming milestones or expected next announcements
6. Conclusion — a wrap-up sentence encouraging fans to stay tuned

TONE: Urgent, exciting, journalistic news-style.
LENGTH: 600-1000 words.
FORMAT: Clean HTML with <h2> sections.`
  },
  {
    id: "theatre-list",
    label: "🎟️ Theatre List & Tickets",
    emoji: "🎟️",
    desc: "Release date announcements with specific theatre lists and BookMyShow details (provide in custom prompt)",
    prompt: `Write a THEATRE LIST & TICKET BOOKING ANNOUNCEMENT article for this Odia film.

STRUCTURE:
1. Release Announcement — highlight the film's theatrical release date and excitement
2. Movie Overview — brief reminder of the story, cast, and director
3. Theatre & Showtimes Guide — neatly format the provided theatre list and ticket booking links (e.g., BookMyShow) using HTML tables or clean bullet points
4. Why Watch It On The Big Screen — talk about the cinematography, music, or scale that demands a cinema viewing
5. Audience Buzz — mention pre-booking excitement and fan reactions
6. Conclusion — a final call-to-action to book tickets

TONE: Energetic, promotional, helpful.
LENGTH: 500-900 words.
FORMAT: Clean HTML. Use <ul> or <table> for the theatre list.`
  }
];
const PROGRESS_STAGES = [
  { key: "researching", label: "Searching Wikipedia", pct: 8 },
  { key: "actors", label: "Researching Cast", pct: 20 },
  { key: "context", label: "Industry Context", pct: 32 },
  { key: "scoring", label: "Calculating Confidence", pct: 45 },
  { key: "retry", label: "Boosting Confidence", pct: 55 },
  { key: "done", label: "Research Complete", pct: 100 }
];
const GEN_STAGES = [
  { key: "context", label: "Building Context", pct: 10 },
  { key: "seo", label: "Generating SEO Plan", pct: 30 },
  { key: "writing", label: "Writing Article", pct: 60 },
  { key: "humanizing", label: "Humanizing Content", pct: 82 },
  { key: "finalizing", label: "Finalizing", pct: 95 },
  { key: "done", label: "Complete", pct: 100 }
];
const BLOG_CATEGORIES = [
  "Movie Review",
  "Box Office",
  "OTT Release",
  "Cast Spotlight",
  "Music Review",
  "Research & Analysis",
  "Comparison",
  "Audience Report",
  "Industry News",
  "Behind the Scenes"
];
function ConfidenceRing({ value }) {
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = Math.min((value || 0) / 100, 1) * circ;
  const color = value >= 90 ? "#4caf82" : value >= 70 ? "#c9973a" : "#e05555";
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }, children: [
    /* @__PURE__ */ jsxs("div", { style: { position: "relative", width: 110, height: 110 }, children: [
      /* @__PURE__ */ jsxs("svg", { width: 110, height: 110, style: { transform: "rotate(-90deg)" }, children: [
        /* @__PURE__ */ jsx("circle", { cx: 55, cy: 55, r, fill: "none", stroke: "rgba(255,255,255,0.06)", strokeWidth: 10 }),
        /* @__PURE__ */ jsx(
          "circle",
          {
            cx: 55,
            cy: 55,
            r,
            fill: "none",
            stroke: color,
            strokeWidth: 10,
            strokeDasharray: `${dash} ${circ - dash}`,
            strokeLinecap: "round",
            style: { transition: "stroke-dasharray 0.8s ease, stroke 0.4s" }
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }, children: [
        /* @__PURE__ */ jsxs("span", { style: { fontSize: "1.4rem", fontWeight: 900, color, lineHeight: 1 }, children: [
          value || 0,
          "%"
        ] }),
        /* @__PURE__ */ jsx("span", { style: { fontSize: "0.58rem", color: "var(--muted)", fontWeight: 700, marginTop: 2 }, children: "Confidence" })
      ] })
    ] }),
    value >= 90 && /* @__PURE__ */ jsx("span", { style: { fontSize: "0.65rem", color: "#4caf82", fontWeight: 800 }, children: "✓ Research Goal Met" }),
    value > 0 && value < 90 && /* @__PURE__ */ jsx("span", { style: { fontSize: "0.65rem", color: "#e05555", fontWeight: 800 }, children: "⚠ Below 90% threshold" })
  ] });
}
function StageProgress({ stage, stages, label }) {
  const idx = stages.findIndex((s) => s.key === stage);
  const curr = stages[Math.max(idx, 0)] || stages[0];
  return /* @__PURE__ */ jsxs("div", { style: { padding: "16px 20px", background: "var(--bg3)", borderRadius: 12, border: "1px solid var(--border)" }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 8 }, children: [
      /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.82rem", fontWeight: 700, color: "var(--gold)" }, children: [
        "⚙ ",
        curr.label,
        "…"
      ] }),
      /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.78rem", color: "var(--muted)", fontWeight: 600 }, children: [
        curr.pct,
        "%"
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { style: { height: 5, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden" }, children: /* @__PURE__ */ jsx("div", { style: { height: "100%", borderRadius: 3, background: "linear-gradient(90deg,var(--gold),#e8c87a)", width: `${curr.pct}%`, transition: "width 0.8s ease" } }) })
  ] });
}
function MovieDataCard({ movie, research }) {
  var _a, _b;
  const [open, setOpen] = useState(false);
  if (!movie) return null;
  return /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }, children: [
    /* @__PURE__ */ jsxs("button", { onClick: () => setOpen((o) => !o), style: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", background: "none", border: "none", cursor: "pointer", color: "var(--text)", fontFamily: "inherit" }, children: [
      /* @__PURE__ */ jsxs("span", { style: { fontWeight: 700, fontSize: "0.88rem", display: "flex", alignItems: "center", gap: 8 }, children: [
        "🎬 ",
        movie.title,
        /* @__PURE__ */ jsx("span", { style: { fontSize: "0.6rem", padding: "2px 7px", borderRadius: 8, background: "rgba(201,151,58,0.12)", color: "var(--gold)", border: "1px solid rgba(201,151,58,0.2)", fontWeight: 700 }, children: movie.verdict || "Upcoming" })
      ] }),
      /* @__PURE__ */ jsx("span", { style: { color: "var(--muted)", fontSize: "0.8rem", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }, children: "▾" })
    ] }),
    open && /* @__PURE__ */ jsxs("div", { style: { padding: "4px 18px 18px", borderTop: "1px solid var(--border)" }, children: [
      /* @__PURE__ */ jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px", marginBottom: 12 }, children: [["Release", fmtDate(movie.releaseDate)], ["Director", movie.director || "—"], ["Producer", movie.producer || "—"], ["Language", movie.language || "Odia"], ["Genre", (movie.genre || []).join(", ") || "—"], ["Runtime", movie.runtime || "—"], ["Budget", movie.budget || "—"], ["OTT", movie.streamingOn || "—"], ["Box Office", ((_a = movie.boxOffice) == null ? void 0 : _a.total) || "—"], ["IMDB", movie.imdbRating || "—"]].map(([k, v]) => /* @__PURE__ */ jsxs("div", { style: { paddingTop: 8 }, children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)" }, children: k }),
        /* @__PURE__ */ jsx("div", { style: { fontSize: "0.8rem", marginTop: 2, color: "var(--text)" }, children: v })
      ] }, k)) }),
      movie.synopsis && /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.7, paddingTop: 8, borderTop: "1px solid var(--border)" }, children: [
        /* @__PURE__ */ jsx("strong", { style: { color: "var(--text)", display: "block", marginBottom: 4, fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.1em" }, children: "Synopsis" }),
        movie.synopsis
      ] }),
      (movie.cast || []).length > 0 && /* @__PURE__ */ jsxs("div", { style: { marginTop: 12 }, children: [
        /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 6 }, children: [
          "Cast (",
          movie.cast.length,
          ")"
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexWrap: "wrap", gap: 5 }, children: [
          movie.cast.slice(0, 8).map((c, i) => /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.72rem", padding: "2px 9px", borderRadius: 10, background: "var(--bg3)", border: "1px solid var(--border)" }, children: [
            c.name,
            c.role ? /* @__PURE__ */ jsxs("span", { style: { color: "var(--muted)" }, children: [
              " — ",
              c.role
            ] }) : null
          ] }, i)),
          movie.cast.length > 8 && /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.72rem", color: "var(--muted)" }, children: [
            "+",
            movie.cast.length - 8,
            " more"
          ] })
        ] })
      ] }),
      (((_b = movie.media) == null ? void 0 : _b.songs) || []).length > 0 && /* @__PURE__ */ jsxs("div", { style: { marginTop: 12 }, children: [
        /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 6 }, children: [
          "Songs (",
          movie.media.songs.length,
          ")"
        ] }),
        movie.media.songs.slice(0, 5).map((s, i) => /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.74rem", marginBottom: 3 }, children: [
          "🎵 ",
          /* @__PURE__ */ jsx("strong", { children: s.title }),
          s.singer ? ` — ${s.singer}` : ""
        ] }, i)),
        movie.media.songs.length > 5 && /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.7rem", color: "var(--muted)" }, children: [
          "+",
          movie.media.songs.length - 5,
          " more songs"
        ] })
      ] }),
      research && (research.sources || []).length > 0 && /* @__PURE__ */ jsxs("div", { style: { marginTop: 12, padding: "10px 0 0", borderTop: "1px solid var(--border)" }, children: [
        /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 6 }, children: [
          "Research Sources (",
          research.sources.length,
          ")"
        ] }),
        research.sources.map((s, i) => /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.75rem", marginBottom: 3 }, children: [
          /* @__PURE__ */ jsx("span", { style: { color: "var(--gold)" }, children: "●" }),
          " ",
          /* @__PURE__ */ jsx("a", { href: s.url, target: "_blank", rel: "noreferrer", style: { color: "var(--text)", textDecoration: "none" }, children: s.name })
        ] }, i))
      ] }),
      (movie._existingBlogs || []).length > 0 && /* @__PURE__ */ jsxs("div", { style: { marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--border)" }, children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: "0.6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 6 }, children: "Existing Blogs" }),
        movie._existingBlogs.map((b, i) => /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.75rem", marginBottom: 4, display: "flex", gap: 6, alignItems: "center" }, children: [
          /* @__PURE__ */ jsx("span", { style: { fontSize: "0.58rem", padding: "1px 6px", borderRadius: 7, fontWeight: 700, background: b.published ? "rgba(76,175,130,0.15)" : "rgba(220,50,50,0.1)", color: b.published ? "#4caf82" : "#e05555" }, children: b.published ? "Live" : "Draft" }),
          /* @__PURE__ */ jsx("span", { style: { color: "var(--muted)" }, children: b.title })
        ] }, i))
      ] })
    ] })
  ] });
}
function SEOPanel({ seo, onChange }) {
  const field = (key, label, multiline = false) => /* @__PURE__ */ jsxs("div", { style: { marginBottom: 12 }, children: [
    /* @__PURE__ */ jsx("label", { style: { fontSize: "0.63rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 3 }, children: label }),
    multiline ? /* @__PURE__ */ jsx("textarea", { rows: 2, className: "form-input", value: seo[key] || "", onChange: (e) => onChange({ ...seo, [key]: e.target.value }), style: { resize: "vertical", fontSize: "0.8rem" } }) : /* @__PURE__ */ jsx("input", { className: "form-input", value: seo[key] || "", onChange: (e) => onChange({ ...seo, [key]: e.target.value }), style: { fontSize: "0.8rem" } })
  ] }, key);
  const arrField = (key, label) => /* @__PURE__ */ jsxs("div", { style: { marginBottom: 12 }, children: [
    /* @__PURE__ */ jsx("label", { style: { fontSize: "0.63rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 3 }, children: label }),
    /* @__PURE__ */ jsx(
      "input",
      {
        className: "form-input",
        value: Array.isArray(seo[key]) ? seo[key].join(", ") : seo[key] || "",
        onChange: (e) => onChange({ ...seo, [key]: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) }),
        style: { fontSize: "0.8rem" }
      }
    ),
    /* @__PURE__ */ jsx("div", { style: { fontSize: "0.6rem", color: "var(--muted)", marginTop: 2 }, children: "Comma-separated" })
  ] }, key);
  return /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }, children: [
    field("seoTitle", "SEO Title (60 chars)"),
    field("slug", "URL Slug"),
    field("metaDescription", "Meta Description (155 chars)", true),
    field("focusKeyword", "Focus Keyword"),
    arrField("primaryKeywords", "Primary Keywords"),
    arrField("secondaryKeywords", "Secondary Keywords"),
    arrField("tags", "Tags"),
    field("ogTitle", "Open Graph Title"),
    field("ogDescription", "OG Description", true),
    field("twitterTitle", "Twitter Title"),
    field("twitterDescription", "Twitter Description", true),
    field("canonicalPath", "Canonical Path"),
    /* @__PURE__ */ jsx("div", { style: { gridColumn: "1 / -1" }, children: field("articleExcerpt", "Article Excerpt", true) })
  ] });
}
function ArticlePreview({ html, movie, seo }) {
  const ref = useRef(null);
  const [mode, setMode] = useState("desktop");
  useEffect(() => {
    var _a;
    if (!ref.current) return;
    const doc = ref.current.contentDocument || ((_a = ref.current.contentWindow) == null ? void 0 : _a.document);
    if (!doc) return;
    const CSS = `
      :root{--bg1:#0f0f0f;--bg2:#161616;--bg3:#1e1e1e;--border:#2a2a2a;--text:#e8e8e8;--muted:#888;--gold:#c9973a}
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      body{font-family:system-ui,-apple-system,sans-serif;background:var(--bg1);color:var(--text);padding:24px;max-width:860px;margin:0 auto;line-height:1.75}
      h1{font-size:1.9rem;font-weight:900;margin-bottom:14px}
      h2{font-size:1.25rem;font-weight:800;margin:26px 0 10px;color:var(--text)}
      h3{font-size:1rem;font-weight:700;margin:18px 0 7px}
      p{margin-bottom:12px;color:#ccc;line-height:1.78}
      ul,ol{margin:0 0 12px 20px;color:#ccc}li{margin-bottom:5px}
      strong{color:var(--text);font-weight:700}
      table{width:100%;border-collapse:collapse;margin:18px 0;font-size:0.88rem}
      th{background:rgba(201,151,58,0.12);color:var(--gold);padding:9px 13px;text-align:left;border-bottom:2px solid rgba(201,151,58,0.3);font-weight:700}
      td{padding:9px 13px;border-bottom:1px solid var(--border);color:#ccc}
      tr:nth-child(even)td{background:rgba(255,255,255,0.02)}
      .faq-section{margin-top:36px;border-top:2px solid var(--border);padding-top:20px}
      .faq-item{border:1px solid var(--border);border-radius:8px;margin-bottom:8px;overflow:hidden}
      .faq-question{padding:12px 16px;cursor:pointer;font-weight:700;font-size:0.9rem;list-style:none}
      .faq-question::-webkit-details-marker{display:none}
      .faq-answer{padding:0 16px 12px;color:#bbb;font-size:0.86rem;line-height:1.7}
      script{display:none!important}
    `;
    doc.open();
    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head><body>
      <h1>${(seo == null ? void 0 : seo.seoTitle) || (movie == null ? void 0 : movie.title) || "Article Preview"}</h1>
      <div style="font-size:0.72rem;color:var(--muted);margin-bottom:20px;display:flex;gap:14px">
        <span>📅 ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
        <span>⏱ ${(seo == null ? void 0 : seo.readingTime) || "8"} min read</span>
        ${(seo == null ? void 0 : seo.focusKeyword) ? `<span>🔑 ${seo.focusKeyword}</span>` : ""}
      </div>
      ${html || "<p style='color:var(--muted)'>No content generated yet.</p>"}
    </body></html>`);
    doc.close();
  }, [html, movie, seo]);
  return /* @__PURE__ */ jsxs("div", { children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }, children: [
      [["desktop", "🖥 Desktop"], ["mobile", "📱 Mobile"]].map(([m, l]) => /* @__PURE__ */ jsx("button", { onClick: () => setMode(m), className: `btn btn-sm ${mode === m ? "btn-gold" : "btn-ghost"}`, style: { fontSize: "0.72rem" }, children: l }, m)),
      /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", style: { marginLeft: "auto", fontSize: "0.7rem" }, onClick: () => {
        var _a;
        (_a = navigator.clipboard) == null ? void 0 : _a.writeText(html || "");
      }, children: "📋 Copy HTML" })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }, children: [
      /* @__PURE__ */ jsxs("div", { style: { padding: "7px 12px", background: "var(--bg3)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 7 }, children: [
        /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 4 }, children: ["#e05555", "#c9973a", "#4caf82"].map((c) => /* @__PURE__ */ jsx("div", { style: { width: 9, height: 9, borderRadius: "50%", background: c } }, c)) }),
        /* @__PURE__ */ jsx("div", { style: { flex: 1, height: 20, background: "var(--bg2)", borderRadius: 4, display: "flex", alignItems: "center", paddingLeft: 8 }, children: /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.62rem", color: "var(--muted)" }, children: [
          "ollypedia.in/blog/",
          (seo == null ? void 0 : seo.slug) || "preview"
        ] }) })
      ] }),
      /* @__PURE__ */ jsx("iframe", { ref, style: { width: mode === "desktop" ? "100%" : "390px", maxWidth: "100%", margin: mode === "mobile" ? "0 auto" : void 0, display: "block", height: 560, border: "none", background: "#0f0f0f" }, title: "article-preview", sandbox: "allow-same-origin" })
    ] })
  ] });
}
function VersionHistory({ logs, onRestore }) {
  const [expanded, setExpanded] = useState(null);
  if (!logs || logs.length === 0) return /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: "28px 0", color: "var(--muted)", fontSize: "0.82rem" }, children: "No previous generations for this movie." });
  return /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 9 }, children: logs.map((log) => /* @__PURE__ */ jsxs("div", { style: { border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }, children: [
    /* @__PURE__ */ jsxs("button", { onClick: () => setExpanded(expanded === log._id ? null : log._id), style: { width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "11px 15px", background: "var(--bg2)", border: "none", cursor: "pointer", color: "var(--text)", fontFamily: "inherit" }, children: [
      /* @__PURE__ */ jsx("span", { style: { fontSize: "0.6rem", fontWeight: 700, padding: "2px 7px", borderRadius: 7, background: log.status === "published" ? "rgba(76,175,130,0.15)" : log.status === "error" ? "rgba(220,50,50,0.1)" : "rgba(201,151,58,0.12)", color: log.status === "published" ? "#4caf82" : log.status === "error" ? "#e05555" : "var(--gold)" }, children: log.status === "published" ? "Published" : log.status === "error" ? "Error" : "Draft" }),
      /* @__PURE__ */ jsx("span", { style: { fontSize: "0.78rem", fontWeight: 600, flex: 1, textAlign: "left" }, children: new Date(log.createdAt).toLocaleString("en-IN") }),
      /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.7rem", color: "var(--muted)" }, children: [
        log.confidence,
        "% · ",
        fmtMs(log.generationTime)
      ] }),
      /* @__PURE__ */ jsx("span", { style: { color: "var(--muted)", fontSize: "0.78rem", transform: expanded === log._id ? "rotate(180deg)" : "none", transition: "transform 0.2s" }, children: "▾" })
    ] }),
    expanded === log._id && /* @__PURE__ */ jsxs("div", { style: { padding: "12px 15px", background: "var(--bg3)", borderTop: "1px solid var(--border)" }, children: [
      log.prompt && /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: 10 }, children: [
        "Prompt: ",
        log.prompt.slice(0, 200),
        log.prompt.length > 200 ? "…" : ""
      ] }),
      log.errorMsg && /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.76rem", color: "#e05555", marginBottom: 10 }, children: [
        "Error: ",
        log.errorMsg
      ] }),
      log.status !== "error" && /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", onClick: () => onRestore(log._id), style: { fontSize: "0.74rem" }, children: "↺ Restore This Version" })
    ] })
  ] }, log._id)) });
}
function ModelBlogPanel({ movies = [], onToast }) {
  var _a, _b;
  const [movieQuery, setMovieQuery] = useState("");
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [fetchedData, setFetchedData] = useState(null);
  const [research, setResearch] = useState(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchStage, setResearchStage] = useState("");
  const [articleTypeId, setArticleTypeId] = useState("movie-review");
  const [customPrompt, setCustomPrompt] = useState("");
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genStage, setGenStage] = useState("");
  const [generatedHTML, setGeneratedHTML] = useState("");
  const [seoData, setSeoData] = useState({});
  const [confidence, setConfidence] = useState(0);
  const [genTime, setGenTime] = useState(0);
  const [logId, setLogId] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("editor");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [pubTitle, setPubTitle] = useState("");
  const [pubSlug, setPubSlug] = useState("");
  const [pubExcerpt, setPubExcerpt] = useState("");
  const [pubCategory, setPubCategory] = useState("Movie Review");
  const [pubCover, setPubCover] = useState("");
  const [pubAuthor, setPubAuthor] = useState("Ollypedia Team");
  const [pubFeatured, setPubFeatured] = useState(false);
  const dropdownRef = useRef(null);
  const selectedType = ARTICLE_TYPES.find((t) => t.id === articleTypeId) || ARTICLE_TYPES[0];
  const filteredMovies = movies.filter((m) => {
    var _a2;
    return !movieQuery.trim() || ((_a2 = m.title) == null ? void 0 : _a2.toLowerCase().includes(movieQuery.toLowerCase()));
  }).slice(0, 22);
  useEffect(() => {
    const h = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const selectMovie = (m) => {
    var _a2;
    setSelectedMovie(m);
    setMovieQuery(m.title);
    setShowDropdown(false);
    setFetchedData(null);
    setResearch(null);
    setGeneratedHTML("");
    setSeoData({});
    setConfidence(0);
    setLogId(null);
    setError("");
    setActiveTab("editor");
    const year = m.releaseDate ? new Date(m.releaseDate).getFullYear() : "";
    setPubTitle(`${m.title}${year ? ` (${year})` : ""} — ${selectedType.desc}`);
    setPubSlug(`${slugify(m.title)}${year ? `-${year}` : ""}-${selectedType.id}`);
    setPubExcerpt(((_a2 = m.synopsis) == null ? void 0 : _a2.slice(0, 200)) || "");
    setPubCover(m.posterUrl || m.thumbnailUrl || "");
    loadLogs(m._id);
  };
  useEffect(() => {
    if (!selectedMovie) return;
    const year = selectedMovie.releaseDate ? new Date(selectedMovie.releaseDate).getFullYear() : "";
    setPubCategory(
      articleTypeId === "box-office-analysis" ? "Box Office" : articleTypeId === "music-review" ? "Music Review" : articleTypeId === "research-paper" ? "Research & Analysis" : articleTypeId === "comparison" ? "Comparison" : articleTypeId === "audience-reaction" ? "Audience Report" : articleTypeId === "cast-spotlight" ? "Cast Spotlight" : articleTypeId === "ott-streaming" ? "OTT Release" : "Movie Review"
    );
    setPubSlug(`${slugify(selectedMovie.title)}${year ? `-${year}` : ""}-${articleTypeId}`);
  }, [articleTypeId, selectedMovie]);
  const loadLogs = useCallback(async (movieId) => {
    if (!movieId) return;
    setLogsLoading(true);
    try {
      setLogs(await API.modelBlogLogs(movieId));
    } catch {
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);
  const animateResearch = useCallback(() => {
    const keys = ["researching", "actors", "context", "scoring"];
    let i = 0;
    const delays = [600, 1500, 2500, 1e3];
    const next = () => {
      if (i < keys.length) {
        setResearchStage(keys[i]);
        i++;
        setTimeout(next, delays[i - 1] || 800);
      }
    };
    next();
  }, []);
  const animateGen = useCallback(() => {
    const keys = ["context", "seo", "writing", "humanizing", "finalizing"];
    let i = 0;
    const delays = [500, 1500, 8e3, 5e3, 2e3];
    const next = () => {
      if (i < keys.length) {
        setGenStage(keys[i]);
        i++;
        setTimeout(next, delays[i - 1] || 1e3);
      }
    };
    next();
  }, []);
  const runResearch = async () => {
    if (!selectedMovie) {
      setError("Please select a movie first.");
      return;
    }
    setResearchLoading(true);
    setResearchStage("researching");
    setError("");
    animateResearch();
    try {
      const result = await API.modelBlogResearch(selectedMovie._id);
      setFetchedData(result.movie);
      setResearch(result.research);
      setConfidence(result.research.confidence);
      setResearchStage("done");
      if (result.research.confidence < 90) {
        setResearchStage("retry");
        onToast == null ? void 0 : onToast(`Research: ${result.research.confidence}% — below 90% threshold. Running extra pass…`, "warn");
        const result2 = await API.modelBlogResearch(selectedMovie._id);
        const merged = {
          sources: [...result.research.sources, ...result2.research.sources.filter((s2) => !result.research.sources.some((s) => s.url === s2.url))],
          facts: [...result.research.facts, ...result2.research.facts.filter((f2) => !result.research.facts.some((f) => f.slice(0, 40) === f2.slice(0, 40)))],
          confidence: Math.max(result.research.confidence, result2.research.confidence)
        };
        setResearch(merged);
        setConfidence(merged.confidence);
        if (merged.confidence >= 90) onToast == null ? void 0 : onToast(`Research boosted to ${merged.confidence}% ✓`, "success");
        else onToast == null ? void 0 : onToast(`Research at ${merged.confidence}% — some data may be limited for this film`, "warn");
      } else {
        onToast == null ? void 0 : onToast(`Research complete — ${result.research.confidence}% confidence ✓`, "success");
      }
    } catch (e) {
      setError(`Research failed: ${e.message}`);
      onToast == null ? void 0 : onToast(`Research failed: ${e.message}`, "error");
    } finally {
      setResearchLoading(false);
    }
  };
  const generateArticle = async () => {
    var _a2, _b2, _c;
    if (!selectedMovie) {
      setError("Please select a movie first.");
      return;
    }
    if (confidence > 0 && confidence < 90) {
      const go = window.confirm(`Research confidence is ${confidence}% (below 90%). You should run research again first. Generate anyway?`);
      if (!go) return;
    }
    setGenerating(true);
    setGenStage("context");
    setError("");
    animateGen();
    const activePrompt = useCustomPrompt && customPrompt.trim() ? `${selectedType.prompt}

=== ADDITIONAL CUSTOM INSTRUCTIONS ===
${customPrompt.trim()}` : selectedType.prompt;
    try {
      const result = await API.modelBlogGenerate({
        movieId: selectedMovie._id,
        prompt: activePrompt,
        research: research || null
      });
      setGeneratedHTML(sanitize(result.html || ""));
      setSeoData(result.seo || {});
      setConfidence((prev) => result.confidence || prev);
      setGenTime(result.generationTime || 0);
      setLogId(result.logId || null);
      if ((_a2 = result.seo) == null ? void 0 : _a2.seoTitle) setPubTitle(result.seo.seoTitle);
      if ((_b2 = result.seo) == null ? void 0 : _b2.slug) setPubSlug(result.seo.slug);
      if ((_c = result.seo) == null ? void 0 : _c.articleExcerpt) setPubExcerpt(result.seo.articleExcerpt);
      setGenStage("done");
      setActiveTab("editor");
      onToast == null ? void 0 : onToast("Article generated successfully!", "success");
      await loadLogs(selectedMovie._id);
    } catch (e) {
      setError(`Generation failed: ${e.message}`);
      onToast == null ? void 0 : onToast(`Generation failed: ${e.message}`, "error");
      setGenStage("");
    } finally {
      setGenerating(false);
    }
  };
  const restoreVersion = async (vLogId) => {
    try {
      const log = await API.modelBlogGetLog(vLogId);
      setGeneratedHTML(sanitize(log.generatedHTML || ""));
      setSeoData(log.seoData || {});
      setConfidence(log.confidence || 0);
      setLogId(vLogId);
      setActiveTab("editor");
      onToast == null ? void 0 : onToast("Version restored!", "success");
    } catch (e) {
      onToast == null ? void 0 : onToast(`Restore failed: ${e.message}`, "error");
    }
  };
  const saveDraft = async () => {
    if (!generatedHTML || !pubTitle) {
      setError("Title and content required.");
      return;
    }
    setPublishing(true);
    try {
      const post = await API.adminCreateBlog({ title: pubTitle.trim(), slug: pubSlug.trim() || slugify(pubTitle), excerpt: pubExcerpt.trim(), content: generatedHTML, category: pubCategory, tags: seoData.tags || [], coverImage: pubCover.trim(), movieId: (selectedMovie == null ? void 0 : selectedMovie._id) || "", movieTitle: (selectedMovie == null ? void 0 : selectedMovie.title) || "", author: pubAuthor.trim() || "Ollypedia Team", published: false, featured: pubFeatured, seoTitle: seoData.seoTitle || pubTitle, seoDesc: seoData.metaDescription || pubExcerpt });
      if (logId) await API.modelBlogMarkPublish(logId, post._id).catch(() => {
      });
      onToast == null ? void 0 : onToast("Draft saved!", "success");
      await loadLogs(selectedMovie._id);
    } catch (e) {
      onToast == null ? void 0 : onToast(`Save failed: ${e.message}`, "error");
    } finally {
      setPublishing(false);
    }
  };
  const publishArticle = async () => {
    if (!generatedHTML || !pubTitle) {
      setError("Title and content required.");
      return;
    }
    setPublishing(true);
    try {
      const post = await API.adminCreateBlog({ title: pubTitle.trim(), slug: pubSlug.trim() || slugify(pubTitle), excerpt: pubExcerpt.trim(), content: generatedHTML, category: pubCategory, tags: seoData.tags || [], coverImage: pubCover.trim(), movieId: (selectedMovie == null ? void 0 : selectedMovie._id) || "", movieTitle: (selectedMovie == null ? void 0 : selectedMovie.title) || "", author: pubAuthor.trim() || "Ollypedia Team", published: true, featured: pubFeatured, seoTitle: seoData.seoTitle || pubTitle, seoDesc: seoData.metaDescription || pubExcerpt });
      if (logId) await API.modelBlogMarkPublish(logId, post._id).catch(() => {
      });
      onToast == null ? void 0 : onToast(`"${pubTitle}" published!`, "success");
      await loadLogs(selectedMovie._id);
      setGeneratedHTML("");
      setSeoData({});
      setLogId(null);
      setActiveTab("editor");
    } catch (e) {
      onToast == null ? void 0 : onToast(`Publish failed: ${e.message}`, "error");
    } finally {
      setPublishing(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { style: { paddingBottom: 60 }, children: [
    /* @__PURE__ */ jsxs("div", { style: { position: "sticky", top: 0, zIndex: 50, background: "var(--bg1)", padding: "12px 28px", marginBottom: 24, boxShadow: "0 2px 16px rgba(0,0,0,0.5)", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsx("span", { style: { fontSize: "1.4rem" }, children: "🤖" }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h2", { style: { fontSize: "1.3rem", margin: 0, fontWeight: 900, lineHeight: 1.1 }, children: "Model Blog" }),
        /* @__PURE__ */ jsx("div", { style: { fontSize: "0.62rem", color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }, children: "AI-Powered Article Generator" })
      ] }),
      /* @__PURE__ */ jsx("div", { style: { flex: 1 } }),
      confidence > 0 && /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 7, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 20, padding: "4px 14px" }, children: [
        /* @__PURE__ */ jsx("span", { style: { fontSize: "0.7rem", color: "var(--muted)" }, children: "Research:" }),
        /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.82rem", fontWeight: 800, color: confidence >= 90 ? "#4caf82" : confidence >= 70 ? "var(--gold)" : "#e05555" }, children: [
          confidence,
          "%"
        ] }),
        confidence >= 90 && /* @__PURE__ */ jsx("span", { style: { fontSize: "0.65rem", color: "#4caf82" }, children: "✓" })
      ] }),
      genTime > 0 && /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.7rem", color: "var(--muted)" }, children: [
        "Generated in ",
        fmtMs(genTime)
      ] }),
      /* @__PURE__ */ jsx("span", { style: { fontSize: "0.62rem", color: "var(--muted)", background: "var(--bg3)", padding: "2px 9px", borderRadius: 10, border: "1px solid var(--border)" }, children: "Groq · llama-3.3-70b" })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { padding: "0 28px" }, children: [
      error && /* @__PURE__ */ jsxs("div", { style: { marginBottom: 18, padding: "11px 15px", background: "rgba(220,50,50,0.1)", border: "1px solid rgba(220,50,50,0.3)", borderRadius: 10, display: "flex", alignItems: "center", gap: 9 }, children: [
        /* @__PURE__ */ jsx("span", { children: "⚠️" }),
        /* @__PURE__ */ jsx("span", { style: { flex: 1, fontSize: "0.84rem", color: "#e05555" }, children: error }),
        /* @__PURE__ */ jsx("button", { onClick: () => setError(""), style: { background: "none", border: "none", color: "#e05555", cursor: "pointer" }, children: "✕" })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 340px", gap: 22, alignItems: "start" }, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 18 }, children: [
          /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }, children: [
            /* @__PURE__ */ jsx("h3", { style: { fontSize: "0.88rem", fontWeight: 800, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }, children: "🎬 Movie Selection" }),
            /* @__PURE__ */ jsxs("div", { style: { position: "relative" }, ref: dropdownRef, children: [
              /* @__PURE__ */ jsx(
                "input",
                {
                  id: "mb-movie-search",
                  className: "form-input",
                  placeholder: "Search movie by title…",
                  value: movieQuery,
                  onChange: (e) => {
                    setMovieQuery(e.target.value);
                    setShowDropdown(true);
                  },
                  onFocus: () => setShowDropdown(true),
                  autoComplete: "off",
                  style: { paddingLeft: 36 }
                }
              ),
              /* @__PURE__ */ jsx("span", { style: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: "0.85rem", color: "var(--muted)", pointerEvents: "none" }, children: "🔍" }),
              showDropdown && filteredMovies.length > 0 && /* @__PURE__ */ jsx("div", { style: { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, zIndex: 100, maxHeight: 280, overflowY: "auto", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }, children: filteredMovies.map((m) => /* @__PURE__ */ jsxs(
                "div",
                {
                  onClick: () => selectMovie(m),
                  style: { padding: "9px 13px", cursor: "pointer", display: "flex", alignItems: "center", gap: 9, borderBottom: "1px solid var(--border)" },
                  onMouseEnter: (e) => e.currentTarget.style.background = "var(--bg3)",
                  onMouseLeave: (e) => e.currentTarget.style.background = "transparent",
                  children: [
                    (m.posterUrl || m.thumbnailUrl) && /* @__PURE__ */ jsx("img", { src: m.posterUrl || m.thumbnailUrl, alt: "", style: { width: 26, height: 36, objectFit: "cover", borderRadius: 4, flexShrink: 0 }, onError: (e) => e.target.style.display = "none" }),
                    /* @__PURE__ */ jsxs("div", { children: [
                      /* @__PURE__ */ jsx("div", { style: { fontWeight: 600, fontSize: "0.85rem" }, children: m.title }),
                      /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.66rem", color: "var(--muted)" }, children: [
                        m.releaseDate ? new Date(m.releaseDate).getFullYear() : "TBA",
                        " · ",
                        (m.genre || []).join(",") || "Odia",
                        " · ",
                        m.verdict || "Upcoming"
                      ] })
                    ] }),
                    (selectedMovie == null ? void 0 : selectedMovie._id) === m._id && /* @__PURE__ */ jsx("span", { style: { marginLeft: "auto", color: "var(--gold)", fontWeight: 900 }, children: "✓" })
                  ]
                },
                m._id
              )) })
            ] }),
            selectedMovie && /* @__PURE__ */ jsxs("div", { style: { marginTop: 10, padding: "9px 13px", background: "rgba(201,151,58,0.07)", border: "1px solid rgba(201,151,58,0.2)", borderRadius: 10, display: "flex", alignItems: "center", gap: 9 }, children: [
              (selectedMovie.posterUrl || selectedMovie.thumbnailUrl) && /* @__PURE__ */ jsx("img", { src: selectedMovie.posterUrl || selectedMovie.thumbnailUrl, alt: "", style: { width: 32, height: 44, objectFit: "cover", borderRadius: 4 }, onError: (e) => e.target.style.display = "none" }),
              /* @__PURE__ */ jsxs("div", { style: { flex: 1 }, children: [
                /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, fontSize: "0.88rem", color: "var(--gold)" }, children: selectedMovie.title }),
                /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.68rem", color: "var(--muted)" }, children: [
                  fmtDate(selectedMovie.releaseDate),
                  " · ",
                  (selectedMovie.genre || []).join(", ") || "—"
                ] })
              ] }),
              /* @__PURE__ */ jsx("button", { onClick: () => {
                setSelectedMovie(null);
                setMovieQuery("");
                setFetchedData(null);
                setResearch(null);
                setGeneratedHTML("");
                setSeoData({});
                setConfidence(0);
              }, style: { background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.95rem" }, children: "✕" })
            ] })
          ] }),
          (fetchedData || selectedMovie) && /* @__PURE__ */ jsx(MovieDataCard, { movie: fetchedData || selectedMovie, research }),
          /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }, children: [
            /* @__PURE__ */ jsx("h3", { style: { fontSize: "0.88rem", fontWeight: 800, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }, children: "📝 Article Type" }),
            /* @__PURE__ */ jsx("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }, children: ARTICLE_TYPES.map((t) => /* @__PURE__ */ jsxs(
              "button",
              {
                onClick: () => {
                  setArticleTypeId(t.id);
                  setUseCustomPrompt(false);
                },
                style: { padding: "10px 13px", border: `1px solid ${articleTypeId === t.id && !useCustomPrompt ? "var(--gold)" : "var(--border)"}`, borderRadius: 10, background: articleTypeId === t.id && !useCustomPrompt ? "rgba(201,151,58,0.12)" : "var(--bg3)", cursor: "pointer", textAlign: "left", fontFamily: "inherit", transition: "all 0.15s" },
                children: [
                  /* @__PURE__ */ jsx("div", { style: { fontSize: "0.82rem", fontWeight: 700, color: articleTypeId === t.id && !useCustomPrompt ? "var(--gold)" : "var(--text)", marginBottom: 3 }, children: t.label }),
                  /* @__PURE__ */ jsx("div", { style: { fontSize: "0.67rem", color: "var(--muted)", lineHeight: 1.4 }, children: t.desc })
                ]
              },
              t.id
            )) }),
            /* @__PURE__ */ jsxs("div", { style: { marginTop: 14 }, children: [
              /* @__PURE__ */ jsx("div", { style: { fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", marginBottom: 6 }, children: "Selected Topic Base Prompt" }),
              /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.74rem", color: "var(--muted)", lineHeight: 1.65, background: "var(--bg3)", padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border)", maxHeight: 120, overflowY: "auto", whiteSpace: "pre-wrap", fontFamily: "monospace" }, children: [
                selectedType.prompt.slice(0, 500),
                selectedType.prompt.length > 500 ? "…" : ""
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px" }, children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }, children: [
              /* @__PURE__ */ jsxs("h3", { style: { fontSize: "0.88rem", fontWeight: 800, margin: 0, display: "flex", alignItems: "center", gap: 8 }, children: [
                "✏️ Add Custom Data & Instructions",
                /* @__PURE__ */ jsx("span", { style: { fontSize: "0.65rem", color: "var(--muted)", fontWeight: 500 }, children: "(Appended to selected topic)" })
              ] }),
              /* @__PURE__ */ jsxs("label", { style: { display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 }, children: [
                /* @__PURE__ */ jsx("input", { type: "checkbox", checked: useCustomPrompt, onChange: (e) => setUseCustomPrompt(e.target.checked), style: { accentColor: "var(--gold)", width: 14, height: 14 } }),
                "Add Custom Data"
              ] })
            ] }),
            useCustomPrompt && /* @__PURE__ */ jsxs("div", { style: { border: "2px solid var(--gold)", borderRadius: 10, overflow: "hidden" }, children: [
              /* @__PURE__ */ jsx("div", { style: { background: "rgba(201,151,58,0.1)", padding: "7px 12px", fontSize: "0.7rem", color: "var(--gold)", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }, children: /* @__PURE__ */ jsxs("span", { children: [
                "⚡ ACTIVE — Your custom data will be added to the ",
                (selectedType == null ? void 0 : selectedType.label) || "selected",
                " instructions"
              ] }) }),
              /* @__PURE__ */ jsx(
                "textarea",
                {
                  id: "mb-custom-prompt",
                  className: "form-input",
                  rows: 16,
                  value: customPrompt,
                  onChange: (e) => setCustomPrompt(e.target.value),
                  placeholder: `Write your exact instructions here. For example:

Write a 2000-word article about [movie] focusing on:
• The director's unique visual style
• How the film compares to [specific film]
• Specific scenes that stand out
• The cultural impact on Odisha

The article should be written in a conversational tone for a young Odia audience.`,
                  style: { resize: "vertical", fontSize: "0.82rem", lineHeight: 1.7, fontFamily: "monospace", border: "none", borderRadius: 0, borderTop: "1px solid var(--border)" }
                }
              )
            ] }),
            !useCustomPrompt && /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.78rem", color: "var(--muted)", padding: "10px 14px", background: "var(--bg3)", borderRadius: 10, border: "1px solid var(--border)" }, children: [
              'Enable "Add Custom Data" above to paste your theatre lists, Box Office numbers, or specific instructions. It will be combined with the ',
              /* @__PURE__ */ jsx("strong", { children: (selectedType == null ? void 0 : selectedType.label) || "selected" }),
              " topic automatically."
            ] })
          ] }),
          researchLoading && researchStage && /* @__PURE__ */ jsx(StageProgress, { stage: researchStage, stages: PROGRESS_STAGES }),
          generating && genStage && genStage !== "done" && /* @__PURE__ */ jsx(StageProgress, { stage: genStage, stages: GEN_STAGES }),
          generatedHTML && /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }, children: [
            /* @__PURE__ */ jsx("div", { style: { display: "flex", borderBottom: "1px solid var(--border)", background: "var(--bg3)", overflowX: "auto" }, children: [["editor", "📝 HTML"], ["seo", "🔍 SEO"], ["preview", "👁 Preview"], ["history", `⏳ History${logs.length > 0 ? ` (${logs.length})` : ""}`]].map(([key, label]) => /* @__PURE__ */ jsx("button", { onClick: () => setActiveTab(key), style: { padding: "11px 16px", border: "none", background: "none", cursor: "pointer", fontSize: "0.78rem", fontWeight: activeTab === key ? 800 : 500, color: activeTab === key ? "var(--gold)" : "var(--muted)", borderBottom: activeTab === key ? "2px solid var(--gold)" : "2px solid transparent", fontFamily: "inherit", whiteSpace: "nowrap" }, children: label }, key)) }),
            /* @__PURE__ */ jsxs("div", { style: { padding: "18px 20px" }, children: [
              activeTab === "editor" && /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: 10 }, children: [
                  /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.72rem", color: "var(--muted)" }, children: [
                    "~",
                    wordCount(generatedHTML.replace(/<[^>]+>/g, " ")),
                    " words · ",
                    readTime(generatedHTML),
                    " min read"
                  ] }),
                  /* @__PURE__ */ jsx("button", { className: "btn btn-ghost btn-sm", style: { fontSize: "0.7rem" }, onClick: () => {
                    var _a2;
                    (_a2 = navigator.clipboard) == null ? void 0 : _a2.writeText(generatedHTML);
                    onToast == null ? void 0 : onToast("HTML copied!", "success");
                  }, children: "📋 Copy" })
                ] }),
                /* @__PURE__ */ jsx("textarea", { className: "form-input", rows: 26, value: generatedHTML, onChange: (e) => setGeneratedHTML(sanitize(e.target.value)), style: { resize: "vertical", fontSize: "0.77rem", fontFamily: "monospace", lineHeight: 1.6 } })
              ] }),
              activeTab === "seo" && /* @__PURE__ */ jsx(SEOPanel, { seo: seoData, onChange: setSeoData }),
              activeTab === "preview" && /* @__PURE__ */ jsx(ArticlePreview, { html: generatedHTML, movie: selectedMovie, seo: seoData }),
              activeTab === "history" && (logsLoading ? /* @__PURE__ */ jsx("div", { style: { textAlign: "center", padding: "28px", color: "var(--muted)" }, children: "Loading…" }) : /* @__PURE__ */ jsx(VersionHistory, { logs, onRestore: restoreVersion }))
            ] })
          ] }),
          !generatedHTML && logs.length > 0 && /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }, children: [
            /* @__PURE__ */ jsxs("div", { style: { padding: "13px 20px", borderBottom: "1px solid var(--border)", background: "var(--bg3)", fontWeight: 700, fontSize: "0.86rem" }, children: [
              "⏳ Previous Generations (",
              logs.length,
              ")"
            ] }),
            /* @__PURE__ */ jsx("div", { style: { padding: "18px 20px" }, children: /* @__PURE__ */ jsx(VersionHistory, { logs, onRestore: restoreVersion }) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 68 }, children: [
          /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px" }, children: [
            /* @__PURE__ */ jsx("h3", { style: { fontSize: "0.78rem", fontWeight: 800, marginBottom: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }, children: "Actions" }),
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 7 }, children: [
              /* @__PURE__ */ jsx("button", { id: "mb-research-btn", className: "btn btn-outline btn-sm", onClick: runResearch, disabled: !selectedMovie || researchLoading || generating, style: { justifyContent: "center", width: "100%" }, children: researchLoading ? "🔍 Researching…" : "🔍 Run Research (≥90%)" }),
              confidence > 0 && confidence < 90 && /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.68rem", color: "#e05555", textAlign: "center", padding: "4px 0" }, children: [
                "⚠ ",
                confidence,
                "% — Run research again to boost"
              ] }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  id: "mb-generate-btn",
                  onClick: generateArticle,
                  disabled: !selectedMovie || generating,
                  style: { width: "100%", padding: "11px 0", borderRadius: 10, border: "none", cursor: !selectedMovie || generating ? "not-allowed" : "pointer", background: !selectedMovie || generating ? "rgba(201,151,58,0.2)" : "var(--gold)", color: "#000", fontWeight: 800, fontSize: "0.88rem", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s" },
                  children: generating ? "⚙ Generating…" : `⚡ Generate ${selectedType.emoji}`
                }
              ),
              generatedHTML && /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx("button", { id: "mb-regenerate-btn", className: "btn btn-outline btn-sm", onClick: generateArticle, disabled: generating, style: { width: "100%", justifyContent: "center" }, children: "🔄 Regenerate" }),
                /* @__PURE__ */ jsx("div", { style: { height: 1, background: "var(--border)", margin: "2px 0" } }),
                /* @__PURE__ */ jsx("button", { id: "mb-preview-btn", className: "btn btn-ghost btn-sm", onClick: () => setActiveTab("preview"), style: { width: "100%", justifyContent: "center" }, children: "👁 Preview" }),
                /* @__PURE__ */ jsx("button", { id: "mb-draft-btn", className: "btn btn-ghost btn-sm", onClick: saveDraft, disabled: publishing, style: { width: "100%", justifyContent: "center" }, children: publishing ? "Saving…" : "💾 Save Draft" }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    id: "mb-publish-btn",
                    onClick: publishArticle,
                    disabled: publishing || !pubTitle,
                    style: { width: "100%", padding: "11px 0", borderRadius: 10, border: "none", cursor: publishing || !pubTitle ? "not-allowed" : "pointer", background: publishing || !pubTitle ? "rgba(76,175,130,0.2)" : "#4caf82", color: "#000", fontWeight: 800, fontSize: "0.86rem", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 },
                    children: publishing ? "Publishing…" : "✅ Approve & Publish"
                  }
                ),
                /* @__PURE__ */ jsx("button", { id: "mb-cancel-btn", className: "btn btn-ghost btn-sm", onClick: () => {
                  setGeneratedHTML("");
                  setSeoData({});
                  setLogId(null);
                  setGenStage("");
                  setActiveTab("editor");
                }, style: { width: "100%", justifyContent: "center", color: "var(--muted)" }, children: "✕ Clear" })
              ] })
            ] })
          ] }),
          (confidence > 0 || research) && /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px", textAlign: "center" }, children: [
            /* @__PURE__ */ jsx("div", { style: { fontSize: "0.78rem", fontWeight: 800, marginBottom: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }, children: "Research Confidence" }),
            /* @__PURE__ */ jsx(ConfidenceRing, { value: confidence }),
            /* @__PURE__ */ jsx("div", { style: { marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }, children: [["Sources", `${((_a = research == null ? void 0 : research.sources) == null ? void 0 : _a.length) || 0}`], ["Facts", `${((_b = research == null ? void 0 : research.facts) == null ? void 0 : _b.length) || 0}`], ["DB Fields", "Complete"], ...genTime > 0 ? [["Gen Time", fmtMs(genTime)]] : []].map(([k, v]) => /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", fontSize: "0.72rem" }, children: [
              /* @__PURE__ */ jsx("span", { style: { color: "var(--muted)" }, children: k }),
              /* @__PURE__ */ jsx("span", { style: { fontWeight: 700 }, children: v })
            ] }, k)) }),
            confidence < 90 && /* @__PURE__ */ jsx("div", { style: { marginTop: 12, padding: "8px 10px", background: "rgba(220,50,50,0.08)", border: "1px solid rgba(220,50,50,0.25)", borderRadius: 8, fontSize: "0.68rem", color: "#e05555", lineHeight: 1.5 }, children: '⚠ Research below 90% threshold. Click "Run Research" again to boost confidence before generating.' })
          ] }),
          generatedHTML && /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px" }, children: [
            /* @__PURE__ */ jsx("div", { style: { fontSize: "0.78rem", fontWeight: 800, marginBottom: 12, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }, children: "Publish Settings" }),
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 9 }, children: [
              [["Article Title", pubTitle, setPubTitle, false], ["URL Slug", pubSlug, (v) => setPubSlug(slugify(v)), false], ["Cover Image URL", pubCover, setPubCover, false], ["Author", pubAuthor, setPubAuthor, false]].map(([label, val, setter, multi]) => /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { style: { fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 3 }, children: label }),
                /* @__PURE__ */ jsx("input", { className: "form-input", value: val, onChange: (e) => setter(e.target.value), style: { fontSize: "0.78rem" } })
              ] }, label)),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { style: { fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 3 }, children: "Excerpt" }),
                /* @__PURE__ */ jsx("textarea", { rows: 2, className: "form-input", value: pubExcerpt, onChange: (e) => setPubExcerpt(e.target.value), style: { resize: "vertical", fontSize: "0.78rem" } })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("label", { style: { fontSize: "0.62rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted)", display: "block", marginBottom: 3 }, children: "Category" }),
                /* @__PURE__ */ jsx("select", { className: "form-input", value: pubCategory, onChange: (e) => setPubCategory(e.target.value), style: { fontSize: "0.78rem" }, children: BLOG_CATEGORIES.map((c) => /* @__PURE__ */ jsx("option", { value: c, children: c }, c)) })
              ] }),
              /* @__PURE__ */ jsxs("label", { style: { display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: "0.8rem" }, children: [
                /* @__PURE__ */ jsx("input", { type: "checkbox", checked: pubFeatured, onChange: (e) => setPubFeatured(e.target.checked), style: { accentColor: "var(--gold)" } }),
                "Featured Article"
              ] })
            ] })
          ] }),
          !selectedMovie && /* @__PURE__ */ jsxs("div", { style: { background: "rgba(201,151,58,0.06)", border: "1px solid rgba(201,151,58,0.18)", borderRadius: 14, padding: "16px 18px" }, children: [
            /* @__PURE__ */ jsx("div", { style: { fontSize: "0.8rem", fontWeight: 800, marginBottom: 10, color: "var(--gold)" }, children: "How it works" }),
            /* @__PURE__ */ jsx("ol", { style: { paddingLeft: 17, margin: 0, display: "flex", flexDirection: "column", gap: 7 }, children: ["Select a movie from the database", "Click Run Research (targets ≥90% confidence)", "Choose an article type or enter a custom prompt", "Click Generate Article", "Review HTML + SEO fields", "Preview in live site layout", "Approve & Publish"].map((s, i) => /* @__PURE__ */ jsx("li", { style: { fontSize: "0.76rem", color: "var(--muted)", lineHeight: 1.5 }, children: s }, i)) })
          ] })
        ] })
      ] })
    ] })
  ] });
}
export {
  ModelBlogPanel as default
};
