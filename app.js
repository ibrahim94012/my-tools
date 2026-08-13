/* ============================================================
   My Tools — app.js
   App logic: Google Sign-in, PIN, Fingerprint (WebAuthn),
   default tool seeding, and Tools CRUD — all via Firebase
   Realtime Database.
   ============================================================ */

/* ---------------- Helpers ---------------- */
const $ = (id) => document.getElementById(id);

function showScreen(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  $(id).classList.remove('hidden');
}

function toast(msg){
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

async function sha256(text){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function b64urlToBuffer(b64url){
  const b64 = b64url.replace(/-/g,'+').replace(/_/g,'/');
  const pad = b64.length % 4 ? '===='.slice(b64.length % 4) : '';
  const raw = atob(b64 + pad);
  const buf = new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++) buf[i] = raw.charCodeAt(i);
  return buf;
}
function bufferToB64url(buf){
  let str = '';
  new Uint8Array(buf).forEach(b => str += String.fromCharCode(b));
  return btoa(str).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}

/* ---------------- State ---------------- */
let currentUser = null;
let pendingPin = '';
let pinMode = 'setup'; // 'setup' | 'unlock'
let selectedIcon = 'fa-solid fa-toolbox';
let uploadedHtml = '';
let toolsCache = {};

const ICON_CHOICES = [
  'fa-solid fa-toolbox','fa-solid fa-lock','fa-solid fa-note-sticky',
  'fa-solid fa-list-check','fa-solid fa-calculator','fa-solid fa-code',
  'fa-solid fa-chart-line','fa-solid fa-clock','fa-solid fa-image',
  'fa-solid fa-file-lines','fa-solid fa-qrcode','fa-solid fa-palette',
  'fa-solid fa-gauge','fa-solid fa-database','fa-solid fa-gear'
];

/* ---------------- Auth: Google Sign-in ---------------- */
$('googleSignInBtn').addEventListener('click', async () => {
  try{
    $('googleSignInBtn').querySelector('span').textContent = 'Please wait...';
    await auth.signInWithPopup(googleProvider);
  }catch(err){
    console.error(err);
    toast('Sign-in failed, please try again');
    $('googleSignInBtn').querySelector('span').textContent = 'Continue with Google';
  }
});

$('logoutBtn').addEventListener('click', async () => {
  sessionStorage.removeItem('mt_unlocked');
  $('sheetSettings').classList.add('hidden');
  await auth.signOut();
});

auth.onAuthStateChanged(async (user) => {
  if(!user){
    currentUser = null;
    showScreen('screenLogin');
    return;
  }
  currentUser = user;
  const snap = await db.ref('users/' + user.uid + '/profile').once('value');
  const profile = snap.val();

  if(!profile || !profile.pinSet){
    // New user — create profile and ask them to set a PIN
    await db.ref('users/' + user.uid + '/profile').update({
      name: user.displayName || '',
      email: user.email || '',
      photo: user.photoURL || '',
      pinSet: false
    });
    pinMode = 'setup';
    pendingPin = '';
    renderPinDots();
    $('pinTitle').textContent = 'Set a PIN';
    $('pinSubtitle').textContent = 'Choose a 4-digit PIN you\u2019ll use to unlock the app';
    showScreen('screenPin');
    return;
  }

  if(sessionStorage.getItem('mt_unlocked') === user.uid){
    enterDashboard();
    return;
  }

  // Needs to unlock
  if(profile.webauthnEnabled){
    showScreen('screenUnlockChoice');
  } else {
    pinMode = 'unlock';
    pendingPin = '';
    renderPinDots();
    $('pinTitle').textContent = 'Unlock with PIN';
    $('pinSubtitle').textContent = 'Enter your 4-digit PIN';
    showScreen('screenPin');
  }
});

/* ---------------- PIN pad ---------------- */
function renderPinDots(){
  const dots = document.querySelectorAll('#pinDots .pin-dot');
  dots.forEach((d,i) => {
    d.classList.toggle('filled', i < pendingPin.length);
    d.classList.remove('error');
  });
}

function pinError(){
  document.querySelectorAll('#pinDots .pin-dot').forEach(d => d.classList.add('error'));
  setTimeout(() => { pendingPin=''; renderPinDots(); }, 400);
}

document.querySelectorAll('.key[data-digit]').forEach(key => {
  key.addEventListener('click', async () => {
    if(pendingPin.length >= 4) return;
    pendingPin += key.dataset.digit;
    renderPinDots();
    if(pendingPin.length === 4){
      await handlePinComplete();
    }
  });
});
$('pinBackspace').addEventListener('click', () => {
  pendingPin = pendingPin.slice(0,-1);
  renderPinDots();
});

async function handlePinComplete(){
  const hash = await sha256(pendingPin);

  if(pinMode === 'setup'){
    await db.ref('users/' + currentUser.uid + '/profile').update({
      pinHash: hash,
      pinSet: true
    });
    pendingPin = '';
    await seedDefaultTools();

    // Check if the device supports a platform authenticator (fingerprint/face)
    let fpAvailable = false;
    try{
      if(window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable){
        fpAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      }
    }catch(e){ fpAvailable = false; }

    if(fpAvailable){
      showScreen('screenFingerprintSetup');
    } else {
      enterDashboard();
    }
    return;
  }

  // unlock mode
  const snap = await db.ref('users/' + currentUser.uid + '/profile').once('value');
  const profile = snap.val();
  if(profile && profile.pinHash === hash){
    sessionStorage.setItem('mt_unlocked', currentUser.uid);
    pendingPin = '';
    enterDashboard();
  } else {
    pinError();
    toast('Incorrect PIN');
  }
}

/* ---------------- Default tools (seeded once per new user) ---------------- */
async function seedDefaultTools(){
  const profSnap = await db.ref('users/' + currentUser.uid + '/profile').once('value');
  const profile = profSnap.val();
  if(profile && profile.seeded) return;

  const updates = {};
  DEFAULT_TOOLS.forEach((tool) => {
    const key = db.ref('users/' + currentUser.uid + '/tools').push().key;
    updates[key] = {
      name: tool.name,
      description: tool.description,
      icon: tool.icon,
      html: tool.html,
      createdAt: Date.now()
    };
  });

  await db.ref('users/' + currentUser.uid + '/tools').update(updates);
  await db.ref('users/' + currentUser.uid + '/profile').update({ seeded: true });
}

/* ---------------- Fingerprint (WebAuthn) setup ---------------- */
$('setupFingerprintBtn').addEventListener('click', async () => {
  try{
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userIdBuf = new TextEncoder().encode(currentUser.uid);

    const cred = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: 'My Tools' },
        user: {
          id: userIdBuf,
          name: currentUser.email || currentUser.uid,
          displayName: currentUser.displayName || 'My Tools User'
        },
        pubKeyCredParams: [{ type:'public-key', alg:-7 }, { type:'public-key', alg:-257 }],
        authenticatorSelection: { authenticatorAttachment:'platform', userVerification:'required' },
        timeout: 60000
      }
    });

    await db.ref('users/' + currentUser.uid + '/profile').update({
      webauthnEnabled: true,
      credentialId: bufferToB64url(cred.rawId)
    });
    toast('Fingerprint unlock enabled \u2705');
  }catch(err){
    console.error(err);
    toast('Could not set up fingerprint, skipping');
  }
  enterDashboard();
});

$('skipFingerprintBtn').addEventListener('click', enterDashboard);

/* ---------------- Unlock: fingerprint or PIN choice ---------------- */
$('unlockFingerprintBtn').addEventListener('click', async () => {
  try{
    const snap = await db.ref('users/' + currentUser.uid + '/profile').once('value');
    const profile = snap.val();
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: profile.credentialId ? [{
          id: b64urlToBuffer(profile.credentialId),
          type: 'public-key'
        }] : [],
        userVerification: 'required',
        timeout: 60000
      }
    });

    sessionStorage.setItem('mt_unlocked', currentUser.uid);
    enterDashboard();
  }catch(err){
    console.error(err);
    toast('Fingerprint didn\u2019t match, use PIN instead');
  }
});

$('useUnlockPinBtn').addEventListener('click', () => {
  pinMode = 'unlock';
  pendingPin = '';
  renderPinDots();
  $('pinTitle').textContent = 'Unlock with PIN';
  $('pinSubtitle').textContent = 'Enter your 4-digit PIN';
  showScreen('screenPin');
});

/* ---------------- Dashboard ---------------- */
function enterDashboard(){
  showScreen('screenDashboard');
  $('userGreeting').textContent = (currentUser.displayName || 'there').split(' ')[0];
  if(currentUser.photoURL){
    $('userAvatar').src = currentUser.photoURL;
    $('settingsAvatar').src = currentUser.photoURL;
  }
  $('settingsName').textContent = currentUser.displayName || 'My Tools User';
  $('settingsEmail').textContent = currentUser.email || '';
  loadTools();
}

/* ---------------- Profile / Settings sheet ---------------- */
$('profileBtn').addEventListener('click', () => {
  $('sheetSettings').classList.remove('hidden');
});
$('closeSettingsBtn').addEventListener('click', () => {
  $('sheetSettings').classList.add('hidden');
});
$('sheetSettings').addEventListener('click', (e) => {
  if(e.target.id === 'sheetSettings') $('sheetSettings').classList.add('hidden');
});

function loadTools(){
  db.ref('users/' + currentUser.uid + '/tools').on('value', (snap) => {
    toolsCache = snap.val() || {};
    renderTools();
  });
}

function renderTools(){
  const grid = $('toolGrid');
  const ids = Object.keys(toolsCache);
  if(ids.length === 0){
    grid.innerHTML = '';
    $('emptyState').classList.remove('hidden');
    return;
  }
  $('emptyState').classList.add('hidden');
  grid.innerHTML = ids.map(id => {
    const t = toolsCache[id];
    return `
      <div class="tool-card" data-id="${id}">
        <button class="tool-delete" data-delete="${id}" aria-label="Delete">
          <i class="fa-solid fa-trash"></i>
        </button>
        <div class="tool-icon"><i class="${t.icon}"></i></div>
        <div class="tool-name">${escapeHtml(t.name)}</div>
        ${t.description ? `<div class="tool-desc">${escapeHtml(t.description)}</div>` : ''}
      </div>`;
  }).join('');

  grid.querySelectorAll('.tool-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if(e.target.closest('[data-delete]')) return;
      openToolViewer(card.dataset.id);
    });
  });
  grid.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTool(btn.dataset.delete);
    });
  });
}

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function deleteTool(id){
  if(!confirm('Delete this tool?')) return;
  db.ref('users/' + currentUser.uid + '/tools/' + id).remove();
  toast('Tool deleted');
}

/* ---------------- Add Tool sheet ---------------- */
function buildIconChoices(){
  $('iconChoices').innerHTML = ICON_CHOICES.map(ic => `
    <button type="button" class="icon-choice ${ic===selectedIcon?'selected':''}" data-icon="${ic}">
      <i class="${ic}"></i>
    </button>`).join('');
  $('iconChoices').querySelectorAll('.icon-choice').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedIcon = btn.dataset.icon;
      $('iconChoices').querySelectorAll('.icon-choice').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      $('iconPreview').innerHTML = `<i class="${selectedIcon}"></i>`;
    });
  });
}

$('fabAddTool').addEventListener('click', () => {
  selectedIcon = 'fa-solid fa-toolbox';
  uploadedHtml = '';
  $('toolNameInput').value = '';
  $('toolDescInput').value = '';
  $('toolFileInput').value = '';
  $('fileStatus').textContent = '';
  $('addToolError').textContent = '';
  buildIconChoices();
  $('iconPreview').innerHTML = `<i class="${selectedIcon}"></i>`;
  $('sheetAddTool').classList.remove('hidden');
});

$('closeAddToolBtn').addEventListener('click', () => $('sheetAddTool').classList.add('hidden'));
$('sheetAddTool').addEventListener('click', (e) => {
  if(e.target.id === 'sheetAddTool') $('sheetAddTool').classList.add('hidden');
});

$('toolFileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if(!file) return;
  if(!file.name.endsWith('.html') && file.type !== 'text/html'){
    $('addToolError').textContent = 'Please upload an .html file only';
    e.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    uploadedHtml = reader.result;
    $('fileStatus').innerHTML = `<i class="fa-solid fa-circle-check"></i> ${escapeHtml(file.name)} uploaded`;
  };
  reader.readAsText(file);
});

$('saveToolBtn').addEventListener('click', async () => {
  const name = $('toolNameInput').value.trim();
  const desc = $('toolDescInput').value.trim();

  if(!name){
    $('addToolError').textContent = 'Please enter a tool name';
    return;
  }
  if(!uploadedHtml){
    $('addToolError').textContent = 'Please upload an HTML file';
    return;
  }

  $('saveToolBtn').disabled = true;
  $('saveToolBtn').innerHTML = '<div class="spinner"></div>';

  try{
    await db.ref('users/' + currentUser.uid + '/tools').push({
      name,
      description: desc,
      icon: selectedIcon,
      html: uploadedHtml,
      createdAt: Date.now()
    });
    $('sheetAddTool').classList.add('hidden');
    toast('Tool added \u2705');
  }catch(err){
    console.error(err);
    $('addToolError').textContent = 'Could not save, please try again';
  }finally{
    $('saveToolBtn').disabled = false;
    $('saveToolBtn').innerHTML = 'Save Tool';
  }
});

/* ---------------- Tool viewer ---------------- */
function openToolViewer(id){
  const t = toolsCache[id];
  if(!t) return;
  $('viewerTitle').textContent = t.name;
  $('viewerFrame').srcdoc = t.html;
  $('sheetViewTool').classList.remove('hidden');
}
$('closeViewerBtn').addEventListener('click', () => {
  $('sheetViewTool').classList.add('hidden');
  $('viewerFrame').srcdoc = '';
});
