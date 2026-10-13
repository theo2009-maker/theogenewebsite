/* =====================================================
   auth.js : simple ACCOUNT MANAGEMENT for Theogene's website
   -----------------------------------------------------
   What it does:
     - Register a new account
     - Login / Logout
     - Edit profile (name, bio, avatar)
     - Save personal notes
     - Change password, download my data, delete account
   IMPORTANT (read this):
     Everything is saved in THIS browser only (localStorage).
     It is perfect for learning and for a demo, but it is NOT a real
     secure login system. A real one needs a server (backend).
   ===================================================== */

// Short helpers
const q  = (s) => document.querySelector(s);
const qa = (s) => document.querySelectorAll(s);

/* ---------- 1. STORAGE: read and write users ---------- */
// "users" = a list of all accounts. "session" = email of who is logged in.
function getUsers()  { return JSON.parse(localStorage.getItem('users') || '{}'); }
function saveUsers(u) { localStorage.setItem('users', JSON.stringify(u)); }
function currentEmail() { return localStorage.getItem('session'); }
function currentUser()  { const u = getUsers(); return u[currentEmail()] || null; }
function updateUser(changes) {            // change some fields of the logged-in user
    const users = getUsers();
    const email = currentEmail();
    users[email] = { ...users[email], ...changes };
    saveUsers(users);
}

/* ---------- 2. PASSWORD SAFETY ---------- */
// We never save the real password. We save a "hash" (a scrambled version)
// made with PBKDF2 and a random "salt", so two same passwords look different.
function bytesToHex(bytes) { return [...bytes].map(b => b.toString(16).padStart(2, '0')).join(''); }
function hexToBytes(hex)   { return new Uint8Array(hex.match(/.{2}/g).map(h => parseInt(h, 16))); }
function newSalt()         { return bytesToHex(crypto.getRandomValues(new Uint8Array(16))); }

async function hashPassword(password, saltHex) {
    const keyMaterial = await crypto.subtle.importKey(
        'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: hexToBytes(saltHex), iterations: 100000, hash: 'SHA-256' },
        keyMaterial, 256);
    return bytesToHex(new Uint8Array(bits));
}

// Show a message under a form. type = "error" (red) or "ok" (green)
function say(id, text, type) {
    const el = q(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'form-note ' + (type || '');
}

/* ---------- 3. HEADER: show "Login" or the user's name ---------- */
const link = q('#accountLink');
if (link) {
    const user = currentUser();
    if (user) {
        link.textContent = user.avatar + ' ' + user.name.split(' ')[0]; // first name only
        link.href = 'account.html';
        link.classList.add('logged');
    }
    // Highlight when we are on the login or account page
    const page = location.pathname.split('/').pop();
    if (page === 'login.html' || page === 'account.html') link.classList.add('active');
}

/* ---------- 4. CONTACT PAGE: fill name and email if logged in ---------- */
if (currentUser() && q('#fName') && q('#fEmail')) {
    q('#fName').value  = currentUser().name;
    q('#fEmail').value = currentUser().email;
}

/* ---------- 5. TABS (used on the login page and the account page) ---------- */
qa('.tab[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
        qa('.tab[data-tab]').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        // show only the panel that matches the tab
        qa('[id^="panel-"]').forEach(p => p.hidden = (p.id !== 'panel-' + tab.dataset.tab));
    });
});

/* =====================================================
   LOGIN PAGE (login.html)
   ===================================================== */
if (q('#panel-register')) {

    // If already logged in, go straight to the account page
    if (currentUser()) location.href = 'account.html';

    /* ----- Create account ----- */
    q('#panel-register').addEventListener('submit', async (e) => {
        e.preventDefault();                                   // stop page reload
        const name  = q('#rName').value.trim();
        const email = q('#rEmail').value.trim().toLowerCase();
        const pass  = q('#rPass').value;
        const pass2 = q('#rPass2').value;

        if (pass.length < 8)  return say('#registerNote', 'Password must have at least 8 characters.', 'error');
        if (pass !== pass2)   return say('#registerNote', 'The two passwords are not the same.', 'error');
        if (!window.crypto || !crypto.subtle)
            return say('#registerNote', 'Your browser blocks secure features. Open the site with Live Server.', 'error');

        const users = getUsers();
        if (users[email])     return say('#registerNote', 'This email already has an account. Please login.', 'error');

        const salt = newSalt();
        users[email] = {
            name, email, salt,
            hash: await hashPassword(pass, salt),             // scrambled password
            bio: '', avatar: '🙂', notes: [],
            created: new Date().toISOString()
        };
        saveUsers(users);
        localStorage.setItem('session', email);               // log the user in
        location.href = 'account.html';
    });

    /* ----- Login ----- */
    q('#panel-login').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = q('#lEmail').value.trim().toLowerCase();
        const pass  = q('#lPass').value;
        const user  = getUsers()[email];

        if (!window.crypto || !crypto.subtle)
            return say('#loginNote', 'Your browser blocks secure features. Open the site with Live Server.', 'error');

        // Same message for "no account" and "wrong password" (safer)
        if (!user || (await hashPassword(pass, user.salt)) !== user.hash)
            return say('#loginNote', 'Wrong email or password.', 'error');

        localStorage.setItem('session', email);
        location.href = 'account.html';
    });
}

/* =====================================================
   ACCOUNT PAGE (account.html)
   ===================================================== */
if (q('#panel-profile')) {

    // Not logged in? Send the visitor to the login page.
    if (!currentUser()) location.href = 'login.html';
    const user = currentUser();

    /* ----- Fill the left card ----- */
    function showCard() {
        const u = currentUser();
        q('#avatarShow').textContent = u.avatar;
        q('#accName').textContent    = u.name;
        q('#accEmail').textContent   = u.email;
        q('#accSince').textContent   = 'Member since ' + new Date(u.created).toLocaleDateString();
        q('#accNotes').textContent   = u.notes.length + ' notes';
    }
    showCard();

    /* ----- Profile: name, bio, avatar ----- */
    let chosenAvatar = user.avatar;
    q('#pName').value = user.name;
    q('#pBio').value  = user.bio;

    qa('.av').forEach(btn => {
        if (btn.dataset.emoji === chosenAvatar) btn.classList.add('active');
        btn.addEventListener('click', () => {
            qa('.av').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            chosenAvatar = btn.dataset.emoji;
        });
    });

    q('#panel-profile').addEventListener('submit', (e) => {
        e.preventDefault();
        updateUser({ name: q('#pName').value.trim(), bio: q('#pBio').value.trim(), avatar: chosenAvatar });
        showCard();
        say('#profileNote', 'Profile saved ✔', 'ok');
    });

    /* ----- Notes: add and delete ----- */
    function showNotes() {
        const list = q('#noteList');
        list.innerHTML = '';                                   // clear the list
        const notes = currentUser().notes;
        if (!notes.length) {
            const empty = document.createElement('li');
            empty.className = 'muted';
            empty.textContent = 'No notes yet. Write your first one above.';
            list.appendChild(empty);
        }
        notes.forEach((note, index) => {
            const li = document.createElement('li');
            li.className = 'note-item';
            const text = document.createElement('span');
            text.textContent = note.text;                      // textContent = safe (no HTML injection)
            const del = document.createElement('button');
            del.textContent = '✕';
            del.setAttribute('aria-label', 'Delete note');
            del.addEventListener('click', () => {
                const n = currentUser().notes;
                n.splice(index, 1);                            // remove this note
                updateUser({ notes: n });
                showNotes(); showCard();
            });
            li.append(text, del);
            list.appendChild(li);
        });
    }
    showNotes();

    q('#panel-notes').addEventListener('submit', (e) => {
        e.preventDefault();
        const text = q('#noteText').value.trim();
        if (!text) return;
        const n = currentUser().notes;
        n.unshift({ text, date: new Date().toISOString() });   // newest first
        updateUser({ notes: n });
        q('#noteText').value = '';
        showNotes(); showCard();
    });

    /* ----- Security: change password ----- */
    q('#passForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = currentUser();
        const oldPass = q('#oldPass').value;
        const newPass = q('#newPass').value;

        if ((await hashPassword(oldPass, u.salt)) !== u.hash)
            return say('#passNote', 'Your current password is wrong.', 'error');
        if (newPass.length < 8)
            return say('#passNote', 'New password must have at least 8 characters.', 'error');
        if (newPass !== q('#newPass2').value)
            return say('#passNote', 'The new passwords are not the same.', 'error');

        const salt = newSalt();
        updateUser({ salt, hash: await hashPassword(newPass, salt) });
        e.target.reset();
        say('#passNote', 'Password changed ✔', 'ok');
    });

    /* ----- Download my data (a .json file) ----- */
    q('#exportBtn').addEventListener('click', () => {
        const { salt, hash, ...safe } = currentUser();         // remove password info
        const file = new Blob([JSON.stringify(safe, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file);
        a.download = 'my-account-data.json';
        a.click();
        URL.revokeObjectURL(a.href);
    });

    /* ----- Logout ----- */
    q('#logoutBtn').addEventListener('click', () => {
        localStorage.removeItem('session');
        location.href = 'login.html';
    });

    /* ----- Delete account ----- */
    q('#deleteBtn').addEventListener('click', () => {
        if (!confirm('Delete your account and all your notes? This cannot be undone.')) return;
        const users = getUsers();
        delete users[currentEmail()];
        saveUsers(users);
        localStorage.removeItem('session');
        location.href = 'index.html';
    });
}
