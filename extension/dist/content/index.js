function g(e,t){return Array.from(e.querySelectorAll(`input[type="${t}"]`))}function f(e){const t=e.querySelector('input[autocomplete="username"], input[autocomplete="email"]');if(t)return t;const n=e.querySelector('input[type="email"]');if(n)return n;const o=Array.from(e.querySelectorAll('input[type="text"], input:not([type])'));return o.find(i=>{const r=(i.name+i.id+(i.placeholder??"")).toLowerCase();return r.includes("user")||r.includes("email")||r.includes("login")||r.includes("account")})??o[0]??null}function v(e){const t=g(e,"password");if(t.length===0)return"unknown";const n=e.querySelector('input[autocomplete="new-password"]')!==null;return t.length>=2||n?"signup":t.length===1?"login":"unknown"}function w(e){const t=v(e),n=g(e,"password");let o=null,s=null,i=null;return t==="login"?(s=n[0]??null,o=f(e)):t==="signup"&&(s=n[0]??null,i=n[1]??null,o=f(e)),{kind:t,usernameField:o,passwordField:s,confirmField:i,form:e}}function x(){return Array.from(document.querySelectorAll("form")).map(w).filter(t=>t.kind!=="unknown"&&t.passwordField!==null)}function k(e){const t=new MutationObserver(e);return t.observe(document.body,{childList:!0,subtree:!0}),t}function m(e,t){const n=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value")?.set;n?n.call(e,t):e.value=t,e.dispatchEvent(new Event("input",{bubbles:!0})),e.dispatchEvent(new Event("change",{bubbles:!0}))}function h(e,t){e.usernameField&&m(e.usernameField,t.username),e.passwordField&&m(e.passwordField,t.password)}function F(e){if(e.kind!=="login"&&e.kind!=="signup"||!e.passwordField||!e.usernameField)return;const t=()=>{const n=e.usernameField?.value??"",o=e.passwordField?.value??"";if(!n||!o)return;let s,i;try{const a=new URL(window.location.href);s=a.hostname,i=a.href}catch{return}const r={type:"CAPTURE_CREDENTIALS",payload:{hostname:s,username:n,password:o,url:i}};chrome.runtime.sendMessage(r).catch(()=>{})};e.form.addEventListener("submit",t,{once:!1,passive:!0})}const E=`
  .wrap {
    position: fixed;
    top: 16px;
    right: 16px;
    width: 300px;
    background: #1f2937;
    border: 1px solid #374151;
    border-radius: 12px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.55);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    color: #f3f4f6;
    overflow: hidden;
    z-index: 2147483647;
    animation: zv-in 0.18s ease-out;
  }
  @keyframes zv-in {
    from { opacity: 0; transform: translateY(-8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 11px 13px 0;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 7px;
    font-weight: 600;
    font-size: 12px;
    color: #a5b4fc;
    letter-spacing: 0.02em;
  }
  .icon {
    width: 20px;
    height: 20px;
    background: #4f46e5;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 800;
    color: #fff;
  }
  .close {
    background: none;
    border: none;
    cursor: pointer;
    color: #6b7280;
    font-size: 16px;
    line-height: 1;
    padding: 2px 5px;
    border-radius: 4px;
    transition: color 0.12s, background 0.12s;
  }
  .close:hover { color: #f3f4f6; background: #374151; }
  .body {
    padding: 8px 13px 13px;
  }
  .label {
    color: #9ca3af;
    font-size: 11px;
    margin-bottom: 7px;
  }
  .entry {
    display: flex;
    align-items: center;
    gap: 9px;
    background: #111827;
    border: 1px solid #374151;
    border-radius: 8px;
    padding: 7px 9px;
    margin-bottom: 6px;
    cursor: pointer;
    transition: border-color 0.12s, background 0.12s;
    user-select: none;
  }
  .entry:hover { border-color: #6366f1; }
  .entry.selected { border-color: #4f46e5; background: #1e1b4b; }
  .avatar {
    width: 28px;
    height: 28px;
    background: #374151;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    color: #a5b4fc;
    flex-shrink: 0;
  }
  .entry-info { overflow: hidden; flex: 1; }
  .entry-user {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #f3f4f6;
  }
  .entry-site {
    font-size: 10px;
    color: #6b7280;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tick {
    color: #4f46e5;
    font-size: 14px;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.12s;
  }
  .entry.selected .tick { opacity: 1; }
  .actions {
    display: flex;
    gap: 7px;
    margin-top: 4px;
  }
  .btn {
    flex: 1;
    padding: 8px 10px;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: opacity 0.12s, background 0.12s;
    letter-spacing: 0.01em;
  }
  .btn-dismiss { background: #374151; color: #d1d5db; }
  .btn-dismiss:hover { background: #4b5563; }
  .btn-fill { background: #4f46e5; color: #fff; }
  .btn-fill:hover { background: #4338ca; }
`;function z(e,t){const n=o=>c(o.charAt(0).toUpperCase()||"?");return`
    <style>${E}</style>
    <div class="wrap">
      <div class="header">
        <div class="brand"><div class="icon">Z</div>ZeroVault</div>
        <button class="close" id="x">&#10005;</button>
      </div>
      <div class="body">
        <div class="label">Saved credentials for this site</div>
        ${e.map((o,s)=>`
          <div class="entry${s===t?" selected":""}" data-i="${s}">
            <div class="avatar">${n(o.username)}</div>
            <div class="entry-info">
              <div class="entry-user">${c(o.username)}</div>
              <div class="entry-site">${c(o.site)}</div>
            </div>
            <span class="tick">&#10003;</span>
          </div>
        `).join("")}
        <div class="actions">
          <button class="btn btn-dismiss" id="dismiss">Dismiss</button>
          <button class="btn btn-fill" id="fill">Fill Password</button>
        </div>
      </div>
    </div>
  `}function c(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function L(e,t,n){document.querySelector("[data-zv-prompt]")?.remove();const o=document.createElement("div");o.setAttribute("data-zv-prompt","");const s=o.attachShadow({mode:"closed"});let i=0;const r=()=>{s.innerHTML=z(e,i),s.getElementById("x")?.addEventListener("click",a),s.getElementById("dismiss")?.addEventListener("click",a),s.getElementById("fill")?.addEventListener("click",y),s.querySelectorAll("[data-i]").forEach(d=>{d.addEventListener("click",()=>{i=parseInt(d.dataset.i??"0",10),r()})})},a=()=>{o.remove(),n()},y=()=>{const d=e[i];d&&(o.remove(),t(d))};r(),document.body.appendChild(o);const u=setTimeout(a,3e4);return o.addEventListener("remove",()=>clearTimeout(u)),()=>{clearTimeout(u),o.remove()}}const b=new WeakSet;let l=null;function S(){try{return new URL(window.location.href).hostname}catch{return null}}const I=`
  .wrap {
    position: fixed;
    top: 16px;
    right: 16px;
    width: 292px;
    background: #1e1b4b;
    border: 1px solid #6366f1;
    border-radius: 12px;
    box-shadow: 0 8px 40px rgba(0,0,0,0.65);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 13px;
    color: #e0e7ff;
    overflow: hidden;
    z-index: 2147483647;
    animation: zv-slide 0.2s ease-out;
  }
  @keyframes zv-slide {
    from { opacity: 0; transform: translateY(-10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 11px 13px 0;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    font-size: 12px;
    color: #a5b4fc;
    letter-spacing: 0.02em;
  }
  .z-icon {
    width: 20px; height: 20px;
    background: #4f46e5;
    border-radius: 5px;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; font-weight: 800; color: #fff;
  }
  .close {
    background: none; border: none; cursor: pointer;
    color: #6366f1; font-size: 18px; line-height: 1;
    padding: 2px 5px; border-radius: 4px;
    transition: color 0.12s, background 0.12s;
  }
  .close:hover { color: #e0e7ff; background: #312e81; }
  .body { padding: 8px 13px 13px; }
  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    background: #312e81; border-radius: 5px;
    padding: 2px 7px; font-size: 10px; font-weight: 700;
    color: #c7d2fe; margin-bottom: 7px; letter-spacing: 0.03em;
    text-transform: uppercase;
  }
  .msg {
    font-size: 12px; color: #a5b4fc;
    margin-bottom: 11px; line-height: 1.4;
  }
  .btn {
    width: 100%; box-sizing: border-box;
    display: flex; align-items: center; justify-content: center; gap: 7px;
    background: #4f46e5; color: #fff;
    border: none; border-radius: 8px;
    padding: 10px 12px;
    font-size: 12px; font-weight: 600; cursor: pointer;
    transition: background 0.15s; letter-spacing: 0.01em;
  }
  .btn:hover { background: #4338ca; }
  .btn-icon { font-size: 14px; }
  .progress { height: 2px; background: #312e81; }
  .bar {
    height: 100%; background: #6366f1;
    animation: shrink 30s linear forwards;
  }
  @keyframes shrink { from { width: 100%; } to { width: 0%; } }
`;function T(e){document.querySelector("[data-zv-notice]")?.remove();const t=document.createElement("div");t.setAttribute("data-zv-notice","");const n=t.attachShadow({mode:"closed"}),o=e?"⚠ High-risk site":"🔐 Credentials detected",s=e?"Banking/crypto site — click below to autofill securely":"Saved password found for this site";n.innerHTML=`
    <style>${I}</style>
    <div class="wrap">
      <div class="header">
        <div class="brand"><div class="z-icon">Z</div>ZeroVault</div>
        <button class="close" id="x">&#10005;</button>
      </div>
      <div class="body">
        <div class="badge">${o}</div>
        <div class="msg">${s}</div>
        <button class="btn" id="fill">
          <span class="btn-icon">🔑</span>
          Unlock &amp; Fill with Windows Hello
        </button>
      </div>
      <div class="progress"><div class="bar"></div></div>
    </div>
  `;const i=()=>{clearTimeout(r),t.remove()};n.getElementById("x")?.addEventListener("click",i),n.getElementById("fill")?.addEventListener("click",async()=>{try{await chrome.runtime.sendMessage({type:"OPEN_POPUP",payload:{}})}catch{}i()}),document.body.appendChild(t);const r=setTimeout(i,3e4)}async function A(e){try{const t={type:"AUTOFILL_REQUEST",payload:{hostname:e}},n=await chrome.runtime.sendMessage(t);return n?.vaultLocked&&n?.requiresBiometric?(T(n.isHighRisk===!0),[]):n?.entries??[]}catch{return[]}}async function P(e,t){if(!e.passwordField||b.has(e.passwordField))return;b.add(e.passwordField);const n=await A(t);n.length!==0&&(l?.(),l=L(n,o=>{l=null,h(e,{username:o.username,password:o.password})},()=>{l=null}))}function p(){const e=S();if(e)for(const t of x())F(t),t.kind==="login"&&P(t,e).catch(()=>{})}function U(e,t){let n=null;return()=>{n!==null&&clearTimeout(n),n=setTimeout(()=>{n=null,e()},t)}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",p):p();const q=U(p,500);k(q);chrome.runtime.onMessage.addListener((e,t,n)=>{if(typeof e!="object"||e===null)return!1;const o=e;if(o.type!=="POPUP_AUTOFILL")return!1;const s=o.payload?.username??"",i=o.payload?.password??"",r=x().filter(a=>a.kind==="login"&&a.passwordField);return r[0]&&h(r[0],{username:s,password:i}),n({ok:!0}),!1});
