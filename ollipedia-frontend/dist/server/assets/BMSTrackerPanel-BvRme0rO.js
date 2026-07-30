import { jsxs, jsx } from "react/jsx-runtime";
import React, { useState, useRef, useEffect } from "react";
import { g as getAdminToken, A as API } from "../entry-server.js";
import "react-dom/server";
import "react-router-dom/server.mjs";
import "react-helmet-async";
import "react-router-dom";
const BASE = "http://localhost:4000/api";
const fmtINR = (n) => {
  if (!n || isNaN(n)) return "—";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${Number(n).toLocaleString("en-IN")}`;
};
const fmtTime = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata"
  }) + " IST";
};
const pct = (sold, total) => total > 0 ? Math.round(sold / total * 100) : 0;
const OccBar = ({ val }) => {
  const color = val >= 70 ? "#4caf50" : val >= 40 ? "#f0a500" : "#e87a6a";
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
    /* @__PURE__ */ jsx("div", { style: { flex: 1, height: 6, background: "var(--bg3)", borderRadius: 4, overflow: "hidden" }, children: /* @__PURE__ */ jsx("div", { style: {
      width: `${val}%`,
      height: "100%",
      background: color,
      borderRadius: 4,
      transition: "width 0.4s"
    } }) }),
    /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.78rem", fontWeight: 700, color, minWidth: 36 }, children: [
      val,
      "%"
    ] })
  ] });
};
const CORS_PROXY = "https://api.allorigins.win/get?url=";
function extractEventCode(url) {
  const m = url.match(/\/(ET\d{8})/i);
  return m ? m[1] : null;
}
async function fetchShowtimesForCity(eventCode, regionCode, regionName) {
  const bmsUrl = `https://in.bookmyshow.com/api/movies-data/showtimes-by-event?EventCode=${eventCode}&RegionCode=${regionCode}&ShowDate=&PageCount=10&withHits=true`;
  const proxyUrl = `${CORS_PROXY}${encodeURIComponent(bmsUrl)}`;
  const res = await fetch(proxyUrl, { timeout: 15e3 });
  const json = await res.json();
  const data = JSON.parse(json.contents || "{}");
  const shows = data.ShowDetails || data.shows || [];
  const theatreMap = {};
  for (const show of shows) {
    const venueName = show.VenueName || show.venue_name || "Unknown Theatre";
    const venueAddr = show.VenueAddress || show.venue_address || "";
    const time = show.ShowTime || show.show_time || "";
    const totalSeats = Number(show.TotalSeatsCount || show.total_seats || 0);
    const available = Number(show.AvailableSeatsCount || show.available_seats || 0);
    const sold = totalSeats - available;
    if (!theatreMap[venueName]) {
      theatreMap[venueName] = {
        name: venueName,
        location: venueAddr,
        shows: 0,
        totalSeats: 0,
        soldSeats: 0,
        showList: []
      };
    }
    theatreMap[venueName].shows++;
    theatreMap[venueName].totalSeats += totalSeats;
    theatreMap[venueName].soldSeats += sold;
    theatreMap[venueName].showList.push({ time, totalSeats, available, sold });
  }
  const theatres = Object.values(theatreMap);
  const cityTotal = theatres.reduce((a, t) => ({
    shows: a.shows + t.shows,
    totalSeats: a.totalSeats + t.totalSeats,
    soldSeats: a.soldSeats + t.soldSeats
  }), { shows: 0, totalSeats: 0, soldSeats: 0 });
  return {
    name: regionName,
    shows: cityTotal.shows,
    totalSeats: cityTotal.totalSeats,
    soldSeats: cityTotal.soldSeats,
    theatres
  };
}
const BMS_REGIONS = [
  { code: "BBI", name: "Bhubaneswar" },
  { code: "CUT", name: "Cuttack" },
  { code: "BBSR", name: "Berhampur" },
  { code: "ROU", name: "Rourkela" },
  { code: "SMBL", name: "Sambalpur" },
  { code: "BOM", name: "Mumbai" },
  { code: "NCR", name: "Delhi NCR" },
  { code: "BNG", name: "Bengaluru" },
  { code: "HYD", name: "Hyderabad" },
  { code: "CHN", name: "Chennai" },
  { code: "KOL", name: "Kolkata" },
  { code: "PUN", name: "Pune" }
];
function BMSTrackerPanel({ movies = [], onToast }) {
  const [selMovieId, setSelMovieId] = useState("");
  const [bmsUrl, setBmsUrl] = useState("");
  const [avgTicket, setAvgTicket] = useState(200);
  const [selRegions, setSelRegions] = useState(["BBI", "CUT", "BOM", "NCR", "KOL"]);
  const [fetching, setFetching] = useState(false);
  const [fetchLog, setFetchLog] = useState([]);
  const [liveData, setLiveData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [sessLoading, setSessLoading] = useState(false);
  const [expandSnap, setExpandSnap] = useState(null);
  const [expandCity, setExpandCity] = useState(null);
  const [pushDay, setPushDay] = useState("");
  const [pushing, setPushing] = useState(false);
  const logRef = useRef(null);
  useEffect(() => {
    if (!selMovieId) {
      setSessions([]);
      return;
    }
    loadSessions(selMovieId);
  }, [selMovieId]);
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [fetchLog]);
  const log = (msg) => setFetchLog((p) => [...p, `[${(/* @__PURE__ */ new Date()).toLocaleTimeString("en-IN")}] ${msg}`]);
  const loadSessions = async (movieId) => {
    setSessLoading(true);
    try {
      const token = getAdminToken();
      const res = await fetch(`${BASE}/admin/tracker/sessions/${movieId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setSessions(await res.json());
    } catch {
    }
    setSessLoading(false);
  };
  const toggleRegion = (code) => {
    setSelRegions((p) => p.includes(code) ? p.filter((c) => c !== code) : [...p, code]);
  };
  const handleFetch = async () => {
    if (!selMovieId) {
      onToast == null ? void 0 : onToast("Select a movie first", "error");
      return;
    }
    if (!bmsUrl.trim()) {
      onToast == null ? void 0 : onToast("Paste the BookMyShow URL", "error");
      return;
    }
    if (selRegions.length === 0) {
      onToast == null ? void 0 : onToast("Select at least one city", "error");
      return;
    }
    const eventCode = extractEventCode(bmsUrl);
    if (!eventCode) {
      onToast == null ? void 0 : onToast("Could not find EventCode in URL. Make sure it's a BMS movie URL like in.bookmyshow.com/movies/title/ET00XXXXXX", "error");
      return;
    }
    setFetching(true);
    setLiveData(null);
    setFetchLog([]);
    log(`Event code: ${eventCode}`);
    log(`Fetching ${selRegions.length} cities...`);
    const cities = [];
    for (const region of BMS_REGIONS.filter((r) => selRegions.includes(r.code))) {
      log(`Fetching ${region.name}...`);
      try {
        const cityData = await fetchShowtimesForCity(eventCode, region.code, region.name);
        if (cityData.shows > 0) {
          cityData.estCollection = cityData.soldSeats * avgTicket;
          cityData.theatres = cityData.theatres.map((t) => ({
            ...t,
            estCollection: t.soldSeats * avgTicket
          }));
          cities.push(cityData);
          log(`✅ ${region.name}: ${cityData.shows} shows, ${cityData.soldSeats}/${cityData.totalSeats} seats sold (${pct(cityData.soldSeats, cityData.totalSeats)}%)`);
        } else {
          log(`⚪ ${region.name}: no shows found`);
        }
      } catch (e) {
        log(`❌ ${region.name}: ${e.message}`);
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    const totals = cities.reduce((a, c) => ({
      shows: a.shows + c.shows,
      totalSeats: a.totalSeats + c.totalSeats,
      soldSeats: a.soldSeats + c.soldSeats,
      estCollection: a.estCollection + c.estCollection
    }), { shows: 0, totalSeats: 0, soldSeats: 0, estCollection: 0 });
    totals.occupancy = pct(totals.soldSeats, totals.totalSeats);
    setLiveData({ cities, totals });
    log(`─── Done. ${cities.length} cities with shows. Overall: ${totals.occupancy}% occupancy`);
    setFetching(false);
  };
  const handleSave = async () => {
    if (!liveData) return;
    setSaving(true);
    try {
      const token = getAdminToken();
      const res = await fetch(`${BASE}/admin/tracker/save-snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          movieId: selMovieId,
          bmsUrl,
          cities: liveData.cities,
          status: "done"
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      onToast == null ? void 0 : onToast("✅ Snapshot saved!", "success");
      loadSessions(selMovieId);
    } catch (e) {
      onToast == null ? void 0 : onToast(e.message, "error");
    }
    setSaving(false);
  };
  const handlePushDay = async () => {
    if (!liveData || !pushDay) {
      onToast == null ? void 0 : onToast("Enter a day number", "error");
      return;
    }
    setPushing(true);
    try {
      const coll = fmtINR(liveData.totals.estCollection);
      await API.adminAddBoxOfficeDay(selMovieId, {
        day: Number(pushDay),
        net: coll,
        gross: fmtINR(Math.round(liveData.totals.estCollection * 1.18)),
        note: `BMS occupancy: ${liveData.totals.occupancy}% · ${liveData.totals.soldSeats}/${liveData.totals.totalSeats} seats · avg ₹${avgTicket}/ticket`,
        date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)
      });
      onToast == null ? void 0 : onToast(`✅ Pushed to Day ${pushDay}!`, "success");
    } catch (e) {
      onToast == null ? void 0 : onToast(`❌ ${e.message}`, "error");
    }
    setPushing(false);
  };
  const openSnapshot = async (id) => {
    if ((expandSnap == null ? void 0 : expandSnap._id) === id) {
      setExpandSnap(null);
      return;
    }
    try {
      const token = getAdminToken();
      const res = await fetch(`${BASE}/admin/tracker/snapshot/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setExpandSnap(await res.json());
    } catch {
    }
  };
  const deleteSnapshot = async (id) => {
    try {
      const token = getAdminToken();
      await fetch(`${BASE}/admin/tracker/snapshot/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions((p) => p.filter((s) => s._id !== id));
      if ((expandSnap == null ? void 0 : expandSnap._id) === id) setExpandSnap(null);
      onToast == null ? void 0 : onToast("Snapshot deleted");
    } catch (e) {
      onToast == null ? void 0 : onToast(e.message, "error");
    }
  };
  movies.find((m) => m._id === selMovieId);
  return /* @__PURE__ */ jsxs("div", { style: { padding: "24px 28px 48px", maxWidth: 1100 }, children: [
    /* @__PURE__ */ jsxs("div", { style: { marginBottom: 28 }, children: [
      /* @__PURE__ */ jsxs("h2", { style: {
        fontSize: "1.4rem",
        fontWeight: 900,
        margin: 0,
        display: "flex",
        alignItems: "center",
        gap: 12
      }, children: [
        /* @__PURE__ */ jsx("span", { children: "🎟" }),
        " BMS Occupancy Tracker"
      ] }),
      /* @__PURE__ */ jsx("p", { style: { color: "var(--muted)", fontSize: "0.82rem", margin: "6px 0 0" }, children: "Fetch live seat availability from BookMyShow → calculate occupancy → estimate collection → push to Box Office Days" })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: {
      background: "var(--bg2)",
      border: "1px solid var(--border)",
      borderRadius: 12,
      padding: "20px 22px",
      marginBottom: 24
    }, children: [
      /* @__PURE__ */ jsx("div", { style: {
        fontSize: "0.7rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color: "var(--muted)",
        marginBottom: 14
      }, children: "Step 1 — Configure" }),
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }, children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("label", { style: labelSt, children: "Movie" }),
          /* @__PURE__ */ jsxs(
            "select",
            {
              value: selMovieId,
              onChange: (e) => setSelMovieId(e.target.value),
              style: inputSt,
              children: [
                /* @__PURE__ */ jsx("option", { value: "", children: "— Select a movie —" }),
                movies.filter((m) => m.status !== "Upcoming" || true).map((m) => {
                  var _a;
                  return /* @__PURE__ */ jsxs("option", { value: m._id, children: [
                    m.title,
                    " (",
                    ((_a = m.releaseDate) == null ? void 0 : _a.slice(0, 4)) || "—",
                    ")"
                  ] }, m._id);
                })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("label", { style: labelSt, children: [
            "Avg Ticket Price (₹) ",
            /* @__PURE__ */ jsx("span", { style: { color: "var(--muted)", fontWeight: 400 }, children: "used for collection estimate" })
          ] }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "number",
              value: avgTicket,
              min: 50,
              max: 2e3,
              onChange: (e) => setAvgTicket(Number(e.target.value)),
              style: { ...inputSt, width: "100%" }
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { marginBottom: 16 }, children: [
        /* @__PURE__ */ jsx("label", { style: labelSt, children: "BookMyShow Movie URL" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            type: "text",
            value: bmsUrl,
            onChange: (e) => setBmsUrl(e.target.value),
            placeholder: "https://in.bookmyshow.com/movies/movie-name/ET00XXXXXX",
            style: { ...inputSt, width: "100%" }
          }
        ),
        /* @__PURE__ */ jsx("div", { style: { fontSize: "0.7rem", color: "var(--muted)", marginTop: 4 }, children: "Open the movie on BMS → copy the URL from the address bar → paste here" })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { marginBottom: 18 }, children: [
        /* @__PURE__ */ jsx("label", { style: labelSt, children: "Cities to scan" }),
        /* @__PURE__ */ jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 8 }, children: BMS_REGIONS.map((r) => /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => toggleRegion(r.code),
            style: {
              padding: "5px 12px",
              borderRadius: 8,
              fontSize: "0.77rem",
              fontWeight: 700,
              border: selRegions.includes(r.code) ? "1px solid rgba(201,151,58,0.6)" : "1px solid var(--border)",
              background: selRegions.includes(r.code) ? "rgba(201,151,58,0.12)" : "var(--bg3)",
              color: selRegions.includes(r.code) ? "var(--gold)" : "var(--muted)",
              cursor: "pointer"
            },
            children: r.name
          },
          r.code
        )) })
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: handleFetch,
          disabled: fetching || !selMovieId || !bmsUrl,
          style: {
            background: fetching ? "var(--bg3)" : "rgba(201,151,58,0.14)",
            border: "1px solid rgba(201,151,58,0.5)",
            borderRadius: 8,
            color: "var(--gold)",
            fontWeight: 800,
            fontSize: "0.88rem",
            padding: "10px 24px",
            cursor: fetching || !selMovieId || !bmsUrl ? "not-allowed" : "pointer"
          },
          children: fetching ? "⏳ Fetching…" : "▶ Fetch Occupancy"
        }
      )
    ] }),
    fetchLog.length > 0 && /* @__PURE__ */ jsx("div", { ref: logRef, style: {
      background: "#0a0a0a",
      border: "1px solid var(--border)",
      borderRadius: 10,
      padding: "12px 16px",
      fontFamily: "monospace",
      fontSize: "0.73rem",
      color: "#a0e0a0",
      maxHeight: 160,
      overflowY: "auto",
      marginBottom: 24
    }, children: fetchLog.map((l, i) => /* @__PURE__ */ jsx("div", { children: l }, i)) }),
    liveData && /* @__PURE__ */ jsxs("div", { style: { marginBottom: 28 }, children: [
      /* @__PURE__ */ jsx("div", { style: {
        fontSize: "0.7rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color: "var(--muted)",
        marginBottom: 14
      }, children: "Step 2 — Results" }),
      /* @__PURE__ */ jsx("div", { style: {
        display: "grid",
        gridTemplateColumns: "repeat(5,1fr)",
        gap: 12,
        marginBottom: 20
      }, children: [
        ["🎭", "Cities", liveData.cities.length],
        ["🏛", "Theatres", liveData.cities.reduce((a, c) => a + c.theatres.length, 0)],
        ["🎬", "Shows", liveData.totals.shows],
        ["💺", "Occupancy", `${liveData.totals.occupancy}%`],
        ["💰", "Est. Collection", fmtINR(liveData.totals.estCollection)]
      ].map(([icon, label, val]) => /* @__PURE__ */ jsxs("div", { style: {
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "14px 16px"
      }, children: [
        /* @__PURE__ */ jsxs("div", { style: {
          fontSize: "0.68rem",
          color: "var(--muted)",
          fontWeight: 700,
          textTransform: "uppercase",
          marginBottom: 6
        }, children: [
          icon,
          " ",
          label
        ] }),
        /* @__PURE__ */ jsx("div", { style: { fontSize: "1.1rem", fontWeight: 900, color: label === "Est. Collection" ? "var(--gold)" : label === "Occupancy" ? liveData.totals.occupancy >= 70 ? "#4caf50" : liveData.totals.occupancy >= 40 ? "#f0a500" : "#e87a6a" : "var(--text)" }, children: val })
      ] }, label)) }),
      /* @__PURE__ */ jsx("div", { style: {
        background: "var(--bg2)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 20
      }, children: /* @__PURE__ */ jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }, children: [
        /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsx("tr", { style: { background: "var(--bg3)" }, children: ["City", "Shows", "Seats", "Sold", "Occupancy", "Est. Collection", ""].map((h) => /* @__PURE__ */ jsx("th", { style: {
          padding: "11px 14px",
          textAlign: "left",
          fontSize: "0.64rem",
          color: "var(--muted)",
          fontWeight: 700,
          textTransform: "uppercase",
          borderBottom: "1px solid var(--border)"
        }, children: h }, h)) }) }),
        /* @__PURE__ */ jsx("tbody", { children: liveData.cities.map((city) => /* @__PURE__ */ jsxs(React.Fragment, { children: [
          /* @__PURE__ */ jsxs(
            "tr",
            {
              style: { borderBottom: "1px solid var(--border)", cursor: "pointer" },
              onClick: () => setExpandCity(expandCity === city.name ? null : city.name),
              children: [
                /* @__PURE__ */ jsxs("td", { style: { padding: "11px 14px", fontWeight: 800 }, children: [
                  expandCity === city.name ? "▾" : "▸",
                  " ",
                  city.name
                ] }),
                /* @__PURE__ */ jsx("td", { style: { padding: "11px 14px" }, children: city.shows }),
                /* @__PURE__ */ jsx("td", { style: { padding: "11px 14px" }, children: city.totalSeats.toLocaleString("en-IN") }),
                /* @__PURE__ */ jsx("td", { style: { padding: "11px 14px", color: "#4caf50", fontWeight: 700 }, children: city.soldSeats.toLocaleString("en-IN") }),
                /* @__PURE__ */ jsx("td", { style: { padding: "11px 14px", minWidth: 140 }, children: /* @__PURE__ */ jsx(OccBar, { val: pct(city.soldSeats, city.totalSeats) }) }),
                /* @__PURE__ */ jsx("td", { style: { padding: "11px 14px", fontWeight: 700, color: "var(--gold)" }, children: fmtINR(city.estCollection) }),
                /* @__PURE__ */ jsxs("td", { style: { padding: "11px 14px", fontSize: "0.7rem", color: "var(--muted)" }, children: [
                  city.theatres.length,
                  " theatres"
                ] })
              ]
            }
          ),
          expandCity === city.name && city.theatres.map((th) => /* @__PURE__ */ jsxs("tr", { style: {
            background: "var(--bg3)",
            borderBottom: "1px solid var(--border)"
          }, children: [
            /* @__PURE__ */ jsxs("td", { style: {
              padding: "9px 14px 9px 28px",
              color: "var(--muted)",
              fontSize: "0.78rem"
            }, children: [
              "↳ ",
              th.name
            ] }),
            /* @__PURE__ */ jsx("td", { style: { padding: "9px 14px", fontSize: "0.78rem" }, children: th.shows }),
            /* @__PURE__ */ jsx("td", { style: { padding: "9px 14px", fontSize: "0.78rem" }, children: th.totalSeats }),
            /* @__PURE__ */ jsx("td", { style: { padding: "9px 14px", fontSize: "0.78rem", color: "#4caf50" }, children: th.soldSeats }),
            /* @__PURE__ */ jsx("td", { style: { padding: "9px 14px", minWidth: 140 }, children: /* @__PURE__ */ jsx(OccBar, { val: pct(th.soldSeats, th.totalSeats) }) }),
            /* @__PURE__ */ jsx("td", { style: { padding: "9px 14px", fontSize: "0.78rem", color: "var(--gold)" }, children: fmtINR(th.estCollection) }),
            /* @__PURE__ */ jsx("td", { style: { padding: "9px 14px", fontSize: "0.7rem", color: "var(--muted)" }, children: th.location })
          ] }, th.name))
        ] }, city.name)) })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleSave,
            disabled: saving,
            style: {
              background: "rgba(76,175,80,0.12)",
              border: "1px solid rgba(76,175,80,0.4)",
              borderRadius: 8,
              color: "#4caf50",
              fontWeight: 800,
              fontSize: "0.85rem",
              padding: "10px 22px",
              cursor: saving ? "not-allowed" : "pointer"
            },
            children: saving ? "💾 Saving…" : "💾 Save Snapshot to DB"
          }
        ),
        /* @__PURE__ */ jsxs("div", { style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "8px 14px"
        }, children: [
          /* @__PURE__ */ jsx("span", { style: { fontSize: "0.78rem", color: "var(--muted)", fontWeight: 600 }, children: "Push est. collection to:" }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "number",
              min: 1,
              max: 99,
              placeholder: "Day #",
              value: pushDay,
              onChange: (e) => setPushDay(e.target.value),
              style: { width: 64, ...inputSt, padding: "5px 8px" }
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: handlePushDay,
              disabled: pushing || !pushDay,
              style: {
                background: "rgba(201,151,58,0.14)",
                border: "1px solid rgba(201,151,58,0.4)",
                borderRadius: 6,
                color: "var(--gold)",
                fontWeight: 800,
                fontSize: "0.78rem",
                padding: "6px 14px",
                cursor: !pushDay || pushing ? "not-allowed" : "pointer"
              },
              children: pushing ? "Pushing…" : "→ Box Office Days"
            }
          )
        ] })
      ] })
    ] }),
    selMovieId && /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("div", { style: {
        fontSize: "0.7rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color: "var(--muted)",
        marginBottom: 14,
        display: "flex",
        alignItems: "center",
        gap: 10
      }, children: [
        "Snapshot History",
        sessLoading && /* @__PURE__ */ jsx("span", { style: { fontWeight: 400, color: "var(--muted)" }, children: "Loading…" }),
        !sessLoading && sessions.length > 0 && /* @__PURE__ */ jsxs("span", { style: { fontWeight: 400 }, children: [
          "(",
          sessions.length,
          " snapshots)"
        ] })
      ] }),
      sessions.length === 0 && !sessLoading && /* @__PURE__ */ jsx("div", { style: { color: "var(--muted)", fontSize: "0.82rem" }, children: "No snapshots yet for this movie." }),
      /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: sessions.map((s) => /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("div", { style: {
          background: "var(--bg2)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "14px 18px",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          cursor: "pointer"
        }, onClick: () => openSnapshot(s._id), children: [
          /* @__PURE__ */ jsx("span", { style: { fontSize: "0.78rem", color: "var(--muted)", minWidth: 160 }, children: fmtTime(s.runAt) }),
          /* @__PURE__ */ jsxs("span", { style: { fontWeight: 700 }, children: [
            s.cityCount,
            " cities · ",
            s.theatreCount,
            " theatres · ",
            s.totalShows,
            " shows"
          ] }),
          /* @__PURE__ */ jsxs("span", { style: {
            color: s.avgOccupancy >= 70 ? "#4caf50" : s.avgOccupancy >= 40 ? "#f0a500" : "#e87a6a",
            fontWeight: 800
          }, children: [
            s.avgOccupancy,
            "% occ."
          ] }),
          /* @__PURE__ */ jsx("span", { style: { color: "var(--gold)", fontWeight: 800 }, children: fmtINR(s.estCollection) }),
          /* @__PURE__ */ jsx("div", { style: { flex: 1 } }),
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: (e) => {
                e.stopPropagation();
                deleteSnapshot(s._id);
              },
              style: {
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#e87a6a",
                fontSize: "0.75rem",
                padding: "4px 8px"
              },
              children: "🗑 Delete"
            }
          ),
          /* @__PURE__ */ jsx("span", { style: { color: "var(--muted)", fontSize: "0.75rem" }, children: (expandSnap == null ? void 0 : expandSnap._id) === s._id ? "▲ Hide" : "▼ Expand" })
        ] }),
        (expandSnap == null ? void 0 : expandSnap._id) === s._id && /* @__PURE__ */ jsx("div", { style: {
          background: "var(--bg3)",
          border: "1px solid var(--border)",
          borderTop: "none",
          borderRadius: "0 0 10px 10px",
          padding: "16px 18px"
        }, children: (expandSnap.cities || []).map((city) => /* @__PURE__ */ jsxs("div", { style: { marginBottom: 14 }, children: [
          /* @__PURE__ */ jsxs("div", { style: {
            fontWeight: 800,
            fontSize: "0.85rem",
            marginBottom: 6,
            display: "flex",
            gap: 12,
            alignItems: "center"
          }, children: [
            /* @__PURE__ */ jsx("span", { children: city.name }),
            /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.72rem", color: "var(--muted)", fontWeight: 600 }, children: [
              city.shows,
              " shows · ",
              city.soldSeats,
              "/",
              city.totalSeats,
              " seats"
            ] }),
            /* @__PURE__ */ jsx(OccBar, { val: city.occupancy }),
            /* @__PURE__ */ jsx("span", { style: { color: "var(--gold)", fontSize: "0.78rem", fontWeight: 700 }, children: fmtINR(city.estCollection) })
          ] }),
          (city.theatres || []).map((th) => /* @__PURE__ */ jsxs("div", { style: {
            display: "flex",
            gap: 10,
            fontSize: "0.75rem",
            color: "var(--muted)",
            padding: "4px 0 4px 16px",
            borderBottom: "1px solid var(--border)",
            alignItems: "center"
          }, children: [
            /* @__PURE__ */ jsxs("span", { style: { flex: 1 }, children: [
              "↳ ",
              th.name
            ] }),
            /* @__PURE__ */ jsxs("span", { children: [
              th.shows,
              " shows"
            ] }),
            /* @__PURE__ */ jsxs("span", { children: [
              th.soldSeats,
              "/",
              th.totalSeats
            ] }),
            /* @__PURE__ */ jsx("span", { style: { minWidth: 100 }, children: /* @__PURE__ */ jsx(OccBar, { val: th.occupancy }) }),
            /* @__PURE__ */ jsx("span", { style: { color: "var(--gold)" }, children: fmtINR(th.estCollection) })
          ] }, th.name))
        ] }, city.name)) })
      ] }, s._id)) })
    ] })
  ] });
}
const labelSt = {
  display: "block",
  fontSize: "0.7rem",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--muted)",
  marginBottom: 6
};
const inputSt = {
  background: "var(--bg3)",
  border: "1px solid var(--border)",
  borderRadius: 7,
  color: "var(--text)",
  padding: "9px 12px",
  fontSize: "0.85rem",
  width: "100%",
  boxSizing: "border-box",
  outline: "none"
};
export {
  BMSTrackerPanel as default
};
