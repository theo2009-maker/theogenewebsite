/* =====================================================
   script.js : the behavior of Theogene's website (all pages)
   Each block below does ONE job. Every block first checks that the
   element exists on the page, so one missing part can never break
   the rest of the website.
   ===================================================== */

// Tell the CSS that JavaScript is working. The "slide in" animation
// only hides things when this class exists, so a page is never blank.
document.documentElement.classList.add('js');

// Short helpers so we type less
const $  = (selector) => document.querySelector(selector);      // find ONE element
const $$ = (selector) => document.querySelectorAll(selector);   // find MANY elements

// Safe click: does nothing if the element is not on this page
function onClick(selector, handler) {
    const el = $(selector);
    if (el) el.addEventListener('click', handler);
}

/* ---------- 1. Year in the footer ---------- */
if ($('#year')) $('#year').textContent = new Date().getFullYear();

/* ---------- 2. Dark / light theme (remembered on this computer) ---------- */
const root = document.documentElement;
const savedTheme = localStorage.getItem('theme');
if (savedTheme) root.setAttribute('data-theme', savedTheme); // use the saved choice

onClick('#themeToggle', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('theme', next); // save it for the next page and next visit
});

/* ---------- 3. Menu: phone button + "More" dropdown ---------- */
const nav = $('#nav');
onClick('#menuBtn', () => { if (nav) nav.classList.toggle('open'); });

const dropdown = $('#dropdown');
onClick('#dropBtn', (e) => {
    e.stopPropagation();                       // do not trigger the "click outside" below
    if (dropdown) dropdown.classList.toggle('open');
});
// Click anywhere else: close the dropdown
document.addEventListener('click', () => { if (dropdown) dropdown.classList.remove('open'); });

/* ---------- 4. Highlight the menu link of the page we are on ---------- */
// Example: on "about.html" the link to about.html becomes colored.
const currentPage = location.pathname.split('/').pop() || 'index.html';
$$('#nav a').forEach(link => {
    if (link.getAttribute('href') === currentPage) {
        link.classList.add('active');
        // If the link is inside "More", color the "More" button too
        if (link.closest('.drop-menu') && $('#dropBtn')) $('#dropBtn').style.color = 'var(--accent)';
    }
});

/* ---------- 5. Typing animation (only on the Home page) ---------- */
if ($('#typed')) {
    // EDIT: change these words to anything you want
    const words = ['Web Developer', 'Systems Programmer', 'Kernel Learner', 'Problem Solver'];
    let wordIndex = 0;    // which word we are on
    let charIndex = 0;    // how many letters are shown
    let deleting = false; // are we erasing?

    function type() {
        const word = words[wordIndex];
        $('#typed').textContent = word.slice(0, charIndex); // show first letters

        if (!deleting && charIndex < word.length) {
            charIndex++;                       // add one letter
            setTimeout(type, 90);
        } else if (!deleting) {
            deleting = true;                   // word finished: wait, then erase
            setTimeout(type, 1400);
        } else if (charIndex > 0) {
            charIndex--;                       // remove one letter
            setTimeout(type, 45);
        } else {
            deleting = false;                  // go to the next word
            wordIndex = (wordIndex + 1) % words.length;
            setTimeout(type, 300);
        }
    }
    type();
}

/* ---------- 6. Click to expand (cards, FAQ, skills, projects, blog) ---------- */
$$('.expand-btn').forEach(button => {
    button.addEventListener('click', () => {
        const box = button.closest('.expand');            // the whole card
        const isOpen = box.classList.toggle('open');      // open <-> close
        button.setAttribute('aria-expanded', isOpen);     // for screen readers

        // If this card has a skill bar: fill it when open, empty it when closed
        const bar = box.querySelector('.bar i');
        if (bar) bar.style.width = isOpen ? bar.dataset.level + '%' : '0';
    });
});

/* ---------- 7. Number counters (0 -> target) ---------- */
function countUp(el) {
    const target = +el.dataset.target;        // final number
    const suffix = el.dataset.suffix || '';   // example: "%"
    const duration = 1600;                    // milliseconds
    const start = performance.now();

    function frame(now) {
        const progress = Math.min((now - start) / duration, 1); // goes 0 -> 1
        el.textContent = Math.round(target * progress) + suffix;
        if (progress < 1) requestAnimationFrame(frame);          // keep going
    }
    requestAnimationFrame(frame);
}

/* ---------- 8. Reveal on scroll + start counters when seen ---------- */
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (!entry.isIntersecting) return;            // not visible yet
        entry.target.classList.add('visible');        // slide it in
        const counter = entry.target.querySelector('.counter');
        if (counter) countUp(counter);                // start counting
        observer.unobserve(entry.target);             // do it only once
    });
}, { threshold: 0.15 });
$$('.reveal').forEach(el => observer.observe(el));

/* ---------- 9. Project filter buttons (Projects page) ---------- */
$$('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
        $$('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const filter = chip.dataset.filter;           // "all", "web" or "system"
        $$('.project').forEach(card => {
            const show = filter === 'all' || card.dataset.cat === filter;
            card.classList.toggle('hide', !show);
        });
    });
});

/* ---------- 10. Gallery: click a picture to enlarge (Gallery page) ---------- */
const lightbox = $('#lightbox');
if (lightbox) {
    $$('.tile').forEach(tile => {
        tile.addEventListener('click', () => {
            $('#lbIcon').textContent = tile.querySelector('span').textContent;
            $('#lbCaption').textContent = tile.dataset.caption;
            lightbox.classList.add('show');
        });
    });
    lightbox.addEventListener('click', () => lightbox.classList.remove('show')); // click = close
}

/* ---------- 11. Scroll things: progress bar, header shadow, back-to-top ---------- */
window.addEventListener('scroll', () => {
    const y = window.scrollY;
    const height = document.documentElement.scrollHeight - window.innerHeight;

    if ($('#progress')) $('#progress').style.width = (height > 0 ? (y / height) * 100 : 0) + '%'; // top bar
    if ($('#header'))   $('#header').classList.toggle('scrolled', y > 10);                          // header shadow
    if ($('#toTop'))    $('#toTop').classList.toggle('show', y > 500);                              // show arrow
});
onClick('#toTop', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

/* ---------- 12. Contact form (Contact page) ---------- */
// NOTE: a website with only HTML cannot send email by itself.
// This code shows a thank-you message and opens the visitor's email app
// with the message already written. EDIT the email address below.
const MY_EMAIL = 'your-email@example.com';

const form = $('#contactForm');
if (form) {
    form.addEventListener('submit', (event) => {
        event.preventDefault(); // stop the page from reloading
        const name = $('#fName').value;
        const subject = encodeURIComponent('Message from ' + name);
        const body = encodeURIComponent($('#fMsg').value + '\n\nFrom: ' + $('#fEmail').value);

        window.location.href = `mailto:${MY_EMAIL}?subject=${subject}&body=${body}`;
        $('#formNote').textContent = 'Thank you, ' + name + '! Your email app is opening.';
        form.reset(); // clear the form
    });
}
