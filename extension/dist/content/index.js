function y(e,t){return Array.from(e.querySelectorAll(`input[type="${t}"]`))}function f(e){const t=e.querySelector('input[autocomplete="username"], input[autocomplete="email"]');if(t)return t;const r=e.querySelector('input[type="email"]');if(r)return r;const n=Array.from(e.querySelectorAll('input[type="text"], input:not([type])'));return n.find(s=>{const i=(s.name+s.id+(s.placeholder??"")).toLowerCase();return i.includes("user")||i.includes("email")||i.includes("login")||i.includes("account")})??n[0]??null}function w(e){const t=y(e,"password");if(t.length===0)return"unknown";const r=e.querySelector('input[autocomplete="new-password"]')!==null;return t.length>=2||r?"signup":t.length===1?"login":"unknown"}function x(e){const t=w(e),r=y(e,"password");let n=null,o=null,s=null;return t==="login"?(o=r[0]??null,n=f(e)):t==="signup"&&(o=r[0]??null,s=r[1]??null,n=f(e)),{kind:t,usernameField:n,passwordField:o,confirmField:s,form:e}}function g(){return Array.from(document.querySelectorAll("form")).map(x).filter(t=>t.kind!=="unknown"&&t.passwordField!==null)}function k(e){const t=new MutationObserver(e);return t.observe(document.body,{childList:!0,subtree:!0}),t}function m(e,t){const r=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value")?.set;r?r.call(e,t):e.value=t,e.dispatchEvent(new Event("input",{bubbles:!0})),e.dispatchEvent(new Event("change",{bubbles:!0}))}function h(e,t){e.usernameField&&m(e.usernameField,t.username),e.passwordField&&m(e.passwordField,t.password)}function F(e){if(e.kind!=="login"&&e.kind!=="signup"||!e.passwordField||!e.usernameField)return;const t=()=>{const r=e.usernameField?.value??"",n=e.passwordField?.value??"";if(!r||!n)return;let o,s;try{const a=new URL(window.location.href);o=a.hostname,s=a.href}catch{return}const i={type:"CAPTURE_CREDENTIALS",payload:{hostname:o,username:r,password:n,url:s}};chrome.runtime.sendMessage(i).catch(()=>{})};e.form.addEventListener("submit",t,{once:!1,passive:!0})}const E=`
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
`;function L(e,t){const r=n=>c(n.charAt(0).toUpperCase()||"?");return`
    <style>${E}</style>
    <div class="wrap">
      <div class="header">
        <div class="brand"><div class="icon">Z</div>ZeroVault</div>
        <button class="close" id="x">&#10005;</button>
      </div>
      <div class="body">
        <div class="label">Saved credentials for this site</div>
        ${e.map((n,o)=>`
          <div class="entry${o===t?" selected":""}" data-i="${o}">
            <div class="avatar">${r(n.username)}</div>
            <div class="entry-info">
              <div class="entry-user">${c(n.username)}</div>
              <div class="entry-site">${c(n.site)}</div>
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
  `}function c(e){return e.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function S(e,t,r){document.querySelector("[data-zv-prompt]")?.remove();const n=document.createElement("div");n.setAttribute("data-zv-prompt","");const o=n.attachShadow({mode:"closed"});let s=0;const i=()=>{o.innerHTML=L(e,s),o.getElementById("x")?.addEventListener("click",a),o.getElementById("dismiss")?.addEventListener("click",a),o.getElementById("fill")?.addEventListener("click",v),o.querySelectorAll("[data-i]").forEach(l=>{l.addEventListener("click",()=>{s=parseInt(l.dataset.i??"0",10),i()})})},a=()=>{n.remove(),r()},v=()=>{const l=e[s];l&&(n.remove(),t(l))};i(),document.body.appendChild(n);const p=setTimeout(a,3e4);return n.addEventListener("remove",()=>clearTimeout(p)),()=>{clearTimeout(p),n.remove()}}const b=new WeakSet;let d=null;function A(){try{return new URL(window.location.href).hostname}catch{return null}}async function z(e){try{const t={type:"AUTOFILL_REQUEST",payload:{hostname:e}};return(await chrome.runtime.sendMessage(t))?.entries??[]}catch{return[]}}async function T(e,t){if(!e.passwordField||b.has(e.passwordField))return;b.add(e.passwordField);const r=await z(t);r.length!==0&&(d?.(),d=S(r,n=>{d=null,h(e,{username:n.username,password:n.password})},()=>{d=null}))}function u(){const e=A();if(e)for(const t of g())F(t),t.kind==="login"&&T(t,e).catch(()=>{})}function I(e,t){let r=null;return()=>{r!==null&&clearTimeout(r),r=setTimeout(()=>{r=null,e()},t)}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",u):u();const q=I(u,500);k(q);chrome.runtime.onMessage.addListener((e,t,r)=>{if(typeof e!="object"||e===null)return!1;const n=e;if(n.type!=="POPUP_AUTOFILL")return!1;const o=n.payload?.username??"",s=n.payload?.password??"",i=g().filter(a=>a.kind==="login"&&a.passwordField);return i[0]&&h(i[0],{username:o,password:s}),r({ok:!0}),!1});
