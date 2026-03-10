import React, { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API, getToken } from "../api/api";
import { MovieCard, SafeImg } from "../components/UI";

const NAV = [
  { key: "overview",       icon: "⬛", label: "Overview"       },
  { key: "films",          icon: "🎬", label: "My Films"       },
  { key: "collaborations", icon: "🤝", label: "Collaborations" },
  { key: "cast",           icon: "👤", label: "Cast & Crew"    },
  { key: "songs",          icon: "🎵", label: "Songs"          },
  { key: "settings",       icon: "⚙️",  label: "Settings"       },
];

function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div className="portal-stat-card">
      <div className="portal-stat-icon" style={{ background: accent || "rgba(201,151,58,0.12)" }}>
        {icon}
      </div>
      <div>
        <div className="portal-stat-val">{value}</div>
        <div className="portal-stat-label">{label}</div>
        {sub && <div className="portal-stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

function SettingsPanel({ production, onToast, onUpdate }) {
  const [form, setForm] = useState({
    name:     production.name     || "",
    bio:      production.bio      || "",
    logo:     production.logo     || "",
    banner:   production.banner   || "",
    website:  production.website  || "",
    location: production.location || "",
    founded:  production.founded  || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const updated = await API.updateProfile(form);
      onUpdate(updated);
      onToast("Profile updated!");
    } catch (e) {
      onToast(typeof e === "string" ? e : "Save failed", "error");
    } finally { setSaving(false); }
  };

  return (
    <div className="portal-settings">
      <div className="portal-section-header">
        <h2 className="portal-section-title">Production Settings</h2>
        <p className="portal-section-sub">Update your public profile and company details</p>
      </div>
      {form.banner && (
        <div style={{ width:"100%", height:140, borderRadius:8, overflow:"hidden", marginBottom:20, border:"1px solid var(--border)" }}>
          <img src={form.banner} alt="Banner" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>e.target.style.display="none"} />
        </div>
      )}
      <div className="portal-form-grid">
        <div className="form-group">
          <label className="form-label">Company Name</label>
          <input className="form-input" value={form.name} onChange={e => set("name", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Location</label>
          <input className="form-input" value={form.location} onChange={e => set("location", e.target.value)} placeholder="e.g. Bhubaneswar, Odisha" />
        </div>
        <div className="form-group">
          <label className="form-label">Founded Year</label>
          <input className="form-input" value={form.founded} onChange={e => set("founded", e.target.value)} placeholder="e.g. 2010" />
        </div>
        <div className="form-group">
          <label className="form-label">Website</label>
          <input className="form-input" value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://…" />
        </div>
        <div className="form-group" style={{ gridColumn:"1/-1" }}>
          <label className="form-label">Logo URL</label>
          <input className="form-input" value={form.logo} onChange={e => set("logo", e.target.value)} placeholder="https://…" />
        </div>
        <div className="form-group" style={{ gridColumn:"1/-1" }}>
          <label className="form-label">Banner URL</label>
          <input className="form-input" value={form.banner} onChange={e => set("banner", e.target.value)} placeholder="https://… (wide image)" />
        </div>
        <div className="form-group" style={{ gridColumn:"1/-1" }}>
          <label className="form-label">Bio / About</label>
          <textarea className="form-textarea" value={form.bio} onChange={e => set("bio", e.target.value)} style={{ minHeight:100 }} />
        </div>
      </div>
      <div style={{ display:"flex", gap:12 }}>
        <button className="btn btn-gold" onClick={save} disabled={saving}>{saving ? "Saving…" : "💾 Save Changes"}</button>
        <Link to={`/production/${production._id}`} className="btn btn-outline btn-sm" target="_blank">👁 View Public Profile</Link>
      </div>
    </div>
  );
}

export default function Dashboard({ production, onToast, onLogout, onProductionUpdate }) {
  const navigate     = useNavigate();
  const [movies,  setMovies]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("overview");
  const [sideOpen, setSideOpen] = useState(false);

  const load = useCallback(() => {
    if (!production || !getToken()) { navigate("/"); return; }
    API.getProductionMovies(production._id)
      .then(setMovies).catch(console.error).finally(() => setLoading(false));
  }, [production]);

  useEffect(() => { load(); }, [load]);

  if (!production || !getToken()) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", gap:16 }}>
      <h2>Not logged in</h2>
      <Link to="/" className="btn btn-gold">Go Home</Link>
    </div>
  );

  const myMovies     = movies.filter(m => String(m.productionId?._id) === String(production._id));
  const collabMovies = movies.filter(m => String(m.productionId?._id) !== String(production._id));
  const allSongs     = movies.flatMap(m => (m.media?.songs || []).map(s => ({ ...s, movieTitle: m.title, movieId: m._id })));
  const allCast      = [...new Map(movies.flatMap(m => m.cast || []).map(c => [String(c.castId), c])).values()];
  const hits         = myMovies.filter(m => ["Hit","Super Hit","Blockbuster"].includes(m.verdict)).length;
  const upcoming     = myMovies.filter(m => !m.verdict || m.verdict === "Upcoming").length;

  return (
    <div className="portal-layout">

      {/* ── TOP BAR ── */}
      <header className="portal-topbar">
        <div className="portal-topbar-left">
          <button className="portal-mobile-toggle" onClick={() => setSideOpen(o => !o)}>
            {sideOpen ? "✕" : "☰"}
          </button>
          <span className="portal-topbar-wordmark">OLLI<span>PEDIA</span></span>
          <span className="portal-topbar-badge">Production Portal</span>
        </div>
        <div className="portal-topbar-right">
          <span className="portal-topbar-user">
            {production.logo && <img src={production.logo} alt="" onError={e=>e.target.style.display="none"} />}
            {production.name}
          </span>
          <Link to="/" className="btn btn-ghost btn-sm">Public Site ↗</Link>
          <button className="btn btn-outline btn-sm" onClick={onLogout}>Logout</button>
        </div>
      </header>

      {/* ── BODY (sidebar + main) ── */}
      <div className="portal-body">

        {/* Sidebar */}
        <aside className={`portal-sidebar ${sideOpen ? "open" : ""}`} onClick={() => setSideOpen(false)}>
          <div className="portal-sidebar-brand">
            <div className="portal-sidebar-logo">
              {production.logo
                ? <img src={production.logo} alt="" onError={e=>e.target.style.display="none"} />
                : <span>{production.name[0]}</span>}
            </div>
            <div className="portal-sidebar-name">{production.name}</div>
          </div>

          <nav className="portal-nav" onClick={e => e.stopPropagation()}>
            {NAV.map(n => (
              <button key={n.key}
                className={`portal-nav-item ${tab === n.key ? "active" : ""}`}
                onClick={() => { setTab(n.key); setSideOpen(false); }}>
                <span className="portal-nav-icon">{n.icon}</span>
                <span className="portal-nav-label">{n.label}</span>
                {n.key === "films"          && myMovies.length > 0     && <span className="portal-nav-badge">{myMovies.length}</span>}
                {n.key === "collaborations" && collabMovies.length > 0 && <span className="portal-nav-badge">{collabMovies.length}</span>}
              </button>
            ))}
          </nav>

          <div className="portal-sidebar-footer">
            <Link to="/dashboard/add-movie" className="btn btn-gold" style={{ width:"100%", textAlign:"center", marginBottom:8 }}>+ Add Movie</Link>
            <Link to={`/production/${production._id}`} className="btn btn-outline btn-sm" style={{ width:"100%", textAlign:"center" }} target="_blank">Public Profile ↗</Link>
          </div>
        </aside>

        {/* Main */}
        <main className="portal-main">

          {/* OVERVIEW */}
          {tab === "overview" && (
            <>
              <div className="portal-page-header">
                <div>
                  <h1 className="portal-page-title">Welcome back, {production.name.split(" ")[0]} 👋</h1>
                  <p className="portal-page-sub">Here's your production house at a glance</p>
                </div>
                <Link to="/dashboard/add-movie" className="btn btn-gold">+ Add New Film</Link>
              </div>

              <div className="portal-stats-grid">
                <StatCard icon="🎬" label="Total Films"    value={myMovies.length}     sub={`${upcoming} upcoming`} />
                <StatCard icon="🏆" label="Hits"           value={hits}                sub="Hit / Super Hit / Blockbuster" accent="rgba(45,106,79,0.25)" />
                <StatCard icon="🤝" label="Collaborations" value={collabMovies.length} sub="as co-producer"         accent="rgba(58,90,138,0.25)" />
                <StatCard icon="👤" label="Cast & Crew"    value={allCast.length}      sub="across all films"       accent="rgba(106,58,106,0.25)" />
              </div>

              {myMovies.length > 0 && (
                <div className="portal-section">
                  <div className="portal-section-header">
                    <h2 className="portal-section-title">Recent Films</h2>
                    <button className="btn btn-ghost btn-sm" onClick={() => setTab("films")}>View All →</button>
                  </div>
                  <div className="movie-grid">
                    {myMovies.slice(0, 4).map(m => <MovieCard key={m._id} movie={m} />)}
                  </div>
                </div>
              )}

              <div className="portal-section">
                <div className="portal-section-header">
                  <h2 className="portal-section-title">Quick Actions</h2>
                </div>
                <div className="portal-actions-grid">
                  {[
                    { icon:"🎬", label:"Add New Film",     desc:"Register a new Odia film",           action:() => navigate("/dashboard/add-movie") },
                    { icon:"⚙️",  label:"Edit Profile",     desc:"Update your company details",         action:() => setTab("settings") },
                    { icon:"🎵", label:"All Songs",        desc:`${allSongs.length} songs in library`, action:() => setTab("songs") },
                    { icon:"👁", label:"View Public Page", desc:"See how fans see you",                action:() => window.open(`/production/${production._id}`, "_blank") },
                  ].map(a => (
                    <button key={a.label} className="portal-action-card" onClick={a.action}>
                      <span className="portal-action-icon">{a.icon}</span>
                      <div>
                        <div className="portal-action-label">{a.label}</div>
                        <div className="portal-action-desc">{a.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {myMovies.length === 0 && !loading && (
                <div className="portal-empty-hero">
                  <div className="portal-empty-icon">🎬</div>
                  <h2>Your filmography is empty</h2>
                  <p>Start building your portfolio by adding your first film.</p>
                  <Link to="/dashboard/add-movie" className="btn btn-gold" style={{ marginTop:20 }}>+ Add Your First Film</Link>
                </div>
              )}
            </>
          )}

          {/* MY FILMS */}
          {tab === "films" && (
            <>
              <div className="portal-page-header">
                <div>
                  <h1 className="portal-page-title">My Films</h1>
                  <p className="portal-page-sub">{myMovies.length} film{myMovies.length !== 1 ? "s" : ""} in your portfolio</p>
                </div>
                <Link to="/dashboard/add-movie" className="btn btn-gold">+ Add Film</Link>
              </div>
              {loading ? (
                <div className="movie-grid">{[...Array(4)].map((_,i) => <div key={i} className="skeleton" style={{ aspectRatio:"2/3" }} />)}</div>
              ) : myMovies.length === 0 ? (
                <div className="portal-empty-hero">
                  <div className="portal-empty-icon">🎬</div>
                  <h2>No films yet</h2>
                  <Link to="/dashboard/add-movie" className="btn btn-gold" style={{ marginTop:20 }}>+ Add Film</Link>
                </div>
              ) : (
                <div className="movie-grid">{myMovies.map(m => <MovieCard key={m._id} movie={m} />)}</div>
              )}
            </>
          )}

          {/* COLLABORATIONS */}
          {tab === "collaborations" && (
            <>
              <div className="portal-page-header">
                <div>
                  <h1 className="portal-page-title">Collaborations</h1>
                  <p className="portal-page-sub">Films where {production.name} is a co-producer</p>
                </div>
              </div>
              {collabMovies.length === 0 ? (
                <div className="portal-empty-hero">
                  <div className="portal-empty-icon">🤝</div>
                  <h2>No collaborations yet</h2>
                  <p>When another production adds you as a collaborator, their films appear here.</p>
                </div>
              ) : (
                <div className="movie-grid">{collabMovies.map(m => <MovieCard key={m._id} movie={m} />)}</div>
              )}
            </>
          )}

          {/* CAST */}
          {tab === "cast" && (
            <>
              <div className="portal-page-header">
                <div>
                  <h1 className="portal-page-title">Cast & Crew</h1>
                  <p className="portal-page-sub">{allCast.length} people across all your films</p>
                </div>
              </div>
              {allCast.length === 0 ? (
                <div className="portal-empty-hero">
                  <div className="portal-empty-icon">👤</div>
                  <h2>No cast added yet</h2>
                  <p>Add cast members when creating or editing a film.</p>
                </div>
              ) : (
                <div className="cast-grid">
                  {allCast.map((c, i) => (
                    <div key={i} className="cast-card cast-card-linked" onClick={() => c.castId && navigate(`/cast/${c.castId}`)}>
                      <div className="cast-card-photo" style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
                        {c.photo
                          ? <img src={c.photo} alt={c.name} style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e=>e.target.style.display="none"} />
                          : <span style={{ fontSize:"1.8rem" }}>{c.type==="Director"?"🎬":c.type==="Producer"?"🎥":"👤"}</span>
                        }
                      </div>
                      <div className="cast-card-body">
                        <div className="cast-card-name">{c.name}</div>
                        {c.role && <div className="cast-card-role">{c.role}</div>}
                        <div className="cast-card-role" style={{ color:"var(--gold)" }}>{c.type}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* SONGS */}
          {tab === "songs" && (
            <>
              <div className="portal-page-header">
                <div>
                  <h1 className="portal-page-title">Songs Library</h1>
                  <p className="portal-page-sub">{allSongs.length} songs across all your films</p>
                </div>
              </div>
              {allSongs.length === 0 ? (
                <div className="portal-empty-hero">
                  <div className="portal-empty-icon">🎵</div>
                  <h2>No songs yet</h2>
                  <p>Add songs through the Media section of each film.</p>
                </div>
              ) : (
                <div className="song-list">
                  {allSongs.map((s, i) => (
                    <div key={i} className="song-item" style={{ cursor:"pointer" }} onClick={() => navigate(`/movie/${s.movieId}`)}>
                      <span className="song-num">{i + 1}</span>
                      <div className="song-info">
                        <div className="song-title">{s.title}</div>
                        <div className="song-singer">{s.singer && `${s.singer} · `}<span style={{ color:"var(--gold)" }}>{s.movieTitle}</span></div>
                      </div>
                      {s.ytId && (
                        <a href={`https://youtube.com/watch?v=${s.ytId}`} target="_blank" rel="noreferrer" onClick={e=>e.stopPropagation()}>
                          <button className="song-play" style={{ opacity:1 }}>▶</button>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* SETTINGS */}
          {tab === "settings" && (
            <SettingsPanel production={production} onToast={onToast} onUpdate={onProductionUpdate || (() => {})} />
          )}

        </main>
      </div>
    </div>
  );
}