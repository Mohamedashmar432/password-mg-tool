export interface PromptEntry {
  id: string;
  site: string;
  username: string;
  password: string;
}

const STYLES = `
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
`;

function html(entries: PromptEntry[], selectedIdx: number): string {
  const avatarLetter = (u: string) => esc(u.charAt(0).toUpperCase() || '?');
  return `
    <style>${STYLES}</style>
    <div class="wrap">
      <div class="header">
        <div class="brand"><div class="icon">Z</div>ZeroVault</div>
        <button class="close" id="x">&#10005;</button>
      </div>
      <div class="body">
        <div class="label">Saved credentials for this site</div>
        ${entries.map((e, i) => `
          <div class="entry${i === selectedIdx ? ' selected' : ''}" data-i="${i}">
            <div class="avatar">${avatarLetter(e.username)}</div>
            <div class="entry-info">
              <div class="entry-user">${esc(e.username)}</div>
              <div class="entry-site">${esc(e.site)}</div>
            </div>
            <span class="tick">&#10003;</span>
          </div>
        `).join('')}
        <div class="actions">
          <button class="btn btn-dismiss" id="dismiss">Dismiss</button>
          <button class="btn btn-fill" id="fill">Fill Password</button>
        </div>
      </div>
    </div>
  `;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function showAutofillPrompt(
  entries: PromptEntry[],
  onSelect: (entry: PromptEntry) => void,
  onDismiss: () => void
): () => void {
  // Remove any pre-existing prompt
  document.querySelector('[data-zv-prompt]')?.remove();

  const host = document.createElement('div');
  host.setAttribute('data-zv-prompt', '');
  const shadow = host.attachShadow({ mode: 'closed' });

  let selectedIdx = 0;

  const render = () => {
    shadow.innerHTML = html(entries, selectedIdx);

    shadow.getElementById('x')?.addEventListener('click', dismiss);
    shadow.getElementById('dismiss')?.addEventListener('click', dismiss);
    shadow.getElementById('fill')?.addEventListener('click', fill);

    shadow.querySelectorAll<HTMLElement>('[data-i]').forEach(el => {
      el.addEventListener('click', () => {
        selectedIdx = parseInt(el.dataset.i ?? '0', 10);
        render();
      });
    });
  };

  const dismiss = () => {
    host.remove();
    onDismiss();
  };

  const fill = () => {
    const entry = entries[selectedIdx];
    if (entry) { host.remove(); onSelect(entry); }
  };

  render();
  document.body.appendChild(host);

  // Auto-dismiss after 30 s so it doesn't linger forever
  const timer = setTimeout(dismiss, 30_000);
  host.addEventListener('remove', () => clearTimeout(timer));

  return () => { clearTimeout(timer); host.remove(); };
}
