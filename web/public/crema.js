/* Crema app script. Runs as a classic script once components/Boot.tsx has loaded the
   directory from /api/directory (Supabase) into window.__CREMA_DATA__. */
const DATA = window.__CREMA_DATA__;
const R = Object.fromEntries(DATA.roasters.map(r=>[r.id,r]));
const B = DATA.beans;
const P = DATA.pods||[];
const ALL = B.concat(P);
const isPod = x=>x.id.startsWith("pod-");
const SYSTEMS = ["Nespresso Original","Nespresso Vertuo","Dolce Gusto","Tassimo"];
const perPod = p=>perCup(p);
const rk = b=>b.brewRoast||b.roast;
const money = x=>x==null?"See shop":`£${(+x).toFixed(2)}`;
const hasLogo = r=>!!(r&&r.logo&&r.logo.src);
const logoImg = r=>`<img src="${esc(r.logo.src)}" alt="${esc(r.name)} logo" loading="lazy">`;
/* Logo tile wherever a roaster is shown; falls back to initials. White/negative logos sit on an ink tile. */
const mark = (r,cls="mono",style="")=>hasLogo(r)?`<div class="${cls} logo-tile${r.logo.dark?" dark":""}">${logoImg(r)}</div>`:`<div class="${cls}"${style?` style="${style}"`:""}>${esc(initials(r.name))}</div>`;
const sizeTxt = g=>g>=1000?`${g/1000}kg`:`${g}g`;
/* Price as the roaster lists it: "from" when it's the lowest of several sizes, per pod/sachet for single-serve, bag size when it isn't the usual 200–250g. */
const priceTag = x=>{ if(x.price==null) return "See shop";
  if(x.perUnit) return `£${x.price.toFixed(2)} <small style="font-weight:600;color:var(--muted)">per ${x.unit}</small>`;
  const odd = x.size && (x.size<200||x.size>250);
  return `${x.priceFrom?'<small style="font-weight:600;color:var(--muted)">from</small> ':""}£${x.price.toFixed(2)}${odd?` <small style="font-weight:600;color:var(--muted)">/ ${sizeTxt(x.size)}</small>`:""}`; };
const priceSpec = x=>{ if(x.price==null) return "See shop";
  const line = x.perUnit ? `per ${x.unit}${x.size?` (${x.size}g)`:""}` : `${x.priceFrom?"from, ":""}${x.size?sizeTxt(x.size)+" bag":""}${x.sizeConfirmed?"":", size not confirmed"}`;
  return `£${x.price.toFixed(2)}<br><span class="why">${esc(line)}</span>`; };
const REAL = DATA.roasters.filter(r=>!r.sample);
const exBadge = r=>r&&r.sample?`<span class="badge" style="background:#fff4d6;color:#7a5a00">Example</span>`:"";
const GUIDES = DATA.guides||[];
const SM = DATA.supermarket||[];
const FAM = {chocolate:/chocolate|cocoa|cacao/,caramel:/caramel|toffee|brown sugar|molasses|honey|syrup|fudge|strudel|vanilla/,nutty:/almond|hazelnut|macadamia|nut|praline|walnut/,
  "dark fruit":/berry|currant|cherry|raisin|dried fruit|plum|rum/,citrus:/lemon|lime|orange|mandarin|tangerine|grapefruit|citrus|bergamot|zest/,
  "tropical/stone fruit":/peach|apricot|mango|lychee|tropical|tamarind|pear/,floral:/jasmine|floral|rose|hibiscus/,tea:/\btea\b/,"spice & smoke":/spice|pepper|liquorice|clove|cinnamon|oak|cedar|smok/};
const fams = notes=>new Set(Object.entries(FAM).filter(([k,re])=>notes.some(n=>re.test(n.toLowerCase()))).map(([k])=>k));
const perCup = x=> x.price==null?null:x.perUnit?(x.unit==="sachet"&&x.size?x.price/x.size*12:x.price):(x.count?x.price/x.count:(x.size?x.price/x.size*15:null));
const TEMP = {"Light":96,"Light-Medium":94,"Medium":93,"Medium-Dark":91,"Dark":89};
let kit = new Set();
try{ kit = new Set(JSON.parse(localStorage.getItem("kit")||"[]")) }catch(e){}
function saveKit(){ try{ localStorage.setItem("kit",JSON.stringify([...kit])) }catch(e){} }
const ownedGuides = ()=>GUIDES.filter(g=>kit.has(g.id));
const ownedSystems = ()=>SYSTEMS.filter(s=>kit.has(s));
const myPods = ()=>ownedSystems().length?P.filter(p=>kit.has(p.system)):P;
/* rank brew methods for a bean: roast suits the method + taste bonus */
function methodScore(g,b){ return (g.affinity[rk(b)]||0) + (g.tasteBonus[b.taste]||0); }
function brewPlan(b){
  const all=[...GUIDES].sort((x,y)=>methodScore(y,b)-methodScore(x,b));
  const mine=all.filter(g=>kit.has(g.id));
  return {best:(mine[0]||all[0]), mine, all, usingKit:mine.length>0};
}
function recipeFor(g,b){
  const R0=rk(b);
  const temp = g.id==="guide-moka" ? "Just boiled" : `${g.kind==="espresso"?Math.min(TEMP[R0]||93,94):TEMP[R0]||93}°C`;
  const ratio = g.kind==="espresso" ? (/^Light/.test(R0)?"1:2.5":"1:2") : `1:${Math.round(g.water/g.dose)}`;
  const water = g.kind==="espresso" ? (/^Light/.test(R0)?g.dose*2.5:g.water) : g.water;
  return {dose:g.dose, water, ratio, temp, grind:g.grind + (/^Light/.test(R0)&&g.kind!=="immersion"?" (a touch finer for this lighter roast)":"")};
}
const STRENGTH_BANDS=[{min:1,max:3,label:"Light & Bright",cls:"s-light",plain:"Delicate and easy-drinking, often fruity or floral."},{min:4,max:6,label:"Smooth & Balanced",cls:"s-mid",plain:"Rounded and everyday — sweet, nutty or chocolatey."},{min:7,max:9,label:"Bold & Rich",cls:"s-bold",plain:"Deep and intense, for strong, full-bodied cups."}];
function strength(x){
  const roastN={"Light":2,"Light-Medium":3,"Medium":5,"Medium-Dark":7,"Dark":8};
  const tasteN={"Florals & Tea":2,"Bright & Fruity":3,"Chocolate Comfort":6};
  const known=x.roast&&x.roast!=="Not stated"&&roastN[x.roast]!=null;
  let n;
  if(known){ n=roastN[x.roast]; if(x.taste==="Chocolate Comfort")n+=1; else if(x.taste==="Florals & Tea")n-=1; }
  else n=tasteN[x.taste]!=null?tasteN[x.taste]:5;
  return {n:Math.max(1,Math.min(9,n)), est:!known};
}
function strengthBand(n){ return STRENGTH_BANDS.find(b=>n>=b.min&&n<=b.max); }
function strengthMeter(x,big){ const {n}=strength(x), band=strengthBand(n);
  return `<span class="smeter ${band.cls}${big?" big":""}" title="Strength ${n} of 9: ${esc(band.label)}" aria-label="Strength ${n} of 9, ${esc(band.label)}">${Array.from({length:9},(_,i)=>`<i${i<n?' class="on"':''}></i>`).join("")}</span>`; }
const TASTES = {"Bright & Fruity":{cls:"t-fruity",slug:"fruity",blurb:"Berries, citrus and stone fruit"},"Chocolate Comfort":{cls:"t-choc",slug:"chocolate",blurb:"Cocoa, caramel and nuts"},"Florals & Tea":{cls:"t-floral",slug:"floral",blurb:"Jasmine, bergamot and black tea"}};
const ROASTS = ["Light","Light-Medium","Medium","Medium-Dark","Dark"];
const $ = s=>document.querySelector(s);
const $all = s=>document.querySelectorAll(s);
function linkCardTitles(root){
  const cards=[...(root.matches?.("[data-go]")?[root]:[]),...root.querySelectorAll("[data-go]")];
  cards.forEach(card=>{const title=card.querySelector("h3");if(!title||title.querySelector("a"))return;const link=document.createElement("a");link.href=card.dataset.go;link.className="card-title";while(title.firstChild)link.appendChild(title.firstChild);title.appendChild(link);});
}
new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType===1)linkCardTitles(node);}))).observe(document.querySelector("main"),{childList:true,subtree:true});
const shuffle = a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const esc = s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const initials = n=>n.split(/\s+/).filter(w=>/^[A-Za-z]/.test(w)).slice(0,2).map(w=>w[0]).join("").toUpperCase();
const countries = o=>(o||"").split(/[\/,]/).map(s=>s.trim()).filter(Boolean);

/* ---------- likes (kept in this browser only) ---------- */
let liked = new Set();
try{ liked = new Set(JSON.parse(localStorage.getItem("liked")||"[]")) }catch(e){}
function saveLikes(){ try{ localStorage.setItem("liked",JSON.stringify([...liked])) }catch(e){} }
function toggleLike(id){ const restoreFocus=document.activeElement?.dataset.like===id; liked.has(id)?liked.delete(id):liked.add(id); saveLikes(); route(); if(restoreFocus) document.querySelector(`.view.on [data-like="${CSS.escape(id)}"]`)?.focus({preventScroll:true}); }

/* ---------- recommendations ----------
   Score each bean against a liked bean: same taste family, shared tasting
   notes, closeness of roast level, same process, shared origin, similar price. */
function similarity(a,b){
  const shared = a.notes.filter(n=>b.notes.includes(n));
  const fa=fams(a.notes), fb=fams(b.notes), sharedF=[...fa].filter(f=>fb.has(f));
  let s = 0;
  s += sharedF.length*1.5;
  if(a.taste===b.taste) s+=3;
  s += shared.length*2.5;
  const rd = Math.abs(ROASTS.indexOf(rk(a))-ROASTS.indexOf(rk(b)));
  s += (1 - rd/4)*2;
  if(a.process&&a.process===b.process&&a.process!=="Not stated") s+=1;
  if(countries(a.origin).some(c=>countries(b.origin).includes(c))) s+=1;
  if(a.system&&b.system) s += a.system===b.system?4:-6;  // pods must fit your machine
  {const ca=perCup(a),cb=perCup(b); if(ca!=null&&cb!=null) s -= Math.min(Math.abs(ca-cb)/0.6,1);}
  return {score:s, shared, fams:sharedF};
}
function recommend(seeds, n=6, pool=B){
  const seedSet = new Set(seeds.map(b=>b.id));
  const scored = pool.filter(b=>!seedSet.has(b.id)&&b.notes[0]!=="Not stated")  // nothing to match on without notes
   .map(b=>{
    let best={score:-1e9,shared:[]};
    seeds.forEach(sd=>{const r=similarity(sd,b); if(r.score>best.score) best={...r,seed:sd}});
    return {bean:b,...best};
  }).sort((x,y)=>y.score-x.score);
  // keep variety: at most 2 picks from any one roaster
  const per={}, out=[];
  for(const r of scored){ per[r.bean.roaster]=(per[r.bean.roaster]||0)+1; if(per[r.bean.roaster]<=2) out.push(r); if(out.length>=n) break; }
  // not enough variety yet? top up with the next best, whoever roasts them
  for(const r of scored){ if(out.length>=n) break; if(!out.includes(r)) out.push(r); }
  return out;
}

/* ---------- rendering ---------- */
function bag(b,big){
  const r=R[b.roaster];
  const heart=big?"":`<button class="heart ${liked.has(b.id)?"on":""}" data-like="${b.id}" aria-label="${liked.has(b.id)?"Unlike":"Like"} ${esc(b.name)}" aria-pressed="${liked.has(b.id)}">${liked.has(b.id)?"♥":"♡"}</button>`;
  if(b.bagImg) return `<div class="bag photo ${TASTES[b.taste].cls}"><img loading="lazy" data-bean="${b.id}" src="${esc(b.bagImg)}" alt="${esc(b.name)} by ${esc(r.name)}" onerror="bagImgFail(this)">${heart}</div>`;
  return `<div class="bag ${TASTES[b.taste].cls}">${bagPouchHTML(b)}${heart}</div>`;
}
function bagPouchHTML(b){const r=R[b.roaster];return `<div class="pouch${hasLogo(r)?" has-logo"+(r.logo.dark?" dark":""):""}">${hasLogo(r)?logoImg(r):esc(initials(r.name))}<small>${esc(b.roastKnown===false?(b.decaf?"decaf":""):b.roast)}</small></div>`;}
function bagImgFail(img){const b=ALL.find(x=>x.id===img.dataset.bean);const w=img.closest(".bag");if(!w)return;w.classList.remove("photo");const d=document.createElement("div");d.innerHTML=b?bagPouchHTML(b):"";if(d.firstChild)img.replaceWith(d.firstChild);else img.remove();}
function beanCard(b,why){
  const r=R[b.roaster];
  const match = why? new Set(why.shared):new Set();
  return `<article class="card bean" data-go="#${b.id}">${bag(b)}
    <div class="body"><span class="rname">${esc(r.name)}</span><h3>${esc(b.name)}</h3>
    <div class="chips">${b.notes.filter(n=>n!=="Not stated").map(n=>`<span class="chip ${match.has(n)?"match":""}">${esc(n)}</span>`).join("")}</div>
    ${(()=>{const m=ownedGuides().filter(g=>methodScore(g,b)>=3)[0];return m?`<div class="chips"><span class="chip kitfit">✓ Great in your ${esc(m.method)}</span></div>`:""})()}
    ${why?`<div class="why">${whyText(why)}</div>`:""}
    <div class="meta"><span class="smwrap">${strengthMeter(b)} <span class="why" style="margin:0">${esc(strengthBand(strength(b).n).label)}</span></span><b>${priceTag(b)}</b></div></div></article>`;
}
function capsule(p,big){
  const r=R[p.roaster];
  return `<div class="bag ${TASTES[p.taste].cls}"><div class="capsule">${esc(initials(r.name))}<small>${p.intensity?p.intensity+"/13":"pods"}</small></div><span class="sys">${p.system==="Not stated"?"Machine not stated":esc(p.system)}</span>${big?"":`<button class="heart ${liked.has(p.id)?"on":""}" data-like="${p.id}" aria-label="${liked.has(p.id)?"Unlike":"Like"} ${esc(p.name)}" aria-pressed="${liked.has(p.id)}">${liked.has(p.id)?"♥":"♡"}</button>`}</div>`;
}
const intensity = n=>`<span class="int" title="Intensity ${n} of 13">${Array.from({length:13},(_,i)=>`<i class="${i<n?"on":""}"></i>`).join("")}</span>`;
function podCard(p,why){
  const r=R[p.roaster], match=why?new Set(why.shared):new Set();
  return `<article class="card bean" data-go="#${p.id}">${capsule(p)}
    <div class="body"><span class="rname">${esc(r.name)} ${exBadge(r)}</span><h3>${esc(p.name)}</h3>
    <div class="chips">${p.notes.filter(n=>n!=="Not stated").map(n=>`<span class="chip ${match.has(n)?"match":""}">${esc(n)}</span>`).join("")}</div>
    ${why?`<div class="why">${whyText(why)}</div>`:""}
    ${kit.has(p.system)?`<div class="chips"><span class="chip kitfit">✓ Fits your machine</span></div>`:""}
    ${p.intensity?intensity(p.intensity):""}
    <div class="meta"><span>${p.count?p.count+" pods · ":""}${p.material==="Not stated"?"Capsule material not stated":esc(p.material.split(" (")[0])}</span><b>${priceTag(p)}</b></div></div></article>`;
}
const anyCard=(x,why)=>isPod(x)?podCard(x,why):beanCard(x,why);
function whyText(w){
  if(w.seed.custom) return `${esc(w.bean.taste)} · ${esc(w.bean.roastNote||w.bean.roast)}`;
  const nm=esc(w.seed.name);
  if(w.shared.length) return `Shares ${w.shared.map(esc).join(", ")} with ${nm}`;
  if(w.fams&&w.fams.length) return `${w.fams.map(f=>f[0].toUpperCase()+f.slice(1)).join(" & ")} notes, like ${nm}`;
  return `Similar roast to ${nm}`;
}
/* What each roaster offers. Filled from the Roaster Tracker's Yes/No columns; a few are worked out from the coffees we list. */
const OFFERS=[["subscription","Subscriptions"],["oneoff","Buy without subscribing"],["decaf","Decaf"],["singleOrigin","Single origins"],["lightRoast","Light roasts"],["pods","Pods & capsules"],
 ["wholesale","Wholesale"],["cafe","Café to visit"],["visits","Roastery visits"],["training","Training & courses"],["equipment","Sells equipment"],["directTrade","Direct trade"],
 ["organic","Organic or certified"],["bcorp","B Corp"],["awards","Award-winning"],["femaleFounded","Female-founded"]];
const offers=r=>r.offers||{};
const offerLabel=k=>(OFFERS.find(o=>o[0]===k)||[k,k])[1];
let rFilt=new Set();
let rRegion="";
// curated roaster filters: [key, title, description, icon-svg-path]
const FILT_UI=[
  ["cof","Coffees listed","We've catalogued their coffees",'<path d="M4 6h16M4 12h16M4 18h10"/>'],
  ["shop","Has a webshop","Buy online directly",'<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M3 4h2l2.4 12.5a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L21 8H6"/>'],
  ["subscription","Subscriptions","Recurring coffee deliveries",'<path d="M4 10a8 8 0 0 1 13-5l2 2M20 14a8 8 0 0 1-13 5l-2-2"/><path d="M19 3v4h-4M5 21v-4h4"/>'],
  ["decaf","Decaf","Offers decaf options",'<path d="M4 8h13a3 3 0 0 1 0 6h-1M4 8v6a4 4 0 0 0 4 4h5a4 4 0 0 0 4-4M7 4v1M11 4v1"/>'],
  ["singleOrigin","Single origins","Traceable single-origin coffees",'<path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Z"/><circle cx="12" cy="9" r="2.3"/>'],
  ["wholesale","Wholesale","Supplies cafés and businesses",'<path d="M3 8l9-5 9 5-9 5-9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>'],
  ["pods","Pods & capsules","Makes pods or capsules",'<rect x="8" y="3" width="8" height="7" rx="2"/><path d="M7 10h10l-1.2 9.2a2 2 0 0 1-2 1.8h-3.6a2 2 0 0 1-2-1.8Z"/>']
];
const filtPred=(r,k)=> k==="cof"?B.some(b=>b.roaster===r.id) : k==="shop"?!!r.shop : offers(r)[k]===true;
const filtCount=k=>REAL.filter(r=>filtPred(r,k)).length;
const filtLabel=k=>(FILT_UI.find(f=>f[0]===k)||[k,k])[1];
function roasterCard(r){
  const n=B.filter(b=>b.roaster===r.id).length;
  const head = hasLogo(r)
    ? `<div class="logo-banner${r.logo.dark?" dark":""}">${logoImg(r)}</div><div class="top named"><div><h3 style="margin:0">${esc(r.name)}</h3><span class="rname">${esc(r.city)}</span></div></div>`
    : `<div class="top">${mark(r)}<div><h3 style="margin:0">${esc(r.name)}</h3><span class="rname">${esc(r.city)}</span></div></div>`;
  return `<article class="card roaster bean${hasLogo(r)?" with-logo":""}" data-go="#roaster-${r.id}">${head}
  <div class="body"><div class="chips" style="margin-top:4px">${r.shop?`<span class="chip">Webshop</span>`:`<span class="chip">No webshop yet</span>`}${OFFERS.filter(([k])=>offers(r)[k]===true&&!["pods","wholesale"].includes(k)).slice(0,3).map(([k,l])=>`<span class="chip${rFilt.has(k)?" kitfit":""}">${esc(l)}</span>`).join("")}${offers(r).pods?`<span class="chip">Pods</span>`:""}${n?`<span class="chip match">${n} coffees listed</span>`:""}</div>
  <div class="meta"><span>${esc(r.region)}</span>${r.wholesale.offers||offers(r).wholesale?`<span class="badge">Wholesale</span>`:""}</div></div></article>`;
}
function fill(sel,vals){ const el=$(sel); vals.forEach(v=>el.insertAdjacentHTML("beforeend",`<option>${esc(v)}</option>`)); }
const uniq = a=>[...new Set(a)].sort();

function renderHome(){
  $("#st-r").textContent=REAL.length.toLocaleString("en-GB"); $("#st-b").textContent=B.length.toLocaleString("en-GB"); $("#st-w").textContent=new Set(B.map(b=>b.roaster)).size.toLocaleString("en-GB");
  const withCoffee=REAL.filter(r=>B.some(b=>b.roaster===r.id)); const featPool=withCoffee.filter(hasLogo); const f=shuffle(featPool.length?featPool:withCoffee)[0]||REAL[0], fb=B.filter(b=>b.roaster===f.id);  // random featured roaster each visit
  $("#featured").innerHTML=`${mark(f,"art")}<div class="txt"><span class="eyebrow">Behind the beans / Roaster spotlight</span><h2>${esc(f.name)}</h2><p>${esc(f.city)} · ${esc(f.region)}</p><div class="chips" style="margin-bottom:16px">${[...new Set(fb.flatMap(b=>b.notes))].slice(0,6).map(n=>`<span class="chip">${esc(n)}</span>`).join("")}</div><p style="color:var(--muted)">${fb.length} coffees listed${f.wholesale.offers?" · supplies wholesale":""}</p><div class="btns"><a class="btn primary small" href="#roaster-${f.id}">Meet the roaster ↗</a><a class="btn small" href="#beans" data-roaster="${f.id}">Explore their coffee</a></div></div>`;
  const wall=shuffle(REAL.filter(hasLogo));  // random selection each visit
  $("#logoWall").innerHTML=wall.slice(0,6).map(r=>`<a class="wall-tile${r.logo.dark?" dark":""}" href="#roaster-${r.id}" title="${esc(r.name)}">${logoImg(r)}</a>`).join("");
  $("#logoWallSec").hidden=!wall.length;
  const tasteArt={fruity:'<circle cx="42" cy="61" r="23"/><circle cx="68" cy="56" r="22"/><path d="M42 38c2-16 13-25 28-25-2 13-11 19-24 20M60 35c-3-11-1-18 3-24M31 53c-4 4-5 9-4 13M62 44c-5 2-8 6-8 11"/>',chocolate:'<path d="M32 84c-20-18-16-42 3-57S76 11 87 28c13 21-5 49-25 58-13 6-23 5-30-2Z"/><path d="M36 78c1-18 13-19 17-32s12-21 26-20M42 34l-2 15M64 67l-4 13M71 37l-3 15"/>',floral:'<path d="M55 50C23 32 42 8 55 34 66 5 90 23 66 44 99 35 101 65 70 59 90 85 62 99 57 67 38 94 16 72 46 58 15 61 20 31 47 46Z"/><circle cx="57" cy="51" r="8"/><path d="M58 69v32M58 92c-15 0-21-7-21-15 12 0 20 4 21 15"/>'};
  $("#tastes").innerHTML=Object.entries(TASTES).map(([k,t],i)=>`<a class="taste ${t.cls}" href="#beans" data-taste="${esc(k)}"><div class="taste-top"><span>0${i+1} / The flavour collection</span><span class="taste-count">${B.filter(b=>b.taste===k).length} coffees</span></div><svg class="taste-art" viewBox="0 0 110 110" aria-hidden="true">${tasteArt[t.slug]}</svg><div><b>${esc(k)}</b><span class="taste-desc">${t.blurb}</span></div><span class="taste-arrow" aria-hidden="true">↗</span></a>`).join("");
  const recentRoasters=new Set();
  const recentBeans=B.filter(b=>b.notes.some(n=>!/^not (stated|listed)$/i.test(n))).sort((a,b)=>a.addedDays-b.addedDays).filter(b=>{if(recentRoasters.has(b.roaster))return false;recentRoasters.add(b.roaster);return true;});
  $("#fresh").innerHTML=recentBeans.slice(0,4).map(b=>beanCard(b)).join("");
    $("#homeMachines").innerHTML=[...SYSTEMS,"Not stated"].filter(s=>P.some(p=>p.system===s)).map(s=>`<a class="pill" href="#pods" data-system="${esc(s)}">${s==="Not stated"?"Machine not stated":esc(s)} · ${P.filter(p=>p.system===s).length}</a>`).join("");
  $("#homePods").innerHTML=P.filter(p=>p.notes[0]!=="Not stated").sort((a,b)=>a.addedDays-b.addedDays).slice(0,4).map(p=>podCard(p)).join("");
  const seeds=ALL.filter(b=>liked.has(b.id));
  $("#homeForYou").hidden=!seeds.length;
  if(seeds.length){ $("#fyLede").textContent=`Based on the ${seeds.length} coffee${seeds.length>1?"s":""} you liked.`; $("#homeRecs").innerHTML=recommend(seeds,4).map(r=>beanCard(r.bean,r)).join(""); }
}
let beanFilter={q:"",taste:"",roast:"",proc:"",strength:"",sort:"new",roaster:"",decaf:false}; let bLimit=48;
function renderBeans(){
  ["q","taste","roast","proc","strength","sort"].forEach(k=>$("#f"+k).value=beanFilter[k]);
  const q=beanFilter.q.toLowerCase();
  let list=B.filter(b=>(!beanFilter.decaf||b.decaf)&&(!beanFilter.taste||b.taste===beanFilter.taste)&&(!beanFilter.roast||b.roast===beanFilter.roast)&&(!beanFilter.proc||b.process===beanFilter.proc)&&(!beanFilter.roaster||b.roaster===beanFilter.roaster)&&(!beanFilter.strength||strengthBand(strength(b).n).cls==="s-"+beanFilter.strength)
    &&(!q||[b.name,b.origin,b.process,b.producer||"",b.listedNotes||"",b.desc||"",R[b.roaster].name,...b.notes].join(" ").toLowerCase().includes(q)));
  const pv=(x,d)=>{const c=perCup(x);return c==null?d:c}; list.sort(beanFilter.sort==="lo"?(a,b)=>pv(a,1e9)-pv(b,1e9):beanFilter.sort==="hi"?(a,b)=>pv(b,-1)-pv(a,-1):(a,b)=>a.addedDays-b.addedDays);
  $("#beanCount").textContent=`${list.length} of ${B.length} coffees`+(beanFilter.roaster?` from ${R[beanFilter.roaster].name}`:"");
  $("#beanGrid").innerHTML=list.length?list.slice(0,bLimit).map(b=>beanCard(b)).join(""):`<div class="empty">No coffees match those filters.</div>`;
  $("#bmore").hidden=list.length<=bLimit;
}
function brewBox(b){
  const {best,mine,all,usingKit}=brewPlan(b), r=recipeFor(best,b);
  const others=(usingKit?mine:all).filter(g=>g!==best).slice(0,3);
  const noGrinder = usingKit && !kit.has("Grinder");
  return `<div class="brewbox"><span class="eyebrow">${usingKit?"Best with your equipment":"Best way to brew it"}</span>
    <h2 style="margin-top:4px">${esc(best.method)}</h2><p style="margin:0;color:var(--muted)">${esc(best.why)}</p>
    <div class="recipe"><div><small>Coffee</small><b>${r.dose} g</b></div><div><small>${best.kind==="espresso"?"Yield":"Water"}</small><b>${r.water} g</b></div><div><small>Ratio</small><b>${r.ratio}</b></div><div><small>Water temp</small><b>${r.temp}</b></div><div><small>Time</small><b>${esc(best.time)}</b></div></div>
    <p style="margin:0 0 12px"><b>Grind:</b> ${esc(r.grind)}${(()=>{const v=grindFor(best.id); return v?` · <b>${esc(myGrinder)}: start at ${esc(v[0])}</b>`:v===null?` · <span class="why">your ${esc(myGrinder)} can't grind for this</span>`:""})()}</p>
    ${noGrinder?`<p class="notice" style="margin:0 0 12px">No grinder? Ask ${esc(R[b.roaster].name)} to grind it for ${esc(best.method)}.</p>`:""}
    <div class="btns"><a class="btn primary small" href="#${best.id}">Step-by-step guide</a>${usingKit?"":`<a class="btn small" href="#brew">Choose my equipment</a>`}</div>
    ${others.length?`<div class="alt"><span class="why" style="align-self:center">${usingKit?"Also works in your":"Also good in a"}</span>${others.map(g=>`<a class="chip" href="#${g.id}">${esc(g.method)}</a>`).join("")}</div>`:""}
    ${b.roastKnown===false?`<p class="why" style="margin-top:10px">The roaster doesn't state a roast level, so this recipe assumes a medium roast.</p>`:""}
    ${usingKit&&methodScore(best,b)<2?`<p class="why" style="margin-top:10px">This roast isn't an ideal match for your equipment. The recipe above is tuned to help.</p>`:""}
  </div>`;
}
let detailOrigin="#beans";
let portalRoaster=null; try{portalRoaster=localStorage.getItem("portalR")||null}catch(e){}
function detailBack(fallback){
  const o=detailOrigin||fallback||"#beans";
  if(o.startsWith("#roaster-")){const r=R[o.slice(9)]; if(r) return `<a class="back" href="${esc(o)}">← Back to ${esc(r.name)}</a>`;}
  const map={"#for-you":"← For you","#kitcoffees":"← Coffees for your kit","#pods":"← All pods","#beans":"← All beans","#map":"← Map","#home":"← Home","#swap":"← Supermarket swap"};
  return `<a class="back" href="${esc(o)}">${map[o]||"← Back"}</a>`;
}
function renderBean(id){
  const b=B.find(x=>x.id===id); if(!b) return go("#beans");
  const r=R[b.roaster], recs=recommend([b],6);
  $("#beanDetail").innerHTML=`${detailBack("#beans")}<div class="detail" style="margin-top:16px">${bag(b,true)}
   <div><a href="#roaster-${r.id}" class="rname" style="font-weight:600">${esc(r.name)}</a><h1 style="font-size:2.4rem">${esc(b.name)}</h1>
   ${(()=>{const {n,est}=strength(b),band=strengthBand(n);return `<div class="strength-box"><div class="sb-main">${strengthMeter(b,true)}<div><b>${esc(band.label)}</b> <span class="why">${n}/9${est?" · estimated":""}</span></div></div><div class="sb-plain">${esc(band.plain)}</div></div>`;})()}
   <div class="chips">${b.notes.filter(n=>n!=="Not stated").map(n=>`<span class="chip">${esc(n)}</span>`).join("")}</div>
   ${b.desc?`<p class="desc">${esc(b.desc)}</p>`:""}
   ${b.listedNotes?`<p class="why" style="margin:8px 0 0">Tasting notes as listed: ${esc(b.listedNotes)}</p>`:""}
   <div class="spec"><div><small>Origin</small>${esc(b.origin)}${b.producer&&!/^not /i.test(b.producer)?`<br><span class="why">${esc(b.producer)}</span>`:""}</div>${b.type?`<div><small>Type</small>${esc(b.type)}</div>`:""}<div><small>Process</small>${esc(b.processFull||b.process)}</div><div><small>Roast</small>${esc(b.roastKnown===false?"Not stated":(b.roastNote||b.roast))}</div><div><small>Taste</small>${esc(b.taste)}</div><div><small>Price</small>${priceSpec(b)}</div></div>
   <div class="btns"><button class="btn ${liked.has(b.id)?"primary":""}" data-like="${b.id}">${liked.has(b.id)?"♥ Liked":"♡ I liked this"}</button>${(()=>{const l=coffeeLink(b);return l?`<a class="btn primary" href="${esc(l.href)}" target="_blank" rel="noopener">${l.label}</a>`:"";})()}<a class="btn" href="#roaster-${r.id}">More from ${esc(r.name)}</a>${r.wholesale.offers?`<a class="btn green" href="#wholesale">Buy wholesale</a>`:""}</div></div></div>
   ${brewBox(b)}
   <section style="padding-bottom:0"><div class="sec-head"><div><h2>If you like this, try…</h2><p>Matched on flavour notes, roast level, process and origin.</p></div></div>
   <div class="grid">${recs.map(x=>beanCard(x.bean,x)).join("")}</div></section>
   <section style="padding-bottom:0"><div class="sec-head"><div><h2>Prefer pods?</h2><p>Capsules with a similar flavour profile.</p></div><a href="#pods">All pods</a></div>
   <div class="grid">${recommend([b],4,myPods()).map(x=>podCard(x.bean,x)).join("")}</div></section>`;
}
let podFilter={system:(()=>{const s=SYSTEMS.filter(x=>kit.has(x));return s.length===1?s[0]:""})(),taste:"",mat:"",decaf:false,sort:"new"};
function renderPods(){
  $("#podMachines").innerHTML=[["","All machines"],...SYSTEMS.filter(s=>P.some(p=>p.system===s)).map(s=>[s,s]),...(P.some(p=>p.system==="Not stated")?[["Not stated","Machine not stated"]]:[])].map(([v,l])=>`<button class="pill ${podFilter.system===v?"on":""}" data-system="${esc(v)}">${esc(l)}</button>`).join("");
  $("#ptaste").value=podFilter.taste; $("#pmat").value=podFilter.mat; $("#pdecaf").checked=podFilter.decaf; $("#psort").value=podFilter.sort;
  let list=P.filter(p=>(!podFilter.system||p.system===podFilter.system)&&(!podFilter.taste||p.taste===podFilter.taste)&&(!podFilter.mat||p.material===podFilter.mat)&&(!podFilter.decaf||/decaf/i.test(p.process+p.name)));
  const so={lo:(a,b)=>(perPod(a)||1e9)-(perPod(b)||1e9),"int-lo":(a,b)=>(a.intensity||99)-(b.intensity||99),"int-hi":(a,b)=>(b.intensity||0)-(a.intensity||0)}[podFilter.sort]||((a,b)=>a.addedDays-b.addedDays);
  list.sort(so);
  $("#podCount").textContent=`${list.length} of ${P.length} pods and capsules`+(podFilter.system?` for ${podFilter.system}`:"");
  $("#podGrid").innerHTML=list.length?list.map(p=>podCard(p)).join(""):`<div class="empty">No pods match those filters yet.</div>`;
}
function renderPod(id){
  const p=P.find(x=>x.id===id); if(!p) return go("#pods");
  const r=R[p.roaster];
  const same=recommend([p],4,P.filter(x=>x.system===p.system));
  const beans=recommend([p],4,B);
  $("#podDetail").innerHTML=`${detailBack("#pods")}<div class="detail" style="margin-top:16px">${capsule(p,true)}
   <div><a href="#roaster-${r.id}" class="rname" style="font-weight:600">${esc(r.name)}</a><h1 style="font-size:2.4rem">${esc(p.name)}</h1>
   <div class="chips">${p.notes.filter(n=>n!=="Not stated").map(n=>`<span class="chip">${esc(n)}</span>`).join("")}</div>
   <div class="spec"><div><small>Fits</small>${esc(p.system)}</div>${p.intensity?`<div><small>Intensity</small>${p.intensity} / 13</div>`:""}<div><small>Capsule</small>${esc(p.material)}</div><div><small>Origin</small>${esc(p.origin)}</div><div><small>Roast</small>${esc(p.roast)}</div><div><small>Price</small>${priceSpec(p)}</div></div>${p.desc?`<p class="desc">${esc(p.desc)}</p>`:""}${p.listedNotes?`<p class="why">Tasting notes as listed: ${esc(p.listedNotes)}</p>`:""}
   <div class="btns"><button class="btn ${liked.has(p.id)?"primary":""}" data-like="${p.id}">${liked.has(p.id)?"♥ Liked":"♡ I liked this"}</button>${p.url?`<a class="btn primary" href="${esc(p.url)}" target="_blank" rel="noopener">View on ${esc(r.name)} ↗</a>`:""}<a class="btn" href="#roaster-${r.id}">More from ${esc(r.name)}</a></div></div></div>
   <div class="brewbox"><span class="eyebrow">Brewing tip</span>
     ${kit.size&&ownedSystems().length?(kit.has(p.system)?`<p><span class="chip kitfit">✓ Fits your ${esc(p.system)}</span></p>`:`<p class="notice">This capsule won't fit your ${ownedSystems().map(esc).join(" or ")}. It needs a ${esc(p.system)} machine.</p>`):""}
     <p style="margin:6px 0 0">${esc((DATA.podTips||{})[p.system]||"The listing doesn't name the machine these pods fit. Check the roaster's page before buying.")}</p></div>
   <section style="padding-bottom:0"><div class="sec-head"><div><h2>More for your ${esc(p.system)}</h2><p>Similar capsules that fit the same machine.</p></div></div>
   <div class="grid">${same.length?same.map(x=>podCard(x.bean,x)).join(""):`<div class="empty">No other ${esc(p.system)} pods yet.</div>`}</div></section>
   <section style="padding-bottom:0"><div class="sec-head"><div><h2>Like this? Try it as beans</h2><p>Whole-bean coffees with a similar profile.</p></div></div>
   <div class="grid">${beans.map(x=>beanCard(x.bean,x)).join("")}</div></section>`;
}
const MACHINES=["Sage Barista Express","Sage Barista Pro","Sage Barista Touch","Sage Bambino / Bambino Plus","Sage the Oracle / Oracle Touch","Ninja Luxe Café","De'Longhi La Specialista","De'Longhi Magnifica (bean-to-cup)","Gaggia Classic Evo","Gaggia bean-to-cup (Magenta / Cadorna)","Jura (bean-to-cup)","Smeg espresso","Lelit (Anna / MaraX)","Rancilio Silvia","Other / not listed"];
const isBeanToCup=m=>/bean-to-cup|jura|magnifica|magenta|cadorna/i.test(m);
function machineGuideHTML(m){
  if(!m) return `<p class="why" style="margin:0">Choose your machine to see its espresso setup.</p>`;
  const b2c=isBeanToCup(m);
  const target=`<div class="recipe"><div><small>Dose in</small><b>${b2c?"set by machine":"18 g"}</b></div><div><small>Shot out</small><b>${b2c?"~40 g":"36 g"}</b></div><div><small>Time</small><b>25–30 s</b></div><div><small>Water temp</small><b>90–94°C</b></div></div>`;
  const body = b2c
    ? `<p style="margin:10px 0 0"><b>Grind:</b> use the machine's own grind dial. If the shot pours too fast and tastes thin, turn it finer a notch at a time; too slow or bitter, coarser. Change one notch, then taste.</p><p class="why" style="margin:8px 0 0">Bean-to-cup machines grind and tamp for you, so aim for a strong, even pour and adjust the dial and cup size to taste.</p>`
    : `<p style="margin:10px 0 0"><b>Grind:</b> fine, like caster sugar. Dose 18 g into the basket, tamp level, aim for about 36 g out in 25–30 seconds. Grind finer to slow a fast, sour shot; coarser to speed a slow, bitter one.</p><p class="why" style="margin:8px 0 0">${/sage|lelit|gaggia|rancilio|smeg/i.test(m)?"A separate or built-in grinder with fine steps helps dial this in.":""}</p>`;
  return `<div class="mach-head" style="margin-bottom:8px"><b>${esc(m)}</b> <span class="chip">${b2c?"Bean-to-cup":"Espresso machine"}</span></div>${target}${body}<p class="why" style="margin:10px 0 0">A full step-by-step guide for the ${esc(m)} is coming. ${isBeanToCup(m)?"":"These are solid starting numbers for most home espresso."}</p>`;
}
function pSeed(str){let h=2166136261>>>0;for(let i=0;i<str.length;i++){h=(h^str.charCodeAt(i))>>>0;h=Math.imul(h,16777619)>>>0;}return h;}
function pRand(seed){let s=seed>>>0;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function portalMetrics(r){
  const coffees=B.filter(b=>b.roaster===r.id), rnd=pRand(pSeed(r.id));
  const pop=(hasLogo(r)?1.6:1)*(1+coffees.length/20);
  const saves=Math.round((40+rnd()*160)*pop), visits=Math.round(saves*(3+rnd()*3)), siteClicks=Math.round(visits*(0.25+rnd()*0.3));
  const trend=Array.from({length:8},()=>Math.round(visits/8*(0.5+rnd()))), deltaV=Math.round(rnd()*38-8);
  const cs=coffees.map(c=>({c,w:rnd()})), tot=cs.reduce((a,b)=>a+b.w,0)||1;
  const top=cs.map(x=>({name:x.c.name,saves:Math.max(1,Math.round(saves*x.w/tot)),clicks:Math.max(0,Math.round(siteClicks*x.w/tot))})).sort((a,b)=>b.saves-a.saves).slice(0,6);
  const wsRadius=[10,15,25,40][Math.floor(rnd()*4)];
  let nearR=0; if(r.lat!=null){ nearR=REAL.filter(o=>o.lat!=null&&o.id!==r.id&&haversine(r.lat,r.lng,o.lat,o.lng)<=wsRadius).length; }
  const demand=Math.round((3+rnd()*7)*(1+nearR/10));
  const shortlisted=Math.round(demand*(0.3+rnd()*0.3));
  const chosen=Math.min(shortlisted,Math.round(shortlisted*(0.2+rnd()*0.4)));
  return {saves,visits,siteClicks,trend,deltaV,top,coffeeCount:coffees.length,nearby:{demand,shortlisted,chosen,radius:wsRadius}};
}
function renderPortal(){
  if(!$("#portalPick").options.length){
    const opts=REAL.filter(r=>B.some(b=>b.roaster===r.id)).sort((a,b)=>a.name.localeCompare(b.name));
    $("#portalPick").innerHTML='<option value="">Choose your roastery…</option>'+opts.map(r=>`<option value="${esc(r.id)}">${esc(r.name)}</option>`).join("");
  }
  const ok=portalRoaster&&R[portalRoaster];
  $("#portalLogin").hidden=!!ok; $("#portalDash").hidden=!ok;
  if(ok){ $("#portalPick").value=portalRoaster; renderPortalDash(); }
}
function renderPortalDash(){
  const r=R[portalRoaster]; if(!r){portalRoaster=null;renderPortal();return;}
  const m=portalMetrics(r), mx=Math.max(...m.trend,1);
  $("#portalDash").innerHTML=`
   <div class="sec-head"><div style="display:flex;align-items:center;gap:12px">${hasLogo(r)?`<span style="width:48px;height:48px;flex:none;border-radius:9px;overflow:hidden;display:grid;place-items:center;background:#fff;border:1.5px solid var(--line)">${logoImg(r)}</span>`:""}<div><h2 style="margin:0">${esc(r.name)}</h2><span class="why" style="margin:0">${esc(r.city||"")} · ${m.coffeeCount} coffees on Crema</span></div></div><button class="btn small" id="portalOut">Log out</button></div>
   <div class="callout" style="margin:0 0 16px"><b>Sample figures.</b> These show the metrics your live portal will display. Real numbers begin when analytics are switched on at launch.</div>
   <div class="pm-grid">
     <div class="pm"><b>${m.saves.toLocaleString()}</b><span>Coffees saved <span class="delta" style="color:${m.deltaV<0?'#c9475a':''}">${m.deltaV<0?'▼':'▲'} ${Math.abs(m.deltaV)}%</span></span></div>
     <div class="pm"><b>${m.visits.toLocaleString()}</b><span>Visits to your page</span></div>
     <div class="pm"><b>${m.siteClicks.toLocaleString()}</b><span>Click-throughs to your website</span></div>
   </div>
   <div class="wpanel">
     <h3 style="margin:0 0 2px">Wholesale demand in your delivery area — this month</h3>
     <p class="why" style="margin:0 0 12px">Café wholesale enquiries placed within your ${m.nearby.radius}-mile delivery area this month. We can show you up to the introduction — what happens after is between you and the café.</p>
     <div class="pm-grid">
       <div class="pm"><b>${m.nearby.demand}</b><span>Enquiries in your area</span></div>
       <div class="pm"><b>${m.nearby.shortlisted}</b><span>You appeared in their results</span></div>
       <div class="pm"><b>${m.nearby.chosen}</b><span>Introductions made</span></div>
     </div>
   </div>
   <h3 style="margin:0 0 4px">Page visits — last 8 weeks</h3>
   <div class="pbar">${m.trend.map(v=>`<i style="height:${Math.round(v/mx*100)}%" title="${v}"></i>`).join("")}</div>
   <h3 style="margin:22px 0 4px">Your most-saved coffees</h3>
   <table class="ptable"><thead><tr><th>Coffee</th><th class="n">Saved</th><th class="n">Site clicks</th></tr></thead><tbody>${m.top.map(t=>`<tr><td>${esc(t.name)}</td><td class="n">${t.saves}</td><td class="n">${t.clicks}</td></tr>`).join("")||`<tr><td colspan="3" class="why">No coffees recorded yet.</td></tr>`}</tbody></table>
   <p class="why" style="margin-top:16px">At launch this will also show new-subscriber matches, wholesale enquiries, and where your visitors come from.</p>`;
  $("#portalOut").addEventListener("click",()=>{portalRoaster=null;try{localStorage.removeItem("portalR")}catch(e){}updateAcctLink();renderPortal();});
}
function kitScored(){
  const owned=ownedGuides(); if(!owned.length) return [];
  return B.map(b=>{let best=owned[0],bs=-1;owned.forEach(g=>{const sc=methodScore(g,b);if(sc>bs){bs=sc;best=g;}});return {b,g:best,sc:bs};})
    .filter(x=>x.sc>=3&&x.b.notes[0]!=="Not stated").sort((a,b)=>b.sc-a.sc||a.b.addedDays-b.b.addedDays);
}
function coffeeLink(b){
  const r=R[b.roaster], lt=b.linkType;
  if(b.url&&lt==="product") return {href:b.url,label:"Buy this coffee ↗"};
  if(b.url&&lt==="listing") return {href:b.url,label:`Find it at ${esc(r.name)} ↗`};
  if(b.url) return {href:b.url,label:`View on ${esc(r.name)} ↗`};
  if(r&&r.shop) return {href:r.shop,label:`Visit ${esc(r.name)} ↗`};
  return null;
}
function brewPickCard(b,g){
  const r=R[b.roaster], v=grindFor(g.id);
  return `<article class="card bean" data-brew="${b.id}~${g.id}">${bag(b)}
    <div class="body"><span class="rname">${esc(r.name)}</span><h3>${esc(b.name)}</h3>
    <div class="chips">${b.notes.filter(n=>n!=="Not stated").slice(0,3).map(n=>`<span class="chip">${esc(n)}</span>`).join("")}</div>
    <div class="meta"><span>${esc(b.roast||"")}</span><b class="why" style="color:var(--blue)">Tap for recipe →</b></div></div></article>`;
}
function brewTemp(g,b){
  if(g.id==="guide-moka") return "Just boiled";
  const ro=(b.roast||"").toLowerCase();
  if(ro.includes("light")) return "94–96°C";
  if(ro.includes("dark")) return "88–91°C";
  if(ro.includes("medium")) return "90–94°C";
  return "89–96°C";
}
function openBrewSheet(beanId,guideId){
  const b=ALL.find(x=>x.id===beanId), g=GUIDES.find(x=>x.id===guideId); if(!b||!g) return;
  const r=R[b.roaster], v=grindFor(g.id), ratio=Math.round(g.water/g.dose);
  const grindLine = myGrinder&&myGrinder!=="other"
     ? (v?`<b>${esc(myGrinder)}:</b> start around <b>${esc(v[0])}</b>${v[1]?` <span class="why">(range ${esc(v[1])})</span>`:""}${v[2]?` — ${esc(v[2])}`:""}`
          : v===null?`Your ${esc(myGrinder)} can't grind for ${esc(g.method)}.`:`${esc(g.grind)}`)
     : `${esc(g.grind)} <span class="why">— set your grinder on the Brew page to see its exact setting</span>`;
  $("#brewBody").innerHTML=`<div class="brew-head"><span class="eyebrow">${esc(g.method)} recipe</span><h3 style="margin:2px 0 0">${esc(b.name)}</h3><span class="why">${esc(r.name)}${b.roast&&b.roast!=="Not stated"?` · ${esc(b.roast)} roast`:""}</span></div>
   <div class="recipe"><div><small>Coffee</small><b>${g.dose} g</b></div><div><small>${g.kind==="espresso"?"Yield":"Water"}</small><b>${g.water} g</b></div><div><small>Ratio</small><b>1:${ratio}</b></div><div><small>Water temp</small><b>${brewTemp(g,b)}</b></div></div>
   <p style="margin:12px 0"><b>Grind:</b> ${grindLine}</p>
   <h4 style="margin:14px 0 6px">Method</h4><ol class="steps-list">${g.steps.map(s=>`<li><span>${esc(s)}</span></li>`).join("")}</ol>
   ${b.brew&&b.brew!=="Not stated"?`<p class="why" style="margin-top:10px"><b>${esc(r.name)}'s own recipe:</b> ${esc(b.brew)}</p>`:""}
   <div class="btns" style="margin-top:14px">${(()=>{const l=coffeeLink(b);return l?`<a class="btn primary" href="${esc(l.href)}" target="_blank" rel="noopener">${l.label}</a>`:"";})()}<a class="btn" href="#${b.id}">Full coffee details</a></div>`;
  showSheet("brewSheet");
}
function renderBrew(){
  const groups=[["Brewers",GUIDES.map(g=>[g.id,g.method])],["Pod machines",SYSTEMS.map(s=>[s,s])],["Extras",[["espresso-machine","Bean-to-cup / espresso machine"],["Grinder","Coffee grinder"]]]];
  $("#kitPicker").innerHTML=groups.map(([t,opts])=>`<div class="kit-group"><small>${t}</small><div class="kit">${opts.map(([v,l])=>`<label><input type="checkbox" data-kit="${esc(v)}" ${kit.has(v)?"checked":""}> ${esc(l)}</label>`).join("")}</div></div>`).join("");
  $("#kitSaved").textContent=kit.size?`Saved in this browser. Coffee pages now show recipes for your ${kit.size} item${kit.size>1?"s":""}.`:"Nothing chosen yet.";
  renderGrindTable();
  const hasMachine=kit.has("espresso-machine");
  $("#machineSec").hidden=!hasMachine;
  if(hasMachine){ if(!$("#myMachine").options.length){ $("#myMachine").innerHTML=`<option value="">Choose your machine…</option>`+MACHINES.map(m=>`<option${m===myMachine?" selected":""}>${esc(m)}</option>`).join(""); } $("#myMachine").value=myMachine; $("#machineGuide").innerHTML=machineGuideHTML(myMachine); }
  const owned=ownedGuides(), showG=(owned.length&&!showAllGuides)?owned:GUIDES;
  $("#guideHead").textContent=(owned.length&&!showAllGuides)?(owned.length>1?"Guides for your equipment":`Brewing with your ${owned[0].method}`):"Brewing guides";
  const tog=$("#guideToggle"); tog.hidden=!owned.length; tog.textContent=showAllGuides?"Show only mine":"Show all methods";
  $("#guideGrid").innerHTML=showG.map(g=>`<article class="card bean" data-go="#${g.id}"><div class="body"><span class="rname">${esc(g.difficulty)} · ${esc(g.time)}</span><h3>${esc(g.method)}</h3><p style="margin:0">${esc(g.why)}</p>
    <div class="meta"><span>${g.dose} g : ${g.water} g</span>${kit.has(g.id)?`<span class="chip kitfit">You have this</span>`:""}</div></div></article>`).join("");
  const kc=$("#kitCoffeesSec");
  if(owned.length){
    kc.hidden=false;
    const scored=kitScored();
    const seen=new Set(), preview=[]; for(const x of scored){ if(seen.has(x.b.roaster))continue; seen.add(x.b.roaster); preview.push(x); if(preview.length>=6)break; }  // one per roaster in the preview
    $("#kitCoffeesHead").textContent=owned.length>1?"Coffees for your kit":`Great coffees for your ${owned[0].method}`;
    $("#kitCoffeesGrid").innerHTML=preview.length?preview.map(x=>brewPickCard(x.b,x.g)).join(""):`<div class="empty">No strong matches yet — try adding more equipment.</div>`;
    const tb=$("#kitCoffeesMore"); tb.hidden=scored.length<=6; tb.textContent=`Show all ${scored.length} coffees for your kit →`;
  } else kc.hidden=true;
}
let terrCells=[]; let terrSecret="";
function newSecret(){ let h=""; for(let i=0;i<8;i++) h+=(Math.floor(Math.random()*65536)).toString(16).padStart(4,"0"); return h; }
function renderTerritory(){ $("#terrOut").innerHTML=""; $("#terrTestWrap").hidden=true; $("#terrTest").value=""; $("#terrTestOut").textContent=""; terrCells=[]; terrSecret=""; }
function terrGenerate(){
  const miles=+$("#terrRadius").value;
  const lines=$("#terrStockists").value.split("\n").map(x=>x.trim()).filter(Boolean);
  const pts=[], unknown=[];
  lines.forEach(l=>{ const g=resolveLoc(l); if(g) pts.push(g); else unknown.push(l); });
  const cells=new Set(); pts.forEach(([la,ln])=>cellsWithin(la,ln,miles).forEach(c=>cells.add(c)));
  terrCells=[...cells];
  if(!terrSecret) terrSecret=newSecret();
  const hashes=terrCells.map(c=>cellHash(c,terrSecret));
  const out=$("#terrOut");
  if(!pts.length){ out.innerHTML=`<div class="empty">No postcodes or towns recognised yet.${unknown.length?" Couldn't place: "+unknown.map(esc).join(", "):""}</div>`; $("#terrTestWrap").hidden=true; return; }
  out.innerHTML=`<div class="notice"><b>${pts.length} location${pts.length>1?"s":""} recognised${unknown.length?`, ${unknown.length} not found`:""}.</b> ${miles>0?`Blocking <b>${terrCells.length}</b> area${terrCells.length>1?"s":""} within ~${miles} mi.`:"No areas blocked — you'll receive every nearby lead."}</div>
    <p class="why" style="margin:12px 0 4px"><b>Your secret key</b> — generated on your device, kept in your dashboard, <b>never sent to Crema</b>:</p>
    <pre class="terrpre terrkey">${terrSecret}</pre>
    <p class="why" style="margin:12px 0 4px"><b>All Crema stores</b> — keyed fingerprints. Without your key they can't be reversed into areas or matched against any address list, even by us:</p>
    <pre class="terrpre">${JSON.stringify(hashes,null,0)}</pre>
    <p class="why" style="margin:8px 0 0">The plain areas (${terrCells.length}) stay on your device for the test below. In the live product the match runs so Crema never sees your key — see the note under the roadmap.</p>`;
  $("#terrTestWrap").hidden=false;
}
function terrTest(){
  const g=resolveLoc($("#terrTest").value), o=$("#terrTestOut");
  if(!$("#terrTest").value.trim()){ o.textContent=""; return; }
  if(!g){ o.textContent="Couldn't place that one."; o.style.color=""; return; }
  const hashes=terrCells.map(c=>cellHash(c,terrSecret));
  const blocked=hashes.includes(cellHash(geoCell(g[0],g[1]),terrSecret));
  o.textContent=blocked?"✕ Blocked — too close to one you supply, so you wouldn't get this lead.":"✓ Available — you'd be offered to this café.";
  o.style.color=blocked?"#c9475a":"var(--green)";
}
function renderKitCoffees(){
  const owned=ownedGuides(), scored=kitScored();
  $("#kcHead").textContent=!owned.length?"Coffees for your kit":owned.length>1?`Coffees for your kit (${scored.length})`:`Great coffees for your ${owned[0].method} (${scored.length})`;
  if(!owned.length){ $("#kcGrid").innerHTML=`<div class="empty">Choose your equipment on the <a href="#brew">Brew page</a> first.</div>`; $("#kcMore").hidden=true; return; }
  $("#kcGrid").innerHTML=scored.slice(0,kcLim).map(x=>brewPickCard(x.b,x.g)).join("")||`<div class="empty">No strong matches yet.</div>`;
  const tb=$("#kcMore"); tb.hidden=scored.length<=kcLim; tb.textContent=`Show more (${scored.length-kcLim} more)`;
}
/* Electric grinders: which brewers (guide ids) each one grinds well for. Prices are typical UK retail, Nov 2026. */
const GRINDERS=[
 {name:"Baratza Encore ESP",price:"about £155",burr:"40mm conical steel burrs",settings:"40 settings: 1–20 for espresso, 21–40 for filter",methods:["guide-espresso","guide-moka","guide-aeropress","guide-v60","guide-chemex","guide-french-press"],
  best:"The easiest all-rounder to start with. Split dial makes switching between espresso and AeroPress or cafetière quick.",url:"https://www.redber.co.uk/products/baratza-encore-esp-coffee-burr-grinder-black",shop:"Redber"},
 {name:"Fellow Opus",price:"about £180–£210",burr:"40mm conical burrs",settings:"41 settings plus fine adjustment",methods:["guide-espresso","guide-moka","guide-aeropress","guide-v60","guide-chemex","guide-french-press"],
  best:"Compact and quiet, from espresso to cold brew. Comes with a dosing lid that fits espresso portafilters.",url:"https://bellabarista.co.uk/products/fellow-opus-conical-burr-grinder",shop:"Bella Barista"},
 {name:"Sage Smart Grinder Pro",price:"about £180–£205",burr:"Stainless conical burrs",settings:"60 settings, with timed doses by cups or shots",methods:["guide-espresso","guide-moka","guide-aeropress","guide-v60","guide-chemex","guide-french-press"],
  best:"Grinds straight into a portafilter or an airtight tub. A good match if you have a Sage espresso machine.",url:"https://johnlewis.com/sage-the-smart-grinder-pro-coffee-grinder/p1591194",shop:"John Lewis"},
 {name:"Wilfa Svart Uniform",price:"about £230–£295",burr:"58mm flat steel burrs",settings:"41 settings, espresso to steep",methods:["guide-espresso","guide-moka","guide-aeropress","guide-v60","guide-chemex","guide-french-press"],
  best:"Flat burrs give a very even grind that shines on V60 and Chemex, and it still reaches espresso. 5-year warranty from UK dealers.",url:"https://www.jurang.co.uk/shop/coffee-grinders/793-wilfa-svart-uniform-coffee-grinder.html",shop:"Jurang"},
 {name:"Fellow Ode Gen 2",price:"about £280",burr:"64mm flat burrs",settings:"31 settings",methods:["guide-aeropress","guide-v60","guide-chemex","guide-french-press"],
  best:"A filter specialist: superb for pour-over, AeroPress and cafetière. It does not grind fine enough for espresso.",url:"https://bellabarista.co.uk/products/fellow-ode-brew-grinder-gen-2",shop:"Bella Barista"},
 {name:"Eureka Mignon Specialita",price:"about £370",burr:"55mm flat steel burrs",settings:"Stepless adjustment, timed dosing",methods:["guide-espresso","guide-moka","guide-aeropress"],
  best:"Built for espresso: very quiet, precise and quick. Can go coarser for AeroPress, but it's not the pick for cafetière or pour-over.",url:"https://www.redber.co.uk/products/eureka-mignon-specialita-coffee-grinder-black",shop:"Redber"},
 {name:"Niche Zero",price:"about £560",burr:"63mm conical burrs",settings:"Stepless dial, single-dose",methods:["guide-espresso","guide-moka","guide-aeropress","guide-v60","guide-chemex","guide-french-press"],
  best:"Made in the UK. Leaves almost no coffee behind, so you can switch beans and methods between cups. A long-term upgrade.",url:"https://www.nichecoffee.co.uk/collections/vendors/products/niche-zero",shop:"Niche Coffee"}
];
/* Where to set each grinder for each brewer. [start, range, note]. From each maker's grind guide;
   gaps filled from independent grind-size measurements (honestcoffeeguide.com). null = not suited. */
const GRIND={
 "Baratza Encore ESP":{dial:"dial 1–40",src:"Baratza's guide, plus independent measurements",
   "guide-espresso":["15","1–20","Baratza's espresso range"],"guide-moka":["18","12–24"],"guide-aeropress":["22","8–30","finer for short steeps"],
   "guide-v60":["22","18–25"],"guide-chemex":["26","22–30"],"guide-french-press":["32","25–38"]},
 "Fellow Opus":{dial:"outer ring 1–11",src:"Fellow's grind guide, plus independent measurements",
   "guide-espresso":["1.5","1–2.5","use the inner ring to fine-tune"],"guide-moka":["3","2.5–5.5"],"guide-aeropress":["3.5","2–5"],
   "guide-v60":["5","3–7"],"guide-chemex":["7","5–9"],"guide-french-press":["9","8–10"]},
 "Fellow Ode Gen 2":{dial:"dial 1–11",src:"Fellow's grind guide",
   "guide-espresso":null,"guide-moka":null,"guide-aeropress":["4.5","3–6"],"guide-v60":["5","4–6"],"guide-chemex":["7","6–8"],"guide-french-press":["8","8–10"]},
 "Sage Smart Grinder Pro":{dial:"settings 1–60",src:"Sage's coffee chart",
   "guide-espresso":["12","1–30","start at 30 with dual-wall baskets"],"guide-moka":["25","20–30","coarse end of Sage's espresso band"],"guide-aeropress":["34","31–40"],
   "guide-v60":["40","31–48"],"guide-chemex":["44","40–48"],"guide-french-press":["58","55–60"]},
 "Wilfa Svart Uniform":{dial:"settings 1–41",src:"Wilfa's grind guide",
   "guide-espresso":["5","3–7"],"guide-moka":["10","8–13","Wilfa gives no moka setting; between espresso and AeroPress"],"guide-aeropress":["18","14–26"],
   "guide-v60":["20","14–28"],"guide-chemex":["24","20–28"],"guide-french-press":["34","30–38"]},
 "Eureka Mignon Specialita":{dial:"stepless dial, counted in turns from the finest point",src:"Independent measurements (Eureka publishes none)",
   "guide-espresso":["2","0–3.5 on the first turn"],"guide-moka":["1 turn","3.5 to 1 turn + 3"],"guide-aeropress":["1 turn + 2","2.5 to 2 turns + 3"],
   "guide-v60":["1 turn + 1","4.5 to 1 turn + 4"],"guide-chemex":["1 turn + 4","1 turn + 2 to 2 turns + 2"],"guide-french-press":["2 turns + 4","1 turn + 4 to 3 turns + 4"]},
 "Niche Zero":{dial:"dial 0–50+",src:"Niche's grind guide, plus independent measurements",
   "guide-espresso":["15","5–20"],"guide-moka":["30","25–35"],"guide-aeropress":["26","20–35"],"guide-v60":["38","35–45"],"guide-chemex":["42","38–45"],"guide-french-press":["50","45+"]}
};
let myGrinder=""; try{ myGrinder=localStorage.getItem("grinder")||"" }catch(e){}
let showAllGuides=false;
let kcLim=48;
let myMachine=""; try{ myMachine=localStorage.getItem("machine")||"" }catch(e){}
const grindFor=(guideId)=>{ const d=GRIND[myGrinder]; return d&&guideId in d?d[guideId]:undefined; };
function renderAbout(){
  document.querySelectorAll('[data-count="roasters"]').forEach(e=>e.textContent=REAL.length.toLocaleString("en-GB"));
  $("#builtOn").textContent=DATA.built||"(unknown)";
}
function renderGrindTable(){
  const sel=$("#myGrinder");
  sel.innerHTML=`<option value="">Choose your grinder…</option>`+Object.keys(GRIND).map(n=>`<option ${n===myGrinder?"selected":""}>${esc(n)}</option>`).join("")+`<option value="other" ${myGrinder==="other"?"selected":""}>Another grinder (describe the grind instead)</option>`;
  const mine=GUIDES.filter(g=>kit.has(g.id)), rows=mine.length?mine:GUIDES, d=GRIND[myGrinder];
  if(!myGrinder){ $("#grindTable").innerHTML=`<p class="why" style="margin:6px 0 0">Pick your grinder to see the setting for ${mine.length?"each of your brewers":"every brewer"}.</p>`; return; }
  $("#grindTable").innerHTML=`<div class="grind-rows">${rows.map(g=>{
      if(!d) return `<div class="grind-row"><div><b>${esc(g.method)}</b><span class="why">${esc(g.grind)}</span></div><div class="grind-set"><small>Aim for</small><span style="font-size:1rem">${esc(g.grind.split(",")[0])}</span></div></div>`;
      const v=d[g.id];
      if(!v) return `<div class="grind-row off"><div><b>${esc(g.method)}</b><span class="why">The ${esc(myGrinder)} can't grind fine enough for this.</span></div><div class="grind-set"><small>Setting</small><span>—</span></div></div>`;
      return `<div class="grind-row"><div><b>${esc(g.method)}</b><span class="why">Range ${esc(v[1])}${v[2]?` · ${esc(v[2])}`:""}</span></div><div class="grind-set"><small>Start at</small><span>${esc(v[0])}</span></div></div>`;
    }).join("")}</div>
    ${d?`<p class="why" style="margin:12px 0 0">${esc(myGrinder)}: ${esc(d.dial)}. Settings from ${esc(d.src)}. Every grinder is calibrated a little differently, so treat these as a starting point.</p>`:""}
    <p style="margin:12px 0 0"><b>Then adjust by taste:</b> sour, weak or running fast → go finer. Bitter, harsh or slow → go coarser. For darker roasts, start a little coarser.</p>`;
}
function renderGrinders(){
  const mine=GUIDES.filter(g=>kit.has(g.id)).map(g=>g.id);
  const label=id=>(GUIDES.find(g=>g.id===id)||{}).method||id;
  const list=GRINDERS.map((g,i)=>({g,i,hit:mine.filter(m=>g.methods.includes(m))})).sort((a,b)=>(b.hit.length-a.hit.length)||(a.i-b.i));
  $("#grinderLede").innerHTML=mine.length
    ?`Matched to your ${mine.length} brewer${mine.length>1?"s":""}: ${mine.map(label).join(", ")}. Grinders that cover all of them come first.`
    :`Grinding just before you brew makes the biggest difference to flavour. Tick your brewers on the <a href="#brew">Brew page</a> and we'll show which grinders cover them.`;
  $("#grinderGrid").innerHTML=list.map(({g,hit})=>{
    const missing=mine.filter(m=>!g.methods.includes(m));
    const fit=!mine.length?"":missing.length?`<span class="badge" style="background:var(--yellow-tint);color:#7a5a00">Covers ${hit.length} of ${mine.length} · not ${missing.map(label).join(", ")}</span>`:`<span class="badge">Covers all your brewers</span>`;
    return `<article class="card grinder"><div class="body">${fit}<h3 style="margin:2px 0 0">${esc(g.name)}</h3><span class="rname">${esc(g.price)} · ${esc(g.burr)}</span>
      <p style="margin:4px 0">${esc(g.best)}</p>
      <div class="chips">${GUIDES.map(m=>{const ok=g.methods.includes(m.id);return `<span class="chip ${ok&&kit.has(m.id)?"kitfit":""}" style="${ok?"":"text-decoration:line-through;opacity:.45"}">${esc(m.method)}</span>`}).join("")}</div>
      <div class="meta"><span>${esc(g.settings)}</span></div>
      <a class="btn small" href="${esc(g.url)}" target="_blank" rel="noopener" style="align-self:flex-start;margin-top:6px">See it at ${esc(g.shop)} ↗</a></div></article>`}).join("");
}
function renderGuide(id){
  const g=GUIDES.find(x=>x.id===id); if(!g) return go("#brew");
  const picks=[...B].sort((x,y)=>methodScore(g,y)-methodScore(g,x)||x.addedDays-y.addedDays).slice(0,4);
  $("#guideDetail").innerHTML=`<a class="back" href="#brew">← All guides</a>
   <div style="max-width:760px;margin-top:16px"><span class="eyebrow">${esc(g.difficulty)} · ${esc(g.time)}</span><h1 style="font-size:2.4rem">${esc(g.method)}</h1><p class="lede" style="color:var(--muted)">${esc(g.why)}</p>
   <div class="recipe"><div><small>Coffee</small><b>${g.dose} g</b></div><div><small>${g.kind==="espresso"?"Yield":"Water"}</small><b>${g.water} g</b></div><div><small>Ratio</small><b>1:${Math.round(g.water/g.dose)}</b></div><div><small>Water temp</small><b>${g.id==="guide-moka"?"Just boiled":"89–96°C"}</b></div></div>
   <p><b>Grind:</b> ${esc(g.grind)}<br><b>You'll need:</b> ${g.kit.map(esc).join(", ")}</p>
   <p class="why">Water temperature depends on the roast: hotter for light roasts, cooler for dark. Each coffee's page gives its exact recipe.</p>
   <h2 style="margin-top:28px">Method</h2><ol class="steps-list">${g.steps.map(s=>`<li><span>${esc(s)}</span></li>`).join("")}</ol>
   <button class="btn ${kit.has(g.id)?"primary":""}" data-kittoggle="${g.id}">${kit.has(g.id)?"✓ In my equipment":"+ I have this"}</button></div>
   <section style="padding-bottom:0"><div class="sec-head"><div><h2>Great coffees for ${esc(g.method)}</h2><p>Tap one for the recipe on your kit.</p></div></div>
   <div class="grid">${picks.map(b=>brewPickCard(b,g)).join("")}</div></section>`;
}
let rLimit=48;
let smFilter="";
function smCard(x){
  return `<article class="card smk" data-go="#swap-${x.id.slice(3)}"><div class="body"><span class="brand">${esc(x.brand)}</span><h3 style="margin:0">${esc(x.name)}</h3>
   <div class="chips"><span class="chip">${esc(x.format)}</span><span class="chip">${esc(x.roast)} roast</span>${x.brandScale&&x.brandScale.toLowerCase()!==(x.roast+" roast").toLowerCase()?`<span class="chip">${esc(x.brandScale)}</span>`:""}${x.system?`<span class="chip">${esc(x.system)}</span>`:""}</div>
   <div class="chips">${x.notes.map(n=>`<span class="chip match">${esc(n)}</span>`).join("")}</div>
   <div class="meta"><span></span><div class="swap-go">${x.roasterId&&R[x.roasterId]?`<span class="badge">Buy direct</span>`:""}<b style="font-size:.9rem">Find my swap</b></div></div></div></article>`;
}
function renderSwap(){
  $("#smTabs").innerHTML=[["","All"],["bag","Bags & ground"],["pod","Pods"]].map(([v,l])=>`<button class="pill ${smFilter===v?"on":""}" data-smk="${v}">${l}</button>`).join("");
  if(!$("#smSys").options[1]) fill("#smSys",uniq(SM.map(x=>x.system).filter(Boolean)));
  const q=$("#smQ").value.trim().toLowerCase(), sys=$("#smSys").value;
  const list=SM.filter(x=>(!smFilter||x.kind===smFilter)&&(!sys||x.system===sys)&&(!q||[x.brand,x.name,x.format,x.system||"",...x.notes].join(" ").toLowerCase().includes(q)))
    .sort((a,b)=>a.brand.localeCompare(b.brand)||a.name.localeCompare(b.name));
  $("#smCount").textContent=`${list.length} of ${SM.length} supermarket coffees`;
  $("#smGrid").innerHTML=list.length?list.map(smCard).join(""):`<div class="empty">No match. Try another brand, or use "Tell us what you like" below.</div>`;
  if(!$("#smTaste").options.length) fill("#smTaste",Object.keys(TASTES));
}
function renderSwapDetail(id){
  const x=SM.find(y=>y.id==="sm-"+id); if(!x) return go("#swap");
  const pc=perCup(x);
  const pool = x.kind==="pod" ? P.filter(p=>p.system===x.system) : B;
  let recs = recommend([x],6,pool).filter(r=>r.score>=3);  // close matches only
  if(recs.length<2) recs = recommend([x],3,pool);
  const beanRecs = x.kind==="pod" ? recommend([x],4,B) : [];
  const recPc = recs.filter(r=>!(R[r.bean.roaster]||{}).sample).map(r=>perCup(r.bean)).filter(v=>v!=null);  // never compare against example listings
  const avg = recPc.length? recPc.reduce((a,b)=>a+b,0)/recPc.length : null;
  $("#swapDetail").innerHTML=`<a class="back" href="#swap">← All supermarket coffees</a>
   <div class="smbox" style="margin-top:16px">
    <div><span class="eyebrow">You usually buy</span><h1 style="font-size:2.2rem;margin-top:6px">${esc(x.brand)} ${esc(x.name)}</h1>
     <div class="spec"><div><small>Format</small>${esc(x.format)}</div><div><small>Roast</small>${esc(x.roast)}</div><div><small>Brand's rating</small>${esc(x.brandScale)}</div>${x.blend?`<div><small>Beans</small>${esc(x.blend)}</div>`:""}${pc!=null?`<div><small>About</small>${Math.round(pc*100)}p per cup${x.count?"":" <span class='why'>(15g)</span>"}</div>`:""}</div>
     <div class="chips">${x.notes.map(n=>`<span class="chip">${esc(n)}</span>`).join("")}</div>
     <p class="why" style="margin-top:12px">Profile from the brand's own description${x.priceNote?` · Typical price: ${esc(x.priceNote)}`:""}${x.source?` · <a href="${esc(x.source)}" target="_blank" rel="noopener">source ↗</a>`:""}</p></div>
    <div><h3>Why try an independent swap?</h3><ul class="why-list">
     <li><b>Roast date on the bag.</b> Independent roasters print when it was roasted, usually days before it reaches you.</li>
     <li><b>You know where it's from.</b> Farm or region, process and roaster are all named.</li>
     <li><b>Same style you like.</b> These picks match your coffee's roast and flavours.</li>
     ${pc!=null&&avg!=null?`<li><b>Price per cup:</b> about ${Math.round(pc*100)}p now vs about ${Math.round(avg*100)}p for these picks.</li>`:`<li><b>Price:</b> speciality coffee often costs a little more per cup. Each roaster's page shows its prices.</li>`}
    </ul></div>
   </div>
   ${directPanel(x)}
   <section style="padding-bottom:0"><div class="sec-head"><div><h2>${x.kind==="pod"?`Independent pods for your ${esc(x.system)}`:"Independent coffees you might like"}</h2><p>Matched on roast level and flavour notes.</p></div></div>
   <div class="grid">${recs.length?recs.map(r=>anyCard(r.bean,r)).join(""):`<div class="empty">${x.system&&x.system!=="Nespresso Original"?`Independent roasters rarely make ${esc(x.system)} pods. Try the fresh coffees below in a cafetière, or a refillable pod for your machine.`:"No matching pods listed yet."}</div>`}</div></section>
   ${beanRecs.length?`<section style="padding-bottom:0"><div class="sec-head"><div><h2>Or try fresh beans</h2><p>Whole-bean coffees with a similar taste.</p></div></div><div class="grid">${beanRecs.map(r=>beanCard(r.bean,r)).join("")}</div></section>`:""}
   <p class="disclaim">Crema isn't linked to ${esc(x.brand)}. Brand and product names belong to their owners.</p>`;
}
/* Supermarket brands that are also roasters in the directory: send people to buy from the roaster itself. */
function directPanel(x){
  const r=x.roasterId&&R[x.roasterId]; if(!r) return "";
  const theirs=B.filter(b=>b.roaster===r.id);
  return `<section style="padding-bottom:0"><div class="direct">
    ${hasLogo(r)?`<div class="direct-logo${r.logo.dark?" dark":""}">${logoImg(r)}</div>`:""}
    <div class="direct-txt"><span class="eyebrow">Fresher from the source</span>
      <h2>Buy it direct from ${esc(r.name)}</h2>
      <p>${esc(r.name)} sells its coffee on its own website. Ordering there means your bag is sent from the roastery, usually within days of roasting, instead of sitting in a warehouse and on a shelf first. It also means more of what you pay goes to the roaster.</p>
      <div class="btns">${r.shop?`<a class="btn primary" href="${esc(r.shop)}" target="_blank" rel="noopener">Shop at ${esc(r.name)} ↗</a>`:""}<a class="btn" href="#roaster-${r.id}">${esc(r.name)} on Crema</a></div>
    </div></div>
    ${theirs.length?`<div class="sec-head" style="margin-top:28px"><div><h3>More from ${esc(r.name)}</h3><p>Coffees they sell direct that you won't always find in the supermarket.</p></div></div><div class="grid">${theirs.slice(0,4).map(b=>beanCard(b)).join("")}</div>`:""}
  </section>`;
}
function renderSwapCustom(){
  const roast=$("#smRoast").value, taste=$("#smTaste").value;
  const seed={id:"custom",custom:true,name:"your taste",roast,taste,notes:[]};
  $("#smCustom").innerHTML=recommend([seed],4,B).map(r=>beanCard(r.bean,r)).join("");
}
function renderRoasters(){
  const q=$("#rq").value.toLowerCase(), reg=rRegion;
  const list=REAL.filter(r=>(!q||(r.name+" "+r.city).toLowerCase().includes(q))&&(!reg||r.region===reg)&&[...rFilt].every(k=>filtPred(r,k)));
  list.sort((a,b)=>hasLogo(b)-hasLogo(a));
  $("#regionLbl").textContent=reg||"Region";
  $("#pillRegion").classList.toggle("sel",!!reg);
  const badge=$("#filtN");badge.hidden=!rFilt.size;badge.textContent=rFilt.size;
  const cntTxt=rFilt.size?` · ${[...rFilt].map(filtLabel).join(", ")}`:"";
  $("#roasterCount").textContent=`${list.length} roasters`+(reg?` in ${reg}`:"")+cntTxt;
  $("#roasterGrid").innerHTML=list.length?list.slice(0,rLimit).map(roasterCard).join(""):`<div class="empty">No roasters match. <button class="linkbtn" id="rclear">Clear filters</button></div>`;
  $("#rmore").hidden=list.length<=rLimit;
}
/* ---- filter sheets ---- */
function openSheet(which){
  if(which==="region"){
    const regs=uniq(REAL.map(r=>r.region));
    $("#regionBody").innerHTML=[["","All regions"],...regs.map(r=>[r,r])].map(([v,l])=>`<button type="button" class="rrow${v===rRegion?" on":""}" data-reg="${esc(v)}">${esc(l)}<span class="tick">✓</span></button>`).join("");
    showSheet("regionSheet");
  }else{
    $("#filtBody").innerHTML=FILT_UI.map(([k,t,d,icon])=>{const c=filtCount(k);return `<label class="frow"><span class="ftile"><svg viewBox="0 0 24 24" aria-hidden="true">${icon}</svg></span><span class="ftxt"><b>${esc(t)}</b><small>${esc(d)} · ${c}</small></span><input type="checkbox" data-filt="${k}" ${rFilt.has(k)?"checked":""} hidden><span class="sw"></span></label>`}).join("");
    showSheet("filtSheet");
  }
}
function showSheet(id){$("#sheetBg").hidden=false;$("#"+id).hidden=false;document.body.classList.add("sheet-open");}
function closeSheet(){$("#sheetBg").hidden=true;$("#regionSheet").hidden=true;$("#filtSheet").hidden=true;$("#brewSheet").hidden=true;document.body.classList.remove("sheet-open");}
function renderRoaster(id){
  const r=R[id]; if(!r) return go("#roasters");
  const w=r.wholesale, list=B.filter(b=>b.roaster===id), pods=P.filter(p=>p.roaster===id);
  $("#roasterDetail").innerHTML=`<a class="back" href="#roasters">← All roasters</a>
   <div class="feature" style="margin-top:16px">${mark(r,"art")}<div class="txt"><span class="eyebrow">${esc(r.city)} · ${esc(r.region)}</span><h1 style="font-size:2.4rem">${esc(r.name)} ${exBadge(r)}</h1>
   <div class="btns" style="margin:10px 0 14px">${r.shop?`<a class="btn primary small" href="${esc(r.shop)}" target="_blank" rel="noopener">Visit their shop ↗</a>`:""}${w.page?`<a class="btn small" href="${esc(w.page)}" target="_blank" rel="noopener">Wholesale page ↗</a>`:""}</div>
   ${r.note?`<p class="why">Note: ${esc(r.note)}</p>`:""}
   ${(w.offers&&w.smallOrderPerKg)?`<div class="spec"><div><small>Beans from (small orders)</small>£${w.smallOrderPerKg}/kg</div>${w.minKg?`<div><small>Minimum order</small>${w.minKg} kg</div>`:""}${w.delivery?`<div><small>Delivery</small>${esc(w.delivery)}</div>`:""}</div><div class="chips" style="margin-bottom:14px">${w.services.map(s=>`<span class="chip">${esc(s)}</span>`).join("")}</div>`:""}
   ${w.offers?`<a class="btn green small" href="#wholesale" data-shortlist="${r.id}">Enquire about wholesale</a>`:`<p class="why">Wholesale terms not listed yet.</p>`}</div></div>
   ${(()=>{const o=offers(r), yes=OFFERS.filter(([k])=>o[k]===true), no=OFFERS.filter(([k])=>o[k]===false), m=r.offersMeta||{};
     return `<section style="padding-bottom:0"><h2>What they offer</h2>${yes.length?`<div class="offer-list">${yes.map(([k,l])=>`<span class="offer yes">✓ ${esc(l)}</span>`).join("")}${no.map(([k,l])=>`<span class="offer no">✕ ${esc(l)}</span>`).join("")}</div>`:`<p class="why">Not checked yet.</p>`}
       <p class="why" style="margin-top:10px">${m.checked?`Checked ${esc(m.checked)}. `:""}${(m.derived||[]).length?`${m.derived.map(offerLabel).join(", ")} based on the coffees we list. `:""}Anything not shown hasn't been checked yet. <a href="#about">How we check</a></p></section>`})()}
   <section style="padding-bottom:0"><h2>Their coffee</h2>${list.length?`<div class="grid">${list.map(b=>beanCard(b)).join("")}</div>`:`<div class="empty">Coffees for ${esc(r.name)} haven't been added yet.${r.shop?` <a href="${esc(r.shop)}" target="_blank" rel="noopener">Browse their shop ↗</a>`:""}</div>`}</section>
   ${pods.length?`<section style="padding-bottom:0"><h2>Their pods &amp; capsules</h2><div class="grid">${pods.map(p=>podCard(p)).join("")}</div></section>`:""}`;
}
function renderForYou(){
  const seeds=ALL.filter(b=>liked.has(b.id));
  $("#likedGrid").innerHTML=seeds.length?seeds.map(b=>anyCard(b)).join(""):`<div class="empty">Nothing liked yet. <a href="#beans">Browse beans</a> and tap ♡ on ones you've enjoyed.</div>`;
  $("#fyGrid").innerHTML=seeds.length?recommend(seeds,9).map(x=>beanCard(x.bean,x)).join(""):`<div class="empty">Your suggestions will appear here.</div>`;
  $("#fyPods").innerHTML=seeds.length?recommend(seeds,6,myPods()).map(x=>podCard(x.bean,x)).join(""):`<div class="empty">Pod suggestions will appear here.</div>`;
}
let shortlist=new Set();
const POSTAREA={AB:[57.14,-2.1],AL:[51.75,-0.33],B:[52.48,-1.9],BA:[51.32,-2.4],BB:[53.74,-2.48],BD:[53.8,-1.75],BH:[50.74,-1.87],BL:[53.58,-2.43],BN:[50.84,-0.14],BR:[51.4,0.02],BS:[51.45,-2.59],BT:[54.6,-5.93],CA:[54.89,-2.93],CB:[52.2,0.12],CF:[51.48,-3.18],CH:[53.19,-2.89],CM:[51.73,0.47],CO:[51.89,0.9],CR:[51.37,-0.1],CT:[51.28,1.08],CV:[52.41,-1.51],CW:[53.1,-2.44],DA:[51.44,0.22],DD:[56.46,-2.97],DE:[52.92,-1.48],DG:[55.07,-3.6],DH:[54.78,-1.57],DL:[54.52,-1.56],DN:[53.52,-1.13],DT:[50.71,-2.44],DY:[52.51,-2.09],E:[51.53,0.0],EC:[51.52,-0.09],EH:[55.95,-3.19],EN:[51.65,-0.08],EX:[50.72,-3.53],FK:[56.0,-3.78],FY:[53.82,-3.05],G:[55.86,-4.25],GL:[51.86,-2.24],GU:[51.24,-0.57],GY:[49.46,-2.58],HA:[51.58,-0.34],HD:[53.65,-1.78],HG:[53.99,-1.54],HP:[51.75,-0.47],HR:[52.06,-2.72],HS:[57.9,-6.8],HU:[53.74,-0.34],HX:[53.72,-1.86],IG:[51.56,0.07],IM:[54.24,-4.5],IP:[52.06,1.16],IV:[57.48,-4.22],JE:[49.21,-2.13],KA:[55.61,-4.5],KT:[51.4,-0.3],KW:[58.98,-2.96],KY:[56.11,-3.16],L:[53.41,-2.99],LA:[54.05,-2.8],LD:[52.24,-3.38],LE:[52.64,-1.13],LL:[53.25,-3.8],LN:[53.23,-0.54],LS:[53.8,-1.55],LU:[51.88,-0.42],M:[53.48,-2.24],ME:[51.38,0.52],MK:[52.04,-0.76],ML:[55.79,-3.99],N:[51.56,-0.11],NE:[54.98,-1.61],NG:[52.95,-1.15],NN:[52.24,-0.9],NP:[51.59,-2.99],NR:[52.63,1.3],NW:[51.54,-0.2],OL:[53.54,-2.12],OX:[51.75,-1.26],PA:[55.85,-4.42],PE:[52.57,-0.24],PH:[56.4,-3.43],PL:[50.38,-4.14],PO:[50.8,-1.09],PR:[53.76,-2.7],RG:[51.45,-0.97],RH:[51.24,-0.17],RM:[51.58,0.18],S:[53.38,-1.47],SA:[51.62,-3.94],SE:[51.46,-0.05],SG:[51.9,-0.2],SK:[53.41,-2.16],SL:[51.51,-0.59],SM:[51.36,-0.19],SN:[51.56,-1.78],SO:[50.9,-1.4],SP:[51.07,-1.79],SR:[54.9,-1.38],SS:[51.54,0.71],ST:[53.0,-2.18],SW:[51.46,-0.17],SY:[52.71,-2.75],TA:[51.02,-3.1],TD:[55.6,-2.8],TF:[52.68,-2.45],TN:[51.19,0.27],TQ:[50.46,-3.53],TR:[50.26,-5.05],TS:[54.57,-1.23],TW:[51.45,-0.33],UB:[51.55,-0.45],W:[51.51,-0.2],WA:[53.39,-2.6],WC:[51.52,-0.12],WD:[51.66,-0.4],WF:[53.68,-1.5],WN:[53.55,-2.63],WR:[52.19,-2.22],WS:[52.59,-1.98],WV:[52.59,-2.13],YO:[53.96,-1.08],ZE:[60.15,-1.15]};
function pcToLatLng(pc){const m=String(pc).toUpperCase().replace(/[^A-Z0-9]/g,"").match(/^([A-Z]{1,2})/);if(!m)return null;return POSTAREA[m[1]]||null;}
const TOWNIDX=(()=>{const m={};DATA.roasters.forEach(r=>{if(r.lat==null)return;(r.city||"").split(",").forEach(p=>{const k=p.trim().toLowerCase();if(k&&!(k in m))m[k]=[r.lat,r.lng];});});return m;})();
const CELL_LAT=0.01, CELL_LNG=0.015;  // ~0.6-mile grid cells
function geoCell(lat,lng){ return Math.round(lat/CELL_LAT)+":"+Math.round(lng/CELL_LNG); }  // an area, not an address
function cellsWithin(lat,lng,miles){
  const out=new Set([geoCell(lat,lng)]);
  if(miles>0){ const dLat=miles/69, dLng=miles/(69*Math.cos(lat*Math.PI/180));
    for(let i=Math.round((lat-dLat)/CELL_LAT);i<=Math.round((lat+dLat)/CELL_LAT);i++)
      for(let j=Math.round((lng-dLng)/CELL_LNG);j<=Math.round((lng+dLng)/CELL_LNG);j++)
        if(haversine(lat,lng,i*CELL_LAT,j*CELL_LNG)<=miles) out.add(i+":"+j); }
  return [...out];
}
function cellHash(c,key){ const s=(key?key+"|":"")+c+(key?"|"+key:""); let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h=(h^s.charCodeAt(i))>>>0; h=Math.imul(h,16777619)>>>0; } let h2=5381>>>0; for(let i=s.length-1;i>=0;i--){ h2=(Math.imul(h2,33)^s.charCodeAt(i))>>>0; } return (h.toString(36)+h2.toString(36)).padStart(13,"0"); }  // keyed: without the roaster secret these can't be reversed or enumerated
function resolveLoc(q){
  q=(q||"").trim(); if(!q) return null;
  const compact=q.toUpperCase().replace(/[^A-Z0-9]/g,"");
  const pm=compact.match(/^([A-Z]{1,2})[0-9]/);              // looks like a postcode (letters then a digit)
  if(pm&&POSTAREA[pm[1]]) return POSTAREA[pm[1]];
  const t=q.trim().toLowerCase();
  if(TOWNIDX[t]) return TOWNIDX[t];
  if(t.length>=3){ const hit=Object.keys(TOWNIDX).find(k=>k.startsWith(t))||Object.keys(TOWNIDX).find(k=>k.includes(t)); if(hit) return TOWNIDX[hit]; }
  if(POSTAREA[compact]) return POSTAREA[compact];            // bare postcode area, e.g. "EH"
  return null;
}
let wsShowAll=false;
function renderWholesale(){
  const supply=$("#wsupply").value, qty=+$("#wqty").value||Infinity, svc=(supply==="pods")?"":$("#wsvc").value, home=resolveLoc($("#wpc").value);
  const isBean=r=>offers(r).wholesale===true||r.wholesale.offers, isPod=r=>offers(r).pods===true;
  let list=DATA.roasters.filter(r=>{
    if(supply==="pods"){ if(!isPod(r))return false; }
    else if(supply==="beans"){ if(!isBean(r))return false; }
    else { if(!isBean(r)&&!isPod(r))return false; }
    if(svc&&!(r.wholesale.services||[]).includes(svc))return false;
    if(qty!==Infinity){ const m=supply==="pods"?(r.wholesale.minPods||0):(r.wholesale.minKg||0); if(m>qty)return false; }
    return true;
  });
  list.forEach(r=>{r._mi=(home&&r.lat!=null)?haversine(home[0],home[1],r.lat,r.lng):null;});
  if(home){
    const w=r=>r.wholesale||{};
    // only roasters who deliver to the customer's area
    list=list.filter(r=>w(r).deliversNational||w(r).deliveryMiles==null||r._mi==null||r._mi<=w(r).deliveryMiles);
    // drop roasters who have blocked the customer's area (they already supply someone there) — privacy-preserving: Crema holds blocked grid-cells/hashes, never a roaster's customer addresses. Inert until roasters supply their cells.
    const cell=geoCell(home[0],home[1]), chash=cellHash(cell);
    list=list.filter(r=>{ const ww=w(r);
      if(Array.isArray(ww.blockedCells)&&ww.blockedCells.includes(cell)) return false;            // level 1: blocked areas
      if(Array.isArray(ww.blockedCellHashes)&&ww.blockedCellHashes.includes(chash)) return false; // level 2: hashed (hidden) areas
      return true; });
  }
  if(home) list.sort((a,b)=>(a._mi==null?9e9:a._mi)-(b._mi==null?9e9:b._mi));
  else list.sort((a,b)=>(b.wholesale.minKg?1:0)-(a.wholesale.minKg?1:0));
  const needM=$("#wMachine").checked; const mp=$("#wMachinePanel"); mp.hidden=!needM; mp.style.display=needM?"block":"none";
  const hasMachine=r=>(r.wholesale.services||[]).some(x=>/machine/i.test(x));
  if(needM) list.sort((a,b)=>hasMachine(b)-hasMachine(a));  // roasters who lease/include a machine first
  const total=list.length, limited=home&&!wsShowAll; if(limited) list=list.slice(0,20);
  $("#wsAll").hidden=!(home&&total>20); $("#wsAll").textContent=wsShowAll?"Show nearest 20 only":`Show all ${total} wholesale roasters`;
  $("#wsCount").textContent=home?(wsShowAll?`${total} wholesale roasters, nearest first`:`Your ${Math.min(20,total)} nearest wholesale roasters — choose up to 5 to contact`):`${total} wholesale listings`;
  $("#wsGrid").innerHTML=list.length?list.map(r=>{const w=r.wholesale;return `<article class="card ws-card"><div class="roaster"><div class="top">${mark(r,"mono","background:var(--green)")}<div><h3 style="margin:0">${esc(r.name)} ${exBadge(r)}</h3><span class="rname">${esc(r.city)}${r._mi!=null?` · <b style="color:var(--green)">${r._mi<10?r._mi.toFixed(1):Math.round(r._mi)} mi away</b>`:""}</span></div></div></div>
    <div class="body">${w.minKg?`<div class="ws-row"><span>Small orders</span><b>£${w.smallOrderPerKg}/kg</b></div><div class="ws-row"><span>Minimum</span><b>${w.minKg} kg</b></div><div class="ws-row"><span>Delivery</span><b style="text-align:right">${esc(w.delivery)}</b></div>
    <div class="chips">${w.services.map(s=>`<span class="chip">${esc(s)}</span>`).join("")}</div><p class="why" style="margin:6px 0 0">Price shown is for small orders; larger volumes cost less per kg.</p>`:`<div class="ws-row"><span>Terms</span><b>Not listed yet</b></div>${w.page?`<a class="why" href="${esc(w.page)}" target="_blank" rel="noopener">See their wholesale page ↗</a>`:""}`}
    <label class="check"><input type="checkbox" data-sl="${r.id}" ${shortlist.has(r.id)?"checked":""} ${(!shortlist.has(r.id)&&shortlist.size>=5)?"disabled":""}> ${shortlist.has(r.id)?"Chosen ✓":"Add to my enquiry"}</label></div></article>`}).join(""):`<div class="empty">No wholesale roasters match.</div>`;
  renderShortlist();
}
function renderShortlist(){
  $("#wf-short").innerHTML=shortlist.size?`<b>${shortlist.size} of 5 chosen:</b> ${[...shortlist].map(id=>esc(R[id].name)).join(", ")}. ${shortlist.size<5?"Add more if you'd like, up to 5.":"That's your five."}`:"Pick up to <b>5 roasters</b> above who you think fit, and we'll email your details to just those five.";
}


/* ---------- profile & weekly picks ----------
   Saved to Supabase through /api/profile, under a random private key kept in this browser,
   and mirrored in localStorage. Email sign-in (so a profile follows people across devices)
   comes later. */
const PF_FORMATS=[["beans","Whole beans or ground"],["pods","Pods & capsules"]];
let profile={name:"",email:"",tastes:[],roasts:[],formats:["beans"],budget:"",grind:"",consent:false};
try{ Object.assign(profile, JSON.parse(localStorage.getItem("profile")||"{}")) }catch(e){}
const store={db:null,uid:null,ready:false,ref:null,busy:Promise.resolve(),timer:null};
const hasProfile=()=>!!(profile.savedAt);
function profileDoc(){ return {...profile,liked:[...liked],kit:[...kit],grinder:myGrinder||"",updated:new Date().toISOString()}; }
function writeProfile(){
  try{ localStorage.setItem("profile",JSON.stringify(profile)) }catch(e){}
  if(!store.ref) return Promise.resolve(true);
  const body=profileDoc();
  store.busy=store.busy.then(()=>store.ref.set(body)).then(()=>true,e=>{console.warn("profile save",e&&e.code);return false});
  return store.busy;
}
/* likes / kit / grinder changes ride along once the person has a profile, one write per pause */
function queueSync(){ if(!hasProfile()||!store.ref) return; clearTimeout(store.timer); store.timer=setTimeout(writeProfile,1500); }
const _saveLikes=saveLikes; saveLikes=function(){ _saveLikes(); queueSync(); };
const _saveKit=saveKit; saveKit=function(){ _saveKit(); queueSync(); };
function newToken(){
  if(crypto.randomUUID) return crypto.randomUUID();
  const b=crypto.getRandomValues(new Uint8Array(16)); b[6]=b[6]&15|64; b[8]=b[8]&63|128;
  const h=[...b].map(x=>x.toString(16).padStart(2,"0")).join("");
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
let pfToken=""; try{ pfToken=localStorage.getItem("pfToken")||"" }catch(e){}
if(!pfToken){ pfToken=newToken(); try{ localStorage.setItem("pfToken",pfToken) }catch(e){} }
async function profileCall(method,doc){
  const r=await fetch(method==="GET"?"/api/profile?token="+encodeURIComponent(pfToken):"/api/profile",
    method==="GET"?{cache:"no-store"}:{method,headers:{"content-type":"application/json"},body:JSON.stringify({token:pfToken,doc})});
  if(!r.ok) throw {code:r.status};
  return method==="GET"?r.json():null;
}
/* same get/set/delete shape the page was written against */
const profileApi={
  async get(){ const j=await profileCall("GET"); return {exists:!!j.doc,data:()=>j.doc}; },
  set:doc=>profileCall("PUT",doc),
  async delete(){ await profileCall("DELETE"); pfToken=newToken(); try{ localStorage.setItem("pfToken",pfToken) }catch(e){} }
};
(async()=>{
  try{
    store.ref=profileApi;
    const snap=await Promise.race([store.ref.get(),new Promise((_,r)=>setTimeout(()=>r("timeout"),10000))]);
    if(snap.exists){
      const d=snap.data()||{};
      ["name","email","tastes","roasts","formats","budget","grind","consent","savedAt"].forEach(k=>{if(d[k]!==undefined) profile[k]=Array.isArray(d[k])?[...d[k]]:d[k]});
      (d.liked||[]).forEach(id=>liked.add(id)); (d.kit||[]).forEach(v=>kit.add(v)); if(d.grinder&&!myGrinder) myGrinder=d.grinder;
      _saveLikes(); _saveKit(); try{localStorage.setItem("grinder",myGrinder);localStorage.setItem("profile",JSON.stringify(profile))}catch(e){}
    }
  }catch(e){ store.ref=null; }
  store.ready=true; updateAcctLink(); setTimeout(()=>{ if(location.hash==="#account") renderAccount(); else route(); },0);
})();
function updateAcctLink(){ const a=$("#acctLink"); if(!a) return; const isR=portalRoaster&&R[portalRoaster]; a.textContent=isR?"Roaster portal":hasProfile()?(profile.name?`Hi, ${profile.name}`:"Your profile"):"Log in"; a.setAttribute("href",isR?"#portal":"#account"); }

function profileMatches(x){
  if(isPod(x)){ if(!profile.formats.includes("pods")) return false; if(ownedSystems().length&&!kit.has(x.system)) return false; }
  else{ if(profile.formats.length&&!profile.formats.includes("beans")) return false;
        if(profile.roasts.length&&x.roastKnown!==false&&!profile.roasts.includes(x.roast)) return false; }
  if(profile.tastes.length&&!profile.tastes.includes(x.taste)) return false;
  if(profile.budget){ const c=perCup(x); if(c!=null&&c>+profile.budget) return false; }
  return x.notes[0]!=="Not stated";
}
/* this week's picks: from the newest additions, matched to likes first, then to the profile */
function weeklyPicks(n=5){
  const fresh=ALL.filter(x=>!liked.has(x.id)).sort((a,b)=>a.addedDays-b.addedDays).slice(0,150);
  let pool=fresh.filter(profileMatches); if(pool.length<n) pool=fresh.filter(x=>x.notes[0]!=="Not stated");
  const seeds=ALL.filter(x=>liked.has(x.id));
  if(seeds.length) return recommend(seeds,n,pool).map(r=>({x:r.bean,why:whyText(r)}));
  const per={},out=[];
  for(const x of pool){ per[x.roaster]=(per[x.roaster]||0)+1; if(per[x.roaster]<=1) out.push({x,why:`${esc(x.taste)}${profile.tastes.includes(x.taste)?", a flavour you chose":""}`}); if(out.length>=n) break; }
  return out;
}
function renderEmailPreview(){
  const picks=weeklyPicks(5), nm=profile.name||"there";
  $("#emailPrev").innerHTML=`<div class="eh"><small>Preview of your weekly email${profile.consent?"":" (not switched on yet)"}</small><b>Hi ${esc(nm)}, ${picks.length} new coffees picked for you</b></div>
   <ol>${picks.map(({x,why})=>{const r=R[x.roaster];return `<li><div class="dot">${hasLogo(r)?logoImg(r):esc(initials(r.name))}</div><div><a href="#${x.id}">${esc(x.name)}</a><div class="sub">${esc(r.name)} · ${esc(x.taste)}${isPod(x)?" · "+esc(x.system):x.roastKnown===false||x.roast==="Not stated"?"":" · "+esc(x.roast)} · ${priceTag(x)}</div><div class="why2">${why}</div></div></li>`}).join("")||`<li class="sub">No matches yet. Try ticking more flavours or roasts.</li>`}</ol>
   <div class="ef">${liked.size?`Matched to the ${liked.size} coffee${liked.size>1?"s":""} you've liked and your profile.`:`Tap ♡ on coffees you've enjoyed and these picks get much sharper.`} Unsubscribe in one click from any email.</div>`;
}
let _acctWired=false;
function acctShowRole(role){
  $("#acctLover").hidden = role!=="lover";
  $("#acctRoaster").hidden = role!=="roaster";
  document.querySelectorAll("#roleSeg button").forEach(b=>b.classList.toggle("on",b.dataset.role===role));
}
function setupAcctRoles(){
  const pick=$("#acctRoastPick");
  if(pick && !pick.options.length){
    const opts=REAL.filter(r=>B.some(b=>b.roaster===r.id)).sort((a,b)=>a.name.localeCompare(b.name));
    pick.innerHTML='<option value="">Choose your roastery…</option>'+opts.map(r=>`<option value="${esc(r.id)}">${esc(r.name)}</option>`).join("");
    if(portalRoaster) pick.value=portalRoaster;
  }
  if(!_acctWired){
    _acctWired=true;
    document.querySelectorAll("#roleSeg button").forEach(b=>b.addEventListener("click",()=>acctShowRole(b.dataset.role)));
    $("#acctRoastBtn").addEventListener("click",()=>{
      const v=$("#acctRoastPick").value;
      if(!v){ $("#acctRoastMsg").textContent="Pick your roastery to continue."; return; }
      portalRoaster=v; try{localStorage.setItem("portalR",v)}catch(e){}
      updateAcctLink(); location.hash="#portal";
    });
  }
  acctShowRole("lover");
}
function renderAccount(){
  setupAcctRoles();
  const st=$("#acctStatus");
  st.className="acct-status"+(store.ref?" ok":"");
  st.innerHTML=!store.ready?"Checking for a saved profile…":store.ref?`<span>✓ <b>Saved to Crema.</b> Your profile is stored with us and linked to this browser. Email sign-in, so it follows you to other devices, is coming.</span>`:`<span><b>Saved in this browser only.</b> This preview can't create accounts yet; when Crema launches you'll sign up with your email and a one-time link.</span>`;
  const box=(id,list,sel,name)=>$(id).innerHTML=list.map(([v,l])=>`<label><input type="checkbox" name="${name}" value="${esc(v)}" ${sel.includes(v)?"checked":""}> ${esc(l)}</label>`).join("");
  box("#pf-tastes",Object.keys(TASTES).map(t=>[t,`${t}`]),profile.tastes,"taste");
  box("#pf-roasts",ROASTS.map(r=>[r,r]),profile.roasts,"roast");
  box("#pf-formats",PF_FORMATS,profile.formats,"format");
  $("#pf-name").value=profile.name||""; $("#pf-email").value=profile.email||"";
  $("#pf-budget").value=profile.budget||""; $("#pf-grind").value=profile.grind||""; $("#pf-consent").checked=!!profile.consent;
  const kitN=ownedGuides().map(g=>g.method).concat(ownedSystems());
  $("#pf-kit").innerHTML=`${liked.size?`<b>${liked.size}</b> liked coffee${liked.size>1?"s":""} (<a href="#for-you">see them</a>)`:`No liked coffees yet (<a href="#beans">browse beans</a>)`} · ${kitN.length?`Equipment: ${kitN.map(esc).join(", ")}`:`No equipment chosen`} · ${myGrinder&&myGrinder!=="other"?`Grinder: ${esc(myGrinder)}`:"No grinder chosen"} · <a href="#brew">change kit</a>`;
  $("#pf-save").textContent=hasProfile()?"Update my profile":"Save my profile";
  $("#pf-danger").hidden=!hasProfile();
  $("#acctTitle").textContent=hasProfile()&&profile.name?`${profile.name}'s coffee profile`:"Your coffee profile";
  renderEmailPreview();
}
function readForm(){
  const vals=n=>[...document.querySelectorAll(`#pfForm input[name=${n}]:checked`)].map(i=>i.value);
  return {name:$("#pf-name").value.trim().slice(0,60),email:$("#pf-email").value.trim().slice(0,120),tastes:vals("taste"),roasts:vals("roast"),formats:vals("format"),budget:$("#pf-budget").value,grind:$("#pf-grind").value,consent:$("#pf-consent").checked};
}
$("#pfForm").addEventListener("input",()=>{ Object.assign(profile,readForm()); renderEmailPreview(); });
$("#pfForm").addEventListener("submit",async e=>{
  e.preventDefault(); const f=readForm(), msg=$("#pf-msg");
  if(f.consent&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email)){ msg.textContent="Add a valid email so we can send your picks."; $("#pf-email").focus(); return; }
  Object.assign(profile,f,{savedAt:profile.savedAt||new Date().toISOString()});
  msg.textContent="Saving…"; const ok=await writeProfile();
  msg.textContent=ok?(store.ref?"Saved to your account.":"Saved in this browser."):"Couldn't save to your account just now. It's kept in this browser.";
  updateAcctLink(); renderAccount(); $("#pf-msg").textContent=msg.textContent;
});
$("#pf-delete").addEventListener("click",async()=>{
  if(store.ref){ clearTimeout(store.timer); await store.busy; try{ await store.ref.delete() }catch(e){} }
  profile={name:"",email:"",tastes:[],roasts:[],formats:["beans"],budget:"",grind:"",consent:false};
  try{ localStorage.removeItem("profile") }catch(e){}
  updateAcctLink(); renderAccount(); $("#pf-msg").textContent="Profile deleted. Your likes and kit stay in this browser.";
});
updateAcctLink();


/* ---------- map ---------- */
const MAP={w:520,h:812,pad:16,latMin:49.9,latMax:58.9,lngMin:-8.3,lngMax:1.9};
MAP.kx=Math.cos(54*Math.PI/180);
function proj(lat,lng){
  const xr=(MAP.lngMax-MAP.lngMin)*MAP.kx, nx=((lng-MAP.lngMin)*MAP.kx)/xr, ny=(MAP.latMax-lat)/(MAP.latMax-MAP.latMin);
  return [MAP.pad+nx*(MAP.w-2*MAP.pad), MAP.pad+ny*(MAP.h-2*MAP.pad)];
}
const GB=[[50.07,-5.72],[51.6,-5.3],[52.1,-4.7],[52.9,-4.8],[53.3,-4.6],[53.4,-3.3],[54.1,-3.6],[54.9,-5.0],[55.9,-5.8],[56.8,-6.1],[57.4,-6.3],[58.3,-5.3],[58.6,-3.9],[58.65,-3.1],[57.7,-2.0],[56.7,-2.4],[56.0,-2.5],[55.6,-1.8],[54.6,-1.0],[54.1,-0.2],[53.6,0.1],[52.9,0.35],[52.1,1.75],[51.5,1.4],[51.0,1.4],[50.8,0.3],[50.73,-1.9],[50.6,-2.5],[50.2,-3.6],[50.07,-5.72]];
const NI=[[55.25,-6.5],[55.3,-7.4],[54.1,-7.6],[54.0,-5.4],[54.65,-5.5],[55.25,-6.5]];
function polyPath(pts){return "M"+pts.map(([la,ln])=>proj(la,ln).map(v=>v.toFixed(1)).join(",")).join("L")+"Z";}
const MAPPTS=()=>REAL.filter(r=>r.lat!=null);
let nearFrom=null;
function haversine(a,b,c,d){const R=3958.8,t=x=>x*Math.PI/180,dla=t(c-a),dlo=t(d-b);const h=Math.sin(dla/2)**2+Math.cos(t(a))*Math.cos(t(c))*Math.sin(dlo/2)**2;return 2*R*Math.asin(Math.sqrt(h));}
function renderMap(){
  const pts=MAPPTS();
  const dots=pts.map(r=>{const [x,y]=proj(r.lat,r.lng);const cafe=offers(r).cafe===true;return `<circle class="dot${cafe?" cafe":""}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.4" data-id="${r.id}"><title>${esc(r.name)} — ${esc(r.city||"")}</title></circle>`}).join("");
  $("#mapCanvas").innerHTML=`<svg viewBox="0 0 ${MAP.w} ${MAP.h}" role="img" aria-label="Map of UK coffee roasters"><path class="uk-outline" d="${polyPath(GB)}"/><path class="uk-outline" d="${polyPath(NI)}"/>${dots}</svg>
    <div class="map-legend"><span><i style="background:var(--blue)"></i>Roaster</span><span><i style="background:var(--accent)"></i>Has a café</span></div>`;
  $("#mapPop").hidden=true;
  if(nearFrom) paintNear();
}
function paintNear(){
  const pts=MAPPTS().map(r=>({r,mi:haversine(nearFrom.lat,nearFrom.lng,r.lat,r.lng)})).sort((a,b)=>a.mi-b.mi);
  const near=pts.slice(0,15), ids=new Set(near.map(x=>x.r.id));
  $all("#mapCanvas .dot").forEach(d=>d.classList.toggle("hi",ids.has(d.dataset.id)));
  $("#nearList").innerHTML=`<h3 style="margin:20px 0 4px">Closest to you</h3>`+near.map(({r,mi})=>`<div class="near-row" data-id="${r.id}"><span class="nlogo">${hasLogo(r)?logoImg(r):esc(initials(r.name))}</span><div><b>${esc(r.name)}</b><div class="why" style="margin:0">${esc(r.city||"")}</div></div><span class="nd">${mi<10?mi.toFixed(1):Math.round(mi)} mi</span></div>`).join("");
}
$("#mapCanvas").addEventListener("click",e=>{
  const dot=e.target.closest(".dot"); if(!dot)return;
  const r=R[dot.dataset.id]; const pop=$("#mapPop"); const sv=$("#mapCanvas").getBoundingClientRect(), db=dot.getBoundingClientRect();
  pop.innerHTML=`<b>${esc(r.name)}</b><span class="why" style="margin:0">${esc(r.city||"")}</span><br><a href="#roaster-${r.id}">View roaster →</a>`;
  pop.style.left=(db.left-sv.left+db.width/2)+"px"; pop.style.top=(db.top-sv.top)+"px"; pop.hidden=false;
});
$("#nearList").addEventListener("click",e=>{const row=e.target.closest("[data-id]");if(row)location.hash="#roaster-"+row.dataset.id;});
$("#nearBtn").addEventListener("click",()=>{
  const msg=$("#nearMsg");
  if(!navigator.geolocation){msg.textContent="Your browser can't share location.";return;}
  msg.textContent="Finding you…";
  navigator.geolocation.getCurrentPosition(pos=>{
    nearFrom={lat:pos.coords.latitude,lng:pos.coords.longitude}; msg.textContent="Showing roasters nearest you.";
    paintNear(); $("#nearList").scrollIntoView({behavior:"smooth",block:"nearest"});
  },err=>{msg.textContent=err.code===1?"Location permission denied.":"Couldn't get your location.";},{timeout:8000});
});

/* ---------- routing (#home, #beans, #bean-001, #roaster-id …) ---------- */
function go(h){ if(location.hash===h) route(); else location.hash=h; }
function route(){
  const h=(location.hash||"#home").slice(1);
  let v=h, arg=null;
  if(/^bean-\d+$/.test(h)){v="bean";arg=h} else if(/^pod-\d+$/.test(h)){v="pod";arg=h} else if(h.startsWith("guide-")){v="guide";arg=h} else if(h.startsWith("swap-")){v="swapd";arg=h.slice(5)} else if(h.startsWith("roaster-")){v="roaster";arg=h.slice(8)}
  if(!document.getElementById("v-"+v)) v="home";
  document.querySelectorAll(".view").forEach(el=>el.classList.toggle("on",el.id==="v-"+v));
  const navKey={bean:"beans",pod:"pods",roaster:"roasters",guide:"brew",swapd:"swap",kitcoffees:"brew"}[v]||v;
  document.querySelectorAll(".links a").forEach(a=>{const current=a.dataset.v===navKey;a.classList.toggle("on",current);if(current)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");});
  ({home:renderHome,beans:renderBeans,bean:()=>renderBean(arg),pods:renderPods,swap:renderSwap,swapd:()=>renderSwapDetail(arg),brew:renderBrew,shop:renderGrinders,about:renderAbout,guide:()=>renderGuide(arg),pod:()=>renderPod(arg),map:renderMap,roasters:renderRoasters,roaster:()=>renderRoaster(arg),"for-you":renderForYou,wholesale:renderWholesale,account:renderAccount,kitcoffees:renderKitCoffees,territory:renderTerritory,portal:renderPortal})[v]();
  if(v!=="bean"&&v!=="pod") detailOrigin=location.hash||"#home";  // remember where a coffee is opened from
}
const lastHash={v:null};
window.addEventListener("hashchange",()=>{route();window.scrollTo(0,0)});

/* ---------- events ---------- */
document.addEventListener("click",e=>{
  const like=e.target.closest("[data-like]"); if(like){e.preventDefault();e.stopPropagation();toggleLike(like.dataset.like);return}
  const t=e.target.closest("[data-taste]"); if(t){beanFilter={...beanFilter,taste:t.dataset.taste,roaster:"",q:""}}
  const rr=e.target.closest("[data-roaster]"); if(rr){beanFilter={...beanFilter,roaster:rr.dataset.roaster,taste:"",q:""}}
  const kt=e.target.closest("[data-kittoggle]"); if(kt){const v=kt.dataset.kittoggle; kit.has(v)?kit.delete(v):kit.add(v); saveKit(); route(); return}
  const cl=e.target.closest("#rclear"); if(cl){rFilt.clear();rRegion="";rLimit=48;renderRoasters();return}
  const rb=e.target.closest("[data-reg]"); if(rb){rRegion=rb.dataset.reg;rLimit=48;closeSheet();renderRoasters();return}
  const ff=e.target.closest("[data-filt]"); if(ff){const k=ff.dataset.filt; setTimeout(()=>{ff.checked?rFilt.add(k):rFilt.delete(k);rLimit=48;renderRoasters();},0); return}
  const sk=e.target.closest("[data-smk]"); if(sk){smFilter=sk.dataset.smk;renderSwap();return}
  const sy=e.target.closest("[data-system]"); if(sy){podFilter.system=sy.dataset.system; if(location.hash==="#pods"){e.preventDefault();renderPods()}}
  const bp=e.target.closest("[data-brew]"); if(bp){const [bid,gid]=bp.dataset.brew.split("~"); openBrewSheet(bid,gid); return}
  const sl=e.target.closest("[data-shortlist]"); if(sl){shortlist.add(sl.dataset.shortlist)}
  const g=e.target.closest("[data-go]"); if(g&&!e.target.closest("a")) go(g.dataset.go);
});
document.addEventListener("change",e=>{ if(e.target.dataset.kit!==undefined){ const v=e.target.dataset.kit; e.target.checked?kit.add(v):kit.delete(v); saveKit(); kcLim=48; const s=ownedSystems(); if(s.length===1) podFilter.system=s[0]; renderBrew(); return; }
  if(e.target.dataset.sl){
    const id=e.target.dataset.sl;
    if(e.target.checked){ if(shortlist.size>=5){ e.target.checked=false; $("#wf-short").innerHTML=`<b>You can choose up to 5 roasters.</b> Untick one to add another.`; return; } shortlist.add(id); }
    else shortlist.delete(id);
    renderWholesale();
  } });
["q","taste","roast","proc","strength","sort"].forEach(k=>$("#f"+k).addEventListener("input",e=>{beanFilter[k]=e.target.value;beanFilter.roaster="";bLimit=48;renderBeans()}));
$("#fdecaf").addEventListener("change",e=>{beanFilter.decaf=e.target.checked;bLimit=48;renderBeans()});
$("#bmore").addEventListener("click",()=>{bLimit+=48;renderBeans()});
$("#smGo").addEventListener("click",renderSwapCustom);
$("#myGrinder").addEventListener("change",e=>{myGrinder=e.target.value; try{localStorage.setItem("grinder",myGrinder)}catch(_){} renderGrindTable(); queueSync();});
$("#guideToggle").addEventListener("click",()=>{showAllGuides=!showAllGuides;renderBrew();});
$("#kitCoffeesMore").addEventListener("click",()=>{kcLim=48;location.hash="#kitcoffees";});
$("#terrGen").addEventListener("click",terrGenerate);
$("#portalLoginBtn").addEventListener("click",()=>{const v=$("#portalPick").value;if(!v){$("#portalMsg").textContent="Pick your roastery to continue.";return;}portalRoaster=v;try{localStorage.setItem("portalR",v)}catch(e){}updateAcctLink();renderPortal();});
$("#terrTest").addEventListener("input",terrTest);
$("#kcMore").addEventListener("click",()=>{kcLim+=48;renderKitCoffees();});
$("#myMachine").addEventListener("change",e=>{myMachine=e.target.value;try{localStorage.setItem("machine",myMachine)}catch(_){}$("#machineGuide").innerHTML=machineGuideHTML(myMachine);queueSync();});
$("#kitSuggestBtn").addEventListener("click",()=>{const v=$("#kitSuggest").value.trim();const m=$("#kitSuggestMsg");if(!v){m.textContent="Type the equipment first.";return;}m.textContent=`Thanks — we'll look at adding "${v}". (This prototype doesn't send yet.)`;$("#kitSuggest").value="";});
$("#smQ").addEventListener("input",renderSwap); $("#smSys").addEventListener("change",renderSwap);
// coffees per day -> kg per week: cups x 7 days x 20g per coffee
const KG_PER_CUP_WEEK = 7*20/1000;
function updateKg(){
  const cups=Math.max(0,+$("#wf-cups").value||0), kg=cups*KG_PER_CUP_WEEK;
  $("#wf-kg").innerHTML = cups ? `Estimated <b>${kg.toLocaleString("en-GB",{maximumFractionDigits:1})} kg per week</b> (${cups} coffees × 7 days × 20g)` : "Enter how many coffees you serve a day.";
}
$("#wf-cups").addEventListener("input",updateKg); updateKg();
$("#homeSearch").addEventListener("submit",e=>{e.preventDefault();beanFilter={q:$("#homeQ").value,taste:"",roast:"",proc:"",strength:"",sort:"new",roaster:""};go("#beans")});
[["#ptaste","taste"],["#pmat","mat"],["#psort","sort"]].forEach(([s,k])=>$(s).addEventListener("change",e=>{podFilter[k]=e.target.value;renderPods()}));
$("#pdecaf").addEventListener("change",e=>{podFilter.decaf=e.target.checked;renderPods()});
$("#pillRegion").addEventListener("click",()=>openSheet("region"));
$("#pillFilt").addEventListener("click",()=>openSheet("filters"));
["#sheetBg","#sheetDone","#regionGrab","#filtGrab","#brewGrab"].forEach(x=>$(x).addEventListener("click",closeSheet));
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("#sheetBg").hidden)closeSheet();});
$("#rq").addEventListener("input",()=>{rLimit=48;renderRoasters()});
$("#rmore").addEventListener("click",()=>{rLimit+=48;renderRoasters()});

const WQTY={beans:[["","Any order size"],["3","Up to 3 kg/week"],["5","Up to 5 kg/week"],["10","Up to 10 kg/week"]],pods:[["","Any order size"],["100","Up to 100 pods/week"],["250","Up to 250 pods/week"],["500","Up to 500 pods/week"]]};
function setSupplyUI(){
  const pods=$("#wsupply").value==="pods";
  $("#wqty").innerHTML=(pods?WQTY.pods:WQTY.beans).map(([v,l])=>`<option value="${v}">${l}</option>`).join("");
  $("#wsvc").style.display=pods?"none":"";  // pod machines don't need barista support
}
setSupplyUI();
$("#wpc").addEventListener("input",()=>{wsShowAll=false;renderWholesale()});
$("#wsupply").addEventListener("change",()=>{setSupplyUI();wsShowAll=false;renderWholesale()});
["#wqty","#wsvc"].forEach(x=>$(x).addEventListener("change",()=>{wsShowAll=false;renderWholesale()}));
$("#wsAll").addEventListener("click",()=>{wsShowAll=!wsShowAll;renderWholesale()});
$("#wMachine").addEventListener("change",()=>{wsShowAll=false;renderWholesale()});
$("#wsForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const out=$("#wf-out");
  if(!shortlist.size){out.innerHTML=`<div class="notice">Choose at least one roaster above first.</div>`;return}
  const n=shortlist.size, btn=e.submitter||$("#wsForm button");
  btn.disabled=true; out.innerHTML=`<div class="notice">Sending…</div>`;
  try{
    const r=await fetch("/api/enquiry",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
      business:$("#wf-biz").value.trim(), businessType:$("#wf-type").value, email:$("#wf-email").value.trim(),
      cupsPerDay:+$("#wf-cups").value||null, message:$("#wf-msg").value.trim(),
      supply:$("#wsupply").value, needsMachine:$("#wMachine").checked, location:$("#wpc").value.trim(),
      roasterIds:[...shortlist]})});
    if(!r.ok) throw r.status;
    out.innerHTML=`<div class="notice"><b>Enquiry received for your ${n} chosen roaster${n>1?"s":""}.</b> We'll pass your details on so they can get in touch.</div>`;
  }catch(err){
    out.innerHTML=`<div class="notice">Sorry, that didn't send. Please try again in a moment.</div>`;
  }finally{ btn.disabled=false; }
});

fill("#ftaste",Object.keys(TASTES)); fill("#froast",[...ROASTS,"Not stated"].filter(r=>B.some(b=>b.roast===r))); fill("#fproc",uniq(B.map(b=>b.process)));
fill("#ptaste",Object.keys(TASTES)); fill("#pmat",uniq(P.map(p=>p.material)));
$("#wsvc").innerHTML='<option value="">Any support</option>'+["Machine leasing","Machine included","Training & support","Servicing"].map(x=>`<option>${x}</option>`).join("");
route();
