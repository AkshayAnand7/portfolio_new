/* ═══════════════════════════════════════════════
   SCROLL ENGINE  ·  main.js
   Lenis smooth scroll + full-site parallax depth
   + 3D mouse tilt effects
   ═══════════════════════════════════════════════ */

// ─────────────────────────────────────────────────
// 1. LENIS — smooth scroll engine
// ─────────────────────────────────────────────────
const lenis = new Lenis({
  lerp: 0.075,
  smoothWheel: true,
  wheelMultiplier: 0.9,
  touchMultiplier: 1.8,
  infinite: false,
});

// Single rAF loop — everything lives here
let scrollY = 0;
function raf(time) {
  lenis.raf(time);
  scrollY = lenis.scroll;
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// ─────────────────────────────────────────────────
// 2. CUSTOM CURSOR
//    Strategy: native cursor stays visible until JS
//    confirms custom cursor is working. This way if
//    JS fails, user still has a normal cursor.
// ─────────────────────────────────────────────────
const dot  = document.getElementById('cursor-dot');
const ring = document.getElementById('cursor-ring');
const cursorWrap = document.getElementById('cursor');

let mx = 0, my = 0, rx = 0, ry = 0;
let cursorActivated = false;
const isTouchDevice = window.matchMedia('(pointer: coarse)').matches
                   || window.matchMedia('(hover: none)').matches;

// On touch devices, hide the custom cursor elements entirely
if (isTouchDevice && cursorWrap) {
  cursorWrap.style.display = 'none';
}

window.addEventListener('mousemove', e => {
  mx = e.clientX;
  my = e.clientY;

  // First mousemove: activate custom cursor and hide native one
  if (!cursorActivated && !isTouchDevice && dot && ring) {
    cursorActivated = true;
    document.body.style.cursor = 'none';
    // Also hide cursor on all interactive elements
    const style = document.createElement('style');
    style.textContent = '*, *::before, *::after { cursor: none !important; }';
    style.id = 'hide-native-cursor';
    document.head.appendChild(style);
    // Snap ring to current position (no lag from 0,0)
    rx = mx;
    ry = my;
  }
});

// Hide custom cursor when mouse leaves window, show when it enters
window.addEventListener('mouseleave', () => {
  if (cursorWrap && cursorActivated) cursorWrap.style.opacity = '0';
});
window.addEventListener('mouseenter', () => {
  if (cursorWrap && cursorActivated) cursorWrap.style.opacity = '1';
});

// Cursor animation loop — only runs on non-touch
if (!isTouchDevice) {
  (function animCursor() {
    if (dot && ring) {
      dot.style.left  = mx + 'px';
      dot.style.top   = my + 'px';
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.left = rx + 'px';
      ring.style.top  = ry + 'px';
    }
    requestAnimationFrame(animCursor);
  })();
}

// Hover class for interactive elements
const hoverTargets = 'a, button, .chip, .stat-card, .proj-row, .c-card, .vpill, .sk-col';
document.querySelectorAll(hoverTargets).forEach(el => {
  el.addEventListener('mouseenter', () => document.body.classList.add('hovering'));
  el.addEventListener('mouseleave', () => document.body.classList.remove('hovering'));
});

// Fix: clear hover state on scroll so cursor doesn't get stuck in hover mode
lenis.on('scroll', () => {
  if (document.body.classList.contains('hovering')) {
    // Check if the element under cursor is actually an interactive target
    const elUnder = document.elementFromPoint(mx, my);
    if (elUnder && !elUnder.closest(hoverTargets)) {
      document.body.classList.remove('hovering');
    }
  }
});

// ─────────────────────────────────────────────────
// 3. NAV — frosted glass on scroll
// ─────────────────────────────────────────────────
const nav = document.getElementById('site-nav');
lenis.on('scroll', ({ scroll }) => {
  if (nav) nav.classList.toggle('scrolled', scroll > 60);
});

// ─────────────────────────────────────────────────
// 4. SCROLL REVEAL
// ─────────────────────────────────────────────────
const revealIO = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('up');

      // After transition completes (0.85s), add 'done' to remove transform transition
      // This prevents CSS from fighting with frame-by-frame JS parallax updates.
      setTimeout(() => {
        e.target.classList.add('done');
      }, 850);

      revealIO.unobserve(e.target);
    }
  });
}, { threshold: 0.06, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.rr').forEach(el => revealIO.observe(el));

// ─────────────────────────────────────────────────
// 5. PARALLAX DEPTH SYSTEM
//    Cache absolute offsets, rebuild on resize AND load
// ─────────────────────────────────────────────────
let wh = window.innerHeight;
let paraItems = [];

function buildParaCache() {
  wh = window.innerHeight;
  paraItems = [];

  document.querySelectorAll('[data-speed]').forEach(el => {
    // Temporarily clear transforms so we get true position
    const savedTransform = el.style.transform;
    const savedTranslate = el.style.translate;
    el.style.transform = 'none';
    el.style.translate = 'none';
    const rect = el.getBoundingClientRect();
    const absTop = rect.top + window.scrollY;
    el.style.transform = savedTransform;
    el.style.translate = savedTranslate;

    paraItems.push({
      el,
      speed:  parseFloat(el.getAttribute('data-speed')),
      top:    absTop,
      height: rect.height,
      isHero: !!el.closest('#hero'),
    });
  });
}

// ─────────────────────────────────────────────────
// 6. PROJECT ROW CACHE
// ─────────────────────────────────────────────────
let projItems = [];
function buildProjCache() {
  projItems = Array.from(document.querySelectorAll('.proj-row')).map(el => {
    const s = el.style.transform; el.style.transform = 'none';
    const r = el.getBoundingClientRect();
    const t = r.top + window.scrollY;
    el.style.transform = s;
    return { el, top: t, height: r.height };
  });
}

// ─────────────────────────────────────────────────
// 7. JOURNEY ITEM CACHE
// ─────────────────────────────────────────────────
let journeyItems = [];
function buildJourneyCache() {
  journeyItems = Array.from(document.querySelectorAll('.j-item')).map(el => {
    const r = el.getBoundingClientRect();
    return { el, top: r.top + window.scrollY, bottom: r.bottom + window.scrollY };
  });
}

// Unified rebuild — called on load AND resize
function rebuildAllCaches() {
  buildParaCache();
  buildProjCache();
  buildJourneyCache();
}

// Build caches after DOM is ready AND after all assets load (fonts, images shift layout)
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(rebuildAllCaches, 200);
});

// Initial build: once on DOMContentLoaded, again after full load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(rebuildAllCaches, 100));
} else {
  setTimeout(rebuildAllCaches, 100);
}
window.addEventListener('load', () => setTimeout(rebuildAllCaches, 200));

// ─────────────────────────────────────────────────
// 8. UNIFIED SCROLL TICK — parallax + drift + dots
// ─────────────────────────────────────────────────
lenis.on('scroll', ({ scroll }) => {
  const vCenter = scroll + wh / 2;

  // — Parallax depth —
  for (let i = 0; i < paraItems.length; i++) {
    const { el, speed, top, height, isHero } = paraItems[i];
    let y = 0;
    if (isHero) {
      y = scroll * speed;
    } else {
      const elCenter = top + height / 2;
      y = (elCenter - vCenter) * speed;
    }
    el.style.setProperty('--para-y', `${y}px`);
  }

  // — Project horizontal drift —
  for (let i = 0; i < projItems.length; i++) {
    const { el, top, height } = projItems[i];
    const elCenter = top + height / 2;
    const dist = (elCenter - vCenter) / wh;
    el.style.transform = `translateX(${dist * 16}px)`;
  }

  // — Journey active dot —
  for (let i = 0; i < journeyItems.length; i++) {
    const { el, top, bottom } = journeyItems[i];
    el.classList.toggle('cur', (top - scroll) < wh * 0.6 && (bottom - scroll) > 0);
  }
});

// ─────────────────────────────────────────────────
// 9. 3D MOUSE-TILT — applied to sections & cards
// ─────────────────────────────────────────────────
function applyTilt(el, { maxX = 6, maxY = 8, scale = 1.02, perspective = 1200 } = {}) {
  el.addEventListener('mousemove', e => {
    const r = el.getBoundingClientRect();
    const xPct = (e.clientX - r.left) / r.width  - 0.5;   // -0.5 → 0.5
    const yPct = (e.clientY - r.top)  / r.height - 0.5;
    const rX = -yPct * maxX * 2;   // invert Y for natural feel
    const rY =  xPct * maxY * 2;
    el.style.transform = `translateY(var(--para-y, 0px)) perspective(${perspective}px) rotateX(${rX}deg) rotateY(${rY}deg) scale(${scale})`;
  });
  el.addEventListener('mouseleave', () => {
    el.style.transition = 'transform 0.6s cubic-bezier(0.16,1,0.3,1)';
    el.style.transform  = `translateY(var(--para-y, 0px)) perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale(1)`;
    setTimeout(() => { el.style.transition = ''; }, 650);
  });
}

// Contact cards — strong tilt
document.querySelectorAll('.c-card').forEach(el => applyTilt(el, { maxX: 10, maxY: 12, scale: 1.03 }));

// Stat cards — subtle tilt
document.querySelectorAll('.stat-card').forEach(el => applyTilt(el, { maxX: 4, maxY: 6, scale: 1.01, perspective: 800 }));

// Skill columns — very subtle 3D lift
document.querySelectorAll('.sk-col').forEach(el => applyTilt(el, { maxX: 3, maxY: 4, scale: 1.01, perspective: 1400 }));

// Vision pills — tiny tilt
document.querySelectorAll('.vpill').forEach(el => applyTilt(el, { maxX: 6, maxY: 8, scale: 1.04, perspective: 600 }));

// ─────────────────────────────────────────────────
// 10. HERO — 3D mouse parallax (multi-layer depth)
// ─────────────────────────────────────────────────
const heroSection = document.getElementById('hero');
const heroLayers  = [
  { el: document.querySelector('.hero-watermark'), factor: 0.012 },
  { el: document.getElementById('orb1'),           factor: 0.022 },
  { el: document.getElementById('orb2'),           factor: -0.016 },
  { el: document.getElementById('orb3'),           factor: 0.018 },
  { el: document.querySelector('.hero-content'),   factor: -0.006 },
];

if (heroSection) {
  heroSection.addEventListener('mousemove', e => {
    const { width, height, left, top } = heroSection.getBoundingClientRect();
    const hmx = e.clientX - left - width  / 2;
    const hmy = e.clientY - top  - height / 2;
    heroLayers.forEach(({ el, factor }) => {
      if (!el) return;
      const baseY = parseFloat(el.style.getPropertyValue('--para-y') || '0');
      el.style.transform = el.classList.contains('hero-watermark')
        ? `translate(calc(-50% + ${hmx * factor}px), calc(-52% + ${hmy * factor}px + ${baseY}px))`
        : `translate(${hmx * factor}px, ${hmy * factor}px)`;
    });
  });

  heroSection.addEventListener('mouseleave', () => {
    heroLayers.forEach(({ el }) => {
      if (!el) return;
      el.style.transition = 'transform 1.2s cubic-bezier(0.16,1,0.3,1)';
      // Reset transforms to neutral position
      const baseY = parseFloat(el.style.getPropertyValue('--para-y') || '0');
      if (el.classList.contains('hero-watermark')) {
        el.style.transform = `translate(-50%, calc(-52% + ${baseY}px))`;
      } else {
        el.style.transform = `translate(0px, 0px)`;
      }
      setTimeout(() => { el.style.transition = ''; }, 1250);
    });
  });
}

// ─────────────────────────────────────────────────
// 11. NAME HIGHLIGHT HOVER
// ─────────────────────────────────────────────────
const nameHL = document.querySelector('.name-highlight');
if (nameHL) {
  nameHL.addEventListener('mouseenter', () => { nameHL.style.letterSpacing = '0.02em'; });
  nameHL.addEventListener('mouseleave', () => { nameHL.style.letterSpacing = ''; });
}

// ─────────────────────────────────────────────────
// 12. STAT COUNTER ANIMATION
// ─────────────────────────────────────────────────
const statIO = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el   = e.target;
    const text = el.textContent.trim();
    const num  = parseInt(text);
    if (!isNaN(num)) {
      let start = 0;
      const suffix = text.replace(num.toString(), '');
      const step = ts => {
        if (!start) start = ts;
        const prog  = Math.min((ts - start) / 1400, 1);
        const eased = 1 - Math.pow(1 - prog, 3);
        el.textContent = Math.floor(eased * num) + suffix;
        if (prog < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    statIO.unobserve(el);
  });
}, { threshold: 0.5 });
document.querySelectorAll('.stat-num').forEach(el => statIO.observe(el));

// ─────────────────────────────────────────────────
// 13. SECTION ENTRANCE — 3D flip-in on reveal
// ─────────────────────────────────────────────────
const sectionIO = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('section-in');
      sectionIO.unobserve(e.target);
    }
  });
}, { threshold: 0.04 });
document.querySelectorAll('section').forEach(el => sectionIO.observe(el));
