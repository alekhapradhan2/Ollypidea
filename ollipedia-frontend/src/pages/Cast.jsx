import SEO, { staticSEO } from "../components/SEO";
import { moviePath, castPath, songPath } from "../utils/slugs";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../api/api";

const CSS = `
@keyframes cpulse{0%,100%{opacity:1}50%{opacity:.35}}
.cc{flex-shrink:0;width:160px;cursor:pointer;transition:transform .25s cubic-bezier(.34,1.56,.64,1)}
.cc:hover{transform:translateY(-6px) scale(1.02)}
.cc:hover .cc-box{box-shadow:0 18px 48px rgba(0,0,0,.7);border-color:rgba(201,151,58,.45)}
.cc:hover .cc-play{opacity:1}
.cc:hover .cc-name{color:var(--gold)}
.cc-box{position:relative;border-radius:10px;overflow:hidden;height:200px;background:var(--bg3);box-shadow:0 4px 14px rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.06);transition:box-shadow .25s,border .25s}
.cc-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.25);opacity:0;transition:opacity .2s}
.cc-name{margin:0;font-weight:700;font-size:.82rem;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text);transition:color .2s}
`;

// Shared IO
const _io = typeof window!=="undefined" ? (() => {
  const cbs=new WeakMap();
  const io=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){cbs.get(e.target)?.();cbs.delete(e.target);io.unobserve(e.target);}});},{rootMargin:"500px"});
  io._cbs=cbs; return io;
})() : null;
const obsImg=(el,cb)=>{if(!_io||!el)return;_io._cbs.set(el,cb);_io.observe(el);return()=>{_io.unobserve(el);_io._cbs.delete(el);};};

function LImg({src,alt,style}){
  const [ok,setOk]=useState(false);const ref=useRef(null);
  useEffect(()=>{ if(!src)return; return obsImg(ref.current,()=>{ if(ref.current) ref.current.src=src; }); },[src]);
  if(!src) return null;
  return <img ref={ref} alt={alt||""} decoding="async" style={{...style,opacity:ok?1:0,transition:"opacity .3s"}} onLoad={()=>setOk(true)} onError={()=>setOk(true)}/>;
}

// Cast card — CSS hover
const CastCard = React.memo(function CastCard({ person, onClick }) {
  const filmCount = person.movies?.length || 0;
  return (
    <div className="cc" onClick={onClick}>
      <div className="cc-box">
        <LImg src={person.photo} alt={person.name} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
        {!person.photo && <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"3rem"}}>👤</div>}
        <div className="cc-play"><div style={{width:36,height:36,borderRadius:"50%",background:"rgba(201,151,58,.9)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".9rem"}}>▶</div></div>
        <div className="home-card-overlay">
          <span className="home-card-genre">{person.type||"Actor"}</span>
          {filmCount>0 && <span className="home-card-verdict" style={{color:"var(--gold)"}}>{filmCount} film{filmCount!==1?"s":""}</span>}
        </div>
      </div>
      <div style={{padding:"9px 2px 0"}}>
        <p className="cc-name">{person.name}</p>
        <p style={{margin:"3px 0 0",fontSize:".68rem",color:"var(--gold)"}}>{person.type||"Actor"}</p>
      </div>
    </div>
  );
});

// Row with lazy rendering
function CastRow({ title, people, tag }) {
  const navigate=useNavigate();
  const rowRef=useRef(null),sentRef=useRef(null);
  const [vis,setVis]=useState(false);
  useEffect(()=>{
    const el=sentRef.current; if(!el) return;
    const io=new IntersectionObserver(([e])=>{if(e.isIntersecting){setVis(true);io.disconnect();}},{rootMargin:"300px"});
    io.observe(el); return()=>io.disconnect();
  },[]);
  const slide=n=>rowRef.current?.scrollBy({left:n,behavior:"smooth"});
  if(!people.length) return null;
  return (
    <section className="home-section" ref={sentRef}>
      <div className="home-section-header">
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <h2 className="home-section-title">{title}</h2>
          {tag && <span className="home-tag">{tag}</span>}
          <span style={{background:"rgba(201,151,58,0.15)",color:"var(--gold)",fontSize:".68rem",fontWeight:700,padding:"2px 9px",borderRadius:10}}>{people.length}</span>
        </div>
        <div className="home-section-arrows">
          <button className="home-arrow" onClick={()=>slide(-400)}>‹</button>
          <button className="home-arrow" onClick={()=>slide(400)}>›</button>
        </div>
      </div>
      <div className="home-row" ref={rowRef} style={{padding:"6px 24px 14px"}}>
        {vis
          ? people.map(p=><CastCard key={p._id} person={p} onClick={()=>navigate(castPath(p))}/>)
          : Array.from({length:6},(_,i)=><div key={i} style={{flexShrink:0,width:160,height:240,borderRadius:8,background:"var(--bg3)",animation:`cpulse 1.5s ease-in-out ${i*.1}s infinite`}}/>)
        }
      </div>
    </section>
  );
}

export default function Cast() {
  const navigate=useNavigate();
  const [cast,setCast]=useState([]);
  const [loading,setLoading]=useState(true);
  const [search,setSearch]=useState("");
  const [view,setView]=useState("trending");
  const [typeFilter,setTypeFilter]=useState("All");

  useEffect(()=>{
    API.getCast()
      .then(data=>setCast([...data].sort((a,b)=>(b.movies?.length||0)-(a.movies?.length||0))))
      .catch(console.error)
      .finally(()=>setLoading(false));
  },[]);

  const isFiltering = search || typeFilter!=="All";
  const types = useMemo(()=>["All",...Array.from(new Set(cast.map(c=>c.type).filter(Boolean))).sort()],[cast]);

  const filtered = useMemo(()=>cast.filter(c=>{
    const ms = !search || c.name?.toLowerCase().includes(search.toLowerCase());
    const mt = typeFilter==="All" || c.type===typeFilter;
    return ms && mt;
  }),[cast,search,typeFilter]);

  const {stars,directors,musicians,crew,topStars,risingNew,veterans} = useMemo(()=>({
    stars:     cast.filter(c=>c.type==="Actor"||c.type==="Actress"),
    directors: cast.filter(c=>c.type==="Director"),
    musicians: cast.filter(c=>["Music Director","Singer","Lyricist"].includes(c.type)),
    crew:      cast.filter(c=>["Producer","Cinematographer","Choreographer","Editor"].includes(c.type)),
    topStars:  cast.filter(c=>c.type==="Actor"||c.type==="Actress").slice(0,20),
    risingNew: cast.filter(c=>(c.movies?.length||0)===1).slice(0,20),
    veterans:  cast.filter(c=>(c.movies?.length||0)>=5).slice(0,20),
  }),[cast]);

  return (
    <div className="home-root" style={{paddingTop:60}}>
      <SEO {...staticSEO.cast} />
      <style>{CSS}</style>

      <div style={{padding:"32px 24px 0",background:"linear-gradient(to bottom,rgba(201,151,58,.06),transparent)",borderBottom:"1px solid var(--border)"}}>
        <div style={{maxWidth:1400,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:14,marginBottom:20}}>
            <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:"clamp(1.6rem,3vw,2.4rem)",fontWeight:900,margin:0}}>Cast & Crew</h1>
            <span style={{fontSize:".82rem",color:"var(--muted)"}}>{cast.length} people</span>
          </div>
          <div className="tabs" style={{borderColor:"rgba(255,255,255,.08)"}}>
            <button className={`tab ${view==="trending"?"active":""}`} onClick={()=>setView("trending")}>🔥 Trending</button>
            <button className={`tab ${view==="all"?"active":""}`} onClick={()=>setView("all")}>👥 Browse All</button>
          </div>
        </div>
      </div>

      {(view==="all"||isFiltering) && (
        <div style={{padding:"12px 24px",background:"var(--bg2)",borderBottom:"1px solid var(--border)",display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{position:"relative",flex:1,minWidth:200,maxWidth:300}}>
            <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--muted)",fontSize:".85rem"}}>🔍</span>
            <input className="form-input" style={{paddingLeft:34,width:"100%"}} placeholder="Search by name…" value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
          <select className="form-select" style={{width:"auto"}} value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}>
            {types.map(t=><option key={t}>{t}</option>)}
          </select>
          {isFiltering && <>
            <button className="btn btn-ghost btn-sm" onClick={()=>{setSearch("");setTypeFilter("All");}} style={{color:"var(--gold)",border:"1px solid rgba(201,151,58,.3)",borderRadius:4}}>✕ Clear</button>
            <span style={{fontSize:".78rem",color:"var(--muted)",marginLeft:"auto"}}>{filtered.length} result{filtered.length!==1?"s":""}</span>
          </>}
        </div>
      )}

      {loading && (
        <div className="home-sections" style={{paddingTop:32}}>
          {[0,1,2].map(i=>(
            <div key={i} className="home-section">
              <div className="home-section-header" style={{padding:"0 24px"}}><div className="skeleton" style={{height:18,width:200}}/></div>
              <div className="home-row" style={{padding:"6px 24px 14px"}}>
                {Array.from({length:7},(_,j)=><div key={j} className="skeleton" style={{flexShrink:0,width:160,height:240,borderRadius:8}}/>)}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && view==="trending" && !isFiltering && (
        <div className="home-sections" style={{paddingTop:32}}>
          {topStars.length>0    && <CastRow title="⭐ Top Stars"           people={topStars}   tag="Popular"/>}
          {directors.length>0   && <CastRow title="🎬 Directors"           people={directors}/>}
          {veterans.length>0    && <CastRow title="🏆 Veteran Artists"     people={veterans}   tag="5+ Films"/>}
          {musicians.length>0   && <CastRow title="🎵 Music & Songs"       people={musicians}/>}
          {risingNew.length>0   && <CastRow title="🌟 Rising Talents"      people={risingNew}  tag="New"/>}
          {crew.length>0        && <CastRow title="🎥 Crew & Production"   people={crew}/>}
          {stars.length>20      && <CastRow title="👥 All Actors & Actresses" people={stars}/>}
          {cast.length===0 && <div className="home-empty" style={{padding:"80px 24px"}}><div style={{fontSize:"3rem",marginBottom:12}}>👤</div><p style={{color:"var(--muted)"}}>No cast members yet.</p></div>}
        </div>
      )}

      {!loading && (view==="all"||isFiltering) && (
        <div className="home-sections" style={{paddingTop:32}}>
          {filtered.length===0
            ? <div className="home-empty" style={{padding:"80px 24px"}}><div style={{fontSize:"3rem",marginBottom:12}}>👤</div><p style={{color:"var(--muted)"}}>No results found.</p><button className="btn btn-outline btn-sm" style={{marginTop:16}} onClick={()=>{setSearch("");setTypeFilter("All");}}>Clear Filters</button></div>
            : search
              ? <section className="home-section"><div className="home-section-header" style={{padding:"0 24px"}}><h2 className="home-section-title">Results</h2><span style={{fontSize:".8rem",color:"var(--muted)"}}>{filtered.length} people</span></div><div style={{padding:"8px 24px 24px",display:"flex",flexWrap:"wrap",gap:14}}>{filtered.map(p=><CastCard key={p._id} person={p} onClick={()=>navigate(castPath(p))}/>)}</div></section>
              : types.filter(t=>t!=="All").map(t=>{ const g=filtered.filter(c=>c.type===t); return g.length?<CastRow key={t} title={t+"s"} people={g}/>:null; })
          }
        </div>
      )}
    </div>
  );
}