(() => {
  'use strict';
  const { themes, situations, shirts } = window.SITE;
  const A = window.anime;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fx = !!A && !reduce;                       // run animations?
  if (fx) document.documentElement.classList.add('js-anim');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };

  /* ================= situations: stages ================= */
  // bubble boxes on the 1120×516 design canvas: [x, y, w, h] (Figma "Frame 1" offset (132,42) already added)
  const OFF = [132, 42];
  const BOXES = [[23, 0, 166, 53], [341, 95, 101, 32], [93, 353, 260, 83], [566, 101, 232, 74], [695, 286, 155, 50], [0, 281, 141, 45], [522, 375, 93, 30], [144, 175, 93, 30], [-125, 106, 166, 53], [880, 20, 120, 36]];

  function bubbleHTML(s, si, i) {
    const [x, y, w, h] = BOXES[i];
    const a = s.answers[(i + si) % Math.max(s.answers.length, 1)];
    // depth: small bubbles are "far" (<1, slow, slightly soft), big ones "near" (>1, fast, crisp)
    const d = (0.5 + ((w - 90) / 170) * 1.1).toFixed(2);
    const style = `--x:${x + OFF[0]};--y:${y + OFF[1]};--w:${w};--h:${h};--d:${d}`;
    if (!a) return `<div class="bubble is-empty" style="${style}" aria-hidden="true"><span class="bubble-bars"><i></i><i></i></span></div>`;
    return `<div class="bubble" role="button" tabindex="0" aria-expanded="false" aria-label="Answer ${i + 1}: hover or press Enter to read" style="${style}">
      <span class="bubble-bars" aria-hidden="true"><i></i><i></i></span>
      <span class="bubble-answer"><p>${esc(a.text)}</p>${a.sample ? '<small>Sample answer</small>' : ''}</span></div>`;
  }

  function stageHTML(s, si) {
    const w = s.write;
    // real (non-sample) answers: one bubble per answer; otherwise the default layout (9 for S01, 8 for the rest)
    const real = s.answers.length > 0 && s.answers.every((a) => !a.sample);
    const count = real ? Math.min(s.answers.length, BOXES.length) : (s.id === 'S01' ? 9 : 8);
    return `<article class="stage" data-id="${s.id}" data-theme="${s.theme}" aria-labelledby="q-${s.id}">
      <div class="bubbles">${Array.from({ length: count }, (_, i) => bubbleHTML(s, si, i)).join('')}</div>
      <div class="cardwrap"><div class="card3d"><div class="flip">
        <div class="face front">
          <img class="face-bg" src="assets/art/front-${s.id}.png" alt="">
          <div class="q-wrap"><h4 class="q" id="q-${s.id}">${esc(s.question)}</h4></div>
          <button type="button" class="write-btn" aria-label="Write your think about: ${esc(s.question)}">Write your think</button>
        </div>
        <div class="face back" inert>
          <img class="face-bg" src="assets/art/back-${s.id}.png" alt="">
          <textarea class="write" maxlength="600" placeholder="Write your think…" aria-label="Your answer"
            style="--wx:${w.x};--wy:${w.y};--ww:${w.w};--wh:${w.h};--wlh:${w.lh};--wc:${w.color}"></textarea>
        </div>
      </div></div></div>
      <div class="back-actions" inert>
        <button type="button" class="back-btn">← Back</button>
        <span class="count" aria-hidden="true"></span>
        <button type="button" class="send">Send your think</button>
      </div>
    </article>`;
  }

  const stack = $('#stack');
  stack.innerHTML = Object.keys(themes).map((tk) => `
    <section class="theme" data-theme="${tk}" aria-labelledby="th-${tk}">
      <h3 class="theme-label" id="th-${tk}">${esc(themes[tk].label)}<span class="swatches" aria-hidden="true"><i></i><i></i><i></i><i></i></span></h3>
      ${situations.map((s, si) => [s, si]).filter(([s]) => s.theme === tk).map(([s, si]) => stageHTML(s, si)).join('')}
    </section>`).join('');

  /* ---------- floating bubbles ---------- */
  function startFloat(b) {
    if (!fx || b.classList.contains('is-open')) return;
    if (b._f) { b._f.pause(); A.remove(b._f); }
    b._f = A({
      targets: b,
      translateX: [0, rnd(-8, 8)], translateY: [0, rnd(-12, 12)], rotate: [0, rnd(-2.5, 2.5)],
      duration: rnd(2800, 5400), direction: 'alternate', loop: true, easing: 'easeInOutSine', delay: rnd(0, 800),
    });
  }
  const stopFloat = (b) => { if (b._f) b._f.pause(); };

  /* ---------- hover → bubble grows into an answer card ---------- */
  const openBubbles = new Set();
  function openBubble(b) {
    if (b._open || b.classList.contains('is-empty')) return;
    const st = b.closest('.stage');
    if (st.classList.contains('is-flipped') || st._busy) return;
    [...openBubbles].forEach(closeBubble);
    b._open = true; openBubbles.add(b);
    b.setAttribute('aria-expanded', 'true');
    stopFloat(b);
    A.remove(b);
    // re-entered while the close animation was still running: kill it completely (bars fading in, text fading out)
    const mid = b.classList.contains('is-open');
    const ans0 = $('.bubble-answer', b), bars0 = $('.bubble-bars', b);
    A.remove(bars0); A.remove(ans0);
    const aop = mid ? parseFloat(getComputedStyle(ans0).opacity) || 0 : 0;
    // fold the current float offset into left/top so there is no jump
    const tx = fx && !mid ? parseFloat(A.get(b, 'translateX')) || 0 : 0, ty = fx && !mid ? parseFloat(A.get(b, 'translateY')) || 0 : 0;
    const cur = { l: b.offsetLeft, t: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight };   // where it is right now
    const o = mid && b._o ? b._o : cur;                                                      // where it rests when closed
    b._o = o;
    const sw = st.clientWidth, sh = st.clientHeight;
    const W = Math.min(sw - 12, clamp(sw * 0.38, 250, 430));
    // measure the height the text needs at that width
    const ans = $('.bubble-answer', b);
    const keep = b.getAttribute('style');
    b.style.width = W + 'px'; b.style.height = 'auto'; ans.style.position = 'relative'; ans.style.inset = 'auto';
    const H = Math.max(b.offsetHeight, 84);
    b.setAttribute('style', keep); ans.style.position = ''; ans.style.inset = '';
    const px = parseFloat(b.style.getPropertyValue('--parx')) || 0, py = parseFloat(b.style.getPropertyValue('--pary')) || 0;
    const sL = mid ? cur.l : o.l + tx + px, sT = mid ? cur.t : o.t + ty + py;
    const sW = mid ? cur.w : o.w, sH = mid ? cur.h : o.h;
    const nL = clamp(o.l + tx + px + (o.w - W) / 2, 6, sw - W - 6);
    const nT = clamp(o.t + ty + py + (o.h - H) / 2 - 14, 4, sh - H - 4);
    b.style.transform = 'none';
    b.classList.add('is-open');
    if (!fx) { Object.assign(b.style, { left: nL + 'px', top: nT + 'px', width: W + 'px', height: H + 'px', borderRadius: '30px' }); $('.bubble-bars', b).style.opacity = 0; ans.style.opacity = 1; return; }
    A({ targets: b, left: [sL, nL], top: [sT, nT], width: [sW, W], height: [sH, H], borderRadius: [mid ? '30px' : '999px', '30px'], duration: 700, easing: 'easeOutElastic(1, .85)' });
    A({ targets: $('.bubble-bars', b), opacity: 0, duration: 180, easing: 'linear' });
    A({ targets: ans, opacity: [aop, 1], translateY: [10, 0], duration: 420, delay: mid ? 0 : 160, easing: 'easeOutQuad' });
  }
  function closeBubble(b) {
    if (!b._open) return;
    b._open = false; openBubbles.delete(b);
    b.setAttribute('aria-expanded', 'false');
    const o = b._o, ans = $('.bubble-answer', b), bars = $('.bubble-bars', b);
    const done = () => {
      ['left', 'top', 'width', 'height', 'borderRadius', 'transform'].forEach((p) => { b.style[p] = ''; });
      b.classList.remove('is-open'); startFloat(b);
    };
    if (!fx) { bars.style.opacity = 1; ans.style.opacity = 0; done(); return; }
    A.remove(b); A.remove(ans); A.remove(bars);
    A({ targets: ans, opacity: 0, duration: 140, easing: 'linear' });
    A({ targets: bars, opacity: 1, duration: 300, delay: 120, easing: 'linear' });
    // land where the bubble rests now (layout position + current scroll-parallax offset)
    const px = parseFloat(b.style.getPropertyValue('--parx')) || 0, py = parseFloat(b.style.getPropertyValue('--pary')) || 0;
    A({ targets: b, left: o.l + px, top: o.t + py, width: o.w, height: o.h, borderRadius: '999px', duration: 520, easing: 'easeOutQuart', complete: done });
  }
  stack.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse') return;
    const b = e.target.closest('.bubble'); if (b && !b.contains(e.relatedTarget)) openBubble(b);
  });
  stack.addEventListener('pointerout', (e) => {
    if (e.pointerType !== 'mouse') return;
    const b = e.target.closest('.bubble'); if (b && !b.contains(e.relatedTarget)) closeBubble(b);
  });
  stack.addEventListener('click', (e) => {
    const b = e.target.closest('.bubble');
    if (!b || e.pointerType === 'mouse') return;      // mouse users already got it on hover
    b._open ? closeBubble(b) : openBubble(b);
  });
  stack.addEventListener('keydown', (e) => {
    const b = e.target.closest('.bubble');
    if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); b._open ? closeBubble(b) : openBubble(b); }
    if (e.key === 'Escape') [...openBubbles].forEach(closeBubble);
  });
  stack.addEventListener('focusout', (e) => { const b = e.target.closest && e.target.closest('.bubble'); if (b && !b.contains(e.relatedTarget)) closeBubble(b); });
  document.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' && !e.target.closest('.bubble')) [...openBubbles].forEach(closeBubble); });
  addEventListener('resize', () => [...openBubbles].forEach(closeBubble));

  /* ---------- flip: "Write your think" ---------- */
  const rectIn = (el, parent) => { const a = el.getBoundingClientRect(), p = parent.getBoundingClientRect(); return { x: a.left - p.left, y: a.top - p.top, w: a.width, h: a.height }; };
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg;
    clearTimeout(toastTimer);
    if (fx) A({ targets: t, opacity: [0, 1], translateY: [12, 0], duration: 400, easing: 'easeOutQuad' }); else t.style.opacity = 1;
    toastTimer = setTimeout(() => { if (fx) A({ targets: t, opacity: 0, duration: 400, easing: 'linear' }); else t.style.opacity = 0; }, 3200);
  }

  function flip(st, toBack, after) {
    if (st._busy || st.classList.contains('is-flipped') === toBack) return;
    st._busy = true;
    [...openBubbles].forEach(closeBubble);
    const wrap = $('.cardwrap', st), f = $('.flip', st), front = $('.face.front', st), back = $('.face.back', st), acts = $('.back-actions', st);
    const bubbles = $$('.bubble', st);
    const r0 = rectIn(wrap, st);
    st.classList.toggle('is-flipped', toBack);             // CSS now holds the target geometry
    const r1 = rectIn(wrap, st);
    front.inert = toBack; back.inert = !toBack; acts.inert = !toBack;
    const finish = () => {
      ['left', 'top', 'width', 'height'].forEach((p) => { wrap.style[p] = ''; });
      st._busy = false;
      if (toBack) { acts.style.opacity = 1; $('.write', st).focus({ preventScroll: true }); } else { acts.style.opacity = 0; $('.write-btn', st).focus({ preventScroll: true }); }
      if (after) after();
    };
    if (!fx) { f.style.transform = toBack ? 'rotateY(180deg)' : ''; bubbles.forEach((b) => { b.style.opacity = toBack ? 0 : 1; }); finish(); return; }
    bubbles.forEach((b) => { stopFloat(b); A.remove(b); });   // cancel entrance / float so they can't fight the fade
    if (toBack) {
      A({ targets: bubbles, opacity: 0, scale: 0.4, translateX: 0, translateY: 0, rotate: 0, duration: 380, delay: A.stagger(25), easing: 'easeInBack' });
    } else {
      A({ targets: bubbles, opacity: 1, scale: 1, translateX: 0, translateY: 0, rotate: 0, duration: 900, delay: A.stagger(45, { start: 500 }), easing: 'easeOutElastic(1,.8)', complete: () => bubbles.forEach(startFloat) });
      A({ targets: acts, opacity: 0, duration: 200, easing: 'linear' });
    }
    A.timeline({ easing: 'easeInOutCubic', duration: 950, complete: finish })
      .add({ targets: wrap, left: [r0.x, r1.x], top: [r0.y, r1.y], width: [r0.w, r1.w], height: [r0.h, r1.h] }, 0)
      .add({ targets: f, rotateY: toBack ? [0, 180] : [180, 0] }, 0)
      .add({ targets: wrap, scale: [{ value: 1.06, duration: 450 }, { value: 1, duration: 500 }] }, 0);
    if (toBack) A({ targets: acts, opacity: [0, 1], translateY: [14, 0], duration: 500, delay: 800, easing: 'easeOutQuad' });
  }

  // restore drafts
  $$('.stage').forEach((st) => { const d = store.get('ifmtis:draft:' + st.dataset.id); if (d) $('.write', st).value = d; });

  stack.addEventListener('click', (e) => {
    const st = e.target.closest('.stage'); if (!st) return;
    if (e.target.closest('.write-btn')) flip(st, true);
    else if (e.target.closest('.back-btn')) flip(st, false);
    else if (e.target.closest('.send')) {
      const ta = $('.write', st), text = ta.value.trim();
      if (!text) { toast('Write something first — even one line.'); ta.focus(); return; }
      const btn = e.target.closest('.send'), form = (window.SITE || {}).form;
      const done = (sent) => {
        store.set('ifmtis:answer:' + st.dataset.id, JSON.stringify({ text, at: new Date().toISOString(), sent }));
        store.del('ifmtis:draft:' + st.dataset.id);
        toast(sent ? 'Thank you. Your words were sent anonymously.' : 'Thank you. Saved on this device only — nothing was sent.');
        ta.value = '';
        btn.disabled = false;
        flip(st, false);
      };
      if (form && form.action) {
        // Google Form: POST in no-cors mode (response is opaque, so a resolved fetch means it was delivered)
        const body = new URLSearchParams();
        body.set(form.fields.text, text);
        if (form.fields.situation) body.set(form.fields.situation, st.dataset.id);
        btn.disabled = true; toast('Sending…');
        fetch(form.action, { method: 'POST', mode: 'no-cors', body })
          .then(() => done(true))
          .catch(() => { btn.disabled = false; toast('Could not send — check your connection and try again. Your text is still here.'); });
      } else done(false);
    }
  });
  stack.addEventListener('input', (e) => { if (e.target.classList.contains('write')) store.set('ifmtis:draft:' + e.target.closest('.stage').dataset.id, e.target.value); });
  stack.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { const st = e.target.closest && e.target.closest('.stage.is-flipped'); if (st) flip(st, false); }
  });

  /* ================= shirts ================= */
  $('#shirt-grid').innerHTML = shirts.map((s, i) => `
    <article class="shirt" data-reveal>
      <div class="shirt-img"><img src="${esc(s.image)}" alt="T-shirt design ${i + 1}: ${esc(s.name)}" loading="lazy"></div>
      <h3>Shirt 0${i + 1} — ${esc(s.name)}</h3>
      <p class="meta">Sizes &amp; material: to be confirmed</p>
      <div class="shirt-row"><span>${s.price ? esc(s.price) : 'Price TBC'}</span>
        ${s.orderUrl ? `<a class="btn solid" href="${esc(s.orderUrl)}" rel="noopener">Order</a>` : '<span class="btn is-soon" aria-disabled="true">Coming soon</span>'}</div>
    </article>`).join('');

  /* ================= posters ================= */
  if (SITE.form && SITE.form.action) { const n = $('#send-note'); if (n) n.hidden = false; }
  const posters = SITE.posters || [];
  function posterHTML(p, big) {
    return `<div class="ph has-img"><img src="${esc(p.image)}" alt="${esc(p.alt || 'Typography poster')}" ${big ? '' : 'loading="lazy"'} decoding="async"></div>`;
  }
  const pMain = $('#poster-main'), thumbs = $('#thumbs');
  let pIdx = 0;
  thumbs.innerHTML = posters.map((p, i) => `<button type="button" class="thumb" data-i="${i}" aria-label="Show poster ${i + 1}">${posterHTML(p)}</button>`).join('');
  function showPoster(i, animateIt) {
    pIdx = (i + posters.length) % posters.length;
    const p = posters[pIdx];
    pMain.innerHTML = posterHTML(p, true);
    $('#poster-count').textContent = `Poster ${String(pIdx + 1).padStart(2, '0')} / ${String(posters.length).padStart(2, '0')}`;
    $('#poster-title').textContent = p.theme === 'relationship' ? 'Relationship' : 'Self';
    const cap = $('#poster-caption');
    cap.innerHTML = String(p.caption || SITE.posterCaption || '').split(/\n\s*\n/).map((t) => `<span class="cap-p">${esc(t)}</span>`).join('');
    $$('.thumb', thumbs).forEach((t, k) => t.setAttribute('aria-current', String(k === pIdx)));
    if (fx && animateIt) A({ targets: pMain, opacity: [0, 1], translateY: [18, 0], rotate: [-1.5, 0], duration: 600, easing: 'easeOutCubic' });
  }
  thumbs.addEventListener('click', (e) => { const t = e.target.closest('.thumb'); if (t) showPoster(+t.dataset.i, true); });
  $('#poster-prev').addEventListener('click', () => showPoster(pIdx - 1, true));
  $('#poster-next').addEventListener('click', () => showPoster(pIdx + 1, true));
  $('#poster-sheet').addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') showPoster(pIdx - 1, true); if (e.key === 'ArrowRight') showPoster(pIdx + 1, true); });
  const lb = $('#lightbox');
  pMain.addEventListener('click', () => { $('#lb-body').innerHTML = posterHTML(posters[pIdx], true); lb.showModal(); });
  $('#lb-close').addEventListener('click', () => lb.close());
  lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
  showPoster(0, false);

  // Keep the arrows fixed: reserve the height of the longest caption so the controls never move.
  const capEl = $('#poster-caption');
  function fixCaptionHeight() {
    const clone = capEl.cloneNode(false);
    clone.removeAttribute('id');
    clone.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;left:0;top:0;min-height:0;width:${capEl.getBoundingClientRect().width}px`;
    capEl.parentNode.appendChild(clone);
    let max = 0;
    posters.forEach((p) => {
      clone.innerHTML = String(p.caption || SITE.posterCaption || '').split(/\n\s*\n/).map((t) => `<span class="cap-p">${esc(t)}</span>`).join('');
      max = Math.max(max, clone.getBoundingClientRect().height);
    });
    clone.remove();
    capEl.style.minHeight = Math.ceil(max) + 'px';
  }
  fixCaptionHeight();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fixCaptionHeight);
  let capT; addEventListener('resize', () => { clearTimeout(capT); capT = setTimeout(fixCaptionHeight, 120); });

  /* ================= nav ================= */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 24);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ================= entrance animations ================= */
  if (!fx) return;

  // hero
  const hero = A.timeline({ easing: 'easeOutExpo' });
  hero
    .add({ targets: '.nav', translateY: [-34, 0], opacity: [0, 1], duration: 900 })
    .add({ targets: '.eyebrow', opacity: [0, 1], translateY: [14, 0], duration: 800 }, '-=600')
    .add({ targets: '.t1 .line', translateY: ['110%', '0%'], duration: 1100 }, '-=500')
    .add({ targets: '.t2', opacity: [0, 1], scale: [0.5, 1], translateY: [40, 0], duration: 1100, easing: 'easeOutBack' }, '-=850')
    .add({ targets: '.t3 .line', translateY: ['110%', '0%'], duration: 1100 }, '-=900')
    .add({ targets: ['.lede', '.cta'], opacity: [0, 1], translateY: [22, 0], delay: A.stagger(130), duration: 900 }, '-=700');

  const cards = $$('.hc');
  A({ targets: cards, opacity: [0, 1], translateX: [300, 0], translateY: [110, 0], scale: [0.82, 1], delay: A.stagger(170, { start: 500 }), duration: 1300, easing: 'easeOutQuart',
    complete: () => cards.forEach((c, i) => A({ targets: c, translateY: [0, [-9, 7, -6][i]], duration: 3600 + i * 700, direction: 'alternate', loop: true, easing: 'easeInOutSine' })) });
  const hb = $$('.hb');
  A({ targets: hb, opacity: [0, 1], scale: [0, 1], delay: A.stagger(120, { start: 1300 }), duration: 1100, easing: 'easeOutElastic(1,.7)',
    complete: () => hb.forEach((b) => A({ targets: b, translateX: [0, rnd(-8, 8)], translateY: [0, rnd(-12, 12)], duration: rnd(2800, 4800), direction: 'alternate', loop: true, easing: 'easeInOutSine' })) });

  // pointer parallax on the hero cluster
  const hc = $('#hero-cards'), heroEl = $('.hero');
  heroEl.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = heroEl.getBoundingClientRect();
    hc.style.setProperty('--px', ((e.clientX - r.left) / r.width - 0.5) * -26);
    hc.style.setProperty('--py', ((e.clientY - r.top) / r.height - 0.5) * -20);
  });
  heroEl.addEventListener('pointerleave', () => { hc.style.setProperty('--px', 0); hc.style.setProperty('--py', 0); });

  // page glows drift slowly
  A({ targets: '.glow', translateX: () => rnd(-50, 50), translateY: () => rnd(-40, 40), duration: () => rnd(9000, 16000), direction: 'alternate', loop: true, easing: 'easeInOutSine' });

  // generic "run once when scrolled into view"
  const once = (els, fn, threshold = 0.2) => {
    if (!('IntersectionObserver' in window)) { els.forEach((el, i) => fn(el, i)); return; }
    const io = new IntersectionObserver((entries) => {
      const hit = entries.filter((en) => en.isIntersecting);
      hit.forEach((en, i) => { io.unobserve(en.target); fn(en.target, i); });
    }, { threshold });
    els.forEach((el) => io.observe(el));
  };

  // theme banner → then the cards glide in from the sides and the bubbles gather around them
  once($$('.theme-label'), (label) => {
    const th = label.closest('.theme');
    A.timeline({ easing: 'easeOutExpo' })
      .add({ targets: label, opacity: [0, 1], translateX: [-70, 0], duration: 1000 })
      .add({ targets: $$('.swatches i', th), scale: [0, 1], delay: A.stagger(80), duration: 700, easing: 'easeOutBack' }, '-=700');
  }, 0.6);

  once($$('.stage'), (st) => {
    const i = $$('.stage').indexOf(st);
    const dir = i % 2 ? 1 : -1;
    const wrap = $('.cardwrap', st), bs = $$('.bubble', st);
    const cx = st.clientWidth / 2, cy = st.clientHeight / 2;
    A({ targets: wrap, opacity: [0, 1], translateX: [dir * 420, 0], translateY: [150, 0], rotate: [dir * 9, 0], duration: 1200, easing: 'easeOutQuart' });
    A({
      targets: bs, opacity: [0, 1], scale: [0.3, 1],
      translateX: (el) => [(el.offsetLeft + el.offsetWidth / 2 - cx) * 1.2, 0],
      translateY: (el) => [(el.offsetTop + el.offsetHeight / 2 - cy) * 1.2, 0],
      delay: A.stagger(80, { start: 450 }), duration: 1500, easing: 'easeOutElastic(1,.75)',
      complete: () => bs.forEach(startFloat),
    });
  }, 0.3);

  // scroll reveals
  $$('.sec-head, .sheet, .about-cols > div, .foot-title, .foot-sub').forEach((el) => el.setAttribute('data-reveal', ''));
  once($$('[data-reveal]'), (el, i) => {
    A({ targets: el, opacity: [0, 1], translateY: [34, 0], duration: 900, delay: i * 110, easing: 'easeOutCubic' });
  }, 0.15);

  /* ---------- scroll parallax: far things drift slowly, near things sweep past ---------- */
  const layers = [];
  $$('.stage').forEach((st) => $$('.bubble', st).forEach((el) => layers.push({ el, st, d: parseFloat(el.style.getPropertyValue('--d')) || 1, x: 0, y: 0, tx: 0, ty: 0 })));
  const heroLayers = [['.hc-lo', 0.55], ['.hc-fr', 0.8], ['.hc-fam', 1.1], ['.hb1', 1.5], ['.hb2', 0.7], ['.hb3', 1.7], ['.hb4', 1.3]]
    .map(([sel, d]) => ({ el: $(sel), d, x: 0, y: 0, tx: 0, ty: 0 }));
  const vis = new Set();
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? vis.add(e.target) : vis.delete(e.target))), { rootMargin: '250px 0px' }) : null;
  $$('.stage').forEach((st) => (io ? io.observe(st) : vis.add(st)));
  let ticking = false;
  function targets() {
    const vh = innerHeight;
    layers.forEach((l) => {
      if (!vis.has(l.st)) return;
      const r = l.st.getBoundingClientRect();
      const p = r.top + r.height / 2 - vh / 2;                    // >0 when the stage sits below the middle of the screen
      l.ty = clamp(p * (l.d - 1) * 0.42, -150, 150);
      l.tx = clamp(p * (l.d - 1) * 0.07, -26, 26);
    });
    heroLayers.forEach((l) => { l.ty = clamp(-scrollY * (l.d - 1) * 0.3, -180, 180); });
  }
  function step() {
    let moving = false;
    [...layers, ...heroLayers].forEach((l) => {
      if (l.el.classList.contains('is-open')) return;
      const dx = l.tx - l.x, dy = l.ty - l.y;
      if (Math.abs(dx) > 0.05 || Math.abs(dy) > 0.05) { l.x += dx * 0.14; l.y += dy * 0.14; moving = true; l.el.style.setProperty('--parx', l.x.toFixed(2)); l.el.style.setProperty('--pary', l.y.toFixed(2)); }
    });
    if (moving) requestAnimationFrame(step); else ticking = false;
  }
  const kick = () => { targets(); if (!ticking) { ticking = true; requestAnimationFrame(step); } };
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick);
  kick();

  // deep link (QR on the printed card → index.html#F01)
  const id = decodeURIComponent(location.hash.slice(1)).toUpperCase();
  const target = id && $(`.stage[data-id="${id}"]`);
  if (target) setTimeout(() => target.scrollIntoView({ block: 'center' }), 200);
})();
