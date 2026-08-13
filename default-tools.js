/* ============================================================
   default-tools.js
   HTML content for the tools that are auto-created for every
   new user. Each is a small self-contained page that saves its
   data in the browser's localStorage (scoped to this tool only).
   ============================================================ */

const DEFAULT_TOOLS = [
  {
    name: "Password Saver",
    icon: "fa-solid fa-lock",
    description: "Store site logins on this device",
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root{ --primary:#2D8CFF; --primary-dark:#0B5FFF; --bg:#EAF4FF; --text:#0F2A4A; --muted:#5B7C99; }
  *{box-sizing:border-box;}
  body{margin:0;font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);padding:18px;}
  h2{font-size:17px;margin:4px 0 4px;}
  p.note{font-size:11.5px;color:var(--muted);margin:0 0 16px;line-height:1.5;}
  .field{margin-bottom:10px;}
  input{width:100%;padding:11px 12px;border-radius:10px;border:1.5px solid #BFE0FF;background:#fff;font-size:14px;outline:none;}
  input:focus{border-color:var(--primary);}
  button{width:100%;padding:12px;border:none;border-radius:10px;background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:#fff;font-weight:600;font-size:14px;cursor:pointer;margin-top:4px;}
  .row{display:flex;gap:8px;}
  .list{margin-top:20px;display:flex;flex-direction:column;gap:10px;}
  .item{background:#fff;border-radius:12px;padding:12px 14px;box-shadow:0 4px 14px -6px rgba(11,95,255,.2);}
  .item .site{font-weight:600;font-size:14px;}
  .item .user{font-size:12.5px;color:var(--muted);margin-top:2px;}
  .item .pass{font-size:12.5px;margin-top:6px;display:flex;align-items:center;gap:8px;}
  .item .pass code{background:#EAF4FF;padding:3px 8px;border-radius:6px;letter-spacing:1px;}
  .item .actions{display:flex;gap:10px;margin-top:8px;}
  .item .actions button{width:auto;padding:6px 12px;font-size:11.5px;background:#EAF4FF;color:var(--primary-dark);font-weight:600;}
  .item .actions .del{background:#FFF1F1;color:#FF5C5C;}
  .empty{text-align:center;color:var(--muted);font-size:13px;margin-top:30px;}
</style></head>
<body>
  <h2>Password Saver</h2>
  <p class="note">Saved only in this browser's local storage. Not encrypted — use for low-risk logins only.</p>

  <div class="field"><input id="site" placeholder="Website or app name"></div>
  <div class="row">
    <div class="field" style="flex:1"><input id="user" placeholder="Username / email"></div>
  </div>
  <div class="field"><input id="pass" placeholder="Password" type="text"></div>
  <button onclick="saveEntry()">Save Login</button>

  <div class="list" id="list"></div>
  <div class="empty" id="empty" style="display:none;">No logins saved yet.</div>

<script>
  const KEY = 'mytools_password_saver';
  function load(){ try{ return JSON.parse(localStorage.getItem(KEY) || '[]'); }catch(e){ return []; } }
  function save(items){ localStorage.setItem(KEY, JSON.stringify(items)); }

  function render(){
    const items = load();
    const list = document.getElementById('list');
    const empty = document.getElementById('empty');
    if(items.length === 0){ list.innerHTML=''; empty.style.display='block'; return; }
    empty.style.display='none';
    list.innerHTML = items.map((it,i) => \`
      <div class="item">
        <div class="site">\${escapeHtml(it.site)}</div>
        <div class="user">\${escapeHtml(it.user || '—')}</div>
        <div class="pass"><code id="p\${i}">••••••••</code>
          <button onclick="toggle(\${i})" style="width:auto;padding:4px 10px;font-size:11px;">Show</button>
          <button onclick="copyPass(\${i})" style="width:auto;padding:4px 10px;font-size:11px;">Copy</button>
        </div>
        <div class="actions"><button class="del" onclick="removeEntry(\${i})">Delete</button></div>
      </div>\`).join('');
  }

  function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; }

  function saveEntry(){
    const site = document.getElementById('site').value.trim();
    const user = document.getElementById('user').value.trim();
    const pass = document.getElementById('pass').value;
    if(!site || !pass) return;
    const items = load();
    items.push({site, user, pass});
    save(items);
    document.getElementById('site').value='';
    document.getElementById('user').value='';
    document.getElementById('pass').value='';
    render();
  }

  function removeEntry(i){
    const items = load();
    items.splice(i,1);
    save(items);
    render();
  }

  function toggle(i){
    const items = load();
    const el = document.getElementById('p'+i);
    el.textContent = el.textContent === '••••••••' ? items[i].pass : '••••••••';
  }

  function copyPass(i){
    const items = load();
    navigator.clipboard.writeText(items[i].pass).catch(()=>{});
  }

  render();
</script>
</body></html>`
  },

  {
    name: "Quick Notes",
    icon: "fa-solid fa-note-sticky",
    description: "Jot down quick notes, auto-saved",
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root{ --primary:#2D8CFF; --bg:#EAF4FF; --text:#0F2A4A; --muted:#5B7C99; }
  *{box-sizing:border-box;}
  body{margin:0;font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);padding:18px;height:100vh;display:flex;flex-direction:column;}
  h2{font-size:17px;margin:4px 0 12px;}
  textarea{flex:1;width:100%;border:1.5px solid #BFE0FF;border-radius:12px;padding:14px;font-size:14.5px;font-family:inherit;resize:none;outline:none;background:#fff;line-height:1.6;}
  textarea:focus{border-color:var(--primary);}
  .status{font-size:11.5px;color:var(--muted);margin-top:8px;text-align:right;}
</style></head>
<body>
  <h2>Quick Notes</h2>
  <textarea id="notes" placeholder="Start typing... your note is saved automatically."></textarea>
  <div class="status" id="status">Saved</div>
<script>
  const KEY = 'mytools_quick_notes';
  const ta = document.getElementById('notes');
  const status = document.getElementById('status');
  ta.value = localStorage.getItem(KEY) || '';
  let t;
  ta.addEventListener('input', () => {
    status.textContent = 'Saving...';
    clearTimeout(t);
    t = setTimeout(() => {
      localStorage.setItem(KEY, ta.value);
      status.textContent = 'Saved';
    }, 400);
  });
</script>
</body></html>`
  },

  {
    name: "To-Do List",
    icon: "fa-solid fa-list-check",
    description: "Simple checklist to track tasks",
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root{ --primary:#2D8CFF; --primary-dark:#0B5FFF; --bg:#EAF4FF; --text:#0F2A4A; --muted:#5B7C99; }
  *{box-sizing:border-box;}
  body{margin:0;font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);padding:18px;}
  h2{font-size:17px;margin:4px 0 12px;}
  .row{display:flex;gap:8px;margin-bottom:14px;}
  input{flex:1;padding:11px 12px;border-radius:10px;border:1.5px solid #BFE0FF;background:#fff;font-size:14px;outline:none;}
  input:focus{border-color:var(--primary);}
  button.add{width:46px;border:none;border-radius:10px;background:linear-gradient(135deg,var(--primary),var(--primary-dark));color:#fff;font-size:16px;cursor:pointer;}
  .task{display:flex;align-items:center;gap:10px;background:#fff;border-radius:12px;padding:12px 14px;margin-bottom:8px;box-shadow:0 4px 14px -6px rgba(11,95,255,.2);}
  .task .box{width:20px;height:20px;border-radius:6px;border:2px solid var(--primary);flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;cursor:pointer;}
  .task.done .box{background:var(--primary);}
  .task .txt{flex:1;font-size:14px;}
  .task.done .txt{text-decoration:line-through;color:var(--muted);}
  .task .del{color:#FF5C5C;font-size:13px;cursor:pointer;}
  .empty{text-align:center;color:var(--muted);font-size:13px;margin-top:30px;}
</style></head>
<body>
  <h2>To-Do List</h2>
  <div class="row">
    <input id="taskInput" placeholder="Add a task...">
    <button class="add" onclick="addTask()">+</button>
  </div>
  <div id="list"></div>
  <div class="empty" id="empty" style="display:none;">Nothing to do yet 🎉</div>
<script>
  const KEY = 'mytools_todo_list';
  function load(){ try{ return JSON.parse(localStorage.getItem(KEY) || '[]'); }catch(e){ return []; } }
  function save(items){ localStorage.setItem(KEY, JSON.stringify(items)); }
  function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s||''; return d.innerHTML; }

  function render(){
    const items = load();
    const list = document.getElementById('list');
    const empty = document.getElementById('empty');
    if(items.length === 0){ list.innerHTML=''; empty.style.display='block'; return; }
    empty.style.display='none';
    list.innerHTML = items.map((it,i) => \`
      <div class="task \${it.done?'done':''}">
        <div class="box" onclick="toggleTask(\${i})">\${it.done?'✓':''}</div>
        <div class="txt">\${escapeHtml(it.text)}</div>
        <div class="del" onclick="removeTask(\${i})">✕</div>
      </div>\`).join('');
  }

  function addTask(){
    const inp = document.getElementById('taskInput');
    const val = inp.value.trim();
    if(!val) return;
    const items = load();
    items.push({text: val, done:false});
    save(items);
    inp.value = '';
    render();
  }
  function toggleTask(i){ const items=load(); items[i].done = !items[i].done; save(items); render(); }
  function removeTask(i){ const items=load(); items.splice(i,1); save(items); render(); }

  document.getElementById('taskInput').addEventListener('keydown', e => { if(e.key==='Enter') addTask(); });
  render();
</script>
</body></html>`
  }
];
