/* =========================================================
   ORBIT 포트폴리오 — 인터랙션
   1. 히어로: 궤도를 따라 도는 입자 + 마우스 물결
   2. 내비게이션: 현재 섹션 표시, TOP 버튼
   3. ABOUT: 스크롤 등장, 큰 문장 좌우 흐름
   4. WORKS: Grid(하단 펼침 상세) / Infinite(드래그 보드)
   ========================================================= */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ───────── 1. HERO 입자 ───────── */
(() => {
  const canvas = document.getElementById('orbit');
  const ctx = canvas.getContext('2d');
  const hero = canvas.parentElement;
  let W, H, dpr, cx, cy, particles = [];
  const mouse = { x: -9999, y: -9999, active: false };
  const ripples = [];
  let running = true;

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = hero.clientWidth; H = hero.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = W / 2; cy = H / 2;

    const base = Math.min(W, H * 1.5);
    const inner = base * 0.15;          // 가운데 비워 둔 영역
    const outer = base * 0.36;
    const count = Math.round(Math.min(6000, (W * H) / 260));
    particles = Array.from({ length: count }, () => {
      // 가운데 띠에 몰리고 안팎으로 갈수록 성기게
      const t = (Math.random() + Math.random() + Math.random()) / 3;
      const r = inner + (outer - inner) * t + (Math.random() - 0.5) * base * 0.04;
      return {
        r,
        a: Math.random() * Math.PI * 2,
        w: (0.00004 + Math.random() * 0.00004) * Math.pow(outer / r, 1.5), // 각속도: 안쪽이 더 빠르게
        squash: 0.8 + Math.random() * 0.05,
        size: 0.8 + Math.random() * 1.2,
        alpha: 0.18 + Math.random() * 0.6,
        ox: 0, oy: 0, vx: 0, vy: 0,
        x: 0, y: 0,
      };
    });
  }

  function onMove(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const dx = x - mouse.x, dy = y - mouse.y;
    mouse.x = x; mouse.y = y; mouse.active = true;
    // 움직인 거리만큼 물결을 남긴다
    if (Math.hypot(dx, dy) > 40 && ripples.length < 6) ripples.push({ x, y, r: 0, life: 1 });
  }
  hero.addEventListener('pointermove', onMove);
  hero.addEventListener('pointerleave', () => { mouse.active = false; mouse.x = mouse.y = -9999; });
  hero.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    ripples.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, r: 0, life: 1.4 });
  });

  function frame(dt) {
    ctx.clearRect(0, 0, W, H);
    const R = Math.min(W, H) * 0.16;            // 마우스 영향 반경

    for (const rp of ripples) { rp.r += dt * 0.55; rp.life -= dt * 0.0011; }
    for (let i = ripples.length - 1; i >= 0; i--) if (ripples[i].life <= 0) ripples.splice(i, 1);

    for (const p of particles) {
      p.a += p.w * dt;
      const bx = cx + Math.cos(p.a) * p.r;
      const by = cy + Math.sin(p.a) * p.r * p.squash;

      // 마우스 가까이 → 밀려나며 흩어짐
      if (mouse.active) {
        const dx = bx + p.ox - mouse.x, dy = by + p.oy - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < R * R) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d / R) * 0.9;
          p.vx += (dx / d) * f + (-dy / d) * f * 0.35;   // 바깥 + 살짝 소용돌이
          p.vy += (dy / d) * f + (dx / d) * f * 0.35;
        }
      }
      // 물결의 앞머리에 닿은 입자는 바깥으로 일렁임
      for (const rp of ripples) {
        const dx = bx - rp.x, dy = by - rp.y;
        const d = Math.hypot(dx, dy) || 1;
        const band = Math.abs(d - rp.r);
        if (band < 28) {
          const f = (1 - band / 28) * rp.life * 0.6;
          p.vx += (dx / d) * f; p.vy += (dy / d) * f;
        }
      }
      // 제자리로 돌아오는 스프링
      p.vx += -p.ox * 0.012; p.vy += -p.oy * 0.012;
      p.vx *= 0.9; p.vy *= 0.9;
      p.ox += p.vx; p.oy += p.vy;

      const x = bx + p.ox, y = by + p.oy;
      const disturbed = Math.min(1, Math.hypot(p.ox, p.oy) / 60);
      ctx.globalAlpha = Math.min(1, p.alpha + disturbed * 0.5);
      ctx.fillStyle = '#e1e4ea';
      ctx.fillRect(x, y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(48, now - last); last = now;
    if (running) frame(dt);
    requestAnimationFrame(loop);
  }

  build();
  window.addEventListener('resize', build);
  if (reduceMotion) { frame(0); return; }
  new IntersectionObserver(([e]) => { running = e.isIntersecting; }).observe(hero);
  requestAnimationFrame(loop);
})();

/* ───────── 2. NAV / TOP ───────── */
(() => {
  const links = [...document.querySelectorAll('.nav__menu a')];
  const sections = links.map((a) => document.getElementById(a.dataset.section));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('is-active', a.dataset.section === e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => s && io.observe(s));

  const top = document.getElementById('top');
  const onScroll = () => top.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.6);
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
})();

/* ───────── 3. ABOUT ───────── */
(() => {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

  /* 큰 소개 문구를 누르면 작업 이미지가 아래에서 위로 스르륵 지나간다
     (피그마 Frame 2147224727: Default → Variant2, On click, Smart Animate 2s ease-in-out) */
  const S_IMGS = [ // [left, top, w, h, 이미지들, 배경, 투명도] — 피그마 Default 상태 위치(1917×930 프레임 기준)
    [483, 930, 390, 292.5, [['mumchit-a.jpg'], ['mumchit-b.jpg']]],
    [955, 1062, 390, 292.5, [['compass.jpg', 'left:-7.77%;top:-7.63%;width:115.45%;height:115.45%']], '#d9e5ec'],
    [144, 1440, 276, 206.814, [['poster.jpg']]],
    [597, 1708, 276, 206.814, [['icon.jpg', 'left:0;top:-0.06%;width:200.48%;height:201.92%']]],
    [1498, 1466, 276, 206.814, [['rock.png', 'left:-16.2%;top:-9.05%;width:132.42%;height:117.81%']]],
    [282, 2337, 390, 292.5, [['fitlink.jpg']], '#d9e5ec'],
    [1202, 2052, 390, 292.5, [['typo.jpg', 'left:-0.02%;top:0;width:112.5%;height:100%']], '#d9e5ec', 0.94],
    [540, 3043, 390, 292.5, [['martens.jpg']]],
    [1166, 2750, 390, 292.5, [['ridi-a.jpg'], ['ridi-b.jpg', 'left:-10.56%;top:-10.7%;width:121.02%;height:121.13%']]],
  ];
  const statementEl = document.getElementById('statement');
  const imagesEl = document.getElementById('statementImages');
  const u = (n) => `calc(${n} * var(--u))`;
  imagesEl.innerHTML = S_IMGS.map(([l, t, w, h, imgs, bg, op]) => {
    const style = `left:${u(l)};top:${u(t)};width:${u(w)};height:${u(h)};${bg ? `background:${bg};` : ''}${op ? `opacity:${op};` : ''}`;
    // 화면 밖(잘린 영역)에 있어 lazy 로딩을 쓰면 끝까지 안 불러와지므로 바로 불러온다
    const inner = imgs.map(([src, css]) => css
      ? `<img src="assets/${src}" alt="" decoding="async" style="${css}">`
      : `<img class="cover" src="assets/${src}" alt="" decoding="async">`).join('');
    return `<div class="s-img" style="${style}">${inner}</div>`;
  }).join('');

  let playing = false;
  function playStatement() {
    if (playing || window.innerWidth <= 900) return;
    playing = true;
    statementEl.classList.add('is-playing');
    imagesEl.classList.add('is-playing');
    const done = () => {
      // 다 올라가면 보이지 않게 제자리로 돌려 두어 다시 누를 수 있게 한다
      imagesEl.style.visibility = 'hidden';
      imagesEl.classList.remove('is-playing');
      statementEl.classList.remove('is-playing');
      requestAnimationFrame(() => requestAnimationFrame(() => { imagesEl.style.visibility = ''; playing = false; }));
    };
    if (reduceMotion) { setTimeout(done, 300); return; }
    imagesEl.addEventListener('transitionend', done, { once: true });
  }
  statementEl.addEventListener('click', playStatement);
  statementEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playStatement(); }
  });

  /* PDF 버튼: 드라이브 연결 전이라 이동하지 않고 상태 변화만 */
  document.getElementById('pdfBtn').addEventListener('click', (e) => e.preventDefault());

  if (reduceMotion) return;
  const statement = statementEl;
  const lines = [...statement.querySelectorAll('.statement__line')];
  let ticking = false;
  function drift() {
    ticking = false;
    if (window.innerWidth <= 900) { lines.forEach((l) => (l.style.transform = '')); return; }
    const r = statement.getBoundingClientRect();
    const p = (window.innerHeight - r.top) / (window.innerHeight + r.height); // 0 → 1
    const k = Math.max(-0.2, Math.min(1.2, p)) - 0.5;
    const unit = Math.min(window.innerWidth, 1920) / 1920;
    lines.forEach((l) => { l.style.transform = `translateX(${k * 120 * unit * Number(l.dataset.drift)}px)`; });
  }
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(drift); } }, { passive: true });
  window.addEventListener('resize', drift);
  drift();
})();

/* ───────── 4. WORKS ───────── */
const WORKS = [
  { id: 'mumchit', name: 'mumchit', cat: 'UIUX Design', contrib: '30%', date: '2026.03~06', size: 'l',
    imgs: [{ src: 'mumchit-a.jpg' }, { src: 'mumchit-b.jpg' }] },
  { id: 'compass', name: 'COMPASS', cat: 'UIUX Design', contrib: '25%', date: '2026.08~11', size: 'l', bg: '#d9e5ec',
    imgs: [{ src: 'compass.jpg', css: 'left:-7.77%;top:-7.63%;width:115.45%;height:115.45%' }] },
  { id: 'poster', name: 'Poster Designs', cat: 'Graphic Design', contrib: '100%', date: '2026.07~12', size: 's',
    imgs: [{ src: 'poster.jpg' }] },
  { id: 'icon', name: 'Icon Designs', cat: 'Graphic Design', contrib: '100%', date: '2026.04~12', size: 's',
    imgs: [{ src: 'icon.jpg', css: 'left:0;top:-0.06%;width:200.48%;height:201.92%' }] },
  { id: 'rock', name: 'Back to ROCK', cat: 'Web Design', contrib: '100%', date: '2025.04~06', size: 's',
    imgs: [{ src: 'rock.png', css: 'inset:0;width:100%;height:100%;object-fit:cover;object-position:bottom' }] },
  { id: 'fitlink', name: 'FIT LINK', cat: 'UIUX Design', contrib: '100%', date: '2026.09~12', size: 'l', bg: '#d9e5ec',
    imgs: [{ src: 'fitlink.jpg' }] },
  { id: 'typo', name: 'Typo Essay', cat: 'Web Design', contrib: '100%', date: '2026.03~06', size: 'l', bg: '#d9e5ec', opacity: 0.94,
    imgs: [{ src: 'typo.jpg', css: 'left:-0.02%;top:0;width:112.5%;height:100%' }] },
  { id: 'martens', name: 'Dr. Martens Campaign', cat: 'BX Design', contrib: '100%', date: '2026.09~12', size: 'l',
    imgs: [{ src: 'martens.jpg' }] },
  { id: 'ridi', name: 'RIDI UI Redesign', cat: 'UIUX Design', contrib: '100%', date: '2026.04~06', size: 'l',
    imgs: [{ src: 'ridi-a.jpg' }, { src: 'ridi-b.jpg', css: 'left:-10.56%;top:-10.7%;width:121.02%;height:121.13%' }] },
];
const ROWS = [['a', [0, 1]], ['b', [2, 3, 4]], ['c', [5, 6]], ['d', [7, 8]]];

function mediaHTML(w) {
  const imgs = w.imgs.map((i) => i.css
    ? `<img src="assets/${i.src}" alt="" loading="lazy" style="${i.css}">`
    : `<img class="cover" src="assets/${i.src}" alt="" loading="lazy">`).join('');
  const style = [w.bg ? `background:${w.bg}` : '', w.opacity ? `opacity:${w.opacity}` : ''].filter(Boolean).join(';');
  return `<div class="card__media-inner" style="${style}">${imgs}</div>`;
}
function cardHTML(w, i, size = w.size) {
  return `
    <button class="card card--${size}" data-index="${i}" aria-label="${w.name} 자세히 보기">
      <div class="card__media">${mediaHTML(w)}</div>
      <div class="card__meta">
        <div class="card__left">
          <p class="card__name"><span>${w.name}</span></p>
          <div class="card__cat"><span>${w.cat}</span><span>contrib. ${w.contrib}</span></div>
        </div>
        <p class="card__date">${w.date}</p>
      </div>
    </button>`;
}
function detailHTML(w) {
  return `
    <div class="detail__body">
      <div class="detail__media">${mediaHTML(w).replace('card__media-inner', 'card__media-inner detail__inner')}</div>
      <div class="detail__info">
        <h3 class="detail__title" id="modal-title">${w.name}</h3>
        <div class="detail__meta"><span>${w.cat}</span><span>contrib. ${w.contrib}</span><span>${w.date}</span></div>
        <p class="detail__text detail__todo">이 작업의 핵심 내용을 2~3줄로 적어 주세요.<br>(문제 → 내가 한 것 → 결과)</p>
        <button class="detail__close" data-close>닫기 ✕</button>
      </div>
    </div>`;
}

(() => {
  const grid = document.getElementById('grid');
  const board = document.getElementById('board');
  const plane = document.getElementById('plane');
  const modal = document.getElementById('modal');
  const panel = modal.querySelector('.modal__panel');

  /* Grid 보기 */
  grid.innerHTML = ROWS.map(([k, idx]) =>
    `<div class="row row--${k}">${idx.map((i) => cardHTML(WORKS[i], i)).join('')}</div>`).join('');

  const detail = document.createElement('div');
  detail.className = 'detail';
  detail.innerHTML = '<div class="detail__clip"></div>';
  const clip = detail.firstChild;
  let openIndex = -1;

  function closeDetail() {
    detail.classList.remove('is-open');
    grid.querySelectorAll('.card.is-open').forEach((c) => c.classList.remove('is-open'));
    openIndex = -1;
  }
  function openDetail(card) {
    const i = Number(card.dataset.index);
    if (i === openIndex) { closeDetail(); return; }
    const row = card.closest('.row');
    const moving = detail.parentElement && detail.previousElementSibling !== row;
    const show = () => {
      clip.innerHTML = detailHTML(WORKS[i]);
      row.after(detail);
      grid.querySelectorAll('.card.is-open').forEach((c) => c.classList.remove('is-open'));
      card.classList.add('is-open');
      openIndex = i;
      requestAnimationFrame(() => {
        detail.classList.add('is-open');
        setTimeout(() => detail.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' }), 250);
      });
    };
    if (moving && detail.classList.contains('is-open')) {
      detail.classList.remove('is-open');
      setTimeout(show, 350);
    } else show();
  }
  grid.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) { closeDetail(); return; }
    const card = e.target.closest('.card');
    if (card) openDetail(card);
  });

  /* Infinite 보기 — 드래그 보드 */
  const SPOTS = [
    [260, 300, 'l'], [1080, 140, 's'], [1700, 380, 'l'],
    [2500, 220, 's'], [560, 1060, 's'], [1240, 860, 'l'],
    [2120, 1180, 's'], [300, 1600, 'l'], [2500, 1520, 'l'],
  ];
  plane.innerHTML = WORKS.map((w, i) => {
    const [x, y, s] = SPOTS[i];
    return cardHTML(w, i, s).replace('<button class="card', `<button style="left:${x}px;top:${y}px;width:${s === 'l' ? 560 : 400}px" class="card`);
  }).join('');
  plane.querySelectorAll('.card__media').forEach((m) => {
    m.style.height = (m.parentElement.classList.contains('card--l') ? 420 : 300) + 'px';
  });

  let pos = { x: 0, y: 0 }, vel = { x: 0, y: 0 }, drag = null, raf = 0;
  const PW = 3200, PH = 2200;
  function clampPos() {
    const bw = board.clientWidth, bh = board.clientHeight;
    pos.x = Math.min(200, Math.max(bw - PW - 200, pos.x));
    pos.y = Math.min(200, Math.max(bh - PH - 200, pos.y));
  }
  function apply() { plane.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`; }
  function center() { pos.x = (board.clientWidth - PW) / 2; pos.y = (board.clientHeight - PH) / 2 + 200; clampPos(); apply(); }
  function glide() {
    vel.x *= 0.93; vel.y *= 0.93;
    pos.x += vel.x; pos.y += vel.y; clampPos(); apply();
    if (Math.abs(vel.x) + Math.abs(vel.y) > 0.3) raf = requestAnimationFrame(glide);
  }
  board.addEventListener('pointerdown', (e) => {
    cancelAnimationFrame(raf);
    drag = { x: e.clientX, y: e.clientY, sx: pos.x, sy: pos.y, moved: 0, lx: e.clientX, ly: e.clientY, target: e.target };
    board.setPointerCapture(e.pointerId);
    board.classList.add('is-dragging');
  });
  board.addEventListener('pointermove', (e) => {
    if (!drag) return;
    pos.x = drag.sx + (e.clientX - drag.x);
    pos.y = drag.sy + (e.clientY - drag.y);
    vel.x = e.clientX - drag.lx; vel.y = e.clientY - drag.ly;
    drag.lx = e.clientX; drag.ly = e.clientY;
    drag.moved = Math.max(drag.moved, Math.hypot(e.clientX - drag.x, e.clientY - drag.y));
    clampPos(); apply();
  });
  const endDrag = (e) => {
    if (!drag) return;
    board.classList.remove('is-dragging');
    const card = drag.moved < 6 && drag.target.closest && drag.target.closest('.card');
    drag = null;
    if (card) openModal(Number(card.dataset.index));
    else if (!reduceMotion) raf = requestAnimationFrame(glide);
  };
  board.addEventListener('pointerup', endDrag);
  board.addEventListener('pointercancel', endDrag);
  board.addEventListener('click', (e) => e.preventDefault());

  /* 모달 (Infinite 보기에서 작업 상세) */
  function openModal(i) {
    panel.innerHTML = detailHTML(WORKS[i]);
    modal.hidden = false;
    panel.querySelector('[data-close]').focus();
  }
  function closeModal() { modal.hidden = true; }
  modal.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!modal.hidden) closeModal(); else if (openIndex > -1) closeDetail();
  });

  /* 보기 전환 */
  const tabs = [...document.querySelectorAll('.works__toggle button')];
  tabs.forEach((t) => t.addEventListener('click', () => {
    const v = t.dataset.view;
    tabs.forEach((b) => b.setAttribute('aria-selected', String(b === t)));
    grid.hidden = v !== 'grid';
    board.hidden = v !== 'infinite';
    if (v === 'infinite') { closeDetail(); center(); }
  }));
  window.addEventListener('resize', () => { if (!board.hidden) { clampPos(); apply(); } });
})();
