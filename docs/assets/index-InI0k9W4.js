(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))o(s);new MutationObserver(s=>{for(const r of s)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&o(a)}).observe(document,{childList:!0,subtree:!0});function n(s){const r={};return s.integrity&&(r.integrity=s.integrity),s.referrerPolicy&&(r.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?r.credentials="include":s.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function o(s){if(s.ep)return;s.ep=!0;const r=n(s);fetch(s.href,r)}})();function se(){const e=new Uint8Array(12);return crypto.getRandomValues(e),[...e].map(t=>t.toString(16).padStart(2,"0")).join("")}function rt(){return{roomId:se(),inviteToken:se()}}function at({wsUrl:e,roomId:t,inviteToken:n,name:o,onHealth:s,onError:r}){if(!t)throw new Error("A room ID is required.");if(!n)throw new Error("An invitation token is required.");const a=se(),d=[],u=[],g=[],c=[];let l=null,$=!1,x=!1,k=0,C=0,L=0,w=null;const I=v=>s==null?void 0:s({localPeerId:a,status:v,peerCount:C,reconnectAttempts:L,peers:[]});function N(v){const A=JSON.stringify(v);$&&(l==null?void 0:l.readyState)===WebSocket.OPEN?l.send(A):c.push(A)}function T(){for(;c.length&&(l==null?void 0:l.readyState)===WebSocket.OPEN;)l.send(c.shift())}function E(){const v=`${e.replace(/\/$/,"")}/room/${encodeURIComponent(t)}`;l=new WebSocket(v),l.onopen=()=>{$=!0,k=0,N({t:"hello",id:a,token:n,name:o}),T(),I("connected")},l.onmessage=A=>{let P;try{P=JSON.parse(A.data)}catch{return}P.t==="welcome"?(C=P.peers.length,I("connected"),P.peers.forEach(O=>u.forEach(te=>te(O)))):P.t==="peer-join"?(C+=1,I("connected"),u.forEach(O=>O(P.id))):P.t==="peer-leave"?(C=Math.max(0,C-1),I("connected"),g.forEach(O=>O(P.id))):P.t==="evt"&&d.forEach(O=>O(P.payload,P.from))},l.onclose=A=>{if($=!1,x){I("closed");return}if(A.code===4001||A.code===4002){r==null||r({type:"join-error",message:"Could not join room (bad token)."}),I("degraded");return}L+=1,I("reconnecting");const O=Math.min(1e3*2**k,8e3);k+=1,w=setTimeout(E,O)},l.onerror=()=>{r==null||r({type:"ws-error",message:"Relay connection error."})}}return E(),{localPeerId:a,publish:v=>N({t:"evt",payload:v}),publishTo:(v,A)=>N({t:"evt",target:v,payload:A}),onEvent:v=>{d.push(v)},onPeerJoin:v=>u.push(v),onPeerLeave:v=>g.push(v),getPeerIds:()=>[],leave(){x=!0,w&&clearTimeout(w);try{l==null||l.close(1e3,"leave")}catch{}}}}const J={rock:{glyph:"✊",beats:"scissors"},paper:{glyph:"✋",beats:"rock"},scissors:{glyph:"✌️",beats:"paper"}};function it(e){const t=Object.keys(e),n=new Set,o=new Set(t.map(s=>e[s]));if(t.length<2)return{outcome:"incomplete",winners:[],winningThrow:null};if(t.length===2){const[s,r]=t;if(e[s]===e[r])return{outcome:"draw",winners:[],winningThrow:null};const a=J[e[s]].beats===e[r]?s:r;return n.add(a),{outcome:"win",winners:[...n],winningThrow:e[a]}}if(o.size===2){const[s,r]=[...o],a=J[s].beats===r?s:r;return t.forEach(d=>{e[d]===a&&n.add(d)}),{outcome:"win",winners:[...n],winningThrow:a}}return o.size===1?{outcome:"draw",winners:[],winningThrow:null}:{outcome:"stalemate",winners:[],winningThrow:null}}function ct(e){const t=Object.values(e).map(Number);if(!t.length)return{avg:0,spread:0,consensus:!0,hardNo:!1,min:0,max:0};const n=Math.min(...t),o=Math.max(...t),s=t.reduce((a,d)=>a+d,0)/t.length,r=o-n;return{avg:s,spread:r,consensus:r<=1,hardNo:t.some(a=>a===0),min:n,max:o}}const lt=Object.keys(J),dt={id:"rps",label:"Rock · Paper · Scissors",description:"The classic settler of disputes. Head-to-head or whole-team throwdown.",glyphs:"✊ ✋ ✌️",blind:!0,needsConfig:!1,minPlayers:2,defaultConfig:()=>({}),normalizeConfig:()=>({}),validatePick:e=>lt.includes(e),result:e=>it(e)},ut={id:"f2f",label:"Fist to Five",description:"Gauge the room. Zero is a hard no, five is full-throated support.",glyphs:"☝️ 🖐",blind:!0,needsConfig:!1,minPlayers:1,defaultConfig:()=>({}),normalizeConfig:()=>({}),validatePick:e=>Number.isInteger(e)&&e>=0&&e<=5,result:e=>ct(e)},U=[0,1,2,3,5,8,13],$e=["?","coffee"],re={id:"points",label:"Story Pointing",description:"Estimate together, anchor-free. Fibonacci scale, reveal when all hands are in.",glyphs:"1 3 5 8 13",blind:!0,needsConfig:!1,minPlayers:1,defaultConfig:()=>({}),normalizeConfig:()=>({}),validatePick:e=>U.includes(e)||$e.includes(e),result(e){const t=Object.entries(e),n=t.filter(([,c])=>typeof c=="number"),o=t.filter(([,c])=>!U.includes(c)||typeof c!="number").map(([c])=>c),s=n.map(([,c])=>c);if(!s.length)return{avg:null,min:null,max:null,consensus:!1,outliers:[],abstained:o,numericCount:0};const r=Math.min(...s),a=Math.max(...s),d=s.reduce((c,l)=>c+l,0)/s.length,u=U.indexOf(a)-U.indexOf(r)<=1,g=u?[]:n.filter(([,c])=>c===r||c===a).map(([c])=>c);return{avg:d,min:r,max:a,consensus:u,outliers:g,abstained:o,numericCount:s.length}},scale:U,special:$e},ke=["yes","no","abstain"],ft={id:"motion",label:"Motion Vote",description:"Pose a question, vote blind. Yes, no, or abstain — revealed together.",glyphs:"👍 👎",blind:!0,needsConfig:!0,minPlayers:1,defaultConfig:()=>({question:""}),normalizeConfig(e){return{question:typeof(e==null?void 0:e.question)=="string"?e.question.trim().slice(0,200):""}},validatePick:e=>ke.includes(e),result(e){const t={yes:0,no:0,abstain:0};for(const o of Object.values(e))t[o]+=1;const n=t.yes+t.no;return{...t,passed:t.yes>t.no,tied:t.yes===t.no&&n>0,unanimous:n>0&&(t.yes===0||t.no===0)}},options:ke};function mt(e,t){return!Array.isArray(e)||e.length!==t||new Set(e).size!==t?!1:e.every(o=>Number.isInteger(o)&&o>=0&&o<t)}const pt={id:"ranked",label:"Ranked Choice",description:"Everyone privately ranks the options. Borda-count scores, revealed together.",glyphs:"🥇 🥈 🥉",blind:!0,needsConfig:!0,minPlayers:1,defaultConfig:()=>({options:[]}),normalizeConfig(e){const t=Array.isArray(e==null?void 0:e.options)?e.options:[];return{options:[...new Set(t.filter(o=>typeof o=="string").map(o=>o.trim().slice(0,100)).filter(Boolean))].slice(0,10)}},validatePick:(e,t)=>mt(e,t.options.length)&&t.options.length>=2,result(e,t){const n=t.options.length,o=new Array(n).fill(0),s=new Array(n).fill(0);for(const u of Object.values(e))u.forEach((g,c)=>{o[g]+=n-1-c,c===0&&(s[g]+=1)});const r=t.options.map((u,g)=>({option:u,index:g,points:o[g],firsts:s[g]})).sort((u,g)=>g.points-u.points||g.firsts-u.firsts||u.index-g.index),a=r[0],d=r.filter(u=>u.points===a.points&&u.firsts===a.firsts);return{scores:r,winner:d.length===1?a.option:null,tie:d.length>1?d.map(u=>u.option):[],voterCount:Object.keys(e).length}}},Ce=["Mission & Purpose","Pace & Sustainability","Process & Tools","Support & Safety","Fun & Energy"],Se=["r","y","g"];function xe(e){const{r:t,y:n,g:o}=e;return o>n&&o>t?"g":n>o&&n>t?"y":t>n&&t>o||t===n&&t>=o?"r":"y"}const gt={id:"health",label:"Health Check",description:"Rate the team red / yellow / green across five dimensions, blind, then compare.",glyphs:"🔴 🟡 🟢",blind:!0,needsConfig:!1,minPlayers:1,defaultConfig:()=>({categories:Ce}),normalizeConfig(e){const n=(Array.isArray(e==null?void 0:e.categories)?e.categories:[]).filter(o=>typeof o=="string").map(o=>o.trim().slice(0,60)).filter(Boolean).slice(0,10);return{categories:n.length>=2?n:Ce}},validatePick(e,t){return!e||typeof e!="object"||Array.isArray(e)?!1:t.categories.every((n,o)=>Se.includes(e[o]))},result(e,t){const n=t.categories.map((s,r)=>{const a={r:0,y:0,g:0};for(const d of Object.values(e))a[d[r]]+=1;return{name:s,...a,light:xe(a)}}),o={r:0,y:0,g:0};for(const s of n)o[s.light]+=1;return{categories:n,overall:xe(o),raterCount:Object.keys(e).length}},lights:Se};function H(e){if(e===void 0)throw new Error("cannot canonicalize undefined");if(typeof e=="function"||typeof e=="symbol"||typeof e=="bigint")throw new Error(`cannot canonicalize ${typeof e}`);if(typeof e=="number"&&!Number.isFinite(e))throw new Error("cannot canonicalize non-finite number");return e===null||typeof e!="object"?JSON.stringify(e):Array.isArray(e)?`[${e.map(H).join(",")}]`:`{${Object.keys(e).sort().map(o=>`${JSON.stringify(o)}:${H(e[o])}`).join(",")}}`}function ht(e){let t=2166136261;for(let n=0;n<e.length;n++)t^=e.charCodeAt(n),t=Math.imul(t,16777619)>>>0;return t>>>0}const bt={id:"turn",label:"Turn Picker",description:"Fairly picks who goes next. Nobody can rig it — randomness comes from everyone.",glyphs:"🎯",blind:!0,needsConfig:!1,minPlayers:1,defaultConfig:()=>({excluded:[]}),normalizeConfig(e){return{excluded:(Array.isArray(e==null?void 0:e.excluded)?e.excluded:[]).filter(n=>typeof n=="string").slice(0,100)}},validatePick:e=>typeof e=="string"&&e.length>0&&e.length<=64,result(e,t,n){const o=new Set(t.excluded);let s=n.participants.filter(g=>!o.has(g));const r=s.length===0;if(r&&(s=[...n.participants]),!s.length)return{winner:null,eligible:[],exhausted:r};const a=Object.keys(e).sort(),d=H(a.map(g=>[g,e[g]]));return{winner:s.sort()[ht(d)%s.length],eligible:s,exhausted:r}}},W={wwda:{label:"Went Well / Didn’t / Actions",columns:[{key:"well",title:"Went Well"},{key:"not",title:"Didn’t Go Well"},{key:"actions",title:"Actions"}]},ssc:{label:"Start / Stop / Continue",columns:[{key:"start",title:"Start"},{key:"stop",title:"Stop"},{key:"continue",title:"Continue"}]}},yt={id:"retro",label:"Retrospective",description:"Reflect as a team. Cards in columns, blind or live, everyone can rearrange.",glyphs:"🗂️",mode:"board",needsConfig:!0,minPlayers:1,defaultConfig:()=>({template:"wwda",privacy:"blind"}),normalizeConfig(e){const t=e&&W[e.template]?e.template:"wwda",n=e&&e.privacy==="live"?"live":"blind";return{template:t,privacy:n}},columnsFor(e){return W[e.template]?W[e.template].columns:W.wwda.columns},validatePick:()=>!1,result:()=>null},Ie=[re,ut,ft,pt,gt,bt,yt,dt],vt=Object.fromEntries(Ie.map(e=>[e.id,e])),$t=Ie,Z=e=>vt[e]||null;function kt(){return{round:0,game:null,config:{},selectFrom:null,names:{},departed:{},commits:{},reveals:{},forced:{},presenceSeq:{},cards:{},cardsRevealed:{},facilitator:{holder:null,term:-1}}}function Ee(e,t,n,o){const s={...e};return s[t]={...s[t]||{},[n]:o},s}function Le(e,t){return t.round>e.round?!0:t.round===e.round?e.selectFrom==null||t.from<e.selectFrom:!1}function Ct(e,t){if(!t||typeof t!="object")return e;switch(t.type){case"presence":{const n=Number(t.seq)||0;return(e.presenceSeq[t.from]??-1)>=n&&e.names[t.from]?e:{...e,names:{...e.names,[t.from]:String(t.name||"").slice(0,20)||"peer"},departed:St(e.departed,t.from),presenceSeq:{...e.presenceSeq,[t.from]:n}}}case"select-game":{if(!Le(e,t))return e;const n=t.config&&typeof t.config=="object"?t.config:{};return{...e,round:t.round,game:t.game,config:n,selectFrom:t.from}}case"back-to-lobby":return Le(e,t)?{...e,round:t.round,game:null,config:{},selectFrom:t.from}:e;case"commit":return{...e,commits:Ee(e.commits,t.round,t.from,t.hash)};case"reveal":return{...e,reveals:Ee(e.reveals,t.round,t.from,{pick:t.pick,nonce:t.nonce})};case"force-reveal":return{...e,forced:{...e.forced,[t.round]:!0}};case"facilitator":{const n=e.facilitator;return t.term>n.term||t.term===n.term&&(n.holder==null||t.holder<n.holder)?{...e,facilitator:{holder:t.holder,term:t.term}}:e}case"card":{const n=e.cards[t.round]||{},o=n[t.cardId];if(!(!o||t.ver>o.ver||t.ver===o.ver&&t.from<o.from))return e;const r=t.card&&typeof t.card=="object"?t.card:{};return{...e,cards:{...e.cards,[t.round]:{...n,[t.cardId]:{...r,ver:t.ver,from:t.from}}}}}case"reveal-cards":return{...e,cardsRevealed:{...e.cardsRevealed,[t.round]:!0}};case"leave":return{...e,departed:{...e.departed,[t.from]:!0}};default:return e}}function St(e,t){if(!(t in e))return e;const n={...e};return delete n[t],n}function Be(e,t){return e.order<t.order?-1:e.order>t.order?1:e.cardId<t.cardId?-1:e.cardId>t.cardId?1:0}function xt(e,t,n,o){const s=e.cards[o]||{};return{columns:t.columnsFor(n).map(a=>({...a,cards:Object.entries(s).filter(([,d])=>d.col===a.key&&!d.deleted).map(([d,u])=>({cardId:d,...u})).sort(Be)})),cardsRevealed:!!e.cardsRevealed[o],privacy:n.privacy}}function je(e){return[...e].sort()[0]??null}function Et(e,t,n,o={}){const s=[...new Set(n)].filter(T=>!e.departed[T]);s.sort();const r=e.facilitator.holder,d=r&&s.includes(r)?r:je(s),u=e.round,g=e.commits[u]||{},c=o[u]||{},l=s.filter(T=>T in g),$=s.length>0&&l.length===s.length,x=!!e.forced[u],k=x||$,C=e.game?Z(e.game):null,L=C?C.normalizeConfig(e.config):{};if(C&&C.mode==="board")return{round:u,game:e.game,config:L,phase:"board",participants:s,names:e.names,facilitator:d,isFacilitator:t===d,committedIds:[],lockedCount:0,remaining:s.length,iAmCommitted:!1,revealPicks:null,result:null,board:xt(e,C,L,u)};let w=C?"pick":"lobby",I=null,N=null;if(C&&k){const T={};for(const v of l)v in c&&C.validatePick(c[v],L)&&(T[v]=c[v]);(x?Object.keys(T).length>0:l.every(v=>v in c))&&(w="reveal",N=T,I=C.result(T,L,{round:u,participants:s}))}return{round:u,game:e.game,config:L,phase:w,participants:s,names:e.names,facilitator:d,isFacilitator:t===d,committedIds:l,lockedCount:l.length,remaining:s.length-l.length,iAmCommitted:l.includes(t),revealPicks:N,result:I}}function Lt(e,{onDeliver:t}){const n=new Set,o=[];function s(r,a){!r||typeof r.id!="string"||n.has(r.id)||(n.add(r.id),o.push(r),t(r),a&&e.publish(r))}return e.onEvent((r,a)=>{if(r&&Array.isArray(r.__snapshot)){for(const d of r.__snapshot)s(d,!1);return}s(r,!0)}),e.onPeerJoin(r=>{e.publishTo(r,{__snapshot:o})}),{publish(r){s(r,!0)},log:o,seenIds:n}}async function le(e){const t=new TextEncoder().encode(e),n=await crypto.subtle.digest("SHA-256",t);return[...new Uint8Array(n)].map(o=>o.toString(16).padStart(2,"0")).join("")}const Oe=(e,t)=>`${H(e)}|${t}`;function At(e,t,n=le){return n(Oe(e,t))}async function Pt(e,t,n,o=le){return typeof t!="string"||!t?!1:await o(Oe(e,t))===n}const Y=36,Rt=Y-1;function Ae(e,t){return t<e.length?parseInt(e[t],Y):0}function X(e="",t=""){let n="",o=0;for(;o<200;){const s=Ae(e,o),r=o<t.length?Ae(t,o):Rt+1;if(r-s>1){const a=s+Math.floor((r-s)/2);return n+a.toString(Y)}n+=s.toString(Y),o+=1}return n+"1"}function Tt(e=""){let t=0;for(let n=0;n<e.length;n++)t=t*31+e.charCodeAt(n)&65535;return(t%1296).toString(Y).padStart(2,"0")}function wt(e="",t=""){return X(e,"")+Tt(t)}const It=15e3;function Bt(){const e=new Uint8Array(16);return crypto.getRandomValues(e),[...e].map(t=>t.toString(16).padStart(2,"0")).join("")}function jt({transport:e,name:t,hasher:n=le,now:o=()=>Date.now(),randomNonce:s=Bt,livenessMs:r=It,autoVerify:a=!1,isCreator:d=!1,roomId:u="default",storage:g=typeof localStorage<"u"?localStorage:null}){const c=e.localPeerId;let l=kt();const $={},x=new Map,k=[],C=new Set;let L=null,w=0,I=0;const N=new Set;let T=null;const E=new Map,v=`tablestakes:drafts:${u}`;function A(){if(g)try{g.setItem(v,JSON.stringify([...E]))}catch{}}function P(){if(g)try{const i=g.getItem(v);if(i)for(const[f,h]of JSON.parse(i))E.set(f,h)}catch{}}function O(){E.clear();try{g==null||g.removeItem(v)}catch{}}P();const te=Lt(e,{onDeliver:fe});e.onPeerLeave(i=>{fe({type:"leave",from:i})}),x.set(c,o());function de(){const i=o(),f=new Set([c]);for(const[h,y]of x)h!==c&&i-y<=r&&!l.departed[h]&&f.add(h);return[...f]}function ue(){return de().filter(i=>!l.departed[i])}function D(){const i=M();let f;try{f=H(i)}catch{f=null}if(!(f!==null&&f===T)){T=f;for(const h of N)h(i)}}function F(i){te.publish(i)}function fe(i){if(l=Ct(l,i),i.from&&x.set(i.from,o()),i.type==="reveal"&&i.from!==c&&k.push({round:i.round,from:i.from,pick:i.pick,nonce:i.nonce}),i.type==="reveal-cards"&&i.round===l.round){for(const[f,h]of E)F({id:`card:${f}:1`,type:"card",from:c,round:i.round,cardId:f,ver:1,card:h});O()}me(),he(),D(),a&&k.length&&queueMicrotask(pe)}function me(){if(!l.game||!L||L.round!==l.round||C.has(l.round))return;const i=ue(),f=l.commits[l.round]||{},h=i.length>0&&i.every(y=>y in f);(l.forced[l.round]||h)&&(C.add(l.round),F({id:`reveal:${c}:${l.round}`,type:"reveal",from:c,round:l.round,pick:L.pick,nonce:L.nonce}))}let ne=!1;function pe(){ne||(ne=!0,Promise.resolve(ge()).finally(()=>{ne=!1}))}async function ge(){var h,y;let i=!1;const f=[];for(const b of k){const G=(h=l.commits[b.round])==null?void 0:h[b.from];if(!G){f.push(b);continue}if(await Pt(b.pick,b.nonce,G,n)){$[y=b.round]??($[y]={});const Q=$[b.round][b.from];(Q===void 0||H(Q)!==H(b.pick))&&($[b.round][b.from]=b.pick,i=!0)}}return k.length=0,k.push(...f),i&&D(),i}function M(){const i=Et(l,c,de(),$);if(i.board){const f=new Map;if(!i.board.cardsRevealed)for(const[h,y]of E){const b=f.get(y.col)||[];b.push({cardId:h,from:c,ver:0,pending:!0,...y}),f.set(y.col,b)}i.board={...i.board,columns:i.board.columns.map(h=>({...h,cards:[...h.cards,...f.get(h.key)||[]].map(y=>({...y,mine:y.author===c})).sort(Be)}))}}return i}function oe(i,f){F({id:`fac:${f}:${i}`,type:"facilitator",from:c,holder:i,term:f})}function he(){const i=l.facilitator.holder;if(i==null)return;const f=ue();!f.length||f.includes(i)||je(f)===c&&i!==c&&oe(c,l.facilitator.term+1)}function _e(i){!M().isFacilitator||i===c||!l.names[i]||l.departed[i]||oe(i,l.facilitator.term+1)}function ze(){be(),d&&oe(c,0)}function be(){x.set(c,o()),F({id:`presence:${c}:${w}`,type:"presence",from:c,name:t,seq:w}),w+=1}function Ue(){me(),he(),a&&k.length&&pe(),D()}async function Ve(i){var b;if(!l.game||C.has(l.round))return;const f=l.commits[l.round]||{};if(c in f)return;const h=s(),y=await At(i,h,n);L={round:l.round,pick:i,nonce:h},$[b=l.round]??($[b]={}),$[l.round][c]=i,F({id:`commit:${c}:${l.round}`,type:"commit",from:c,round:l.round,hash:y})}function We(i,f={}){if(!M().isFacilitator)return;const h=l.round+1;L=null,F({id:`select:${h}:${c}`,type:"select-game",from:c,round:h,game:i,config:f})}function Je(){if(!M().isFacilitator)return;const i=l.round+1;L=null,F({id:`lobby:${i}:${c}`,type:"back-to-lobby",from:c,round:i})}function Ye(){M().isFacilitator&&F({id:`force:${l.round}:${c}`,type:"force-reveal",from:c,round:l.round})}function Ke(){F({id:`leave:${c}`,type:"leave",from:c})}function Qe(i){return i.board&&i.board.privacy==="blind"&&!i.board.cardsRevealed}function K(i,f,h){F({id:`card:${i}:${f}`,type:"card",from:c,round:l.round,cardId:i,ver:f,card:h})}function Xe(i,f,h={}){var ve;const y=M();if(!y.board)return null;const b=`${c}:${I++}`,G=((ve=y.board.columns.find(st=>st.key===i))==null?void 0:ve.cards)||[],Q=wt(G.length?G[G.length-1].order:"",c),ye={text:String(f).slice(0,280),col:i,order:Q,author:c,deleted:!1,...h};return Qe(y)?(E.set(b,ye),A(),D()):K(b,1,ye),b}function Ze(i,f){var y;if(E.has(i)){const b=E.get(i);if(b.author!==c)return;E.set(i,{...b,text:String(f).slice(0,280)}),A(),D();return}const h=(y=l.cards[l.round])==null?void 0:y[i];!h||h.author!==c||K(i,h.ver+1,{...h,text:String(f).slice(0,280)})}function et(i,f,h){var b;if(E.has(i)){const G=E.get(i);E.set(i,{...G,col:f,order:h}),A(),D();return}const y=(b=l.cards[l.round])==null?void 0:b[i];y&&K(i,y.ver+1,{...y,col:f,order:h})}function tt(i){var h;if(E.has(i)){if(E.get(i).author!==c)return;E.delete(i),A(),D();return}const f=(h=l.cards[l.round])==null?void 0:h[i];!f||f.author!==c||K(i,f.ver+1,{...f,deleted:!0})}function nt(){const i=M();!i.isFacilitator||!i.board||F({id:`reveal-cards:${l.round}`,type:"reveal-cards",from:c,round:l.round})}function ot(i){return N.add(i),()=>N.delete(i)}return{self:c,join:ze,heartbeat:be,tick:Ue,lock:Ve,selectGame:We,backToLobby:Je,forceReveal:Ye,leave:Ke,handOff:_e,addCard:Xe,editCard:Ze,moveCard:et,deleteCard:tt,revealCards:nt,processVerifications:ge,getView:M,onChange:ot,_debug:()=>({state:l,verified:$})}}const p=e=>document.getElementById(e),m=e=>String(e).replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t]);function _(e,t){return e?`<div class="lock-note"><strong>Locked in.</strong> Waiting on ${t} player${t===1?"":"s"}…</div>`:'<div class="lock-note">Your pick locks in immediately — choose with intent.</div>'}function z(e,t){return e.isFacilitator?`
    <div class="stage-actions">
      <button class="btn-primary" id="againBtn">${m(t)}</button>
      <button class="btn-ghost" id="lobbyBtn">Change game</button>
    </div>`:`<div class="lock-note">Waiting on ${m(e.names[e.facilitator]||"the facilitator")} for the next round…</div>`}function R(e,t){return`<div class="stage-kicker">Round ${e.round} — ${m(t)}</div>`}const Ot={renderPick(e,t){const n=e.iAmCommitted;return`
      ${R(e,"Rock Paper Scissors")}
      <div class="stage-title">Make your <em>throw</em></div>
      <div class="choices">
        ${Object.entries(J).map(([o,s])=>`
          <button class="choice ${t.choice===o?"selected":""}" data-pick="${o}" ${n?"disabled":""}>
            <span class="glyph">${s.glyph}</span>
            <span class="lbl">${o}</span>
          </button>`).join("")}
      </div>
      ${_(n,e.remaining)}`},renderReveal(e){const t=e.revealPicks||{},n=Object.keys(t),o=e.result,s=new Set(o.winners);let r;if(o.outcome==="draw")r=n.length===2?"A <em>draw.</em> Run it back.":"Everyone threw the same. A <em>draw.</em>";else if(o.outcome==="stalemate")r="All three throws on the table — <em>stalemate.</em>";else if(o.outcome==="incomplete")r="Not enough throws to call it.";else if(n.length===2){const a=o.winners[0],d=n.find(u=>u!==a);r=`<em>${m(e.names[a]||"Someone")}</em> takes it — ${m(t[a])} beats ${m(t[d])}.`}else{const a=o.winningThrow;r=`<em>${m(a[0].toUpperCase()+a.slice(1))}</em> wins the round.`}return`
      ${R(e,"the reveal")}
      <div class="verdict">${r}</div>
      <div class="results">
        ${n.map((a,d)=>{var u;return`
          <div class="result-row ${s.has(a)?"winner":""}" style="animation-delay:${d*90}ms">
            <span class="r-glyph">${((u=J[t[a]])==null?void 0:u.glyph)||"?"}</span>
            <span class="r-name">${m(e.names[a]||"departed player")}</span>
            <span class="r-choice">${m(t[a])}${s.has(a)?" · win":""}</span>
          </div>`}).join("")}
      </div>
      ${z(e,"Throw again")}`},bind(e,t,n,o){document.querySelectorAll("[data-pick]").forEach(s=>s.addEventListener("click",()=>{n.choice=s.dataset.pick,t.lock(n.choice),o()}))}},Ft={renderPick(e,t){const n=e.iAmCommitted;return`
      ${R(e,"Fist to Five")}
      <div class="stage-title">How do you <em>really</em> feel?</div>
      <div class="choices">
        ${[0,1,2,3,4,5].map(o=>`
          <button class="choice ${t.choice===o?"selected":""}" data-pick="${o}" ${n?"disabled":""}>
            <span class="num">${o}</span>
            <span class="lbl">${o===0?"fist":o===5?"all in":"&nbsp;"}</span>
          </button>`).join("")}
      </div>
      ${_(n,e.remaining)}`},renderReveal(e){const t=e.revealPicks||{},n=Object.keys(t),o=e.result;let s;o.hardNo?s="A fist on the table — <em>someone is blocking.</em> Talk it out.":o.consensus&&o.avg>=4?s='<span class="consensus">Strong consensus.</span> Ship it.':o.consensus?s='<span class="consensus">Aligned</span> — the room agrees.':s=`The room is <em>split.</em> Hear from the ${o.min}s and the ${o.max}s.`;const r=[...n].sort((a,d)=>Number(t[a])-Number(t[d]));return`
      ${R(e,"the reveal")}
      <div class="verdict">${s}</div>
      <div class="stat-strip">
        <div class="stat"><div class="s-val">${o.avg.toFixed(1)}</div><div class="s-lbl">average</div></div>
        <div class="stat"><div class="s-val">${o.spread}</div><div class="s-lbl">spread</div></div>
      </div>
      <div class="results">
        ${r.map((a,d)=>`
          <div class="result-row" style="animation-delay:${d*90}ms">
            <span class="r-num">${m(t[a])}</span>
            <span class="r-name">${m(e.names[a]||"departed player")}</span>
            <span class="r-choice">${Number(t[a])===0?"block":Number(t[a])>=4?"support":"reserved"}</span>
          </div>`).join("")}
      </div>
      ${z(e,"Vote again")}`},bind(e,t,n,o){document.querySelectorAll("[data-pick]").forEach(s=>s.addEventListener("click",()=>{n.choice=Number(s.dataset.pick),t.lock(n.choice),o()}))}},Pe={"?":"?",coffee:"☕"},qt={renderPick(e,t){const n=e.iAmCommitted,o=[...re.scale,...re.special];return`
      ${R(e,"Story Pointing")}
      <div class="stage-title">Size it <em>blind</em></div>
      <div class="choices">
        ${o.map(s=>`
          <button class="choice ${t.choice===s?"selected":""}" data-pick="${m(String(s))}" ${n?"disabled":""}>
            <span class="num">${Pe[s]??s}</span>
            <span class="lbl">${s==="?"?"unsure":s==="coffee"?"break":"&nbsp;"}</span>
          </button>`).join("")}
      </div>
      ${_(n,e.remaining)}`},renderReveal(e){const t=e.revealPicks||{},n=e.result,o=Object.keys(t).sort((a,d)=>{const u=typeof t[a]=="number"?t[a]:1/0,g=typeof t[d]=="number"?t[d]:1/0;return u-g}),s=new Set(n.outliers);let r;return n.numericCount===0?r="No estimates on the table — <em>coffee first?</em>":n.consensus?r=`<span class="consensus">Converged.</span> Call it a ${Math.round(n.avg)}.`:r=`The room is <em>split</em> — hear from the ${n.min}s and the ${n.max}s.`,`
      ${R(e,"the reveal")}
      <div class="verdict">${r}</div>
      ${n.numericCount?`
      <div class="stat-strip">
        <div class="stat"><div class="s-val">${n.avg.toFixed(1)}</div><div class="s-lbl">average</div></div>
        <div class="stat"><div class="s-val">${n.min}–${n.max}</div><div class="s-lbl">range</div></div>
      </div>`:""}
      <div class="results">
        ${o.map((a,d)=>`
          <div class="result-row ${s.has(a)?"winner":""}" style="animation-delay:${d*90}ms">
            <span class="r-num">${Pe[t[a]]??m(t[a])}</span>
            <span class="r-name">${m(e.names[a]||"departed player")}</span>
            <span class="r-choice">${s.has(a)?"outlier · speak up":n.abstained.includes(a)?"abstained":""}</span>
          </div>`).join("")}
      </div>
      ${z(e,"Point again")}`},bind(e,t,n,o){document.querySelectorAll("[data-pick]").forEach(s=>s.addEventListener("click",()=>{const r=s.dataset.pick,a=r==="?"||r==="coffee"?r:Number(r);n.choice=a,t.lock(a),o()}))}},Re={yes:"👍",no:"👎",abstain:"🤷"},Nt={configForm(e){return`
      <div class="field">
        <label for="cfgQuestion">The question</label>
        <input type="text" id="cfgQuestion" maxlength="200" placeholder="e.g. Ship it on Friday?" value="${m(e.question||"")}" autocomplete="off">
      </div>`},readConfig(){var e;return{question:((e=document.getElementById("cfgQuestion"))==null?void 0:e.value)||""}},configValid:e=>e.question.trim().length>0,renderPick(e,t){const n=e.iAmCommitted;return`
      ${R(e,"Motion Vote")}
      <div class="stage-title">${m(e.config.question||"The motion")}</div>
      <div class="choices">
        ${["yes","no","abstain"].map(o=>`
          <button class="choice ${t.choice===o?"selected":""}" data-pick="${o}" ${n?"disabled":""}>
            <span class="glyph">${Re[o]}</span>
            <span class="lbl">${o}</span>
          </button>`).join("")}
      </div>
      ${_(n,e.remaining)}`},renderReveal(e){const t=e.revealPicks||{},n=e.result,o=Object.keys(t).sort();let s;return n.tied?s="Dead <em>even.</em> Keep talking.":n.passed?s=`<span class="consensus">Carried${n.unanimous?", unanimously":""}.</span> ${n.yes}–${n.no}.`:s=`<em>Does not carry.</em> ${n.yes}–${n.no}.`,`
      ${R(e,"the reveal")}
      <p class="stage-sub">${m(e.config.question||"")}</p>
      <div class="verdict">${s}</div>
      <div class="stat-strip">
        <div class="stat"><div class="s-val">${n.yes}</div><div class="s-lbl">yes</div></div>
        <div class="stat"><div class="s-val">${n.no}</div><div class="s-lbl">no</div></div>
        <div class="stat"><div class="s-val">${n.abstain}</div><div class="s-lbl">abstain</div></div>
      </div>
      <div class="results">
        ${o.map((r,a)=>`
          <div class="result-row" style="animation-delay:${a*90}ms">
            <span class="r-glyph">${Re[t[r]]}</span>
            <span class="r-name">${m(e.names[r]||"departed player")}</span>
            <span class="r-choice">${m(t[r])}</span>
          </div>`).join("")}
      </div>
      ${z(e,"New motion")}`},againOpensConfig:!0,bind(e,t,n,o){document.querySelectorAll("[data-pick]").forEach(s=>s.addEventListener("click",()=>{n.choice=s.dataset.pick,t.lock(n.choice),o()}))}},Mt={configForm(e){return`
      <div class="field">
        <label for="cfgOptions">Options — one per line (2–10)</label>
        <textarea id="cfgOptions" rows="4" placeholder="Option A&#10;Option B&#10;Option C">${m(e.optionsText||"")}</textarea>
      </div>`},readConfig(){var t;const e=((t=document.getElementById("cfgOptions"))==null?void 0:t.value)||"";return{optionsText:e,options:e.split(`
`).map(n=>n.trim()).filter(Boolean)}},configValid:e=>e.options.length>=2,renderPick(e,t){const n=e.iAmCommitted,o=t.rank||[],s=e.config.options,r=o.length===s.length;return`
      ${R(e,"Ranked Choice")}
      <div class="stage-title">Rank them <em>all</em></div>
      <p class="stage-sub">Tap in order of preference — first tap is your top pick.</p>
      <div class="choices">
        ${s.map((a,d)=>{const u=o.indexOf(d);return`
            <button class="choice ${u>=0?"selected":""}" data-rank="${d}" ${n||u>=0?"disabled":""}>
              <span class="num">${u>=0?u+1:"·"}</span>
              <span class="lbl">${m(a)}</span>
            </button>`}).join("")}
      </div>
      ${n?"":`
      <div class="stage-actions">
        <button class="btn-primary" id="lockRankBtn" ${r?"":"disabled"}>Lock ranking</button>
        <button class="btn-ghost" id="resetRankBtn" ${o.length?"":"disabled"}>Reset</button>
      </div>`}
      ${_(n,e.remaining)}`},renderReveal(e){const t=e.result;let n;return t.winner?n=`<em>${m(t.winner)}</em> takes it.`:t.tie.length?n=`A tie between <em>${t.tie.map(m).join("</em> and <em>")}</em>.`:n="No clear result.",`
      ${R(e,"the reveal")}
      <div class="verdict">${n}</div>
      <div class="results">
        ${t.scores.map((o,s)=>`
          <div class="result-row ${o.option===t.winner?"winner":""}" style="animation-delay:${s*90}ms">
            <span class="r-num">${s+1}</span>
            <span class="r-name">${m(o.option)}</span>
            <span class="r-choice">${o.points} pts · ${o.firsts} first${o.firsts===1?"":"s"}</span>
          </div>`).join("")}
      </div>
      <div class="lock-note">Borda count across ${t.voterCount} ballot${t.voterCount===1?"":"s"}.</div>
      ${z(e,"Vote again")}`},bind(e,t,n,o){document.querySelectorAll("[data-rank]").forEach(a=>a.addEventListener("click",()=>{n.rank=[...n.rank||[],Number(a.dataset.rank)],o()}));const s=document.getElementById("resetRankBtn");s&&s.addEventListener("click",()=>{n.rank=[],o()});const r=document.getElementById("lockRankBtn");r&&r.addEventListener("click",()=>{(n.rank||[]).length===e.config.options.length&&(t.lock(n.rank),o())})}},Te={r:"🔴",y:"🟡",g:"🟢"},Gt={renderPick(e,t){const n=e.iAmCommitted,o=t.ratings||{},s=e.config.categories,r=s.every((a,d)=>o[d]);return`
      ${R(e,"Health Check")}
      <div class="stage-title">How's the <em>team?</em></div>
      <div class="health-rate">
        ${s.map((a,d)=>`
          <div class="health-row">
            <span class="hc-name">${m(a)}</span>
            <span class="hc-lights">
              ${["r","y","g"].map(u=>`
                <button class="hc-light ${o[d]===u?"selected":""}" data-cat="${d}" data-light="${u}" ${n?"disabled":""}>${Te[u]}</button>`).join("")}
            </span>
          </div>`).join("")}
      </div>
      ${n?"":`
      <div class="stage-actions">
        <button class="btn-primary" id="lockHealthBtn" ${r?"":"disabled"}>Lock ratings</button>
      </div>`}
      ${_(n,e.remaining)}`},renderReveal(e){const t=e.result,n=t.overall==="g"?'<span class="consensus">Healthy.</span> Keep going.':t.overall==="y"?"Some <em>yellow flags</em> — worth a conversation.":"<em>Red flags on the table.</em> Make time for this.";return`
      ${R(e,"the reveal")}
      <div class="verdict">${n}</div>
      <div class="results">
        ${t.categories.map((o,s)=>`
          <div class="result-row" style="animation-delay:${s*90}ms">
            <span class="r-glyph">${Te[o.light]}</span>
            <span class="r-name">${m(o.name)}</span>
            <span class="r-choice">${o.g}🟢 ${o.y}🟡 ${o.r}🔴</span>
          </div>`).join("")}
      </div>
      <div class="lock-note">${t.raterCount} rating${t.raterCount===1?"":"s"} · lights are the majority, ties darken.</div>
      ${z(e,"Check again")}`},bind(e,t,n,o){document.querySelectorAll("[data-cat]").forEach(r=>r.addEventListener("click",()=>{n.ratings={...n.ratings||{},[r.dataset.cat]:r.dataset.light},o()}));const s=document.getElementById("lockHealthBtn");s&&s.addEventListener("click",()=>{const r=e.config.categories,a=n.ratings||{};r.every((d,u)=>a[u])&&(t.lock(Object.fromEntries(r.map((d,u)=>[u,a[u]]))),o())})}};function Dt(){const e=new Uint8Array(12);return crypto.getRandomValues(e),[...e].map(t=>t.toString(16).padStart(2,"0")).join("")}const Ht={renderPick(e,t){const n=e.iAmCommitted,o=(e.config.excluded||[]).filter(s=>e.names[s]).map(s=>e.names[s]);return`
      ${R(e,"Turn Picker")}
      <div class="stage-title">Who goes <em>next?</em></div>
      <p class="stage-sub">Everyone contributes randomness — nobody can rig the draw. ${o.length?`Already picked: ${o.map(m).join(", ")}.`:""}</p>
      <div class="stage-actions">
        <button class="btn-primary" id="drawBtn" ${n?"disabled":""}>${n?"In the hat":"Throw in the hat"}</button>
      </div>
      ${_(n,e.remaining)}`},renderReveal(e){const t=e.result,n=t.winner?e.names[t.winner]||"a departed player":"nobody";return`
      ${R(e,"the draw")}
      <div class="verdict"><em>${m(n)}</em> — you're up.</div>
      ${t.exhausted?'<div class="lock-note">Everyone had a turn — the exclusion list reset.</div>':""}
      ${e.isFacilitator?`
        <div class="stage-actions">
          <button class="btn-primary" id="againExcludeBtn">Pick again (skip ${m(n)})</button>
          <button class="btn-ghost" id="lobbyBtn">Change game</button>
        </div>`:z(e,"Pick again")}`},bind(e,t,n,o){const s=document.getElementById("drawBtn");s&&s.addEventListener("click",()=>{t.lock(Dt()),o()});const r=document.getElementById("againExcludeBtn");r&&r.addEventListener("click",()=>{const a=e.result,d=a.exhausted?[]:e.config.excluded||[],u=a.winner?[...new Set([...d,a.winner])]:d;t.selectGame("turn",{excluded:u})})}};function we(e,{title:t}={}){const n=[];t&&n.push(`# ${t}`,"");for(const o of e.board.columns){if(n.push(`## ${o.title}`),!o.cards.length)n.push("_(empty)_");else for(const s of o.cards){const r=e.names[s.author]||"unknown";n.push(`- ${s.text} — _${r}_`)}n.push("")}return n.join(`
`).trim()+`
`}async function _t(e){try{await navigator.clipboard.writeText(e)}catch{prompt("Copy this:",e);return}const t=p("toast");t&&(t.textContent="Copied",t.classList.add("show"),setTimeout(()=>{t.classList.remove("show"),t.textContent="Link copied"},1800))}function zt(e,t){const n=new Blob([e],{type:"text/markdown"}),o=URL.createObjectURL(n),s=document.createElement("a");s.href=o,s.download=t,document.body.appendChild(s),s.click(),s.remove(),URL.revokeObjectURL(o)}const Ut={configForm(e){const t=e.template||"wwda",n=e.privacy||"blind";return`
      <div class="field">
        <label>Template</label>
        <div class="choice-row">
          ${Object.entries(W).map(([o,s])=>`
            <label class="check-row">
              <input type="radio" name="cfgTemplate" value="${o}" ${t===o?"checked":""}>
              <span>${m(s.label)}</span>
            </label>`).join("")}
        </div>
      </div>
      <div class="field">
        <label>Card privacy</label>
        <div class="choice-row">
          <label class="check-row">
            <input type="radio" name="cfgPrivacy" value="blind" ${n==="blind"?"checked":""}>
            <span>Blind — hidden until you reveal</span>
          </label>
          <label class="check-row">
            <input type="radio" name="cfgPrivacy" value="live" ${n==="live"?"checked":""}>
            <span>Live — visible as written</span>
          </label>
        </div>
      </div>`},readConfig(){var n,o;const e=((n=document.querySelector('input[name="cfgTemplate"]:checked'))==null?void 0:n.value)||"wwda",t=((o=document.querySelector('input[name="cfgPrivacy"]:checked'))==null?void 0:o.value)||"blind";return{template:e,privacy:t}},configValid:()=>!0,renderBoard(e){const t=e.board.privacy==="blind"&&!e.board.cardsRevealed;return`
      <div class="stage-kicker">Retrospective</div>
      <div class="stage-title">${t?"Write it <em>down</em>":"The <em>board</em>"}</div>
      ${t?'<p class="stage-sub">Your cards are private until the facilitator reveals the board.</p>':""}
      <div class="board">
        ${e.board.columns.map(n=>`
          <div class="board-col">
            <div class="board-col-title">${m(n.title)}</div>
            <div class="board-cards" data-col="${m(n.key)}">
              ${n.cards.map((o,s)=>`
                <div class="board-card ${o.pending?"pending":""}" data-card="${m(o.cardId)}">
                  <div class="bc-text">${m(o.text)}</div>
                  <div class="bc-meta">
                    <span class="bc-author">${m(e.names[o.author]||(o.pending?"you":"departed"))}${o.pending?" · private":""}</span>
                    <span class="bc-actions">
                      ${s>0?`<button class="bc-btn" data-act="up" data-card="${m(o.cardId)}">↑</button>`:""}
                      ${s<n.cards.length-1?`<button class="bc-btn" data-act="down" data-card="${m(o.cardId)}">↓</button>`:""}
                      <button class="bc-btn" data-act="left" data-card="${m(o.cardId)}">←</button>
                      <button class="bc-btn" data-act="right" data-card="${m(o.cardId)}">→</button>
                      ${o.mine?`<button class="bc-btn" data-act="delete" data-card="${m(o.cardId)}">✕</button>`:""}
                    </span>
                  </div>
                </div>`).join("")}
              <form class="bc-add" data-col="${m(n.key)}">
                <input type="text" maxlength="280" placeholder="Add a card…" autocomplete="off">
              </form>
            </div>
          </div>`).join("")}
      </div>
      <div class="stage-actions">
        ${e.isFacilitator&&t?'<button class="btn-primary" id="revealCardsBtn">Reveal cards</button>':""}
        ${e.isFacilitator?'<button class="btn-ghost" id="lobbyBtn">Change game</button>':""}
        <button class="btn-ghost" id="exportMdBtn">Copy markdown</button>
        <button class="btn-ghost" id="downloadMdBtn">Download .md</button>
      </div>`},bindBoard(e,t){const n=e.board.columns.map(d=>d.key);document.querySelectorAll(".board-cards").forEach(d=>{const u=d.dataset.col;d.querySelectorAll("[data-act]").forEach(g=>g.addEventListener("click",()=>{const c=g.dataset.card,l=g.dataset.act,$=e.board.columns.find(k=>k.key===u).cards,x=$.findIndex(k=>k.cardId===c);if(l==="delete"){t.deleteCard(c);return}if(l==="up"&&x>0){const k=x>=2?$[x-2].order:"";t.moveCard(c,u,X(k,$[x-1].order))}else if(l==="down"&&x<$.length-1){const k=x+2<$.length?$[x+2].order:"";t.moveCard(c,u,X($[x+1].order,k))}else if(l==="left"||l==="right"){const k=n[(n.indexOf(u)+(l==="right"?1:n.length-1))%n.length],C=e.board.columns.find(w=>w.key===k).cards,L=C.length?C[C.length-1].order:"";t.moveCard(c,k,X(L,""))}}))}),document.querySelectorAll(".bc-add").forEach(d=>d.addEventListener("submit",u=>{u.preventDefault();const g=d.querySelector("input"),c=g.value.trim();c&&t.addCard(d.dataset.col,c),g.value=""}));const o=document.getElementById("revealCardsBtn");o&&o.addEventListener("click",()=>t.revealCards());const s=document.getElementById("lobbyBtn");s&&s.addEventListener("click",()=>t.backToLobby());const r=document.getElementById("exportMdBtn");r&&r.addEventListener("click",()=>_t(we(e)));const a=document.getElementById("downloadMdBtn");a&&a.addEventListener("click",()=>zt(we(e),"retro.md"))}},Vt={rps:Ot,f2f:Ft,points:qt,motion:Nt,ranked:Mt,health:Gt,turn:Ht,retro:Ut},ee=e=>Vt[e]||null;function Wt(e,t){if(!e.isFacilitator)return`
      <div class="stage-kicker">Round table</div>
      <div class="stage-title">Waiting on the <em>facilitator</em></div>
      <p class="waiting-host">${m(e.names[e.facilitator]||"The facilitator")} is choosing a game…</p>`;if(t.configGame){const n=Z(t.configGame),o=ee(t.configGame);return`
      <div class="stage-kicker">Set up</div>
      <div class="stage-title">${m(n.label)}</div>
      <p class="stage-sub">${m(n.description)}</p>
      ${o.configForm(t.configDraft||{})}
      <div class="stage-actions">
        <button class="btn-primary" id="startConfiguredBtn">Start round</button>
        <button class="btn-ghost" id="cancelConfigBtn">Back</button>
      </div>
      <div class="transport-error" id="configError"></div>`}return`
    <div class="stage-kicker">Round table</div>
    <div class="stage-title">Pick a <em>game</em></div>
    <p class="stage-sub">You're facilitating. Everyone locks in blind — nothing is shown until all hands are in.</p>
    <div class="game-cards">
      ${$t.map(n=>`
        <button class="game-card" data-game="${m(n.id)}">
          <div class="gc-glyphs">${n.glyphs}</div>
          <div class="gc-name">${m(n.label)}</div>
          <div class="gc-desc">${m(n.description)}</div>
        </button>`).join("")}
    </div>`}function Jt(e,t,n,o){if(document.querySelectorAll("[data-game]").forEach(a=>a.addEventListener("click",()=>{const d=a.dataset.game,u=Z(d);u&&(u.needsConfig?(n.configGame=d,n.configDraft={},o()):t.selectGame(d,u.defaultConfig(e)))})),n.configGame){const a=ee(n.configGame);document.querySelectorAll("#stage input, #stage textarea").forEach(d=>d.addEventListener("input",()=>{n.configDraft=a.readConfig()}))}const s=document.getElementById("startConfiguredBtn");s&&s.addEventListener("click",()=>{const a=n.configGame,d=Z(a),u=ee(a),g=d.normalizeConfig(u.readConfig());if(!u.configValid(g)){const c=document.getElementById("configError");c&&(c.textContent="That setup isn’t complete yet.");return}n.configGame=null,n.configDraft=null,t.selectGame(a,g)});const r=document.getElementById("cancelConfigBtn");r&&r.addEventListener("click",()=>{n.configGame=null,n.configDraft=null,o()})}const Yt="wss://tablestakes-turn.joshuarlowry.workers.dev",Kt=()=>new URLSearchParams(location.hash.replace(/^#/,"")),ae=()=>`${location.origin}${location.pathname}?room=${encodeURIComponent(j)}#token=${encodeURIComponent(B)}`;let S=null,j=null,B="",Fe=!1,q={},ie=-1,qe=null,Ne=null;const Me=new URLSearchParams(location.search);j=Me.get("room");Fe=!j;B=Kt().get("token")||Me.get("token")||"";B&&(p("inviteTokenInput").value=B);if(j){p("createBtn").textContent="Join room";const e=p("joinNote");e.style.display="inline",e.textContent=`joining ${j}`}p("createBtn").addEventListener("click",Ge);p("nameInput").addEventListener("keydown",e=>{e.key==="Enter"&&Ge()});p("copyBtn").addEventListener("click",async()=>{De();const e=p("inviteLinkInput").value;try{await navigator.clipboard.writeText(e)}catch{prompt("Copy this link:",e)}const t=p("toast");t.classList.add("show"),setTimeout(()=>t.classList.remove("show"),1800)});p("leaveBtn").addEventListener("click",Qt);async function Ge(){const e=p("nameInput").value.trim();if(!e){p("nameInput").focus();return}if(j){if(B=p("inviteTokenInput").value.trim()||B,!B){p("transportError").textContent="This room needs an invitation token.";return}history.replaceState(null,"",ae())}else{const n=rt();j=n.roomId,B=n.inviteToken,p("inviteTokenInput").value=B,history.replaceState(null,"",ae())}const t=at({wsUrl:Yt,roomId:j,inviteToken:B,name:e,onHealth:Zt,onError:Xt});S=jt({transport:t,name:e,autoVerify:!0,isCreator:Fe,roomId:j}),S.onChange(ce),S.join(),qe=setInterval(()=>S.heartbeat(),5e3),Ne=setInterval(()=>S.tick(),2e3),p("entry").classList.add("hidden"),p("room").classList.add("visible"),p("roomCodeText").textContent=j,De(),ce(S.getView())}function De(){!j||!B||(p("inviteLinkInput").value=ae())}function Qt(){S==null||S.leave(),S=null,clearInterval(qe),clearInterval(Ne),j=null,B="",q={},ie=-1,history.replaceState(null,"",location.pathname),p("room").classList.remove("visible"),p("entry").classList.remove("hidden"),p("createBtn").textContent="Start a room",p("joinNote").style.display="none",p("joinNote").textContent="",p("roomCodeText").textContent="",p("inviteLinkInput").value="",p("inviteTokenInput").value="",p("transportError").textContent="",p("healthErrors").textContent="",p("localPeerId").textContent="pending",p("transportStatus").textContent="idle",p("peerCount").textContent="0",p("reconnectAttempts").textContent="0",p("players").innerHTML="",p("stage").innerHTML="",He(!1,0)}function Xt(e){p("healthErrors").textContent=e.message||String(e)}function Zt(e){p("localPeerId").textContent=e.localPeerId||"pending",p("transportStatus").textContent=e.status,p("peerCount").textContent=String(e.peerCount),p("reconnectAttempts").textContent=String(e.reconnectAttempts)}function He(e,t){p("conn").classList.toggle("live",e),p("connText").textContent=e?`${t} connected`:S?"waiting for peers":"offline"}function ce(e){e.round!==ie&&(q={},ie=e.round),tn(e);const t=p("stage"),n=e.game?ee(e.game):null;e.phase==="lobby"||!n?t.innerHTML=Wt(e,q):e.phase==="board"?t.innerHTML=n.renderBoard(e,q):e.phase==="pick"?t.innerHTML=n.renderPick(e,q)+en(e):t.innerHTML=n.renderReveal(e),nn(e,n),He(e.participants.length>1,e.participants.length)}function en(e){return e.isFacilitator&&e.iAmCommitted&&e.remaining>0?'<div class="stage-actions"><button class="btn-ghost" id="forceBtn">Reveal now</button></div>':""}function tn(e){p("players").innerHTML=e.participants.map(t=>`
    <div class="player ${e.committedIds.includes(t)?"locked":""} ${t===S.self?"me":""}">
      <span class="pip"></span>
      <span>${m(e.names[t]||"…")}</span>
      ${t===e.facilitator?'<span class="tag">FACILITATOR</span>':""}
      ${e.isFacilitator&&t!==S.self&&t!==e.facilitator?`<button class="mini-action" data-facilitator="${m(t)}">Make facilitator</button>`:""}
    </div>`).join("")}function V(){ce(S.getView())}function nn(e,t){if(e.phase==="lobby"||!t)Jt(e,S,q,V);else if(e.phase==="board")t.bindBoard(e,S,q,V);else if(e.phase==="pick"){t.bind(e,S,q,V);const n=p("forceBtn");n&&n.addEventListener("click",()=>S.forceReveal())}else{t.bind(e,S,q,V);const n=p("againBtn");n&&n.addEventListener("click",()=>{t.againOpensConfig?(S.backToLobby(),q.configGame=e.game,q.configDraft={},V()):S.selectGame(e.game,e.config)});const o=p("lobbyBtn");o&&o.addEventListener("click",()=>S.backToLobby())}document.querySelectorAll("[data-facilitator]").forEach(n=>n.addEventListener("click",()=>S.handOff(n.dataset.facilitator)))}
