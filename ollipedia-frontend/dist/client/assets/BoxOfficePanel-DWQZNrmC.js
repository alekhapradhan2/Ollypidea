import{r as N,A as X,j as e,g as we}from"./index-BBNrY1FN.js";const $e="http://localhost:4000/api",pe=r=>{if(!r&&r!==0)return 0;const i=String(r).replace(/[₹,\s]/g,"").toLowerCase(),s=parseFloat(i);return isNaN(s)?0:i.includes("cr")||i.includes("crore")?Math.round(s*1e7):i.includes("l")||i.includes("lakh")?Math.round(s*1e5):s>=1e3?Math.round(s):0},h=r=>{if(r==null||r==="")return"—";const i=typeof r=="number"?r:pe(r);return!i||isNaN(i)?r||"—":i>=1e7?`₹${(i/1e7).toFixed(2)} Cr`:i>=1e5?`₹${(i/1e5).toFixed(2)} L`:`₹${i.toLocaleString("en-IN")}`},P=pe,ve=1.18,xe=(r,i)=>{if(!r)return"";const s=new Date(r);return isNaN(s.getTime())?"":(s.setDate(s.getDate()+(Number(i)-1)),s.toISOString().slice(0,10))},ke=(r,i,s)=>{const p=[["Day","Date (reference only — recalculated on upload)","Net Collection"]];for(let a=0;a<s;a++){const u=i+a,C=xe(r==null?void 0:r.releaseDate,u);p.push([`Day ${u}`,C||"TBA",""])}return p.map(a=>a.map(u=>`"${String(u).replace(/"/g,'""')}"`).join(",")).join(`\r
`)},Se=(r,i)=>{const s=new Blob(["\uFEFF"+r],{type:"text/csv;charset=utf-8;"}),p=URL.createObjectURL(s),a=document.createElement("a");a.href=p,a.download=i,document.body.appendChild(a),a.click(),document.body.removeChild(a),URL.revokeObjectURL(p)},je=r=>{const i=[];let s=[],p="",a=!1;const u=()=>{s.push(p),p=""},C=()=>{u(),i.push(s),s=[]};for(let j=0;j<r.length;j++){const t=r[j],b=r[j+1];a?t==='"'&&b==='"'?(p+='"',j++):t==='"'?a=!1:p+=t:t==='"'?a=!0:t===","?u():t==="\r"||(t===`
`?C():p+=t)}return(p.length||s.length)&&C(),i.filter(j=>j.some(t=>String(t).trim()!==""))},me=r=>{const i=String(r??"").match(/(\d+)/);return i?parseInt(i[1],10):null},Oe=r=>{if(!r.length)return[];const i=r[0].map(a=>String(a).toLowerCase());let s=i.findIndex(a=>a.includes("day")),p=i.findIndex(a=>a.includes("net"));return s===-1&&(s=0),p===-1&&(p=i.length-1),r.slice(1).map(a=>({day:me(a[s]),netRaw:String(a[p]??"").trim()})).filter(a=>a.day&&a.netRaw)},ze=r=>String(r||"").split(/\r?\n/).map(i=>i.trim()).filter(Boolean).map(i=>{const s=me(i);if(!s)return null;const p=i.replace(/^\s*day\s*-?\s*\d+\s*/i,"").replace(/^\d+\s*/,"").replace(/^[\s,:\-\t]+/,"").trim();return p?{day:s,netRaw:p}:null}).filter(Boolean),ae=r=>String(r||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-").trim(),ie=r=>r?new Date(r).getFullYear():"",he=r=>{const i=Array.isArray(r.cast)?r.cast:[],s=w=>{var y;return((y=i.find(k=>{const $=(k.role||k.type||"").toLowerCase();return w.some(S=>$.includes(S))}))==null?void 0:y.name)||null},p=i.find(w=>{const y=(w.role||w.type||"").toLowerCase().trim();return y==="director"||y==="film director"||y==="movie director"||y.includes("director")&&!["music","art","action","stunt","assistant","co-","associate"].some(k=>y.includes(k))}),a=(p==null?void 0:p.name)||r.director||null,u=i.find(w=>{const y=(w.role||w.type||"").toLowerCase().trim();return y==="producer"||y.includes("producer")&&!["executive","co-","line","associate","assistant"].some(k=>y.includes(k))}),C=(u==null?void 0:u.name)||r.producer||null,j=s(["music director"])||null,t=s(["writer","screenplay","story","dialogue"])||null,b=s(["cinematographer","dop","director of photography"])||null,l=s(["editor"])||null,n=["director","producer","writer","screenplay","story","dialogue","music director","cinematographer","dop","editor","choreographer","art director","costume","sound","stunt","vfx"],m=["actor","actress","lead","hero","heroine","supporting","cameo","special appearance"],f=i.filter(w=>{const y=(w.role||w.type||"").toLowerCase();return!(n.some($=>y.includes($))&&!m.some($=>y.includes($)))}),x=f.slice(0,4).map(w=>w.name).filter(Boolean),W=f.filter(w=>{const y=(w.role||w.type||"").toLowerCase();return y.includes("actress")||y.includes("heroine")}).slice(0,2).map(w=>w.name).filter(Boolean);return{directorName:a,producerName:C,musicDirector:j,writer:t,dop:b,editor:l,leadActors:x,leadActresses:W}},ye=(r,i,s,p)=>{const a=[...i||[]].sort((f,x)=>f.day-x.day),u=a.find(f=>f.day===r),C=(u==null?void 0:u.date)||"",j=a.filter(f=>f.day<r).reduce((f,x)=>f+(P(x.net)||0),0),t=[],b=C?new Date(C).getDay():null,l=b===0||b===5||b===6;r===1?t.push("opening-day"):r===2?t.push("day-two"):r===3?t.push("day-three"):r===7?t.push("first-week-closing"):r===10?t.push("day-ten"):r===15&&t.push("day-fifteen"),r>3&&t.push(l?"weekend":"weekday");const m=[1,2,3,5,10,15,20,25,35,50,75,100,150,200].find(f=>{const x=f*1e7;return j<x&&(s||0)>=x})||null;if(m&&t.push(`milestone-${m}cr`),p!=null&&p.ottReleaseDate&&C){const f=new Date(p.ottReleaseDate),x=new Date(C);if(!isNaN(f.getTime())){const W=Math.round((f-x)/864e5);W>=0&&W<=7&&t.push("approaching-ott"),W<0&&t.push("post-ott-theatrical")}}return r>=25&&t.push("extended-run"),t.length||t.push("standard-day"),{tags:t,isWeekend:l,milestoneCroreCrossed:m}},Ne=(r,i,s,p,a)=>{const u=ie(r.releaseDate),j=[...i].sort((f,x)=>f.day-x.day).map(f=>`Day ${f.day}${f.date?` (${f.date})`:""}: Net ${h(f.net)}, Gross ${h(f.gross)}${f.note?` — ${f.note}`:""}`).join(`
`),t=he(r),b=[t.directorName?`Director: ${t.directorName}`:"",t.producerName?`Producer: ${t.producerName}`:"",t.musicDirector?`Music Director: ${t.musicDirector}`:"",t.writer?`Writer: ${t.writer}`:"",t.leadActors.length?`Cast: ${t.leadActors.join(", ")}`:"",t.leadActresses.length?`Actresses: ${t.leadActresses.join(", ")}`:""].filter(Boolean).join(`
`),n=ye(a,i,s,r).tags,m=n.join(", ");return`You are writing a box office collection article for the Odia film website Ollypedia.

Movie: ${r.title}${u?` (${u})`:""}
${r.language?`Language: ${r.language}`:"Language: Odia"}
Genre: ${Array.isArray(r.genre)?r.genre.join(", "):r.genre||"Drama"}
Release Date: ${r.releaseDate?new Date(r.releaseDate).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}):""}
${b}
${r.budget?`Budget: ${r.budget}`:""}

Day-wise collection data (all days up to Day ${a}):
${j}

Total Net: ${h(s)}
Total Gross: ${h(p)}

CONTEXT FOR TODAY (Day ${a}): ${m}.
${n.includes("opening-day")?"This is the FILM'S OPENING DAY — focus on first impressions, opening-day buzz, and how it compares to expectations going in.":""}
${n.includes("weekend")?"Today falls in the WEEKEND box-office window — focus heavily on weekend vs weekday performance and family/leisure footfalls.":""}
${n.includes("weekday")?"Today is a WEEKDAY — focus on how the film is holding up after the opening rush and what weekday collections reveal about word-of-mouth.":""}
${n.includes("first-week-closing")?"Today marks the close of WEEK ONE — focus on the overall week-one verdict and what it signals for week two.":""}
${n.some(f=>f.startsWith("milestone-"))?`The film has just CROSSED A COLLECTION MILESTONE today (${n.find(f=>f.startsWith("milestone-"))}) — lead with this milestone and what it means for the film's standing in Ollywood.`:""}
${n.includes("approaching-ott")?"The film's OTT release is approaching within the next week — mention how the theatrical run is winding down ahead of the digital premiere.":""}
${n.includes("extended-run")?"The film is in an EXTENDED THEATRICAL RUN (25+ days) — focus on staying power, repeat audiences, and longevity rather than day-on-day swings.":""}

You must respond ONLY with a valid JSON object (no markdown, no code fences, no extra text). The JSON must have exactly these keys:

{
  "seoHeadline": "A compelling 10-15 word headline for the h1 tag, reflecting today's specific context above (not a generic 'Day N collection' phrase)",
  "introParagraph": "2-3 sentences introducing the film and Day ${a} performance. Mention the net and gross figures naturally, and reflect today's context.",
  "boxOfficeAnalysis": "2-3 paragraphs (plain text, no HTML tags) covering the day-wise journey and trend, written specifically through today's context above — do NOT just restate yesterday's analysis with new numbers.",
  "audienceResponse": "1-2 paragraphs about how Odia audiences and reviewers are responding — word of mouth, social media buzz, repeat viewing. Vary the framing based on how many days the film has run.",
  "performanceAnalysis": "2 paragraphs analysing the film's performance relative to its budget and typical Odia cinema benchmarks. Mention total net ${h(s)} and gross ${h(p)}.",
  "weekendWeekdayComparison": "1-2 paragraphs specifically comparing weekend and weekday collection patterns for this film so far, and what that pattern suggests about audience type (family/youth/repeat viewers).",
  "occupancyTrend": "1 paragraph describing the likely occupancy trend (rising, falling, steady) across screens based on the collection numbers — do not invent exact percentages, describe the trend qualitatively.",
  "prediction": "1-2 paragraphs predicting upcoming weekend/week performance based on current trend.",
  "industryImpact": "1 paragraph on what this film's performance means for the wider Ollywood (Odia film industry) — e.g. theatre footfalls, confidence in the genre, impact on upcoming Odia releases.",
  "futureOutlook": "1-2 paragraphs on the film's likely box office path from here — upcoming milestones, competition from other releases, or OTT timing if relevant.",
  "finalVerdict": "2-3 sentences summarising the film's box office status after Day ${a}. Do NOT use words like Hit, Flop, Average, Super-Hit — just describe the collection factually."
}

Rules:
- All values must be plain text only — no HTML, no bullet points, no markdown
- Write for an Odia cinema (Ollywood) audience
- Keep each section concise but informative
- Make this article meaningfully different from a generic "Day N" template — lean into today's specific context listed above
- Do not invent or fabricate collection figures — only use the data provided above`},ce=(r,i,s,p,a,u=[])=>{var f;const C=ie(i.releaseDate),j=ye(s,u,p,i),t=new Set(j.tags),b=t.has("weekend"),l=(f=[...t].find(x=>x.startsWith("milestone-")))==null?void 0:f.replace("milestone-","").replace("cr",""),n=x=>({seoHeadline:`${i.title}${C?` (${C})`:""} Day ${s} Box Office Collection Report`,introParagraph:`${i.title}${C?` (${C})`:""} continues its theatrical run. On Day ${s}, the film has collected a total net of ${h(p)} and gross of ${h(a)} at the Odia box office.`,boxOfficeAnalysis:t.has("opening-day")?`${i.title} opened in theatres across Odisha with this Day 1 collection setting the baseline for the film's theatrical run.`:t.has("first-week-closing")?`${i.title} has now completed its first full week in theatres, with a week-one tally of ${h(p)} net.`:b?`${i.title} is riding the weekend box office window on Day ${s}, typically a period of higher footfalls than weekdays.`:`${i.title} has shown a steady run at the box office on Day ${s}, a regular weekday in its theatrical journey.`,audienceResponse:`Audiences across Odisha have given ${i.title} a warm response. The film continues to attract viewers with positive word of mouth${t.has("extended-run")?", helping it sustain a long theatrical run":""}.`,performanceAnalysis:`With a total net collection of ${h(p)} and gross of ${h(a)}, ${i.title} has delivered a notable performance for Odia cinema.`,weekendWeekdayComparison:b?`Day ${s} falls within the weekend box office window, when Odia films typically see higher occupancy than weekdays.`:`Day ${s} is a weekday for ${i.title}, and weekday collections are usually lower than the opening weekend.`,occupancyTrend:`Occupancy levels for ${i.title} on Day ${s} are estimated based on trade trends for similarly positioned Odia releases${b?", with weekend shows typically running fuller":", with weekday shows generally running at moderate occupancy"}.`,prediction:`Based on current trends, ${i.title} is expected to maintain momentum in the coming days, especially during weekends.`,industryImpact:`${i.title}'s box office run is being closely watched within Ollywood as a marker of audience appetite for this genre of Odia cinema.`,futureOutlook:l?`Having just crossed the ₹${l} Cr mark, ${i.title} enters its next phase of theatrical run with a fresh milestone to build on.`:`Looking ahead, ${i.title}'s box office trajectory will depend on how it performs through the next weekend.`,finalVerdict:`${i.title} has collected ${h(p)} net and ${h(a)} gross after ${s} days. All figures are industry estimates. Source: Ollypedia.`})[x]||"",m=["seoHeadline","introParagraph","boxOfficeAnalysis","audienceResponse","performanceAnalysis","weekendWeekdayComparison","occupancyTrend","prediction","industryImpact","futureOutlook","finalVerdict"];if(!(r!=null&&r.trim()))return Object.fromEntries(m.map(x=>[x,n(x)]));try{const x=r.trim().replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/```\s*$/i,"").trim(),W=JSON.parse(x);return Object.fromEntries(m.map(w=>[w,W[w]||n(w)]))}catch{return{seoHeadline:n("seoHeadline"),introParagraph:n("introParagraph"),boxOfficeAnalysis:r.trim(),audienceResponse:n("audienceResponse"),performanceAnalysis:n("performanceAnalysis"),weekendWeekdayComparison:n("weekendWeekdayComparison"),occupancyTrend:n("occupancyTrend"),prediction:n("prediction"),industryImpact:n("industryImpact"),futureOutlook:n("futureOutlook"),finalVerdict:n("finalVerdict")}}},ue=r=>String(r||"").replace(/`/g,"&#96;").trim().split(/\n{2,}/).map(i=>i.split(/\n/).map(s=>s.trim()).filter(Boolean).join(" ").trim()).filter(Boolean).map(i=>`<p>${i}</p>`).join(`
`),Ce=(r,i,s,p,a,u,C)=>{const j=ie(r.releaseDate),t=[...i].sort((k,$)=>k.day-$.day),b=u&&typeof u=="object"&&"seoHeadline"in u?u:ce(u,r,a,s,p,i),l=`${r.title||"Unknown Movie"} (Re-Release)`,n=`/box-office/${ae(`${r.title}${j?` (${j})`:""}`)}`,m=h(s),f=h(p),x=k=>ue(k).replace(/<p>/g,'<p style="color:#ccc;line-height:1.9;margin:0 0 16px;font-size:0.97rem;">');let W=0,w=0;const y=t.map((k,$)=>{W+=P(k.net),w+=P(k.gross);const S=k.day===a,z=k.date?new Date(k.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"—";return`
    <tr style="background:${S?"rgba(201,151,58,0.05)":$%2===0?"transparent":"rgba(255,255,255,0.012)"};">
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:${S?"#c9973a":"#aaa"};font-weight:700;white-space:nowrap;">
        Day ${k.day}
      </td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:#888;font-size:0.82rem;">${z}</td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:${S?"#c9973a":"#ddd"};font-weight:700;">${k.net?h(k.net):"—"}</td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:#7ec8e3;font-weight:700;">${k.gross?h(k.gross):"—"}</td>
    </tr>`}).join("");return`
<!-- RE-RELEASE EXCLUSIVE TEMPLATE -->
<section style="background:#151515;border:1px solid #2a2a2a;border-radius:14px;padding:26px 28px;margin-bottom:22px;">
  <h2 style="font-size:1.15rem;font-weight:800;color:#c9973a;border-left:4px solid #c9973a;padding-left:12px;margin:0 0 18px;line-height:1.3;">
    ${l} Box Office - Day ${a}
  </h2>
  <p style="color:#ccc;line-height:1.9;margin:0 0 16px;font-size:0.97rem;">
    The much-awaited re-release of <strong>${r.title}</strong> is seeing renewed interest at the box office. 
    By Day ${a}, the re-release has grossed a total of <strong>${f}</strong> and netted <strong>${m}</strong>, proving that true cinematic classics never fade.
  </p>
  ${x(b.boxOfficeAnalysis)}
  ${x(b.performanceAnalysis)}
</section>

<section style="background:#151515;border:1px solid #2a2a2a;border-radius:14px;padding:26px 28px;margin-bottom:22px;">
  <h2 style="font-size:1.15rem;font-weight:800;color:#c9973a;border-left:4px solid #c9973a;padding-left:12px;margin:0 0 18px;line-height:1.3;">
    Re-Release Day-wise Breakdown
  </h2>
  <div style="overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;font-size:0.88rem;min-width:400px;">
      <thead>
        <tr>
          <th style="padding:12px 14px;background:#1a1a1a;color:#888;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.07em;text-align:left;border-bottom:2px solid #242424;">Day</th>
          <th style="padding:12px 14px;background:#1a1a1a;color:#888;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.07em;text-align:left;border-bottom:2px solid #242424;">Date</th>
          <th style="padding:12px 14px;background:#1a1a1a;color:#888;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.07em;text-align:left;border-bottom:2px solid #242424;">Net</th>
          <th style="padding:12px 14px;background:#1a1a1a;color:#888;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.07em;text-align:left;border-bottom:2px solid #242424;">Gross</th>
        </tr>
      </thead>
      <tbody>
        ${y}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;color:#c9973a;font-weight:800;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.06em;">
            TOTAL RE-RELEASE (${t.length} days)
          </td>
          <td style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;color:#c9973a;font-weight:800;font-size:1rem;">${m}</td>
          <td style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;color:#7ec8e3;font-weight:800;font-size:1rem;">${f}</td>
        </tr>
      </tfoot>
    </table>
  </div>
</section>

<section style="background:#151515;border:1px solid #2a2a2a;border-radius:14px;padding:26px 28px;margin-bottom:22px;">
  <h2 style="font-size:1.15rem;font-weight:800;color:#c9973a;border-left:4px solid #c9973a;padding-left:12px;margin:0 0 18px;line-height:1.3;">
    Nostalgia & Audience Response
  </h2>
  ${x(b.audienceResponse)}
</section>

<section style="background:#151515;border:1px solid #2a2a2a;border-radius:14px;padding:26px 28px;margin-bottom:22px;">
  <h2 style="font-size:1.15rem;font-weight:800;color:#c9973a;border-left:4px solid #c9973a;padding-left:12px;margin:0 0 18px;line-height:1.3;">
    Occupancy Trends & Weekend Growth
  </h2>
  ${x(b.occupancyTrend)}
  ${x(b.weekendWeekdayComparison)}
</section>

<section style="background:#151515;border:1px solid #2a2a2a;border-radius:14px;padding:26px 28px;margin-bottom:22px;">
  <h2 style="font-size:1.15rem;font-weight:800;color:#c9973a;border-left:4px solid #c9973a;padding-left:12px;margin:0 0 18px;line-height:1.3;">
    Re-Release Impact & Legacy
  </h2>
  ${x(b.industryImpact)}
</section>

<section style="background:#151515;border:1px solid #2a2a2a;border-radius:14px;padding:26px 28px;margin-bottom:22px;">
  <h2 style="font-size:1.15rem;font-weight:800;color:#c9973a;border-left:4px solid #c9973a;padding-left:12px;margin:0 0 18px;line-height:1.3;">
    Future Outlook & Verdict
  </h2>
  ${x(b.prediction)}
  ${x(b.futureOutlook)}
  <div style="border-left:4px solid #c9973a;padding-left:16px;margin-top:16px;">
    ${x(b.finalVerdict)}
  </div>
  <div style="text-align:center;margin-top:22px;">
    <a href="${n}" class="cta-btn" style="display:inline-block;background:#ff6b00;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:800;font-size:0.93rem;">
      🎬 View Latest Re-Release Box Office Updates
    </a>
  </div>
</section>
  `},Te=(r,i,s,p,a,u,C,j="original")=>{if(j==="re-release")return Ce(r,i,s,p,a,u);const t=ie(r.releaseDate),b=[...i].sort((c,I)=>c.day-I.day),l=u&&typeof u=="object"&&"seoHeadline"in u?u:ce(u,r,a,s,p,i),n=r.title||"Unknown Movie",m=n.replace(/\s+/g,""),f=r.releaseDate?new Date(r.releaseDate).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}):"",x=Array.isArray(r.genre)?r.genre:r.genre?[r.genre]:[],W=x.join(", ")||"Drama",w=ae(`${n}${t?` (${t})`:""}`),y=`/box-office/${w}`,k=he(r),{directorName:$,producerName:S,musicDirector:z,writer:U,dop:_,editor:V,leadActors:R,leadActresses:L}=k,G=b.find(c=>c.day===a)||b[b.length-1]||{},q=G.net?h(G.net):"—",Y=G.gross?h(G.gross):"—",D=h(s),M=h(p),o=c=>ue(c).replace(/<p>/g,'<p style="color:#ccc;line-height:1.9;margin:0 0 16px;font-size:0.97rem;">');(()=>{const c=[];return c.push(`${n} Odia Movie`,`${n} Movie Details`,`${n} Cast`,`${n} Cast and Crew`,`${n} Story`,`${n} Review`,`${n} Trailer`,`${n} Teaser`,`${n} Songs`,`${n} Music`,`${n} Release Date`),c.push(`${n} Box Office Collection`,`${n} Day ${a} Collection`,`${n} Day ${a} Box Office Collection`,`${n} Total Collection`,`${n} Total Box Office Collection`,`${n} Gross Collection`,`${n} Net Collection`,`${n} Opening Day Collection`,`${n} First Day Collection`,`${n} Week 1 Collection`,`${n} Box Office Report`,`${n} Box Office Prediction`,`${n} Worldwide Collection`,`${n} Audience Response`,`${n} Movie Update`,`${n} Latest News`,`${n} Movie Collection`,t?`${n} (${t})`:null,t?`${n} (${t}) Box Office Collection`:null,t?`${n} (${t}) Total Collection`:null),$&&c.push($,`${$} Movie`,`${$} Odia Movie`,`${$} Director`),S&&c.push(S,`${S} Producer`),R.forEach(I=>c.push(I,`${I} Movie`,`${I} Odia Movie`)),L.forEach(I=>c.push(I,`${I} Movie`,`${I} Odia Movie`)),z&&c.push(z,`${z} Music Director`),U&&c.push(U,`${U} Writer`),_&&c.push(_,`${_} Cinematographer`),V&&c.push(V,`${V} Editor`),x.forEach(I=>c.push(`${I} Odia Movie`,`Odia ${I} Film`)),c.push("Odia Movie Collection","Odia Movie Details","Odia Movie Cast","Odia Movie Review","Odia Movie Trailer","Odia Movie Release Date","Odia Movie Box Office","Odia Box Office Collection","Ollywood Box Office Collection","Ollywood Movie Collection","Ollywood Movie Details","Ollywood News","Latest Odia Movie News","Odia Cinema News","Odia Film Industry","Trending Odia Movie",t?`New Odia Movie ${t}`:"New Odia Movie","Best Odia Movies","Ollywood Updates"),c.filter(Boolean)})();const v=[`#${m}`,`#${m}Collection`,`#${m}BoxOffice`,`#${m}Day${a}`,$?`#${$.replace(/\s+/g,"")}`:null,S?`#${S.replace(/\s+/g,"")}`:null,z?`#${z.replace(/\s+/g,"")}`:null,...R.map(c=>`#${c.replace(/\s+/g,"")}`),...L.map(c=>`#${c.replace(/\s+/g,"")}`),"#OdiaMovie","#Ollywood","#OdiaCinema","#Ollypedia","#BoxOfficeCollection","#OllywoodBoxOffice","#OllywoodNews",t?`#OdiaMovie${t}`:null].filter(Boolean),g=[["Movie Name",n],["Language","Odia"],["Industry","Ollywood"],["Genre",W],f?["Release Date",f]:null,$?["Director",$]:null,S?["Producer",S]:null,z?["Music Director",z]:null,U?["Writer",U]:null,_?["Cinematographer",_]:null,V?["Editor",V]:null,R.length?["Cast",R.join(", ")]:null,L.length?["Actress",L.join(", ")]:null,r.budget?["Budget",r.budget]:null].filter(Boolean),T=Math.max(...b.map(c=>P(c.net)),1);b.map((c,I)=>{const oe=P(c.net),K=P(c.gross),H=Math.round(oe/T*100),Q=K>0?Math.round(K/T*100):0,re=c.day===a,le=c.date?new Date(c.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"",de=`Day ${c.day}${c.day===1?" (Opening)":""}`,be=re?"#c9973a":I%2===0?"#8a6fc4":"#4a9fd4";return`
    <tr style="background:${re?"rgba(201,151,58,0.06)":"transparent"};">
      <td style="padding:10px 12px;border-bottom:1px solid #1e1e1e;min-width:72px;vertical-align:middle;">
        <div style="font-size:0.8rem;font-weight:700;color:${re?"#c9973a":"#aaa"};">${de}</div>
        ${le?`<div style="font-size:0.7rem;color:#555;">${le}</div>`:""}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #1e1e1e;width:55%;">
        <div style="margin-bottom:5px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
            <div style="font-size:0.65rem;color:#666;width:36px;flex-shrink:0;">Net</div>
            <div style="flex:1;background:#1a1a1a;border-radius:999px;height:7px;overflow:hidden;">
              <div style="width:${H}%;height:100%;background:${be};border-radius:999px;transition:width 0.3s;"></div>
            </div>
            <div style="font-size:0.78rem;font-weight:700;color:${re?"#c9973a":"#ccc"};min-width:56px;text-align:right;word-break:break-word;">${c.net?h(c.net):"—"}</div>
          </div>
          ${K>0?`
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="font-size:0.65rem;color:#666;width:36px;flex-shrink:0;">Gross</div>
            <div style="flex:1;background:#1a1a1a;border-radius:999px;height:5px;overflow:hidden;">
              <div style="width:${Q}%;height:100%;background:#3a6a8a;border-radius:999px;"></div>
            </div>
            <div style="font-size:0.72rem;color:#7ec8e3;min-width:56px;text-align:right;word-break:break-word;">${h(c.gross)}</div>
          </div>`:""}
        </div>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #1e1e1e;vertical-align:middle;text-align:right;">
        ${c.note?`<span style="display:inline-block;background:#1e1e1e;color:#777;border:1px solid #2a2a2a;border-radius:4px;padding:2px 8px;font-size:0.7rem;">${c.note}</span>`:""}
      </td>
    </tr>`}).join("");let O=0;const A=b.map((c,I)=>{const oe=P(c.net);P(c.gross),O+=oe;const K=I>0?P(b[I-1].net):null;let H="";if(K!==null&&K>0&&oe>0){const le=(oe-K)/K*100,de=le>=0;H=`<span style="display:inline-block;background:${de?"rgba(40,120,60,0.25)":"rgba(180,40,40,0.25)"};color:${de?"#5dba7d":"#e07070"};border-radius:4px;padding:2px 7px;font-size:0.72rem;font-weight:700;">
        ${de?"▲":"▼"} ${Math.abs(le).toFixed(1)}%
      </span>`}else I===0&&(H='<span style="display:inline-block;background:rgba(201,151,58,0.2);color:#c9973a;border-radius:4px;padding:2px 7px;font-size:0.72rem;font-weight:700;">Opening</span>');const Q=c.day===a,re=c.date?new Date(c.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"—";return`
    <tr style="background:${Q?"rgba(201,151,58,0.05)":I%2===0?"transparent":"rgba(255,255,255,0.012)"};">
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:${Q?"#c9973a":"#aaa"};font-weight:700;white-space:nowrap;">
        Day ${c.day}${Q?' <span style="font-size:0.65rem;background:rgba(201,151,58,0.2);color:#c9973a;padding:1px 6px;border-radius:4px;vertical-align:middle;">Latest</span>':""}
      </td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:#888;font-size:0.82rem;">${re}</td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:${Q?"#c9973a":"#ddd"};font-weight:700;">${c.net?h(c.net):"—"}</td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:#7ec8e3;font-weight:600;">${c.gross?h(c.gross):"—"}</td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:#c9973a;font-weight:700;">${h(O)}</td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;">${H}</td>
    </tr>`}).join(""),B=v.map(c=>`<span class="tag-chip" style="display:inline-block;background:#1e1e1e;color:#c9973a;border:1px solid #3a2800;border-radius:20px;padding:4px 13px;font-size:0.78rem;font-weight:600;margin:2px;">${c}</span>`).join(`
    `),E="background:#181818;border:1px solid #242424;border-radius:14px;padding:26px 28px;margin-bottom:26px;",F="font-size:1.05rem;font-weight:800;color:#ff6b00;border-left:4px solid #ff6b00;padding-left:12px;margin:0 0 20px;line-height:1.3;",Z="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#888;font-size:0.87rem;width:42%;vertical-align:top;",ee="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#ddd;font-size:0.87rem;font-weight:600;",te="padding:11px 14px;background:#1f1f1f;color:#888;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;text-align:left;border-bottom:2px solid #2a2a2a;",ne=ae(`${n}${t?` (${t})`:""} day ${a-1} box office collection`),se=ae(`${n}${t?` (${t})`:""} day ${a+1} box office collection`),ge=`${n} Day ${a-1}`,fe=`${n} Day ${a+1}`;return`<!-- ════════════════════════════════════════════════════════════════
  OLLYPEDIA SEO META — READ BY CMS
  title:          ${n}${t?` (${t})`:""} Day ${a} box office collection and collected ${M} gross | Ollypedia
  description:    ${n}${t?` (${t})`:""} Day ${a} box office collection: Collected ${D} net and ${M} gross in ${a} day${a!==1?"s":""}. Complete day-wise breakdown, audience response, performance analysis & predictions on Ollypedia.
  og:title:       ${n}${t?` (${t})`:""} Day ${a} box office collection and collected ${M} gross | Ollypedia
  og:description: ${n} has collected ${D} net and ${M} gross after ${a} days. Full report on Ollypedia.
════════════════════════════════════════════════════════════════ -->

<!-- ─────────────────────────────────────────────
  JSON-LD SCHEMA — NewsArticle + Movie + BreadcrumbList
  Injected into <head> by CMS. Enables Google rich results:
  - NewsArticle → headline in search + Google News
  - Movie       → movie knowledge panel association
  - BreadcrumbList → breadcrumb path shown in search results
───────────────────────────────────────────── -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "NewsArticle",
      "headline": "${n}${t?` (${t})`:""} Day ${a} box office collection and collected ${M} gross",
      "description": "${n}${t?` (${t})`:""} Day ${a} box office collection: Collected ${D} net and ${M} gross in ${a} day${a!==1?"s":""}.",
      "datePublished": "${new Date().toISOString().slice(0,10)}",
      "dateModified": "${new Date().toISOString().slice(0,10)}",
      "author": { "@type": "Organization", "name": "Ollypedia", "url": "https://ollypedia.in" },
      "publisher": {
        "@type": "Organization",
        "name": "Ollypedia",
        "url": "https://ollypedia.in",
        "logo": { "@type": "ImageObject", "url": "https://ollypedia.in/logo.png" }
      },
      "mainEntityOfPage": { "@type": "WebPage", "@id": "https://ollypedia.in/blog/${C}" },
      "about": {
        "@type": "Movie",
        "name": "${n}",
        "inLanguage": "Odia",
        "genre": "${W}"${f?`,
        "datePublished": "${f}"`:""}${$?`,
        "director": { "@type": "Person", "name": "${$}" }`:""}${S?`,
        "producer": { "@type": "Person", "name": "${S}" }`:""}${R.length?`,
        "actor": [${R.map(c=>`{ "@type": "Person", "name": "${c}" }`).join(", ")}]`:""}
      }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home",        "item": "https://ollypedia.in" },
        { "@type": "ListItem", "position": 2, "name": "Box Office",  "item": "https://ollypedia.in/box-office" },
        { "@type": "ListItem", "position": 3, "name": "${n}", "item": "https://ollypedia.in${y}" },
        { "@type": "ListItem", "position": 4, "name": "Day ${a} Collection", "item": "https://ollypedia.in/blog/${C}" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is the total box office collection of ${n}${t?` (${t})`:""}?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "As of Day ${a}, ${n} has collected a total of ${D} net and ${M} gross at the Odia box office. These are industry estimates updated daily on Ollypedia."
          }
        },
        {
          "@type": "Question",
          "name": "How much did ${n} collect on Day ${a}?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "On Day ${a}, ${n} collected ${q} net and ${Y} gross. The cumulative total stands at ${D} net after ${a} day${a!==1?"s":""} in theatres."
          }
        }${$?`,
        {
          "@type": "Question",
          "name": "Who directed ${n}?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "${n} is directed by ${$}.${S?` The film is produced by ${S}.`:""} It is an Odia language film released in ${t||"2026"} under the Ollywood banner."
          }
        }`:""}${R.length?`,
        {
          "@type": "Question",
          "name": "Who are the lead actors in ${n}?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "${n} stars ${R.join(", ")}${L.length?` alongside ${L.join(", ")}`:""}.${z?` The music is composed by ${z}.`:""}"
          }
        }`:""},
        {
          "@type": "Question",
          "name": "Is ${n} a hit or flop at the box office?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Based on ${a} day${a!==1?"s":""} of data, ${n} has collected ${D} net at the Odia box office.${r.budget?` The film had an estimated budget of ${r.budget}.`:""} Ollypedia updates collection figures daily based on industry trade estimates."
          }
        }
      ]
    }
  ]
}
<\/script>


<!-- ─────────────────────────────────────────────
  MOBILE RESPONSIVE STYLES
  Scoped to .ollypedia-blog-content — safe to inject inline.
  No layout or functionality changes, purely presentation fixes.
───────────────────────────────────────────── -->
<style>
/* ── Base resets for blog content ── */
.ollypedia-blog-content img,
.ollypedia-blog-content table,
.ollypedia-blog-content div,
.ollypedia-blog-content section,
.ollypedia-blog-content td,
.ollypedia-blog-content th { box-sizing: border-box; }

/* ── Prevent any element from causing horizontal scroll ── */
.ollypedia-blog-content { overflow-x: hidden; word-break: break-word; }

/* ── Long text, headings, links and data cells wrap instead of overflowing
     (most of this already inherits word-break from the rule above; these
     are explicit so it holds even if an inline style or sanitizer strips
     inheritance) ── */
.ollypedia-blog-content p,
.ollypedia-blog-content span,
.ollypedia-blog-content strong,
.ollypedia-blog-content em,
.ollypedia-blog-content a,
.ollypedia-blog-content h1,
.ollypedia-blog-content h2,
.ollypedia-blog-content h3,
.ollypedia-blog-content td,
.ollypedia-blog-content th {
  overflow-wrap: break-word;
  word-break: break-word;
  max-width: 100%;
}

/* ── Images, charts, video and other embeds never exceed the viewport.
     (No <img>/<iframe> currently ships in this template, but this keeps
     any future poster/embed additions safe automatically.) ── */
.ollypedia-blog-content img,
.ollypedia-blog-content svg,
.ollypedia-blog-content video,
.ollypedia-blog-content iframe,
.ollypedia-blog-content embed,
.ollypedia-blog-content object,
.ollypedia-blog-content canvas {
  max-width: 100%;
  height: auto;
}

/* ── Code blocks and quotes wrap or scroll within themselves instead of
     widening the page ── */
.ollypedia-blog-content pre {
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: break-word;
  overflow-x: auto;
  max-width: 100%;
  -webkit-overflow-scrolling: touch;
}
.ollypedia-blog-content code {
  overflow-wrap: break-word;
  word-break: break-word;
}
.ollypedia-blog-content blockquote {
  max-width: 100%;
  overflow-wrap: break-word;
  word-break: break-word;
}

/* ── A table is only allowed to exceed 100% width when it explicitly opts
     in via min-width (e.g. the day-wise data table, which scrolls inside
     its own .tbl-scroll/overflow-x:auto wrapper) — min-width still wins
     over this for that table, so its intended horizontal scroll is
     untouched; every other table is capped to the viewport. ── */
.ollypedia-blog-content table { max-width: 100%; }

/* ── Scrollable table wrapper already present; ensure -webkit too ── */
.ollypedia-blog-content .tbl-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }

@media (max-width: 640px) {

  /* Hero section — tighter padding on small screens */
  .ollypedia-blog-content .hero-section {
    padding: 20px 16px 18px !important;
  }

  /* Section cards — reduce horizontal padding */
  .ollypedia-blog-content section[style*="background:#181818"],
  .ollypedia-blog-content section[style*="background: #181818"] {
    padding: 18px 14px !important;
  }

  /* Tags section — reduce horizontal padding to match other cards */
  .ollypedia-blog-content section[style*="background:#111"] {
    padding: 16px 14px !important;
  }

  /* Stat chips grid — force single column on very small screens */
  .ollypedia-blog-content .stat-chips {
    grid-template-columns: 1fr 1fr !important;
  }

  /* Performance analysis stat block — stack vertically */
  .ollypedia-blog-content .perf-stats {
    flex-direction: column !important;
    gap: 12px !important;
  }

  /* Day nav prev/next — stack vertically */
  .ollypedia-blog-content nav[aria-label="Day navigation"] {
    flex-direction: column !important;
  }

  /* Movie details table — label column narrower */
  .ollypedia-blog-content .info-table td:first-child {
    width: 38% !important;
    font-size: 0.8rem !important;
  }

  /* Box office data table cells — reduce padding and font size */
  .ollypedia-blog-content .data-table td,
  .ollypedia-blog-content .data-table th {
    padding: 8px 8px !important;
    font-size: 0.78rem !important;
  }

  /* Bar chart table cells */
  .ollypedia-blog-content .bar-table td {
    padding: 8px 8px !important;
  }

  /* Also Read grid — 1 column */
  .ollypedia-blog-content .also-read-grid {
    grid-template-columns: 1fr !important;
  }

  /* Tag chips — smaller */
  .ollypedia-blog-content .tag-chip {
    font-size: 0.7rem !important;
    padding: 3px 10px !important;
  }

  /* CTA button — full width */
  .ollypedia-blog-content .cta-btn {
    display: block !important;
    width: 100% !important;
    box-sizing: border-box !important;
    text-align: center !important;
  }

  /* FAQ sections — tighter padding */
  .ollypedia-blog-content .faq-section {
    padding: 18px 14px !important;
  }
}

@media (max-width: 400px) {
  /* Stat chips — single column on very narrow screens */
  .ollypedia-blog-content .stat-chips {
    grid-template-columns: 1fr !important;
  }

  /* Hero h1 font size floor */
  .ollypedia-blog-content h1 {
    font-size: 1.1rem !important;
  }
}
</style>

<!-- ─────────────────────────────────────────────
  BREADCRUMB + TIMESTAMP
  Breadcrumb: visual trail matches BreadcrumbList schema above.
  <time>: machine-readable freshness signal for Google.
───────────────────────────────────────────── -->
<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
  <nav aria-label="Breadcrumb" style="font-size:0.78rem;color:#555;display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
    <a href="/" style="color:#777;text-decoration:none;">Home</a>
    <span style="color:#333;">›</span>
    <a href="/box-office" style="color:#777;text-decoration:none;">Box Office</a>
    <span style="color:#333;">›</span>
    <a href="${y}" style="color:#777;text-decoration:none;">${n}${t?` (${t})`:""}</a>
    <span style="color:#333;">›</span>
    <span style="color:#c9973a;">Day ${a} Collection</span>
  </nav>
  <time datetime="${new Date().toISOString().slice(0,10)}" style="font-size:0.73rem;color:#444;white-space:nowrap;">
    🕐 Updated: ${new Date().toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}
  </time>
</div>


<!-- ─────────────────────────────────────────────
  HERO BANNER
───────────────────────────────────────────── -->
<div class="hero-section" style="background:linear-gradient(135deg,#1a0e00 0%,#121212 100%);border:1px solid #2e2000;border-radius:14px;padding:30px 28px 24px;margin-bottom:22px;">

  <div style="margin-bottom:14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
    <span style="display:inline-block;background:#2a1500;color:#c9973a;font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:4px 12px;border-radius:999px;border:1px solid #3a2200;">📊 Box Office Report</span>
    <span style="display:inline-block;background:#1e1e1e;color:#888;font-size:0.68rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;padding:4px 12px;border-radius:999px;border:1px solid #2a2a2a;">Day ${a} Update</span>
    ${t?`<span style="display:inline-block;background:#1e1e1e;color:#888;font-size:0.68rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;padding:4px 12px;border-radius:999px;border:1px solid #2a2a2a;">${t}</span>`:""}
  </div>

  <h1 style="color:#fff;font-size:clamp(1.2rem,4.5vw,1.6rem);line-height:1.3;font-weight:800;margin:0 0 14px;word-break:break-word;">
    ${n}${t?` (${t})`:""} Day ${a} Box Office Collection — ${(l.seoHeadline||"").replace(/`/g,"&#96;")}
  </h1>

  <p style="color:#bbb;font-size:0.98rem;line-height:1.85;margin:0 0 24px;">${(l.introParagraph||"").replace(/`/g,"&#96;")}</p>

  <p style="color:#aaa;font-size:0.93rem;line-height:1.7;margin:0 0 24px;">
    According to industry trade estimates, <strong style="color:#fff;">${n}</strong> has collected approximately
    <strong style="color:#c9973a;">${D} Net</strong> and
    <strong style="color:#7ec8e3;">${M} Gross</strong> in its first ${a} day${a!==1?"s":""} of theatrical release.
    ${$?`Directed by <strong style="color:#ddd;">${$}</strong>, the`:"The"} film has been running across Odisha with
    ${R.length?`<strong style="color:#ddd;">${R.slice(0,2).join(" and ")}</strong> in the lead roles.`:"strong audience support."}
  </p>

  <!-- Stat chips -->
  <div class="stat-chips" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:10px;">
    <div style="background:rgba(0,0,0,0.5);border:1px solid #2e2000;border-radius:10px;padding:14px 16px;">
      <div style="font-size:0.62rem;color:#666;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Total Net</div>
      <div style="font-size:clamp(1rem,3.5vw,1.3rem);font-weight:800;color:#c9973a;word-break:break-word;">${D}</div>
    </div>
    <div style="background:rgba(0,0,0,0.5);border:1px solid #1a2a3a;border-radius:10px;padding:14px 16px;">
      <div style="font-size:0.62rem;color:#666;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Total Gross</div>
      <div style="font-size:clamp(1rem,3.5vw,1.3rem);font-weight:800;color:#7ec8e3;word-break:break-word;">${M}</div>
    </div>
    <div style="background:rgba(0,0,0,0.5);border:1px solid #222;border-radius:10px;padding:14px 16px;">
      <div style="font-size:0.62rem;color:#666;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Day ${a} Net</div>
      <div style="font-size:clamp(1rem,3.5vw,1.3rem);font-weight:800;color:#fff;word-break:break-word;">${q}</div>
    </div>
  </div>
</div>


<!-- ─────────────────────────────────────────────
  KEY HIGHLIGHT CALLOUT
───────────────────────────────────────────── -->
<div style="background:#180e00;border-left:4px solid #ff9800;border-radius:0 10px 10px 0;padding:14px 20px;margin-bottom:22px;">
  <strong style="color:#ff9800;">📊 Box Office Update:</strong>
  <span style="color:#ccc;"> <strong style="color:#fff;">${n}</strong> has collected an estimated
  <strong style="color:#c9973a;">${D} net</strong> and
  <strong style="color:#7ec8e3;">${M} gross</strong> after
  <strong style="color:#fff;">${a} day${a!==1?"s":""}</strong> in theatres.
  ${s>=1e7?`The film has crossed the <strong style="color:#c9973a;">₹${(s/1e7).toFixed(0)} Cr mark</strong> at the Odia box office.`:""}</span>
</div>


<!-- ─────────────────────────────────────────────
  MOVIE DETAILS TABLE
───────────────────────────────────────────── -->
<section style="${E}">
  <h2 style="${F}">${n} Movie Details</h2>
  <table class="info-table" style="width:100%;border-collapse:collapse;">
    <tbody>
      ${g.map(([c,I])=>`
      <tr>
        <td style="${Z}">${c}</td>
        <td style="${ee}">${I}</td>
      </tr>`).join("")}
      <tr>
        <td style="${Z}">Total Net Collection</td>
        <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#c9973a;font-weight:800;font-size:1.05rem;">${D}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#888;font-size:0.87rem;width:42%;vertical-align:top;">Total Gross Collection</td>
        <td style="padding:10px 0;color:#7ec8e3;font-weight:800;font-size:1.05rem;">${M}</td>
      </tr>
    </tbody>
  </table>
  <div style="text-align:center;margin-top:22px;">
    <a href="${y}" class="cta-btn" style="display:inline-block;background:#ff6b00;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:800;font-size:0.93rem;">
      🎬 View Latest Box Office Updates
    </a>
  </div>
</section>



<!-- ─────────────────────────────────────────────
  GRAPH 2: STRUCTURED DATA TABLE  (Net · Gross · Cumulative · Trend)
  Best for: exact figures + running total + day-on-day trend
───────────────────────────────────────────── -->
<section style="${E}">
  <h2 style="${F}">${n} Complete Box Office Data — Day-wise Breakdown</h2>
  <p style="color:#666;font-size:0.82rem;margin:0 0 18px;line-height:1.6;">
    Net · Gross · Cumulative net total after each day · Trend vs previous day
  </p>
  <div style="overflow-x:auto;">
    <table class="data-table" style="width:100%;border-collapse:collapse;font-size:0.88rem;min-width:520px;">
      <thead>
        <tr>
          <th style="${te}">Day</th>
          <th style="${te}">Date</th>
          <th style="${te}">Net</th>
          <th style="${te}">Gross</th>
          <th style="${te}">Cumulative Net</th>
          <th style="${te}">Trend</th>
        </tr>
      </thead>
      <tbody>
        ${A}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;color:#c9973a;font-weight:800;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.06em;">
            TOTAL (${b.length} days)
          </td>
          <td style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;color:#c9973a;font-weight:800;font-size:1rem;">${D}</td>
          <td style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;color:#7ec8e3;font-weight:800;font-size:1rem;">${M}</td>
          <td style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;color:#c9973a;font-weight:800;font-size:1rem;">${D}</td>
          <td style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;"></td>
        </tr>
      </tfoot>
    </table>
  </div>
</section>


<!-- ─────────────────────────────────────────────
  EDITORIAL SECTIONS (AI-written)
───────────────────────────────────────────── -->
<section style="${E}">
  <h2 style="${F}">Box Office Journey — ${n}</h2>
  ${o(l.boxOfficeAnalysis)}
</section>

<section style="${E}">
  <h2 style="${F}">Weekend vs Weekday Performance</h2>
  ${o(l.weekendWeekdayComparison)}
</section>

<section style="${E}">
  <h2 style="${F}">Audience Response</h2>
  ${o(l.audienceResponse)}
</section>

<section style="${E}">
  <h2 style="${F}">Occupancy Trends</h2>
  ${o(l.occupancyTrend)}
</section>

<section style="${E}">
  <h2 style="${F}">Performance Analysis</h2>
  <div class="perf-stats" style="background:#1f1800;border:1px solid #2e2000;border-radius:10px;padding:16px 20px;margin-bottom:18px;display:flex;gap:24px;flex-wrap:wrap;">
    <div>
      <div style="font-size:0.65rem;color:#666;text-transform:uppercase;letter-spacing:0.09em;margin-bottom:4px;">Total Net</div>
      <div style="font-size:1.2rem;font-weight:800;color:#c9973a;">${D}</div>
    </div>
    <div>
      <div style="font-size:0.65rem;color:#666;text-transform:uppercase;letter-spacing:0.09em;margin-bottom:4px;">Total Gross</div>
      <div style="font-size:1.2rem;font-weight:800;color:#7ec8e3;">${M}</div>
    </div>
    <div>
      <div style="font-size:0.65rem;color:#666;text-transform:uppercase;letter-spacing:0.09em;margin-bottom:4px;">Days Tracked</div>
      <div style="font-size:1.2rem;font-weight:800;color:#fff;">${b.length}</div>
    </div>
  </div>
  ${o(l.performanceAnalysis)}
</section>

<section style="${E}">
  <h2 style="${F}">Impact on the Ollywood Industry</h2>
  ${o(l.industryImpact)}
</section>

<section style="${E}">
  <h2 style="${F}">Future Box Office Outlook</h2>
  ${o(l.prediction)}
  ${o(l.futureOutlook)}
</section>

<section style="${E}">
  <h2 style="${F}">Final Verdict</h2>
  <div style="border-left:4px solid #c9973a;padding-left:16px;margin-bottom:16px;">
    ${o(l.finalVerdict)}
  </div>
  <p style="color:#555;font-size:0.8rem;line-height:1.6;margin:0;">
    <em>* All collection figures are industry estimates sourced by Ollypedia Box Office Tracking. Figures may differ from official studio numbers.</em>
  </p>
</section>


<!-- ─────────────────────────────────────────────
  PREV / NEXT DAY NAVIGATION
  Signals article series to Google. Passes PageRank
  through the day chain. Helps crawlers find all posts.
───────────────────────────────────────────── -->
<nav aria-label="Day navigation" style="display:flex;gap:12px;margin-bottom:22px;flex-wrap:wrap;">
  ${a>1?`<a href="/blog/${ne}" rel="prev" style="flex:1;min-width:140px;display:flex;align-items:center;gap:10px;background:#181818;border:1px solid #242424;border-radius:12px;padding:14px 18px;text-decoration:none;">
    <span style="font-size:1.1rem;color:#555;">←</span>
    <div>
      <div style="font-size:0.65rem;color:#555;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:3px;">Previous</div>
      <div style="font-size:0.85rem;font-weight:700;color:#aaa;">${ge}</div>
      <div style="font-size:0.72rem;color:#555;">Box Office Collection</div>
    </div>
  </a>`:'<div style="flex:1;min-width:140px;"></div>'}
  <a href="/blog/${se}" rel="next" style="flex:1;min-width:140px;display:flex;align-items:center;justify-content:flex-end;gap:10px;background:#181818;border:1px solid #242424;border-radius:12px;padding:14px 18px;text-decoration:none;text-align:right;">
    <div>
      <div style="font-size:0.65rem;color:#555;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:3px;">Next</div>
      <div style="font-size:0.85rem;font-weight:700;color:#aaa;">${fe}</div>
      <div style="font-size:0.72rem;color:#555;">Box Office Collection</div>
    </div>
    <span style="font-size:1.1rem;color:#555;">→</span>
  </a>
</nav>


<!-- ─────────────────────────────────────────────
  FAQ SECTION — Structured Q&A for SEO
  Uses FAQ schema-friendly markup. Google often
  pulls these into rich results / People Also Ask.
───────────────────────────────────────────── -->
<section class="faq-section" style="background:#181818;border:1px solid #242424;border-radius:14px;padding:26px 28px;margin-bottom:22px;">
  <h2 style="font-size:1.05rem;font-weight:800;color:#ff6b00;border-left:4px solid #ff6b00;padding-left:12px;margin:0 0 22px;line-height:1.3;">
    Frequently Asked Questions — ${n} Box Office
  </h2>

  <div style="border-bottom:1px solid #242424;padding-bottom:18px;margin-bottom:18px;">
    <h3 style="font-size:0.93rem;font-weight:700;color:#ddd;margin:0 0 8px;">
      What is the total box office collection of ${n}${t?` (${t})`:""}?
    </h3>
    <div>
      <p style="color:#aaa;font-size:0.9rem;line-height:1.8;margin:0;">
        As of Day ${a}, <strong style="color:#fff;">${n}</strong> has collected a total of
        <strong style="color:#c9973a;">${D} net</strong> and
        <strong style="color:#7ec8e3;">${M} gross</strong> at the Odia box office.
        These are industry estimates and figures are updated daily on Ollypedia.
      </p>
    </div>
  </div>

  <div style="border-bottom:1px solid #242424;padding-bottom:18px;margin-bottom:18px;">
    <h3 style="font-size:0.93rem;font-weight:700;color:#ddd;margin:0 0 8px;">
      How much did ${n} collect on Day ${a}?
    </h3>
    <div>
      <p style="color:#aaa;font-size:0.9rem;line-height:1.8;margin:0;">
        On Day ${a}, <strong style="color:#fff;">${n}</strong> collected
        <strong style="color:#c9973a;">${q} net</strong> and
        <strong style="color:#7ec8e3;">${Y} gross</strong>.
        The cumulative total stands at <strong style="color:#c9973a;">${D} net</strong> after ${a} day${a!==1?"s":""} in theatres.
      </p>
    </div>
  </div>

  ${$?`
  <div style="border-bottom:1px solid #242424;padding-bottom:18px;margin-bottom:18px;">
    <h3 style="font-size:0.93rem;font-weight:700;color:#ddd;margin:0 0 8px;">
      Who directed ${n}?
    </h3>
    <div>
      <p style="color:#aaa;font-size:0.9rem;line-height:1.8;margin:0;">
        <strong style="color:#fff;">${n}</strong> is directed by
        <strong style="color:#ddd;">${$}</strong>.
        ${S?`The film is produced by <strong style="color:#ddd;">${S}</strong>.`:""}
        It is an Odia language film released in ${t||"2026"} under the Ollywood banner.
      </p>
    </div>
  </div>`:""}

  ${R.length?`
  <div style="border-bottom:1px solid #242424;padding-bottom:18px;margin-bottom:18px;">
    <h3 style="font-size:0.93rem;font-weight:700;color:#ddd;margin:0 0 8px;">
      Who are the lead actors in ${n}?
    </h3>
    <div>
      <p style="color:#aaa;font-size:0.9rem;line-height:1.8;margin:0;">
        <strong style="color:#fff;">${n}</strong> stars
        <strong style="color:#ddd;">${R.join(", ")}</strong>${L.length?` alongside <strong style="color:#ddd;">${L.join(", ")}</strong>`:""}.
        ${z?`The music is composed by <strong style="color:#ddd;">${z}</strong>.`:""}
      </p>
    </div>
  </div>`:""}

  <div style="padding-bottom:4px;">
    <h3 style="font-size:0.93rem;font-weight:700;color:#ddd;margin:0 0 8px;">
      Is ${n} a hit or flop at the box office?
    </h3>
    <div>
      <p style="color:#aaa;font-size:0.9rem;line-height:1.8;margin:0;">
        Based on ${a} day${a!==1?"s":""} of data, <strong style="color:#fff;">${n}</strong> has collected
        <strong style="color:#c9973a;">${D} net</strong> at the Odia box office.
        ${r.budget?`The film had an estimated budget of <strong style="color:#ddd;">${r.budget}</strong>.`:""}
        A detailed performance analysis is available above. Ollypedia updates collection figures daily based on industry trade estimates.
      </p>
    </div>
  </div>
</section>


<!-- ─────────────────────────────────────────────
  ALSO READ — Internal links section
  Signals site structure to Google, passes
  PageRank to related pages, reduces bounce rate.
───────────────────────────────────────────── -->
<section class="faq-section" style="background:#181818;border:1px solid #242424;border-radius:14px;padding:26px 28px;margin-bottom:22px;">
  <h2 style="font-size:1.05rem;font-weight:800;color:#ff6b00;border-left:4px solid #ff6b00;padding-left:12px;margin:0 0 20px;line-height:1.3;">
    Also Read
  </h2>
  <div class="also-read-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;">
    <a href="${y}" style="display:flex;align-items:center;gap:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:10px;padding:14px 16px;text-decoration:none;transition:border-color 0.2s;">
      <span style="font-size:1.3rem;flex-shrink:0;">📊</span>
      <div>
        <div style="font-size:0.82rem;font-weight:700;color:#ddd;line-height:1.4;">${n} Full Box Office Report</div>
        <div style="font-size:0.72rem;color:#666;margin-top:2px;">All days · Running total</div>
      </div>
    </a>
    <a href="/box-office" style="display:flex;align-items:center;gap:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:10px;padding:14px 16px;text-decoration:none;transition:border-color 0.2s;">
      <span style="font-size:1.3rem;flex-shrink:0;">🎬</span>
      <div>
        <div style="font-size:0.82rem;font-weight:700;color:#ddd;line-height:1.4;">Ollywood Box Office Collection</div>
        <div style="font-size:0.72rem;color:#666;margin-top:2px;">Latest Odia movie collections</div>
      </div>
    </a>
    <a href="/movie/${w}" style="display:flex;align-items:center;gap:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:10px;padding:14px 16px;text-decoration:none;transition:border-color 0.2s;">
      <span style="font-size:1.3rem;flex-shrink:0;">🎭</span>
      <div>
        <div style="font-size:0.82rem;font-weight:700;color:#ddd;line-height:1.4;">${n} — Cast, Story & Details</div>
        <div style="font-size:0.72rem;color:#666;margin-top:2px;">Full movie info on Ollypedia</div>
      </div>
    </a>
    <a href="/blog?category=Box%20Office" style="display:flex;align-items:center;gap:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:10px;padding:14px 16px;text-decoration:none;transition:border-color 0.2s;">
      <span style="font-size:1.3rem;flex-shrink:0;">📰</span>
      <div>
        <div style="font-size:0.82rem;font-weight:700;color:#ddd;line-height:1.4;">More Box Office Reports</div>
        <div style="font-size:0.72rem;color:#666;margin-top:2px;">Latest Ollywood collection news</div>
      </div>
    </a>
  </div>
</section>


<!-- ─────────────────────────────────────────────
  HASHTAGS / SOCIAL TAGS
───────────────────────────────────────────── -->
<section style="background:#111;border-radius:14px;padding:20px 26px;margin-bottom:22px;">
  <h2 style="font-size:0.7rem;font-weight:700;color:#444;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px;">Tags</h2>
  <div style="display:flex;flex-wrap:wrap;gap:5px;">
    ${B}
  </div>
</section>


<!-- ─────────────────────────────────────────────
  FOOTER
───────────────────────────────────────────── -->
<div style="border-top:1px solid #1c1c1c;padding-top:16px;margin-top:4px;">
  <p style="color:#444;font-size:0.8rem;line-height:1.8;margin:0;">
    <strong style="color:#555;">Source:</strong> Ollypedia Box Office Tracking &nbsp;·&nbsp;
    <strong style="color:#555;">Last Updated:</strong> <time datetime="${new Date().toISOString().slice(0,10)}" style="color:#444;">Day ${a}, ${new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</time> &nbsp;·&nbsp;
    <a href="${y}" style="color:#c9973a;text-decoration:none;">View full collection report →</a><br>
    <em style="color:#3a3a3a;">All collection figures are industry estimates and may vary from official figures.</em>
  </p>
</div>`},J={display:"block",fontSize:"0.72rem",color:"var(--muted)",fontWeight:700,marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em"};function De({movie:r,isEdit:i,dayData:s,allDays:p,onClose:a,onSaved:u,onToast:C,trackType:j="normal"}){const t=ie(r.releaseDate),b=p.length?Math.max(...p.map(g=>g.day))+1:1,[l,n]=N.useState({day:String((s==null?void 0:s.day)??b),net:String((s==null?void 0:s.net)??""),gross:String((s==null?void 0:s.gross)??""),date:String((s==null?void 0:s.date)??new Date().toISOString().slice(0,10)),note:String((s==null?void 0:s.note)??"")}),[m,f]=N.useState(!1),[x,W]=N.useState(""),[w,y]=N.useState(""),[k,$]=N.useState(null),[S,z]=N.useState(""),[U,_]=N.useState(!1),[V,R]=N.useState(""),[L,G]=N.useState(!!(s!=null&&s.gross)),q=1.18,Y=g=>T=>{const O=T.target.value;g==="net"?n(A=>{const B=pe(O),E=B>0?h(Math.round(B*q)):A.gross;return{...A,net:O,gross:L?A.gross:E}}):g==="gross"?(G(O.trim()!==""),n(A=>({...A,gross:O}))):n(A=>({...A,[g]:O}))},D=N.useCallback(()=>{const g={day:parseInt(l.day,10),net:l.net.trim(),gross:l.gross.trim(),date:l.date,note:l.note.trim()};return[...(p||[]).filter(O=>O.day!==g.day),g].sort((O,A)=>O.day-A.day)},[l,p]);N.useEffect(()=>{if(!m)return;const g=parseInt(l.day,10),T=D(),O=T.reduce((B,E)=>B+P(E.net),0),A=T.reduce((B,E)=>B+P(E.gross),0);W(Ne(r,T,O,A,g))},[m]);const M=async()=>{if(x.trim()){z("loading"),y(""),$(null);try{const g=we(),T=await fetch(`${$e}/admin/generate-article`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${g}`},body:JSON.stringify({prompt:x})}),O=await T.json();if(!T.ok)throw new Error(O.error||"Generation failed");const A=O.text||"";y(A);const B=D(),E=B.reduce((Z,ee)=>Z+P(ee.net),0),F=B.reduce((Z,ee)=>Z+P(ee.gross),0);$(ce(A,r,parseInt(l.day,10),E,F,B)),z("done")}catch(g){z("error"),C("❌ AI generation failed: "+g.message,"error")}}},o=async()=>{if(!l.net.trim()&&!l.gross.trim()){R("Enter at least Net or Gross collection.");return}_(!0),R("");const g={day:parseInt(l.day,10),net:l.net.trim(),gross:l.gross.trim(),date:l.date,note:l.note.trim()};try{if(i?await X.adminUpdateBoxOfficeDay(r._id,g.day,g,j):await X.adminAddBoxOfficeDay(r._id,g,j),C(`Day ${g.day} ${i?"updated":"added"}!`,"success"),m){const T=D(),O=T.reduce((H,Q)=>H+P(Q.net),0),A=T.reduce((H,Q)=>H+P(Q.gross),0),B=g.day,E=j==="re-release",F=E?" (Re-Release)":"",Z=E?"-re-release":"",ee=`${r.title}${t?` (${t})`:""}${F} Day ${B} box office collection and collected ${h(A)} gross`,te=`${r.title}${t?` (${t})`:""}${Z} day ${B} box office collection`,ne=ae(te),se=k||ce(w,r,B,O,A,T),ge=Te(r,T,O,A,B,se,ne,j),fe=se.introParagraph||`${ee}: Net ${h(g.net||0)}, Gross ${h(g.gross||0)}. Total ${h(O)} net in ${T.length} days.`,c=`${r.title}${t?` (${t})`:""}${F} Day ${B} box office collection and collected ${h(A)} gross | Ollypedia`,I=`${r.title}${t?` (${t})`:""}${F} Day ${B} box office collection: The film has collected ${h(O)} net and ${h(A)} gross in ${B} day${B!==1?"s":""}. Check complete day-wise breakdown, audience response, and performance analysis on Ollypedia.`,oe={title:ee,slug:ne,excerpt:fe,content:ge,category:"Box Office",tags:[r.title,"Box Office","Odia Cinema","Ollywood",`Day ${B}`,t?String(t):null,...se&&r.cast?(()=>{const H=he(r);return[H.directorName,H.producerName,H.musicDirector,...H.leadActors,...H.leadActresses].filter(Boolean)})():[]].filter(Boolean),coverImage:r.bannerUrl||r.posterUrl||"",movieId:r._id,movieTitle:r.title,published:!0,featured:!1,seoTitle:c,seoDesc:I};let K=null;try{const Q=(await X.adminGetBlogPosts()).find(re=>re.slug===ne);Q&&(K=Q._id)}catch{}K?(await X.adminUpdateBlog(K,oe),C(`✅ Day ${B} blog updated at /blog/${ne}`,"success")):(await X.adminCreateBlog(oe),C(`✅ Day ${B} blog published at /blog/${ne}`,"success"))}u(),a()}catch(T){R(T.message||"Save failed.")}finally{_(!1)}},d=parseInt(l.day,10),v=ae(`${r.title}${t?` (${t})`:""} day ${d} box office collection`);return e.jsx("div",{className:"modal-overlay",onClick:a,children:e.jsxs("div",{className:"modal",onClick:g=>g.stopPropagation(),style:{maxWidth:580,maxHeight:"90vh",overflowY:"auto"},children:[e.jsxs("div",{className:"modal-header",children:[e.jsxs("span",{className:"modal-title",children:[i?`✏️ Edit Day ${s.day}`:`➕ Add Day ${l.day}`," — ",r.title,t?` (${t})`:""]}),e.jsx("button",{className:"modal-close",onClick:a,children:"×"})]}),e.jsxs("div",{style:{padding:"22px 24px"},children:[V&&e.jsxs("div",{style:{marginBottom:16,padding:"10px 14px",background:"rgba(220,50,50,0.1)",border:"1px solid rgba(220,50,50,0.4)",borderRadius:8,color:"#e87a6a",fontSize:"0.82rem"},children:["⚠️ ",V]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14},children:[e.jsxs("div",{children:[e.jsx("label",{style:J,children:"Day Number"}),e.jsx("input",{className:"form-input",style:{width:"100%",boxSizing:"border-box"},type:"number",min:"1",value:l.day,onChange:Y("day"),disabled:i})]}),e.jsxs("div",{children:[e.jsx("label",{style:J,children:"Date"}),e.jsx("input",{className:"form-input",style:{width:"100%",boxSizing:"border-box"},type:"date",value:l.date,onChange:Y("date")})]})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14},children:[e.jsxs("div",{children:[e.jsx("label",{style:J,children:"Net Collection (₹)"}),e.jsx("input",{className:"form-input",style:{width:"100%",boxSizing:"border-box"},type:"text",placeholder:"e.g. 45,00,000",value:l.net,onChange:Y("net"),autoFocus:!i}),e.jsx("div",{style:{fontSize:"0.65rem",color:"var(--muted)",marginTop:4},children:"Gross auto-calculates at Net × 1.18 (18% GST)"})]}),e.jsxs("div",{children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5},children:[e.jsx("label",{style:{...J,marginBottom:0},children:"Gross Collection (₹)"}),L&&e.jsx("button",{type:"button",onClick:()=>{G(!1);const g=parseFloat(l.net.replace(/[^0-9.]/g,"")),T=!isNaN(g)&&g>0?String(Math.round(g*q)):"";n(O=>({...O,gross:T}))},style:{fontSize:"0.6rem",color:"var(--gold)",background:"rgba(201,151,58,0.12)",border:"1px solid rgba(201,151,58,0.3)",borderRadius:6,padding:"2px 7px",cursor:"pointer",fontWeight:700},children:"↺ Auto"})]}),e.jsx("input",{className:"form-input",style:{width:"100%",boxSizing:"border-box",borderColor:L?"rgba(201,151,58,0.5)":void 0},type:"text",placeholder:"Auto-filled from Net",value:l.gross,onChange:Y("gross")}),e.jsx("div",{style:{fontSize:"0.65rem",marginTop:4,color:L?"var(--gold)":"var(--muted)"},children:L?"✏️ Manual override — click ↺ Auto to recalculate":"✅ Auto-calculated from Net"})]})]}),e.jsxs("div",{style:{marginBottom:20},children:[e.jsx("label",{style:J,children:"Notes (optional)"}),e.jsx("input",{className:"form-input",style:{width:"100%",boxSizing:"border-box"},type:"text",placeholder:"e.g. 2nd Saturday, Holiday boost",value:l.note,onChange:Y("note")})]}),e.jsx("div",{style:{borderTop:"1px solid var(--border)",margin:"0 0 20px"}}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:m?16:0,cursor:"pointer",userSelect:"none"},onClick:()=>f(g=>!g),children:[e.jsxs("div",{style:{flex:1},children:[e.jsxs("div",{style:{fontWeight:700,fontSize:"0.9rem"},children:["🤖 Generate AI Blog for Day ",d]}),e.jsxs("div",{style:{fontSize:"0.71rem",color:"var(--muted)",marginTop:3,lineHeight:1.5},children:["Will publish at"," ",e.jsxs("code",{style:{background:"var(--bg3)",padding:"1px 6px",borderRadius:4,color:"var(--gold)",fontSize:"0.68rem"},children:["/blog/",v]})," ","with Day 1–",d," cumulative data"]})]}),e.jsx("div",{style:{width:42,height:24,borderRadius:12,background:m?"var(--gold)":"var(--bg3)",border:"1px solid var(--border)",position:"relative",transition:"background 0.2s",flexShrink:0},children:e.jsx("div",{style:{position:"absolute",top:3,left:m?21:3,width:16,height:16,borderRadius:8,background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 4px rgba(0,0,0,0.4)"}})})]}),m&&e.jsxs("div",{style:{background:"rgba(201,151,58,0.04)",border:"1px solid rgba(201,151,58,0.18)",borderRadius:10,padding:"16px 18px",marginBottom:18},children:[e.jsx("label",{style:{...J,color:"#c9973a"},children:"AI Prompt (edit before generating)"}),e.jsx("textarea",{className:"form-input",value:x,onChange:g=>W(g.target.value),rows:7,style:{width:"100%",boxSizing:"border-box",fontSize:"0.76rem",lineHeight:1.65,resize:"vertical",fontFamily:"monospace",marginBottom:10},placeholder:"Prompt will auto-fill when you open this section…"}),e.jsx("button",{className:"btn btn-sm",style:{width:"100%",background:"rgba(201,151,58,0.14)",color:"var(--gold)",border:"1px solid rgba(201,151,58,0.4)",fontWeight:700},onClick:M,disabled:S==="loading"||!x.trim(),children:S==="loading"?"⏳ Generating with Groq AI…":S==="done"?"✅ Regenerate":"🤖 Generate Blog Content"}),S==="error"&&e.jsx("div",{style:{marginTop:10,fontSize:"0.78rem",color:"#e87a6a"},children:"❌ Generation failed — check GROQ_API_KEY in .env, then retry."}),S==="done"&&k&&(()=>{const g=[{label:"SEO Headline",key:"seoHeadline",rows:1},{label:"Intro Paragraph",key:"introParagraph",rows:3},{label:"Box Office Journey",key:"boxOfficeAnalysis",rows:5},{label:"Audience Response",key:"audienceResponse",rows:4},{label:"Performance Analysis",key:"performanceAnalysis",rows:4},{label:"Future Prediction",key:"prediction",rows:3},{label:"Final Verdict",key:"finalVerdict",rows:3}];return e.jsxs("div",{style:{marginTop:14},children:[e.jsx("div",{style:{fontSize:"0.72rem",color:"var(--gold)",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:12},children:"✅ Generated — Edit any section below before saving"}),g.map(({label:T,key:O,rows:A})=>e.jsxs("div",{style:{marginBottom:14},children:[e.jsx("label",{style:{display:"block",fontSize:"0.68rem",color:"var(--muted)",fontWeight:700,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.05em"},children:T}),e.jsx("textarea",{className:"form-input",value:k[O]||"",onChange:B=>$(E=>({...E,[O]:B.target.value})),rows:A,style:{width:"100%",boxSizing:"border-box",fontSize:"0.77rem",lineHeight:1.7,resize:"vertical"}})]},O)),e.jsx("div",{style:{fontSize:"0.68rem",color:"var(--muted)",marginTop:4,lineHeight:1.6},children:"✏️ Edit any section above. Blog publishes with full SEO, schema, hero, day-wise table & all sections."})]})})()]}),e.jsxs("div",{style:{display:"flex",gap:10},children:[e.jsx("button",{className:"btn btn-ghost",style:{flex:1},onClick:a,disabled:U,children:"Cancel"}),e.jsx("button",{className:"btn btn-gold",style:{flex:2,fontWeight:800},onClick:o,disabled:U||m&&S==="loading",children:U?"Saving…":m?`💾 Save Day ${d} + Publish Blog`:`💾 Save Day ${d}`})]}),m&&e.jsxs("p",{style:{marginTop:10,fontSize:"0.7rem",color:"var(--muted)",textAlign:"center",lineHeight:1.6},children:["Day ",d," blog will include ",e.jsxs("strong",{style:{color:"var(--text)"},children:["all days 1–",d]})," in the table. Day 1 blog has 1 row, Day 2 has 2 rows, and so on."]})]})]})})}function Ae({movie:r,allDays:i,onClose:s,onSaved:p,onToast:a}){const u=ie(r.releaseDate),C=i.length?Math.max(...i.map(o=>o.day))+1:1,j=new Set(i.map(o=>o.day)),[t,b]=N.useState("file"),[l,n]=N.useState(C),[m,f]=N.useState(30),[x,W]=N.useState(""),[w,y]=N.useState([]),[k,$]=N.useState(!1),[S,z]=N.useState(""),U=N.useRef(null),_=o=>{const d=new Map;return o.forEach(({day:v,netRaw:g})=>d.set(v,{day:v,netRaw:g})),Array.from(d.values()).sort((v,g)=>v.day-g.day).map(v=>{const g=pe(v.netRaw);return{...v,netNum:g,valid:g>0,grossNum:g>0?Math.round(g*ve):0,date:xe(r.releaseDate,v.day),isUpdate:j.has(v.day)}})},V=()=>{const o=ke(r,l,m),d=ae(r.title||"movie");Se(o,`${d}-boxoffice-template-day${l}-to-${l+m-1}.csv`)},R=async o=>{var v;const d=(v=o.target.files)==null?void 0:v[0];if(d){z("");try{const g=await d.text(),T=je(g),O=Oe(T);O.length?y(_(O)):(z("No usable rows found — make sure the Net Collection column is filled in."),y([]))}catch(g){z("Could not read that file: "+g.message)}finally{U.current&&(U.current.value="")}}},L=()=>{z("");const o=ze(x);o.length?y(_(o)):(z('Could not find any day lines. Try one entry per line, e.g. "Day 1 - 1500000".'),y([]))},G=w.filter(o=>o.valid),q=w.filter(o=>!o.valid),Y=G.filter(o=>!o.isUpdate).length,D=G.filter(o=>o.isUpdate).length,M=async()=>{if(G.length){$(!0),z("");try{const o={days:G.map(v=>({day:v.day,net:String(v.netNum)}))},d=await X.adminBulkBoxOfficeDays(r._id,o);a(`✅ Saved ${d.added||0} new + ${d.updated||0} updated day(s) for ${r.title}.`,"success"),p(),s()}catch(o){z(o.message||"Bulk save failed.")}finally{$(!1)}}};return e.jsx("div",{className:"modal-overlay",onClick:s,children:e.jsxs("div",{className:"modal",onClick:o=>o.stopPropagation(),style:{maxWidth:700,maxHeight:"90vh",overflowY:"auto"},children:[e.jsxs("div",{className:"modal-header",children:[e.jsxs("span",{className:"modal-title",children:["📤 Bulk Box Office Upload — ",r.title,u?` (${u})`:""]}),e.jsx("button",{className:"modal-close",onClick:s,children:"×"})]}),e.jsxs("div",{style:{padding:"22px 24px"},children:[!r.releaseDate&&e.jsx("div",{style:{marginBottom:16,padding:"10px 14px",background:"rgba(220,160,40,0.08)",border:"1px solid rgba(220,160,40,0.3)",borderRadius:8,color:"#d9a73a",fontSize:"0.8rem"},children:"⚠️ This movie has no release date set, so per-day dates can't be auto-calculated. Set a release date first so Day 1 = release date works correctly."}),S&&e.jsxs("div",{style:{marginBottom:16,padding:"10px 14px",background:"rgba(220,50,50,0.1)",border:"1px solid rgba(220,50,50,0.4)",borderRadius:8,color:"#e87a6a",fontSize:"0.82rem"},children:["⚠️ ",S]}),e.jsx("div",{style:{display:"flex",gap:8,marginBottom:18},children:[["file","📄 Template File"],["paste","✏️ Paste Data"]].map(([o,d])=>e.jsx("button",{onClick:()=>{b(o),y([]),z("")},className:t===o?"btn btn-gold btn-sm":"btn btn-ghost btn-sm",style:{fontWeight:700},children:d},o))}),t==="file"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14},children:[e.jsxs("div",{children:[e.jsx("label",{style:J,children:"Start Day"}),e.jsx("input",{className:"form-input",style:{width:"100%",boxSizing:"border-box"},type:"number",min:"1",value:l,onChange:o=>n(parseInt(o.target.value,10)||1)})]}),e.jsxs("div",{children:[e.jsx("label",{style:J,children:"Number of Days"}),e.jsx("input",{className:"form-input",style:{width:"100%",boxSizing:"border-box"},type:"number",min:"1",max:"200",value:m,onChange:o=>f(parseInt(o.target.value,10)||1)})]})]}),e.jsxs("button",{className:"btn btn-ghost btn-sm",style:{width:"100%",marginBottom:14,fontWeight:700},onClick:V,children:["⬇️ Download Template (Day ",l,"–",l+m-1,")"]}),e.jsxs("div",{style:{fontSize:"0.72rem",color:"var(--muted)",marginBottom:16,lineHeight:1.6},children:["Open it in Excel/Sheets, fill in the ",e.jsx("strong",{style:{color:"var(--text)"},children:"Net Collection"})," column only — leave a day blank to skip it — then save as ",e.jsx("strong",{style:{color:"var(--text)"},children:".csv"})," and upload it below. Dates and Gross are always calculated automatically; whatever ends up in the Date column is ignored."]}),e.jsx("label",{style:J,children:"Upload Filled Template (.csv)"}),e.jsx("input",{ref:U,type:"file",accept:".csv,text/csv",onChange:R,className:"form-input",style:{width:"100%",boxSizing:"border-box"}})]}),t==="paste"&&e.jsxs(e.Fragment,{children:[e.jsx("label",{style:J,children:"Paste day-wise data (one entry per line)"}),e.jsx("textarea",{className:"form-input",style:{width:"100%",boxSizing:"border-box",minHeight:140,fontFamily:"monospace",fontSize:"0.82rem",resize:"vertical"},placeholder:`Day 1 - 1500000
Day 2 - 2200000
Day 3 - 1.8 Cr
…`,value:x,onChange:o=>W(o.target.value)}),e.jsxs("div",{style:{fontSize:"0.72rem",color:"var(--muted)",margin:"8px 0 14px",lineHeight:1.6},children:['Accepts formats like "Day 1 - 1500000", "1,15L", "1 1.2 Cr" — one entry per line. Dates and Gross are calculated automatically from Day 1 = ',r.releaseDate?new Date(r.releaseDate).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"the release date","."]}),e.jsx("button",{className:"btn btn-gold btn-sm",style:{fontWeight:800},onClick:L,disabled:!x.trim(),children:"🔍 Parse & Preview"})]}),w.length>0&&e.jsxs(e.Fragment,{children:[e.jsx("div",{style:{borderTop:"1px solid var(--border)",margin:"20px 0 16px"}}),e.jsxs("div",{style:{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12},children:[e.jsxs("span",{style:{fontSize:"0.72rem",background:"rgba(80,200,120,0.12)",color:"#6fd08c",border:"1px solid rgba(80,200,120,0.3)",padding:"3px 10px",borderRadius:10,fontWeight:700},children:[Y," new"]}),D>0&&e.jsxs("span",{style:{fontSize:"0.72rem",background:"rgba(201,151,58,0.12)",color:"var(--gold)",border:"1px solid rgba(201,151,58,0.3)",padding:"3px 10px",borderRadius:10,fontWeight:700},children:[D," will be overwritten"]}),q.length>0&&e.jsxs("span",{style:{fontSize:"0.72rem",background:"rgba(220,50,50,0.1)",color:"#e87a6a",border:"1px solid rgba(220,50,50,0.3)",padding:"3px 10px",borderRadius:10,fontWeight:700},children:[q.length," skipped (no readable amount)"]})]}),e.jsx("div",{style:{maxHeight:280,overflowY:"auto",border:"1px solid var(--border)",borderRadius:10},children:e.jsxs("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:"0.82rem"},children:[e.jsx("thead",{children:e.jsx("tr",{style:{background:"var(--bg2)"},children:["Day","Date","Net","Gross","Status"].map(o=>e.jsx("th",{style:{padding:"8px 12px",textAlign:"left",fontSize:"0.62rem",color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:"2px solid var(--border)",position:"sticky",top:0,background:"var(--bg2)"},children:o},o))})}),e.jsx("tbody",{children:w.map(o=>e.jsxs("tr",{style:{borderBottom:"1px solid var(--border)",opacity:o.valid?1:.5},children:[e.jsxs("td",{style:{padding:"7px 12px",fontWeight:700,color:"var(--gold)"},children:["Day ",o.day]}),e.jsx("td",{style:{padding:"7px 12px",color:"var(--muted)"},children:o.date?new Date(o.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"—"}),e.jsx("td",{style:{padding:"7px 12px",fontWeight:600},children:o.valid?h(o.netNum):o.netRaw||"—"}),e.jsx("td",{style:{padding:"7px 12px",color:"#7ec8e3"},children:o.valid?h(o.grossNum):"—"}),e.jsx("td",{style:{padding:"7px 12px",fontSize:"0.72rem"},children:o.valid?o.isUpdate?e.jsx("span",{style:{color:"var(--gold)"},children:"↻ update"}):e.jsx("span",{style:{color:"#6fd08c"},children:"+ new"}):e.jsx("span",{style:{color:"#e87a6a"},children:"⚠️ unreadable amount"})})]},o.day))})]})})]}),e.jsxs("div",{style:{display:"flex",gap:10,marginTop:22},children:[e.jsx("button",{className:"btn btn-ghost",style:{flex:1},onClick:s,disabled:k,children:"Cancel"}),e.jsx("button",{className:"btn btn-gold",style:{flex:2,fontWeight:800},onClick:M,disabled:k||G.length===0,children:k?"Saving…":`💾 Save ${G.length} Day${G.length!==1?"s":""}`})]})]})]})})}function Ee({movies:r,onToast:i}){const[s,p]=N.useState(""),[a,u]=N.useState([]),[C,j]=N.useState(!1),[t,b]=N.useState(null),[l,n]=N.useState([]),[m,f]=N.useState([]),[x,W]=N.useState(!1),[w,y]=N.useState(null),[k,$]=N.useState(!1),S=N.useRef(null);N.useEffect(()=>{const o=d=>{S.current&&!S.current.contains(d.target)&&j(!1)};return document.addEventListener("mousedown",o),()=>document.removeEventListener("mousedown",o)},[]),N.useEffect(()=>{if(!s.trim()||t){u([]),j(!1);return}const o=s.toLowerCase(),d=(Array.isArray(r)?r:[]).filter(v=>(v.title||"").toLowerCase().includes(o)).slice(0,8);u(d),j(d.length>0)},[s,r,t]);const z=N.useCallback(async o=>{if(o!=null&&o._id){n([]),f([]),W(!0);try{const d=await X.getMovieBoxOfficeDays(o._id,"original"),v=Array.isArray(d)?[...d].sort((g,T)=>g.day-T.day):[];if(n(v),o.isReRelease)try{const g=await X.getMovieBoxOfficeDays(o._id,"re-release"),T=Array.isArray(g)?[...g].sort((O,A)=>O.day-A.day):[];f(T)}catch{f([])}}catch(d){i==null||i("Failed to load data: "+d.message,"error"),n([])}finally{W(!1)}}},[i]),U=o=>{b(o),p(o.title),j(!1),z(o)},_=()=>{b(null),p(""),n([]),f([])};l.reduce((o,d)=>o+P(d.net),0),l.reduce((o,d)=>o+P(d.gross),0);const V=l.length?Math.max(...l.map(o=>o.day))+1:1,R=t?ie(t.releaseDate):"",L=!!(t!=null&&t.isReRelease&&(t!=null&&t.reReleaseDate)),G=l.reduce((o,d)=>o+P(d.net),0),q=l.reduce((o,d)=>o+P(d.gross),0),Y=m.reduce((o,d)=>o+P(d.net),0),D=m.reduce((o,d)=>o+P(d.gross),0),M=m.length?Math.max(...m.map(o=>o.day))+1:1;return e.jsxs("div",{style:{padding:"0 28px 60px"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",position:"sticky",top:0,zIndex:50,background:"var(--bg1)",padding:"13px 28px",margin:"0 -28px 28px",boxShadow:"0 2px 20px rgba(0,0,0,0.5)",borderBottom:"1px solid var(--border)"},children:[e.jsx("h2",{style:{fontSize:"1.3rem",margin:0,fontWeight:800},children:"📊 Box Office"}),t&&e.jsxs("span",{style:{fontSize:"0.74rem",color:"var(--gold)",background:"rgba(201,151,58,0.1)",border:"1px solid rgba(201,151,58,0.25)",padding:"3px 10px",borderRadius:12,fontWeight:600},children:[t.title,R?` (${R})`:""]}),t&&l.length>0&&e.jsxs("span",{style:{fontSize:"0.68rem",color:"var(--muted)",background:"var(--bg3)",padding:"3px 9px",borderRadius:10,fontWeight:600},children:[l.length," day",l.length!==1?"s":""," recorded"]}),e.jsx("div",{style:{flex:1}}),t&&e.jsx("button",{className:"btn btn-ghost btn-sm",style:{fontWeight:800},onClick:()=>$(!0),children:"📤 Bulk Upload"}),t&&e.jsxs("button",{className:"btn btn-gold btn-sm",style:{fontWeight:800},onClick:()=>y({isEdit:!1,dayData:null}),children:["+ Add Day ",V]})]}),e.jsxs("div",{style:{maxWidth:500,marginBottom:32},children:[e.jsx("label",{style:{...J,marginBottom:8,fontSize:"0.78rem"},children:"Search Movie"}),e.jsxs("div",{ref:S,style:{position:"relative"},children:[e.jsx("span",{style:{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--muted)",pointerEvents:"none",zIndex:1},children:"🔍"}),e.jsx("input",{className:"form-input",style:{paddingLeft:38,paddingRight:t?36:14,width:"100%",boxSizing:"border-box"},placeholder:"Type movie name to search…",value:s,onChange:o=>{p(o.target.value),t&&(b(null),n([]))},onFocus:()=>a.length>0&&j(!0)}),t&&e.jsx("button",{onClick:_,style:{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:"1.2rem",padding:0},children:"×"}),C&&a.length>0&&e.jsx("div",{style:{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:10,zIndex:200,overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,0.65)"},children:a.map(o=>e.jsxs("button",{onClick:()=>U(o),style:{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"10px 14px",background:"none",border:"none",cursor:"pointer",textAlign:"left",borderBottom:"1px solid var(--border)"},onMouseEnter:d=>d.currentTarget.style.background="rgba(201,151,58,0.09)",onMouseLeave:d=>d.currentTarget.style.background="none",children:[(o.posterUrl||o.thumbnailUrl)&&e.jsx("img",{src:o.posterUrl||o.thumbnailUrl,alt:o.title,style:{width:28,height:38,objectFit:"cover",borderRadius:4,flexShrink:0},onError:d=>d.target.style.display="none"}),e.jsxs("div",{children:[e.jsx("div",{style:{fontWeight:700,fontSize:"0.88rem"},children:o.title}),e.jsxs("div",{style:{fontSize:"0.68rem",color:"var(--muted)"},children:[o.releaseDate?new Date(o.releaseDate).getFullYear():"TBA",o.language?` · ${o.language}`:""]})]})]},o._id))}),C&&a.length===0&&s.trim()&&!t&&e.jsxs("div",{style:{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:10,zIndex:200,padding:16,color:"var(--muted)",fontSize:"0.83rem"},children:['No movies found for "',s,'"']})]})]}),!t&&e.jsxs("div",{style:{textAlign:"center",padding:"80px 0",color:"var(--muted)"},children:[e.jsx("div",{style:{fontSize:"4rem",marginBottom:16},children:"📊"}),e.jsx("div",{style:{fontSize:"1.1rem",fontWeight:800,marginBottom:8,color:"var(--text)"},children:"Box Office Tracker"}),e.jsx("div",{style:{fontSize:"0.84rem",maxWidth:380,margin:"0 auto",lineHeight:1.8},children:"Search a movie above to record day-wise collection and publish AI-powered box office blogs per day."})]}),t&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:14,padding:"20px 24px",marginBottom:28,overflow:"hidden",position:"relative"},children:[t.bannerUrl&&e.jsx("img",{src:t.bannerUrl,alt:"",style:{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:.06,pointerEvents:"none"},onError:o=>o.target.style.display="none"}),e.jsxs("div",{style:{display:"flex",gap:20,alignItems:"flex-start",position:"relative",zIndex:1},children:[(t.posterUrl||t.thumbnailUrl)&&e.jsx("img",{src:t.posterUrl||t.thumbnailUrl,alt:t.title,style:{width:68,height:94,objectFit:"cover",borderRadius:10,flexShrink:0,boxShadow:"0 4px 20px rgba(0,0,0,0.7)"},onError:o=>o.target.style.display="none"}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsxs("div",{style:{fontWeight:800,fontSize:"1.25rem",lineHeight:1.2,marginBottom:4},children:[t.title,R?` (${R})`:"",L&&e.jsx("span",{style:{marginLeft:8,fontSize:"0.65rem",background:"rgba(201,151,58,0.18)",color:"#c9973a",padding:"2px 8px",borderRadius:10,fontWeight:700,verticalAlign:"middle"},children:"🔄 Re-Release"})]}),e.jsxs("div",{style:{fontSize:"0.75rem",color:"var(--muted)",marginBottom:16},children:[t.releaseDate?new Date(t.releaseDate).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"Release TBA",L&&` · Re-Release: ${new Date(t.reReleaseDate).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}`,t.language?` · ${t.language}`:"",t.budget?` · Budget: ${t.budget}`:""]}),e.jsx("div",{style:{display:"flex",flexWrap:"wrap",gap:10},children:[{label:"Original Net",value:h(G),color:"var(--gold)"},{label:"Original Gross",value:h(q),color:"#7ec8e3"},L?{label:"Re-Release Net",value:h(Y),color:"#e89b3a"}:null,L?{label:"Re-Release Gross",value:h(D),color:"#a8d8ea"}:null,{label:"Days",value:x?"…":l.length||"—",color:"var(--text)"}].filter(Boolean).map(({label:o,value:d,color:v})=>e.jsxs("div",{style:{background:"rgba(0,0,0,0.4)",borderRadius:10,padding:"9px 16px",border:"1px solid rgba(255,255,255,0.06)",minWidth:110},children:[e.jsx("div",{style:{fontSize:"0.6rem",color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:3},children:o}),e.jsx("div",{style:{fontSize:"1.05rem",fontWeight:800,color:v},children:d})]},o))})]})]})]}),x&&e.jsxs("div",{style:{textAlign:"center",padding:52,color:"var(--muted)"},children:[e.jsx("div",{style:{fontSize:"2rem",marginBottom:8},children:"⏳"}),e.jsx("div",{style:{fontSize:"0.88rem"},children:"Loading collection data…"})]}),!x&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14},children:[e.jsx("div",{style:{fontWeight:800,fontSize:"1rem",color:"var(--text)"},children:"🎬 Original Box Office"}),e.jsxs("button",{className:"btn btn-gold btn-sm",style:{fontWeight:800},onClick:()=>y({isEdit:!1,dayData:null,trackType:"original"}),children:["+ Add Day ",V]})]}),l.length===0?e.jsxs("div",{style:{textAlign:"center",padding:"40px 0",color:"var(--muted)",border:"1px dashed var(--border)",borderRadius:12,marginBottom:28},children:[e.jsx("div",{style:{fontSize:"2rem",marginBottom:8},children:"📭"}),e.jsx("div",{style:{fontWeight:700,marginBottom:6,color:"var(--text)",fontSize:"0.95rem"},children:"No original box office data yet"}),e.jsx("button",{className:"btn btn-gold btn-sm",style:{fontWeight:800,marginTop:8},onClick:()=>y({isEdit:!1,dayData:null,trackType:"original"}),children:"+ Add Day 1 Collection"})]}):e.jsxs(e.Fragment,{children:[e.jsx("div",{style:{overflowX:"auto",borderRadius:12,border:"1px solid var(--border)",marginBottom:8},children:e.jsxs("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:"0.88rem"},children:[e.jsx("thead",{children:e.jsx("tr",{style:{background:"var(--bg2)"},children:["Day","Date","Net Collection","Gross Collection","Notes",""].map((o,d)=>e.jsx("th",{style:{padding:"12px 16px",textAlign:"left",fontSize:"0.64rem",color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,whiteSpace:"nowrap",borderBottom:"2px solid var(--border)"},children:o},d))})}),e.jsx("tbody",{children:l.map((o,d)=>e.jsxs("tr",{style:{borderBottom:"1px solid var(--border)",background:d%2===0?"transparent":"rgba(255,255,255,0.012)",transition:"background 0.1s"},onMouseEnter:v=>v.currentTarget.style.background="rgba(201,151,58,0.05)",onMouseLeave:v=>v.currentTarget.style.background=d%2===0?"transparent":"rgba(255,255,255,0.012)",children:[e.jsxs("td",{style:{padding:"12px 16px",fontWeight:800,color:"var(--gold)",whiteSpace:"nowrap"},children:["Day ",o.day,o.day===1&&e.jsx("span",{style:{marginLeft:6,fontSize:"0.6rem",background:"rgba(201,151,58,0.14)",color:"var(--gold)",padding:"1px 6px",borderRadius:8},children:"Opening"})]}),e.jsx("td",{style:{padding:"12px 16px",color:"var(--muted)",fontSize:"0.8rem"},children:o.date?new Date(o.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"—"}),e.jsx("td",{style:{padding:"12px 16px",fontWeight:700},children:h(o.net)}),e.jsx("td",{style:{padding:"12px 16px",fontWeight:600,color:"#7ec8e3"},children:h(o.gross)}),e.jsx("td",{style:{padding:"12px 16px",color:"var(--muted)",fontSize:"0.78rem",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:o.note||"—"}),e.jsxs("td",{style:{padding:"12px 16px",whiteSpace:"nowrap",display:"flex",gap:6},children:[e.jsx("button",{className:"btn btn-ghost btn-sm",style:{fontSize:"0.72rem",padding:"4px 12px"},onClick:()=>y({isEdit:!0,dayData:o,trackType:"original"}),children:"✏️ Edit"}),e.jsx("button",{className:"btn btn-ghost btn-sm",style:{fontSize:"0.72rem",padding:"4px 12px",color:"#e87a6a",border:"1px solid rgba(220,50,50,0.35)"},onClick:async()=>{if(window.confirm(`Delete Day ${o.day} collection data? This cannot be undone.`))try{await X.adminDeleteBoxOfficeDay(t._id,o.day,"original"),i(`Day ${o.day} deleted.`,"success"),z(t)}catch(v){i("❌ Delete failed: "+v.message,"error")}},children:"🗑️ Delete"})]})]},o.day))}),e.jsx("tfoot",{children:e.jsxs("tr",{style:{background:"rgba(201,151,58,0.07)",borderTop:"2px solid var(--border)"},children:[e.jsxs("td",{colSpan:2,style:{padding:"12px 16px",fontWeight:800,fontSize:"0.78rem",color:"var(--gold)",textTransform:"uppercase",letterSpacing:"0.07em"},children:["TOTAL (",l.length," day",l.length!==1?"s":"",")"]}),e.jsx("td",{style:{padding:"12px 16px",fontWeight:800,color:"var(--gold)",fontSize:"1rem"},children:h(G)}),e.jsx("td",{style:{padding:"12px 16px",fontWeight:800,color:"#7ec8e3",fontSize:"1rem"},children:h(q)}),e.jsx("td",{colSpan:2})]})})]})}),e.jsxs("div",{style:{marginBottom:32,padding:"10px 16px",background:"rgba(201,151,58,0.04)",border:"1px solid rgba(201,151,58,0.14)",borderRadius:10,fontSize:"0.77rem",color:"var(--muted)",lineHeight:1.7},children:["💡 ",e.jsx("strong",{style:{color:"var(--text)"},children:"Tip:"})," Use ",e.jsxs("strong",{style:{color:"var(--gold)"},children:["+ Add Day ",V]})," to record new data. Toggle ",e.jsx("strong",{style:{color:"var(--gold)"},children:"🤖 AI Blog"})," to also publish an SEO article."]})]}),L&&e.jsxs(e.Fragment,{children:[e.jsx("div",{style:{borderTop:"2px solid rgba(201,151,58,0.3)",margin:"8px 0 22px"}}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14},children:[e.jsxs("div",{children:[e.jsx("div",{style:{fontWeight:800,fontSize:"1rem",color:"#c9973a"},children:"🔄 Re-Release Box Office"}),e.jsxs("div",{style:{fontSize:"0.72rem",color:"var(--muted)",marginTop:2},children:["Re-Released: ",new Date(t.reReleaseDate).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})]})]}),e.jsxs("button",{className:"btn btn-gold btn-sm",style:{fontWeight:800,background:"rgba(201,151,58,0.2)",border:"1px solid rgba(201,151,58,0.5)"},onClick:()=>y({isEdit:!1,dayData:null,trackType:"re-release"}),children:["+ Add Re-Release Day ",M]})]}),m.length===0?e.jsxs("div",{style:{textAlign:"center",padding:"40px 0",color:"var(--muted)",border:"1px dashed rgba(201,151,58,0.35)",borderRadius:12,marginBottom:28},children:[e.jsx("div",{style:{fontSize:"2rem",marginBottom:8},children:"🔄"}),e.jsx("div",{style:{fontWeight:700,marginBottom:6,color:"var(--text)",fontSize:"0.95rem"},children:"No re-release box office data yet"}),e.jsx("div",{style:{fontSize:"0.8rem",marginBottom:12},children:"Add re-release day-wise collection data to track the re-release run separately."}),e.jsx("button",{className:"btn btn-gold btn-sm",style:{fontWeight:800},onClick:()=>y({isEdit:!1,dayData:null,trackType:"re-release"}),children:"+ Add Re-Release Day 1"})]}):e.jsxs(e.Fragment,{children:[e.jsx("div",{style:{overflowX:"auto",borderRadius:12,border:"1px solid rgba(201,151,58,0.3)",marginBottom:8},children:e.jsxs("table",{style:{width:"100%",borderCollapse:"collapse",fontSize:"0.88rem"},children:[e.jsx("thead",{children:e.jsx("tr",{style:{background:"rgba(201,151,58,0.06)"},children:["Day","Date","Net Collection","Gross Collection","Notes",""].map((o,d)=>e.jsx("th",{style:{padding:"12px 16px",textAlign:"left",fontSize:"0.64rem",color:"#c9973a",textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:700,whiteSpace:"nowrap",borderBottom:"2px solid rgba(201,151,58,0.25)"},children:o},d))})}),e.jsx("tbody",{children:m.map((o,d)=>e.jsxs("tr",{style:{borderBottom:"1px solid var(--border)",background:d%2===0?"transparent":"rgba(201,151,58,0.02)",transition:"background 0.1s"},onMouseEnter:v=>v.currentTarget.style.background="rgba(201,151,58,0.07)",onMouseLeave:v=>v.currentTarget.style.background=d%2===0?"transparent":"rgba(201,151,58,0.02)",children:[e.jsxs("td",{style:{padding:"12px 16px",fontWeight:800,color:"#c9973a",whiteSpace:"nowrap"},children:["Day ",o.day,o.day===1&&e.jsx("span",{style:{marginLeft:6,fontSize:"0.6rem",background:"rgba(201,151,58,0.18)",color:"#c9973a",padding:"1px 6px",borderRadius:8},children:"Re-Opening"})]}),e.jsx("td",{style:{padding:"12px 16px",color:"var(--muted)",fontSize:"0.8rem"},children:o.date?new Date(o.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"—"}),e.jsx("td",{style:{padding:"12px 16px",fontWeight:700},children:h(o.net)}),e.jsx("td",{style:{padding:"12px 16px",fontWeight:600,color:"#7ec8e3"},children:h(o.gross)}),e.jsx("td",{style:{padding:"12px 16px",color:"var(--muted)",fontSize:"0.78rem",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:o.note||"—"}),e.jsxs("td",{style:{padding:"12px 16px",whiteSpace:"nowrap",display:"flex",gap:6},children:[e.jsx("button",{className:"btn btn-ghost btn-sm",style:{fontSize:"0.72rem",padding:"4px 12px"},onClick:()=>y({isEdit:!0,dayData:o,trackType:"re-release"}),children:"✏️ Edit"}),e.jsx("button",{className:"btn btn-ghost btn-sm",style:{fontSize:"0.72rem",padding:"4px 12px",color:"#e87a6a",border:"1px solid rgba(220,50,50,0.35)"},onClick:async()=>{if(window.confirm(`Delete Re-Release Day ${o.day}? This cannot be undone.`))try{await X.adminDeleteBoxOfficeDay(t._id,o.day,"re-release"),i(`Re-Release Day ${o.day} deleted.`,"success"),z(t)}catch(v){i("❌ Delete failed: "+v.message,"error")}},children:"🗑️ Delete"})]})]},o.day))}),e.jsx("tfoot",{children:e.jsxs("tr",{style:{background:"rgba(201,151,58,0.1)",borderTop:"2px solid rgba(201,151,58,0.3)"},children:[e.jsxs("td",{colSpan:2,style:{padding:"12px 16px",fontWeight:800,fontSize:"0.78rem",color:"#c9973a",textTransform:"uppercase",letterSpacing:"0.07em"},children:["RE-RELEASE TOTAL (",m.length," day",m.length!==1?"s":"",")"]}),e.jsx("td",{style:{padding:"12px 16px",fontWeight:800,color:"#c9973a",fontSize:"1rem"},children:h(Y)}),e.jsx("td",{style:{padding:"12px 16px",fontWeight:800,color:"#7ec8e3",fontSize:"1rem"},children:h(D)}),e.jsx("td",{colSpan:2})]})})]})}),e.jsxs("div",{style:{marginBottom:16,padding:"10px 16px",background:"rgba(201,151,58,0.04)",border:"1px solid rgba(201,151,58,0.2)",borderRadius:10,fontSize:"0.77rem",color:"var(--muted)",lineHeight:1.7},children:["💡 ",e.jsx("strong",{style:{color:"var(--text)"},children:"Tip:"})," Use ",e.jsxs("strong",{style:{color:"#c9973a"},children:["+ Add Re-Release Day ",M]})," to record more data. Toggle ",e.jsx("strong",{style:{color:"#c9973a"},children:"🤖 AI Blog"})," to publish a re-release specific blog article."]})]})]})]})]}),w&&t&&e.jsx(De,{movie:t,isEdit:w.isEdit,dayData:w.isEdit?w.dayData:null,allDays:w.trackType==="re-release"?m:l,onClose:()=>y(null),onSaved:()=>z(t),onToast:i,trackType:w.trackType||"original"}),k&&t&&e.jsx(Ae,{movie:t,allDays:l,onClose:()=>$(!1),onSaved:()=>z(t),onToast:i})]})}export{Ee as default};
