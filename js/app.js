'use strict';

const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function initStarfield() {
  const root = document.getElementById('starfield');
  if (!root) return;
  const starCount = innerWidth < 600 ? 90 : 160;
  for (let i = 0; i < starCount; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const size = Math.random() * 2 + 0.6;
    s.style.width = size + 'px';
    s.style.height = size + 'px';
    s.style.left = Math.random() * 100 + 'vw';
    s.style.top = Math.random() * 100 + 'vh';
    s.style.setProperty('--tw-min', String(0.1 + Math.random() * 0.25));
    s.style.setProperty('--tw-max', String(0.55 + Math.random() * 0.45));
    s.style.animationDuration = (2 + Math.random() * 4) + 's';
    s.style.animationDelay = (Math.random() * 4) + 's';
    root.appendChild(s);
  }
  if (prefersReducedMotion) return;
  function spawnShootingStar() {
    const star = document.createElement('div');
    star.className = 'shooting-star';
    const startX = Math.random() * innerWidth * 0.7;
    const startY = Math.random() * innerHeight * 0.4 - 40;
    const angle = 18 + Math.random() * 14;
    const dist = Math.max(innerWidth, innerHeight) * 0.9;
    const rad = (angle * Math.PI) / 180;
    const dx = Math.cos(rad) * dist;
    const dy = Math.sin(rad) * dist;
    star.style.left = startX + 'px';
    star.style.top = startY + 'px';
    star.style.transform = `rotate(${angle}deg)`;
    root.appendChild(star);
    const duration = 900 + Math.random() * 700;
    const anim = star.animate([
      { transform: `translate3d(0, 0, 0) rotate(${angle}deg)`, opacity: 0 },
      { transform: `translate3d(${dx * 0.06}px, ${dy * 0.06}px, 0) rotate(${angle}deg)`, opacity: 1, offset: 0.12 },
      { transform: `translate3d(${dx * 0.85}px, ${dy * 0.85}px, 0) rotate(${angle}deg)`, opacity: 1, offset: 0.75 },
      { transform: `translate3d(${dx}px, ${dy}px, 0) rotate(${angle}deg)`, opacity: 0 }
    ], { duration, easing: 'linear', fill: 'forwards' });
    anim.onfinish = () => star.remove();
  }
  function scheduleShootingStar() {
    spawnShootingStar();
    setTimeout(scheduleShootingStar, 1800 + Math.random() * 3200);
  }
  scheduleShootingStar();
}

initStarfield();

const pages = Array.from(document.querySelectorAll('.page'));
let idx = 0;
const pager = document.getElementById('pager');

function pageNum(el) {
  return el ? Number(el.dataset.page) : null;
}

function show(i) {
  cancelPress();
  const prev = idx;
  idx = (i + pages.length) % pages.length;
  if (pageNum(pages[prev]) === 3) stopScene();
  if (pageNum(pages[prev]) === 4) stopHourglass();
  pages.forEach((p, k) => {
    p.style.setProperty('--page-from', i < prev ? '-18px' : '18px');
    p.classList.toggle('page--active', k === idx);
  });
  document.querySelectorAll('[data-chapter]').forEach((button, k) => {
    if (k === idx) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  pager.textContent = (idx + 1) + ' / ' + pages.length;
  if (pageNum(pages[idx]) === 3) startScene();
  if (pageNum(pages[idx]) === 4) startHourglass();
  if (idx === 1) resizeViz();
  if (idx !== 1 && rainRunning) {
    stopRain(); rainRunning = false;
    toggleRainLabel.textContent = 'Lluvia de "Te amo"';
    toggleRainBtn.setAttribute('aria-pressed', 'false');
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
  const targetIdx = pageToTrackIndex[idx] ?? 0;
  if (tracks[targetIdx] && new URL(tracks[targetIdx].src, document.baseURI).href !== audio.src) {
    setTrack(targetIdx, { autoplay: !audio.paused, fade: true });
  }
}

document.querySelectorAll('[data-chapter]').forEach(button => button.addEventListener('click', () => show(Number(button.dataset.chapter))));

document.getElementById('prev').onclick = () => show(idx - 1);
document.getElementById('next').onclick = () => show(idx + 1);

document.addEventListener('keydown', e => {
  if (e.target.closest('input, textarea, select, [contenteditable]') || document.querySelector('.modal.show') || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'ArrowRight') show(idx + 1);
  if (e.key === 'ArrowLeft') show(idx - 1);
  if (e.key === 'm' || e.key === 'M') {
    audio.muted = !audio.muted;
  }
});

(function initSwipe() {
  let touchX = null;
  let touchY = null;
  let startTime = null;
  document.querySelectorAll('.page').forEach(p => {
    p.addEventListener('touchstart', e => {
      if (e.target.closest('button, input, [role=button]')) { touchX = null; return; }
      const t = e.changedTouches[0];
      touchX = t.clientX;
      touchY = t.clientY;
      startTime = Date.now();
    }, { passive: true });
    p.addEventListener('touchmove', e => {
      if (touchX === null) return;
      const t = e.changedTouches[0];
      const dx = Math.abs(t.clientX - touchX);
      const dy = Math.abs(t.clientY - touchY);
      if (dx > dy && dx > 20) {
        e.preventDefault();
      }
    }, { passive: false });
    p.addEventListener('touchend', e => {
      if (touchX === null) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchX;
      const dy = t.clientY - touchY;
      const elapsed = Date.now() - startTime;
      touchX = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && elapsed < 400) {
        if (dx < 0) show(idx + 1);
        else show(idx - 1);
      }
    }, { passive: true });
  });
})();

const nf = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

function pad(n) { return String(n).padStart(2, '0'); }

function plural(n, one, many) { return n === 1 ? one : many; }

function addYears(d, n) {
  const t = new Date(d);
  t.setFullYear(t.getFullYear() + n);
  return t;
}

function addMonths(d, n) {
  const t = new Date(d);
  t.setMonth(t.getMonth() + n);
  return t;
}

function diffYMDHMS(from, to) {
  if (to < from) return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  let years = to.getFullYear() - from.getFullYear();
  let anniv = addYears(from, years);
  if (anniv > to) { years--; anniv = addYears(from, years); }
  let months = to.getMonth() - anniv.getMonth();
  if (months < 0) months += 12;
  let mAnniv = addMonths(anniv, months);
  if (mAnniv > to) { months--; mAnniv = addMonths(anniv, months); }
  const ut = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  const um = Date.UTC(mAnniv.getFullYear(), mAnniv.getMonth(), mAnniv.getDate());
  let days = Math.floor((ut - um) / 86400000);
  const base = new Date(mAnniv.getFullYear(), mAnniv.getMonth(), mAnniv.getDate(),
    from.getHours(), from.getMinutes(), from.getSeconds(), 0);
  let ms = to - base - days * 86400000;
  if (ms < 0) { days--; ms += 86400000; }
  const hours = Math.floor(ms / 3600000);
  ms -= hours * 3600000;
  const minutes = Math.floor(ms / 60000);
  ms -= minutes * 60000;
  const seconds = Math.floor(ms / 1000);
  return { years, months, days, hours, minutes, seconds };
}

const Easing = {
  inQuad: t => t * t,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutCubic: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  outQuint: t => 1 - Math.pow(1 - t, 5),
  inOutQuint: t => t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2,
  outExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  inOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: t => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2),
};

const Icons = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M7 4.5v15l13-7.5-13-7.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4.5" width="4.5" height="15" rx="1"/><rect x="13.5" y="4.5" width="4.5" height="15" rx="1"/></svg>',
};

function setIcon(el, key) {
  el.innerHTML = `<span class="btn-icon__svg">${Icons[key]}</span>`;
}

const audio = new Audio();
audio.preload = 'auto';
audio.loop = true;

const playBtn = document.getElementById('playPause');
const prevBtn = document.getElementById('prevTrack');
const nextBtn = document.getElementById('nextTrack');
const volEl = document.getElementById('vol');
const nowPlaying = document.getElementById('nowPlaying');

const tracks = [
  { id: 'p1', src: 'audio/musica1.mp3', title: 'Destello...' },
  { id: 'p2', src: 'audio/musica2.mp3', title: 'I Wanna Be Yours' },
  { id: 'p3', src: 'audio/ambiente.mp3', title: 'Sparks' },
  { id: 'p4', src: 'audio/pista_p4.mp3', title: 'Apocalypse' },
];

const pageToTrackIndex = { 0: 0, 1: 1, 2: 2, 3: 3, 4: 0 };

let currentIdx = 0;
let isFading = false;

let savedVol = null;
try { savedVol = localStorage.getItem('love.vol'); } catch {}
if (savedVol !== null && Number.isFinite(Number(savedVol))) volEl.value = Math.max(0, Math.min(1, Number(savedVol)));
audio.volume = Number(volEl.value);

function uiUpdatePlaying(playing) {
  setIcon(playBtn, playing ? 'pause' : 'play');
  playBtn.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
}

uiUpdatePlaying(false);

// A transition belongs to one track request; a newer request cancels it.
let fadeTimer = null;
let trackVersion = 0;
function setTrack(i, { autoplay = true, fade = true } = {}) {
  currentIdx = (i + tracks.length) % tracks.length;
  const track = tracks[currentIdx];
  nowPlaying.textContent = track.title;
  crossfadeTo(track.src, autoplay, fade);
}
function crossfadeTo(src, autoplay = true, fade = true) {
  const version = ++trackVersion;
  clearInterval(fadeTimer);
  isFading = false;
  const load = () => {
    audio.pause();
    audio.src = src;
    audio.volume = Number(volEl.value);
    uiUpdatePlaying(false);
    if (!autoplay) return;
    audio.play().then(() => {
      if (version === trackVersion) uiUpdatePlaying(true);
    }).catch(() => { if (version === trackVersion) uiUpdatePlaying(false); });
  };
  if (!fade || audio.paused || !autoplay) { load(); return; }
  isFading = true;
  fadeTimer = setInterval(() => {
    audio.volume = Math.max(0, audio.volume - 0.12);
    if (audio.volume <= 0.01) {
      clearInterval(fadeTimer); isFading = false; load();
    }
  }, 40);
}

playBtn.addEventListener('click', async () => {
  if (isFading) {
    clearInterval(fadeTimer); isFading = false; ++trackVersion;
    audio.pause(); audio.src = tracks[currentIdx].src;
    audio.volume = Number(volEl.value); uiUpdatePlaying(false); return;
  }
  if (audio.src === '') {
    setTrack(currentIdx, { autoplay: true, fade: false });
    return;
  }
  if (audio.paused) {
    try {
      await audio.play();
      uiUpdatePlaying(true);
    } catch (e) {
      uiUpdatePlaying(false);
    }
  } else {
    audio.pause();
    uiUpdatePlaying(false);
  }
});

prevBtn.addEventListener('click', () => setTrack(currentIdx - 1));
nextBtn.addEventListener('click', () => setTrack(currentIdx + 1));

volEl.addEventListener('input', () => {
  audio.volume = Number(volEl.value);
  try { localStorage.setItem('love.vol', volEl.value); } catch {}
});

const sinceEl = document.getElementById('since');
const lineEl = document.getElementById('line');
const unitsEl = document.getElementById('units');
const totalDaysEl = document.getElementById('totalDays');
const totalHoursEl = document.getElementById('totalHours');
const totalSecondsEl = document.getElementById('totalSeconds');
const heartBeatsEl = document.getElementById('heartBeats');
const earthOrbitsEl = document.getElementById('earthOrbits');
const galaxyOrbitEl = document.getElementById('galaxyOrbit');
const laughSecondsEl = document.getElementById('laughSeconds');

const start = new Date(2022, 11, 10, 0, 0, 0);
sinceEl.textContent = `Contando desde: ${start.toLocaleString('es-CL')}`;

function renderCounter() {
  const now = new Date();
  const d = diffYMDHMS(start, now);
  lineEl.textContent = `${d.years} ${plural(d.years, 'año', 'años')}, ${d.months} ${plural(d.months, 'mes', 'meses')}, ${d.days} ${plural(d.days, 'día', 'días')}`;
  unitsEl.innerHTML = '';
  for (const t of [`${pad(d.hours)} h`, `${pad(d.minutes)} min`, `${pad(d.seconds)} s`]) {
    const span = document.createElement('span');
    span.className = 'chip';
    span.textContent = t;
    unitsEl.appendChild(span);
  }
  const ms = now - start;
  const totalSeconds = Math.floor(ms / 1000);
  const totalHours = Math.floor(ms / 3600000);
  const totalDays = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
    Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000);
  totalSecondsEl.textContent = nf.format(totalSeconds);
  totalHoursEl.textContent = nf.format(totalHours);
  totalDaysEl.textContent = nf.format(totalDays);
  const avgBpm = 75 / 60;
  heartBeatsEl.textContent = nf.format(Math.floor(totalSeconds * avgBpm));
  earthOrbitsEl.textContent = ((ms / (365.25 * 24 * 3600 * 1000)).toFixed(6));
  galaxyOrbitEl.textContent = ((ms / (230e6 * 365.25 * 24 * 3600 * 1000)).toExponential(3));
  laughSecondsEl.textContent = nf.format(Math.floor((totalDays) * 3 * 60));
}

renderCounter();
setInterval(renderCounter, 1000);

const loveLetter = `
Amor mío,

Desde que llegaste a mi vida, el universo dejó de ser un lugar inmenso y vacío para convertirse en un mapa lleno de estrellas que me guían siempre hacia ti. Eres mi constelación favorita, mi planeta habitable, la órbita en la que quiero quedarme para siempre. Si el cosmos parece infinito, mi amor por ti lo supera; porque por más lejos que miremos, no hay límite para lo que siento.

Tú eres mi Big Bang personal: el inicio de todo lo bueno, el origen de cada alegría, la energía que da vida a mis días. Y aunque allá afuera existan millones de galaxias, ninguna brilla tanto como la luz que encuentro en tu sonrisa.

Si pudiera escribir nuestro amor en lenguaje de programación, sería un while(true){ teAmo++; } —un bucle infinito, sin condiciones de salida. Cada latido es una línea de código que se ejecuta sin error, cada mirada es un commit importante en este repositorio que llamamos vida. Tú eres mi mejor algoritmo, optimizado sin que yo lo buscara, y la función que siempre devuelve felicidad.

Eres mi variable constante, la que no cambia aunque todo alrededor se altere. Eres mi sistema operativo estable, mi backup seguro en los días inciertos, mi interfaz más amigable. Y si algún día el mundo hiciera "crash", yo reiniciaría mil veces solo para volver a encontrarte.

En tus ojos veo nebulosas, en tu risa escucho la música de las estrellas, en tu abrazo siento la gravedad que me mantiene en pie. Y aunque el universo siga expandiéndose, mi amor por ti siempre irá más rápido que la luz. Porque mientras la ciencia dice que nada supera esa velocidad, yo sé que lo que siento rompe todas las leyes conocidas.

Quiero ser tu astronauta eterno, viajando contigo por todos los sistemas estelares que aún nos faltan descubrir. Y también quiero ser tu programador fiel, depurando los errores, compilando sueños y ejecutando proyectos donde tú siempre seas la protagonista.

Lo único que sé con certeza es que no hay final: ni en el espacio, ni en el tiempo, ni en la memoria de este corazón que late por ti. Cada día a tu lado es como lanzar una nueva versión mejorada de mí mismo, y cada noche es un release estable lleno de paz.

Tú eres mi universo entero, mi ecuación perfecta, mi código más bello y mi galaxia infinita.

Hoy, mañana y siempre: mi amor por ti no tiene fin, porque este loop nunca se romperá.
`;

const secretHeart = document.getElementById('secretHeart');
const letterModal = document.getElementById('loveLetterModal');
const letterTextEl = document.getElementById('loveLetterText');

let pressTimer = null;

function openLetter() {
  cancelPress();
  letterTextEl.replaceChildren(...loveLetter.trim().split(/\n\s*\n/).map(text => {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    return paragraph;
  }));
  openModal(letterModal, { duck: true });
}

function closeLetter() {
  closeModal(letterModal);
}

letterModal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeLetter));

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && letterModal.classList.contains('show')) closeLetter();
});

function startPress() {
  if (pressTimer) return;
  secretHeart.classList.add('is-holding');
  pressTimer = setTimeout(() => {
    openLetter();
    pressTimer = null;
  }, 2000);
}

function cancelPress() {
  secretHeart.classList.remove('is-holding');
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
}

secretHeart.addEventListener('pointerdown', startPress);
secretHeart.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!e.repeat) openLetter(); } });
secretHeart.addEventListener('keyup', cancelPress);
secretHeart.addEventListener('blur', cancelPress);
['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => secretHeart.addEventListener(ev, cancelPress));

const finalMessage = `Hay momentos en los que el cansancio parece ganar y el camino se siente demasiado cuesta arriba. Cuando estés en uno de esos días, lee esto: todo el esfuerzo que estás invirtiendo ahora está construyendo a la persona que serás mañana. Las tormentas y los días pesados no están ahí para detenerte, sino para demostrarte de qué estás hecha. Tómate un respiro si lo necesitas, respira profundo, pero no dejes de avanzar. Confía en tu proceso; tienes una capacidad inmensa para lograr lo que te propongas.`;

const finalMessageModal = document.getElementById('finalMessageModal');
const finalMessageText = document.getElementById('finalMessageText');
const secretHeartFinal = document.getElementById('secretHeartFinal');

function openFinalMessage() {
  finalMessageText.textContent = finalMessage.trim();
  finalMessageModal.classList.add('show');
  finalMessageModal.setAttribute('aria-hidden', 'false');
  try { audio.volume = Math.max(0, audio.volume - 0.3); } catch (e) { }
}

function closeFinalMessage() {
  finalMessageModal.classList.remove('show');
  finalMessageModal.setAttribute('aria-hidden', 'true');
  try { audio.volume = Number(volEl.value); } catch (e) { }
}

finalMessageModal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeFinalMessage));

secretHeartFinal.addEventListener('click', () => {
  show(0);
  closeFinalMessage();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && finalMessageModal.classList.contains('show')) closeFinalMessage();
});

const loveWords = [
  ["Te amo", "Español"],
  ["I love you", "English"],
  ["Je t'aime", "Français"],
  ["Ti amo", "Italiano"],
  ["Ich liebe dich", "Deutsch"],
  ["Eu te amo", "Português"],
  ["愛してる", "日本語"],
  ["사랑해", "한국어"],
  ["我爱你", "中文"],
  ["Я тебя люблю", "Русский"],
  ["أحبك", "العربية"],
  ["Te iubesc", "Română"],
  ["Seni seviyorum", "Türkçe"],
  ["Ik hou van jou", "Nederlands"],
  ["Σ' αγαπώ", "Ελληνικά"],
  ["Aku cinta kamu", "Indonesia"],
  ["Aš tave myliu", "Lietuvių"],
  ["Kocham Cię", "Polski"],
  ["Ég elska þig", "Íslenska"],
  ["Te sakam", "Македонски"],
  ["मैं तुमसे प्यार करता हूँ", "हिन्दी"],
  ["Mwen renmen ou", "Kreyòl"],
  ["Ngiyakuthanda", "Zulu"],
  ["Ndagukunda", "Kinyarwanda"],
  ["Aloha wau iā 'oe", "ʻŌlelo Hawaiʻi"],
  ["Te dua", "Shqip"],
  ["Volim te", "Hrvatski"],
  ["Milujĕ tě", "Čeština"]
];

const loveGrid = document.getElementById('loveGrid');

loveWords.forEach(w => {
  const d = document.createElement('button');
  d.type = 'button';
  d.className = 'love';
  d.innerHTML = `${w[0]} <small>${w[1]}</small>`;
  d.addEventListener('click', () => addReason(`${w[0]} — por ${randomReasonFragment()}`));
  loveGrid.appendChild(d);
});

const defaultReasons = [
  "cómo iluminas mis días con una sonrisa",
  "lo valiente que eres incluso cuando dudas",
  "tus abrazos que curan todo",
  "tu risa que hace música en mi mundo",
  "tu forma de mirar, tan honesta",
  "tu paciencia en los días difíciles",
  "tu locura linda que me contagia",
  "que sueñas grande y me invitas a soñar",
  "tu ternura en los detalles",
  "la paz que encuentro en tu voz"
];

function randomReasonFragment() {
  return defaultReasons[Math.floor(Math.random() * defaultReasons.length)];
}

const reasonsEl = document.getElementById('reasons');

function addReason(t) {
  const r = document.createElement('div');
  r.className = 'reason';
  r.textContent = t;
  reasonsEl.prepend(r);
}

defaultReasons.forEach(r => addReason(`Te amo por ${r}`));

let rainRunning = false;
let rainTimer = null;
const toggleRainBtn = document.getElementById('toggleRain');
const toggleRainLabel = document.getElementById('toggleRainLabel');

toggleRainBtn.onclick = () => {
  rainRunning = !rainRunning;
  toggleRainBtn.setAttribute('aria-pressed', String(rainRunning));
  toggleRainLabel.textContent = rainRunning ? 'Detener lluvia' : 'Lluvia de "Te amo"';
  if (rainRunning) {
    startRain();
  } else {
    stopRain();
  }
};

function startRain() {
  rainTimer = setInterval(() => {
    const el = document.createElement('div');
    el.className = 'rain-drop';
    el.textContent = "Te amo";
    const leftVw = Math.random() * 100;
    const rot0 = (Math.random() * 14 - 7);
    const rot1 = (Math.random() * 14 - 7);
    el.style.left = leftVw + 'vw';
    el.style.opacity = String(0.7 + Math.random() * 0.3);
    el.style.fontSize = (16 + Math.random() * 20) + 'px';
    document.body.appendChild(el);
    const duration = 6000 + Math.random() * 4000;
    const fallDistance = Math.round(innerHeight + 80);
    const anim = el.animate([
      { transform: `translate3d(0, 0, 0) rotate(${rot0}deg)`, offset: 0 },
      { transform: `translate3d(0, ${fallDistance}px, 0) rotate(${rot1}deg)`, offset: 1 }
    ], { duration, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'forwards' });
    anim.onfinish = () => el.remove();
    if (prefersReducedMotion) {
      anim.finish();
    }
  }, 250);
}

function stopRain() {
  clearInterval(rainTimer);
  rainTimer = null;
  document.querySelectorAll('.rain-drop').forEach(d => d.remove());
}

let audioCtx = null;
let analyser = null;
let vizData = null;
const vizCanvas = document.getElementById('vizCanvas');
const vctx = vizCanvas.getContext('2d');

function resizeViz() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  vizCanvas.width = Math.round(vizCanvas.clientWidth * dpr);
  vizCanvas.height = Math.round(vizCanvas.clientHeight * dpr);
  vctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

addEventListener('resize', resizeViz);
resizeViz();

function ensureAnalyser() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const src = audioCtx.createMediaElementSource(audio);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  src.connect(analyser);
  analyser.connect(audioCtx.destination);
  vizData = new Uint8Array(analyser.frequencyBinCount);
  requestAnimationFrame(vizLoop);
}

function vizLoop() {
  if (analyser) {
    analyser.getByteFrequencyData(vizData);
    const w = vizCanvas.clientWidth;
    const h = vizCanvas.clientHeight;
    vctx.clearRect(0, 0, w, h);
    const barW = w / vizData.length;
    for (let i = 0; i < vizData.length; i++) {
      const bh = (vizData[i] / 255) * h;
      vctx.fillStyle = 'rgba(166, 132, 255, 0.55)';
      vctx.fillRect(i * barW, h - bh, barW * 0.9, bh);
    }
  }
  requestAnimationFrame(vizLoop);
}

audio.addEventListener('play', () => {
  ensureAnalyser();
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  uiUpdatePlaying(true);
});
audio.addEventListener('pause', () => uiUpdatePlaying(false));
audio.addEventListener('error', () => { uiUpdatePlaying(false); nowPlaying.textContent = 'No se pudo cargar la pista'; });

// Stable, time-based renderers shared by the two canvas experiences.
const clamp01 = value => Math.max(0, Math.min(1, value));
const smooth = value => { const t = clamp01(value); return t * t * (3 - 2 * t); };
function seededRandom(seed) {
  return () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
}

function canvasPlayback(canvas, draw) {
  const context = canvas.getContext('2d');
  const state = { time: 0, width: 1, height: 1, active: false, paused: false, dpr: 1 };
  let frame = 0, last = 0;
  const blocked = () => document.hidden || !!document.querySelector('.modal.show');
  function size() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    state.width = rect.width; state.height = rect.height;
    state.dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(rect.width * state.dpr), h = Math.round(rect.height * state.dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    return true;
  }
  function paint(dt = 0) {
    context.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    context.clearRect(0, 0, state.width, state.height);
    draw(context, state, dt);
  }
  function tick(now) {
    frame = 0;
    if (!state.active || state.paused || blocked() || prefersReducedMotion) return;
    const dt = Math.min((now - last) / 1000, 0.08);
    last = now; state.time += dt; paint(dt);
    frame = requestAnimationFrame(tick);
  }
  function sync() {
    cancelAnimationFrame(frame); frame = 0;
    if (!state.active || !size()) return;
    paint(); last = performance.now();
    if (!state.paused && !blocked() && !prefersReducedMotion) frame = requestAnimationFrame(tick);
  }
  new ResizeObserver(sync).observe(canvas);
  document.addEventListener('visibilitychange', sync);
  document.addEventListener('album:modalchange', sync);
  return {
    state,
    start(time = 0) { state.time = time; state.active = true; state.paused = false; sync(); },
    stop() { state.active = false; cancelAnimationFrame(frame); frame = 0; },
    seek(time) { state.time = time; sync(); },
    pause() { state.paused = !state.paused; sync(); return state.paused; },
    refresh: sync,
  };
}

const scene = document.getElementById('scene');
const overlayText = document.getElementById('overlayText');
const sceneStage = document.getElementById('sceneStage');
const secret = 'amor';
let secretStarUnlocked = false;
const spaceRandom = seededRandom(12102022);
const spaceStars = Array.from({ length: 260 }, () => ({
  x: spaceRandom(), y: spaceRandom(), depth: .2 + spaceRandom() * .8,
  radius: .4 + spaceRandom() * 1.15, phase: spaceRandom() * Math.PI * 2,
}));
const galaxyLocations = Array.from({ length: 65 }, (_, i) => {
  const angle = spaceRandom() * Math.PI * 2, r = Math.sqrt(spaceRandom());
  return { x: Math.cos(angle) * r, y: Math.sin(angle) * r, size: .025 + spaceRandom() * .05,
    angle: spaceRandom() * Math.PI, phase: i * .9 };
});

// Expensive textures are drawn once, never randomized during animation.
function createGalaxyTexture() {
  const texture = document.createElement('canvas'); texture.width = 600; texture.height = 400;
  const ctx = texture.getContext('2d'), random = seededRandom(428);
  ctx.translate(300, 200);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 185);
  glow.addColorStop(0, 'rgba(255,224,184,.7)'); glow.addColorStop(.22, 'rgba(182,147,224,.25)'); glow.addColorStop(1, 'rgba(90,90,200,0)');
  ctx.save(); ctx.scale(1.4, .48); ctx.fillStyle = glow; ctx.fillRect(-300,-300,600,600); ctx.restore();
  for (let i = 0; i < 2000; i++) {
    const r = Math.pow(random(), .62) * 245;
    const angle = (i % 3) * Math.PI * 2 / 3 + r * .023 + (random() - .5) * .6;
    const x = Math.cos(angle) * r, y = Math.sin(angle) * r * .43 + (random() - .5) * 10;
    ctx.fillStyle = r < 65 ? `rgba(255,231,196,${.3 + random() * .65})` : `rgba(185,192,255,${.15 + random() * .65})`;
    ctx.beginPath(); ctx.arc(x, y, .35 + random() * 1.15, 0, Math.PI * 2); ctx.fill();
  }
  return texture;
}
function createEarthTexture() {
  const texture=document.createElement('canvas');texture.width=texture.height=420;
  const ctx=texture.getContext('2d'),mask=document.createElement('canvas');mask.width=mask.height=420;
  const m=mask.getContext('2d');m.translate(210,210);m.scale(190,190);m.fillStyle='#fff';
  const continents=[
    [[-.99,-.4],[-.88,-.65],[-.69,-.75],[-.53,-.68],[-.37,-.8],[-.16,-.7],[-.1,-.57],[-.24,-.51],[-.21,-.35],[-.33,-.2],[-.36,-.05],[-.23,.08],[-.36,.1],[-.52,-.1],[-.65,-.18],[-.69,-.36]],
    [[-.37,.08],[-.18,.11],[-.06,.25],[.01,.35],[-.12,.54],[-.16,.7],[-.29,.92],[-.35,.74],[-.39,.59],[-.42,.43],[-.52,.23]],
    [[.08,-.52],[.2,-.6],[.15,-.78],[.4,-.89],[.69,-.74],[.89,-.64],[1,-.46],[.82,-.33],[.96,-.25],[.84,-.03],[.66,-.12],[.53,-.29],[.4,-.23],[.33,-.42],[.18,-.38]],
    [[.16,-.31],[.42,-.27],[.59,-.11],[.5,.01],[.42,.16],[.42,.29],[.28,.49],[.17,.27],[.16,.09],[.03,-.05]],
    [[.68,.44],[.88,.33],[1,.42],[.96,.62],[.82,.67],[.67,.58]],
    [[-.45,-.97],[-.22,-.96],[-.15,-.86],[-.29,-.74]],
  ];
  for(const points of continents){
    m.beginPath();const first=points[0],last=points.at(-1);m.moveTo((first[0]+last[0])/2,(first[1]+last[1])/2);
    points.forEach((p,i)=>{const next=points[(i+1)%points.length];m.quadraticCurveTo(p[0],p[1],(p[0]+next[0])/2,(p[1]+next[1])/2);});m.closePath();m.fill();
  }
  const maskData=m.getImageData(0,0,420,420).data,pixels=ctx.createImageData(420,420);
  const hash=(x,y)=>{let n=Math.imul(x,374761393)+Math.imul(y,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
  function noise(x,y){
    const ix=Math.floor(x),iy=Math.floor(y),fx=smooth(x-ix),fy=smooth(y-iy);
    const a=hash(ix,iy)*(1-fx)+hash(ix+1,iy)*fx,b=hash(ix,iy+1)*(1-fx)+hash(ix+1,iy+1)*fx;
    return a*(1-fy)+b*fy;
  }
  function terrain(x,y){return noise(x,y)*.55+noise(x*2,y*2)*.27+noise(x*4,y*4)*.13+noise(x*8,y*8)*.05;}
  for(let py=20;py<400;py++)for(let px=20;px<400;px++){
    const x=(px-210)/190,y=(py-210)/190,rr=x*x+y*y;if(rr>1)continue;
    const z=Math.sqrt(1-rr),u=Math.atan2(x,z),v=Math.asin(y),index=(py*420+px)*4;
    const detail=terrain(u*9+20,v*9+20),land=maskData[index+3]/255;
    const arid=Math.max(0,1-Math.abs(y+.16)*4)*noise(u*7+40,v*7+10);
    let red=(12+detail*15)*(1-land)+(48+detail*43+arid*60)*land;
    let green=(49+detail*24)*(1-land)+(81+detail*48+arid*27)*land;
    let blue=(83+detail*29)*(1-land)+(69+detail*31-arid*9)*land;
    const warp=noise(u*4+21,v*4+7)*1.4;
    const cloud=clamp01((terrain(u*6+warp+63,v*10-warp+28)-.52)*4.4);
    const ice=clamp01((Math.abs(y)-.9)*10);
    const white=Math.max(cloud*.87,ice*.8);
    red=red*(1-white)+235*white;green=green*(1-white)+245*white;blue=blue*(1-white)+251*white;
    const light=.16+.84*clamp01(-x*.65-y*.45+z*.62);
    const rim=Math.pow(1-z,5)*20;
    pixels.data[index]=red*light;pixels.data[index+1]=green*light+rim*.7;pixels.data[index+2]=blue*light+rim;
    pixels.data[index+3]=Math.round(clamp01((1-Math.sqrt(rr))*190)*255);
  }
  ctx.putImageData(pixels,0,0);return texture;
}
let galaxyTexture, earthTexture;
function halo(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,color); g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(x-r,y-r,r*2,r*2);
}
function drawSpaceBackground(ctx, s) {
  const { width: w, height: h, time: t } = s;
  ctx.fillStyle = '#080812'; ctx.fillRect(0,0,w,h);
  halo(ctx,w*.22,h*.32,Math.max(w,h)*.7,'rgba(62,32,104,.36)');
  halo(ctx,w*.83,h*.6,Math.max(w,h)*.55,'rgba(15,63,85,.24)');
  for (const star of spaceStars) {
    const dx = Math.sin(t*.025+star.phase) * 9 * star.depth;
    ctx.globalAlpha = .25 + star.depth * .4 + Math.sin(t*.8+star.phase)*.12;
    ctx.fillStyle = star.depth > .8 ? '#f4ddbb' : '#d5e3ff';
    ctx.beginPath(); ctx.arc(star.x*w+dx,star.y*h,star.radius,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (t < 11 && !prefersReducedMotion) {
    const phase = (t % 3.6) / 1.1;
    if (phase < 1) {
      const n = Math.floor(t/3.6), x = w*(-.1+phase*.9), y = h*(.15+n*.09+phase*.3);
      const tail = Math.min(w*.22,100), g = ctx.createLinearGradient(x-tail,y-tail*.34,x,y);
      g.addColorStop(0,'rgba(218,230,255,0)'); g.addColorStop(1,'rgba(239,241,255,.9)');
      ctx.strokeStyle = g; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x-tail,y-tail*.34); ctx.lineTo(x,y); ctx.stroke();
      halo(ctx,x,y,8,'rgba(236,234,255,.5)');
    }
  }
}
function drawGlobe(ctx, radius, t) {
  halo(ctx,0,0,radius*1.24,'rgba(49,142,214,.4)');
  ctx.save(); ctx.rotate(Math.sin(t*.08)*.04); ctx.drawImage(earthTexture,-radius*1.1,-radius*1.1,radius*2.2,radius*2.2); ctx.restore();
  ctx.strokeStyle = 'rgba(131,214,255,.7)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0,0,radius,0,Math.PI*2); ctx.stroke();
}
function drawGalaxy(ctx,x,y,r,angle=0,alpha=1) {
  ctx.save(); ctx.translate(x,y); ctx.rotate(angle); ctx.globalAlpha *= alpha;
  ctx.drawImage(galaxyTexture,-r,-r*2/3,r*2,r*4/3); ctx.restore();
}
function drawUniverse(ctx,r,t) {
  halo(ctx,0,0,r*1.2,'rgba(118,66,139,.28)');
  ctx.strokeStyle = 'rgba(160,146,216,.15)'; ctx.lineWidth = .8;
  for (let i=0;i<4;i++) {
    ctx.beginPath(); ctx.ellipse(0,0,r,r*(.22+i*.2),Math.PI*i/4,0,Math.PI*2); ctx.stroke();
  }
  for (const p of galaxyLocations) {
    ctx.fillStyle = 'rgba(191,196,236,.5)'; ctx.beginPath(); ctx.arc(p.x*r,p.y*r,p.size*18,0,Math.PI*2); ctx.fill();
  }
  ctx.save(); ctx.scale(r*.044,r*.044);
  ctx.beginPath();
  const points=[];
  for(let i=0;i<=100;i++) {
    const a=i/100*Math.PI*2;
    const x=16*Math.sin(a)**3, y=-(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a));
    points.push([x,y]); i?ctx.lineTo(x,y):ctx.moveTo(x,y);
  }
  ctx.closePath(); ctx.fillStyle='rgba(244,151,188,.08)'; ctx.fill();
  ctx.strokeStyle='rgba(247,188,211,.65)'; ctx.lineWidth=.14; ctx.stroke();
  for(let i=0;i<points.length;i+=3) {
    const [x,y]=points[i]; ctx.fillStyle=`rgba(255,216,225,${.55+.4*Math.sin(t+i)**2})`;
    ctx.beginPath(); ctx.arc(x,y,i%9===0?.37:.18,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}
function drawSpaceObject(ctx, stage, radius, time, local) {
  if(stage===0) { drawGlobe(ctx,radius*(1-.35*smooth(local)),time); return; }
  if(stage===1) {
    for(let i=0;i<7;i++) {
      const orbit=radius*(.21+i*.125);
      ctx.strokeStyle='rgba(180,190,220,.18)'; ctx.lineWidth=.8;
      ctx.beginPath(); ctx.ellipse(0,0,orbit,orbit*.62,-.16,0,Math.PI*2);ctx.stroke();
      const a=time*(.24/(1+i*.35))+i*1.8, x=Math.cos(a)*orbit, y=Math.sin(a)*orbit*.62;
      ctx.save();ctx.rotate(-.16);ctx.translate(x,y);
      if(i===2) drawGlobe(ctx,Math.max(3,radius*.035),time);
      else {ctx.fillStyle=['#b0ada4','#ddbf99','#65a6cf','#c98360','#d4b99a','#dcd5b6','#8badbd'][i];ctx.beginPath();ctx.arc(0,0,Math.max(1.8,radius*(i===4?.045:.022)),0,Math.PI*2);ctx.fill();}
      ctx.restore();
    }
    halo(ctx,0,0,radius*.3,'rgba(253,179,86,.55)');
    const sun=ctx.createRadialGradient(-3,-3,0,0,0,radius*.075);sun.addColorStop(0,'#fff7d4');sun.addColorStop(1,'#eca05a');
    ctx.fillStyle=sun;ctx.beginPath();ctx.arc(0,0,radius*.075,0,Math.PI*2);ctx.fill();return;
  }
  if(stage===2) {drawGalaxy(ctx,0,0,radius*1.3,-.28+time*.008);return;}
  if(stage===3 || stage===4) {
    const count=stage===3?18:65;
    for(let i=0;i<count;i++) {
      const p=galaxyLocations[i];
      const x=stage===3?p.x:Math.sin(p.y*4+p.phase*.12)*.58+p.x*.34;
      drawGalaxy(ctx,x*radius,p.y*radius*.88,radius*p.size*(stage===3?2.2:.8),p.angle,.5+(i%3)*.2);
    }
    if(stage===3) {drawGalaxy(ctx,-radius*.27,radius*.16,radius*.35,-.3);drawGalaxy(ctx,radius*.28,-radius*.23,radius*.4,.35);}
    return;
  }
  drawUniverse(ctx,radius*.87,time);
}
const journeyNames=['Tierra','Sistema Solar','Vía Láctea','Grupo Local','Supercúmulo de Virgo','Universo observable'];
let lastSceneCopy='';
function renderScene(ctx,s) {
  if(!galaxyTexture) {galaxyTexture=createGalaxyTexture();earthTexture=createEarthTexture();}
  drawSpaceBackground(ctx,s);
  const t=s.time, stage=t<11?-1:Math.min(5,Math.floor((t-11)/6));
  let title='Bajo las estrellas', message='';
  if(t<3) message='';
  else if(t<6) message='pide un deseo..';
  else if(t<11) message='yo ya pedí el mío y eres tú, lo mejor que me pudo pasar';
  else {title=journeyNames[stage];if(stage===5)message='mi amor por ti es más grande que todo esto';}
  const copy=title+'|'+message;
  if(copy!==lastSceneCopy) {
    lastSceneCopy=copy;sceneStage.textContent=title;overlayText.textContent=message;
    overlayText.classList.toggle('show',!!message);
    scene.setAttribute('aria-label',title+(message?'. '+message:''));
    document.querySelectorAll('[data-scene-time]').forEach((button,i)=>{
      if(i===stage) button.setAttribute('aria-current','step'); else button.removeAttribute('aria-current');
    });
  }
  if(stage<0) return;
  const local=stage===5?1:((t-11)%6)/6;
  const transition=stage===5?0:smooth((local-.72)/.28);
  const r=Math.min(s.width*.37,s.height*.31);
  ctx.save();ctx.translate(s.width/2,s.height*.45);
  ctx.globalAlpha=stage===0?smooth((t-11)/1.2)*(1-transition):1-transition;
  drawSpaceObject(ctx,stage,r,t,local);
  if(transition>0) {ctx.globalAlpha=transition;drawSpaceObject(ctx,stage+1,r,t,0);}
  ctx.restore();
}
const scenePlayback=canvasPlayback(scene,renderScene);
const pauseSceneButton=document.getElementById('pauseScene');
function syncScenePause() {
  pauseSceneButton.disabled=prefersReducedMotion;
  pauseSceneButton.textContent=prefersReducedMotion?'Movimiento reducido':scenePlayback.state.paused?'Reanudar viaje':'Pausar viaje';
  pauseSceneButton.setAttribute('aria-pressed',String(scenePlayback.state.paused));
}
function startScene() {lastSceneCopy='';scenePlayback.start(prefersReducedMotion?42:0);syncScenePause();}
function stopScene() {scenePlayback.stop();}
function finishScene() {scenePlayback.seek(42);}
pauseSceneButton.addEventListener('click',()=>{scenePlayback.pause();syncScenePause();});
document.querySelectorAll('[data-scene-time]').forEach(button=>button.addEventListener('click',()=>scenePlayback.seek(Number(button.dataset.sceneTime)+1.3)));
document.getElementById('btnShot').onclick=()=>{
  const output=document.createElement('canvas');output.width=scene.width;output.height=scene.height+160*scenePlayback.state.dpr;
  const ctx=output.getContext('2d'),dpr=scenePlayback.state.dpr,w=scenePlayback.state.width,h=scenePlayback.state.height;
  ctx.fillStyle='#080812';ctx.fillRect(0,0,output.width,output.height);ctx.drawImage(scene,0,0);
  ctx.scale(dpr,dpr);ctx.fillStyle='#f7eafa';ctx.textAlign='center';ctx.font='22px Georgia';ctx.fillText(sceneStage.textContent,w/2,32,w-32);
  ctx.font='italic 18px Georgia';let line='',y=h+34;
  for(const word of overlayText.textContent.split(' ')) {
    const next=line?line+' '+word:word;
    if(line && ctx.measureText(next).width>w-40){ctx.fillText(line,w/2,y);y+=26;line=word;}else line=next;
  }
  if(line)ctx.fillText(line,w/2,y);
  const link=document.createElement('a');link.download='bajo-las-estrellas.png';link.href=output.toDataURL('image/png');link.click();
};

function normalizePhrase(v) {
  return v.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

const secretForm = document.getElementById('secretForm');
const secretInput = document.getElementById('secretWord');
const secretFeedback = document.getElementById('secretFeedback');

secretForm.addEventListener('submit', e => {
  e.preventDefault();
  const guess = normalizePhrase(secretInput.value);
  secretFeedback.classList.remove('ok', 'err');
  if (!guess) {
    secretFeedback.textContent = 'Escribe la palabra para descubrir la sorpresa.';
    secretInput.focus();
    return;
  }
  if (guess === secret) {
    unlockConstellation();
    secretFeedback.textContent = 'Has abierto nuestra constelación.';
    secretFeedback.classList.add('ok');
    secretInput.value = '';
  } else {
    secretFeedback.textContent = 'Esa no es la palabra secreta, intenta otra vez';
    secretFeedback.classList.add('err');
    secretInput.classList.remove('shake');
    void secretInput.offsetWidth;
    secretInput.classList.add('shake');
  }
});

const qrModal = document.getElementById('qrModal');
const qrUrlEl = document.getElementById('qrUrl');
const qrImg = document.getElementById('qrImg');

function openModal(modalEl, opts = {}) {
  if (modalEl.classList.contains('show')) return;
  modalEl._returnFocus = document.activeElement;
  modalEl.classList.add('show');
  modalEl.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  modalEl.querySelector('button')?.focus();
  document.dispatchEvent(new Event('album:modalchange'));
  if (opts.duck) {
    try { audio.volume = Math.max(0, audio.volume - 0.3); } catch (e) { }
  }
}

function closeModal(modalEl) {
  if (!modalEl.classList.contains('show')) return;
  modalEl.classList.remove('show');
  document.body.classList.remove('modal-open');
  modalEl._returnFocus?.focus();
  modalEl.setAttribute('aria-hidden', 'true');
  document.dispatchEvent(new Event('album:modalchange'));
  try { audio.volume = Number(volEl.value); } catch (e) { }
}

document.getElementById('btnQR').onclick = () => {
  const url = location.href;
  qrUrlEl.textContent = url;
  const api = "https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=" + encodeURIComponent(url);
  qrImg.src = api;
  openModal(qrModal);
};

document.getElementById('copyUrl').onclick = async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    alert('Enlace copiado');
  } catch (e) {
    alert(location.href);
  }
};

const hourglassWrap=document.getElementById('hourglass');
const hgCanvas=document.getElementById('hgCanvas');
const hgMsg2=document.getElementById('hgMsg2');
const pauseSandButton=document.getElementById('pauseHourglass');
const sandStatus=document.getElementById('sandStatus');
const SAND_TOTAL=.82, SAND_RATE=SAND_TOTAL/28, FLIP_SECONDS=1.4;
const sandRandom=seededRandom(1012);
const sandSpecks=Array.from({length:360},()=>({x:(sandRandom()-.5)*1.35,y:(sandRandom()-.5)*2,size:.0015+sandRandom()*.003,bright:sandRandom()>.55}));
const upperBulb=[];
function glassWidth(y){return .035+.59*Math.pow(Math.sin(Math.abs(y)*Math.PI/2),1.65);}
for(let i=0;i<=48;i++){const y=-1+i*.96/48;upperBulb.push({x:glassWidth(y),y});}
for(let i=48;i>=0;i--){const y=-1+i*.96/48;upperBulb.push({x:-glassWidth(y),y});}
const lowerBulb=upperBulb.map(p=>({x:-p.x,y:-p.y}));
let sandTop=SAND_TOTAL, flipTime=-1, settleTime=0, revealedInfinity=false, lastSandStatus='';
function polygonArea(points){
  let sum=0;
  for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];sum+=a.x*b.y-b.x*a.y;}
  return Math.abs(sum)/2;
}
// Two gravity-aligned slopes form a small pile without creating or losing sand.
function clipHalfPlane(points,distance){
  const result=[];
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length],da=distance(a),db=distance(b);
    if(da>=0)result.push(a);
    if((da>=0)!==(db>=0)){const ratio=da/(da-db);result.push({x:a.x+(b.x-a.x)*ratio,y:a.y+(b.y-a.y)*ratio});}
  }
  return result;
}
function pileRegions(points,line){
  return [-1,1].map(side=>clipHalfPlane(clipHalfPlane(points,p=>p.x*side),p=>p.y-line-.19*p.x*side));
}
function sandSurface(points,fraction){
  const target=polygonArea(points)*clamp01(fraction);
  let low=Math.min(...points.map(p=>p.y))-.3,high=Math.max(...points.map(p=>p.y));
  for(let i=0;i<22;i++){const mid=(low+high)/2;if(pileRegions(points,mid).reduce((sum,region)=>sum+polygonArea(region),0)>target)low=mid;else high=mid;}
  return (low+high)/2;
}
function polygonPath(ctx,points){
  ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();
}
function rotateBulb(points,angle){const c=Math.cos(angle),s=Math.sin(angle);return points.map(p=>({x:p.x*c-p.y*s,y:p.x*s+p.y*c}));}
function drawSand(ctx,bulb,amount){
  const surface=sandSurface(bulb,amount),regions=pileRegions(bulb,surface);
  if(amount<.00001)return surface;
  ctx.save();ctx.beginPath();
  for(const points of regions){points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();}
  ctx.clip();
  const gold=ctx.createLinearGradient(-.6,-1,.6,1);
  gold.addColorStop(0,'#b78240');gold.addColorStop(.36,'#e8c385');gold.addColorStop(.56,'#f6dda6');gold.addColorStop(1,'#aa7436');
  ctx.fillStyle=gold;ctx.fillRect(-1.5,-1.5,3,3);
  for(const point of sandSpecks){ctx.fillStyle=point.bright?'rgba(255,248,212,.65)':'rgba(89,54,22,.32)';ctx.fillRect(point.x,point.y,point.size,point.size);}
  ctx.strokeStyle='rgba(255,239,188,.7)';ctx.lineWidth=.009;
  ctx.beginPath();ctx.moveTo(-1.5,surface+.289);ctx.lineTo(0,surface+.004);ctx.lineTo(1.5,surface+.289);ctx.stroke();
  ctx.restore();return surface;
}
function drawGlass(ctx,points){
  polygonPath(ctx,points);
  const glass=ctx.createLinearGradient(-.65,0,.65,0);
  glass.addColorStop(0,'rgba(182,220,239,.19)');glass.addColorStop(.16,'rgba(208,238,249,.025)');glass.addColorStop(.64,'rgba(183,210,237,.01)');glass.addColorStop(.96,'rgba(206,226,242,.2)');
  ctx.fillStyle=glass;ctx.fill();ctx.strokeStyle='rgba(211,231,240,.42)';ctx.lineWidth=.011;ctx.stroke();
}
function drawFrame(ctx,angle){
  ctx.save();ctx.rotate(angle);
  const brass=ctx.createLinearGradient(-.85,0,.85,0);
  brass.addColorStop(0,'#59412d');brass.addColorStop(.18,'#b39360');brass.addColorStop(.38,'#f0dbb0');brass.addColorStop(.6,'#967246');brass.addColorStop(.87,'#c7a16d');brass.addColorStop(1,'#56402c');
  ctx.fillStyle=brass;
  for(const side of [-1,1]){
    ctx.beginPath();ctx.roundRect(side*.79-.025,-1.08,.05,2.16,.018);ctx.fill();
    ctx.beginPath();ctx.roundRect(-.9,side*1.075-.055,1.8,.11,.045);ctx.fill();
    ctx.strokeStyle='rgba(255,231,185,.45)';ctx.lineWidth=.008;
    ctx.beginPath();ctx.moveTo(-.8,side*1.075-.025);ctx.lineTo(.8,side*1.075-.025);ctx.stroke();
  }
  // Narrow metal waist and reflections along the glass shoulders.
  ctx.fillStyle='#a9906e';ctx.beginPath();ctx.roundRect(-.075,-.026,.15,.052,.012);ctx.fill();
  ctx.strokeStyle='rgba(240,249,255,.42)';ctx.lineWidth=.016;ctx.lineCap='round';
  for(const sign of [-1,1]){
    ctx.beginPath();ctx.moveTo(-.51,sign*.91);ctx.bezierCurveTo(-.51,sign*.72,-.32,sign*.38,-.15,sign*.2);ctx.stroke();
    ctx.strokeStyle='rgba(240,249,255,.16)';ctx.lineWidth=.028;
    ctx.beginPath();ctx.moveTo(.5,sign*.87);ctx.bezierCurveTo(.5,sign*.65,.29,sign*.36,.15,sign*.19);ctx.stroke();
  }
  ctx.restore();
}
function renderHourglass(ctx,state,dt){
  if(flipTime>=0){
    flipTime+=dt;
    if(flipTime>=FLIP_SECONDS){sandTop=SAND_TOTAL-sandTop;flipTime=-1;settleTime=.9;revealedInfinity=true;}
  }else if(settleTime>0){
    settleTime=Math.max(0,settleTime-dt);
  }else if(dt>0){
    sandTop=Math.max(0,sandTop-SAND_RATE*dt);
    if(sandTop===0)flipTime=0;
  }
  const angle=flipTime<0?0:Math.PI*smooth(flipTime/FLIP_SECONDS);
  const {width:w,height:h,time:t}=state;
  const radius=Math.min(w*.35,h*.365),cx=w/2,cy=h*.48;
  halo(ctx,cx,cy,radius*1.7,'rgba(156,105,47,.17)');
  const shadow=ctx.createRadialGradient(cx,cy+radius*1.25,0,cx,cy+radius*1.25,radius);
  shadow.addColorStop(0,'rgba(0,0,0,.45)');shadow.addColorStop(1,'rgba(0,0,0,0)');
  ctx.save();ctx.translate(0,(cy+radius*1.25)*.84);ctx.scale(1,.16);ctx.fillStyle=shadow;ctx.fillRect(cx-radius,cy+radius*.25,radius*2,radius*2);ctx.restore();
  for(let i=0;i<18;i++){
    const p=sandSpecks[i],x=cx+p.x*radius*2.6,y=cy+p.y*radius*1.3+Math.sin(t*.3+i)*3;
    ctx.fillStyle='rgba(232,205,159,.23)';ctx.beginPath();ctx.arc(x,y,p.size*180,0,Math.PI*2);ctx.fill();
  }
  ctx.save();ctx.translate(cx,cy);ctx.scale(radius,radius);
  const upper=rotateBulb(upperBulb,angle),lower=rotateBulb(lowerBulb,angle);
  drawSand(ctx,upper,sandTop);
  const bottomSurface=drawSand(ctx,lower,SAND_TOTAL-sandTop);
  if(flipTime<0 && settleTime===0 && sandTop>0.0001){
    const end=Math.max(.05,bottomSurface),length=end-.015;
    ctx.strokeStyle='rgba(237,211,154,.4)';ctx.lineWidth=.008;
    ctx.beginPath();ctx.moveTo(0,-.045);ctx.lineTo(0,end);ctx.stroke();
    for(let i=0;i<30;i++){
      const phase=(t*1.7+i/30)%1,y=.015+phase*phase*length;
      ctx.fillStyle=i%3?'#e7c889':'#fff0c6';ctx.beginPath();ctx.arc(Math.sin(i*9+t)*.01,y,.0035+(i%4)*.001,0,Math.PI*2);ctx.fill();
    }
    if(SAND_TOTAL-sandTop>.003){
      ctx.fillStyle='rgba(254,228,168,.7)';ctx.beginPath();ctx.ellipse(0,end,.023,.006,0,0,Math.PI*2);ctx.fill();
    }
  }
  drawGlass(ctx,upper);drawGlass(ctx,lower);drawFrame(ctx,angle);ctx.restore();
  hgMsg2.classList.toggle('show',revealedInfinity || prefersReducedMotion);
  const status=flipTime>=0?'El tiempo vuelve a empezar':state.paused?'La arena está en pausa':'Toca el reloj para voltearlo';
  if(status!==lastSandStatus){lastSandStatus=status;sandStatus.textContent=status;}
}
const hourglassPlayback=canvasPlayback(hgCanvas,renderHourglass);
function syncSandPause(){
  pauseSandButton.disabled=prefersReducedMotion;
  pauseSandButton.textContent=prefersReducedMotion?'Movimiento reducido':hourglassPlayback.state.paused?'Reanudar arena':'Pausar arena';
  pauseSandButton.setAttribute('aria-pressed',String(hourglassPlayback.state.paused));
}
function startHourglass(){sandTop=SAND_TOTAL;flipTime=-1;settleTime=0;revealedInfinity=false;hourglassPlayback.start();syncSandPause();}
function stopHourglass(){hourglassPlayback.stop();}
function flipHourglass(){
  if(!hourglassPlayback.state.active || flipTime>=0)return;
  if(prefersReducedMotion || hourglassPlayback.state.paused){sandTop=SAND_TOTAL-sandTop;revealedInfinity=true;}
  else flipTime=0;
  hourglassPlayback.refresh();
}
hourglassWrap.addEventListener('click',flipHourglass);
hourglassWrap.addEventListener('keydown',event=>{
  if((event.key==='Enter'||event.key===' ')&&!event.repeat){event.preventDefault();flipHourglass();}
});
pauseSandButton.addEventListener('click',()=>{hourglassPlayback.pause();syncSandPause();});

document.querySelectorAll('.modal').forEach(m => {
  m.addEventListener('click', e => {
    if (e.target.hasAttribute('data-close')) closeModal(m);
  });
  m.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => closeModal(m)));
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.show').forEach(m => closeModal(m));
  }
});

document.querySelectorAll('.modal').forEach(modal => {
  document.body.appendChild(modal);
  const title = modal.querySelector('h2');
  title.id = modal.id + '-title';
  modal.setAttribute('aria-labelledby', title.id);
  modal.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const buttons = [...modal.querySelectorAll('button, a[href], input')];
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
});

// The secret is a keepsake unlock, saved only in this browser.
const constellationModal = document.getElementById('constellationModal');
const constellationButton = document.getElementById('openConstellation');
let constellationSaved = false;
try { secretStarUnlocked = localStorage.getItem('love.constellation') === 'unlocked'; constellationSaved = secretStarUnlocked; } catch {}
function syncConstellation() {
  constellationButton.hidden = !secretStarUnlocked;
  secretForm.hidden = secretStarUnlocked;
  document.getElementById('constellationSaved').textContent = constellationSaved
    ? 'Este rincón queda guardado en este navegador. Puedes volver desde Universo.'
    : 'Puedes volver a este rincón desde Universo mientras el álbum siga abierto.';
}
function unlockConstellation() {
  secretStarUnlocked = true;
  try { localStorage.setItem('love.constellation', 'unlocked'); constellationSaved = true; } catch {}
  syncConstellation();
  openModal(constellationModal);
  constellationModal._returnFocus = constellationButton;
}
constellationButton.addEventListener('click', () => openModal(constellationModal));
document.getElementById('constellationLetter').addEventListener('click', () => {
  closeModal(constellationModal);
  openLetter();
  letterModal._returnFocus = constellationButton;
});
document.querySelectorAll('[data-secret-page]').forEach(button => button.addEventListener('click', () => {
  closeModal(constellationModal);
  const pageIndex = Number(button.dataset.secretPage);
  show(pageIndex);
  document.querySelector('[data-chapter="' + pageIndex + '"]').focus();
}));
syncConstellation();
document.getElementById('replayScene').addEventListener('click', startScene);
document.getElementById('skipScene').addEventListener('click', finishScene);

const seek = document.getElementById('seek');
const elapsedTime = document.getElementById('elapsedTime');
const durationTime = document.getElementById('durationTime');
function formatTrackTime(value) {
  if (!Number.isFinite(value)) return '0:00';
  return Math.floor(value / 60) + ':' + String(Math.floor(value % 60)).padStart(2, '0');
}
function updateTimeline() {
  const ready = Number.isFinite(audio.duration) && audio.duration > 0;
  seek.disabled = !ready;
  seek.max = ready ? audio.duration : 100;
  seek.value = ready ? audio.currentTime : 0;
  elapsedTime.textContent = formatTrackTime(audio.currentTime);
  durationTime.textContent = formatTrackTime(audio.duration);
  seek.setAttribute('aria-valuetext', elapsedTime.textContent + ' de ' + durationTime.textContent);
}
['timeupdate', 'loadedmetadata', 'durationchange', 'emptied'].forEach(event => audio.addEventListener(event, updateTimeline));
seek.addEventListener('input', () => { if (!seek.disabled) audio.currentTime = Number(seek.value); });
document.getElementById('collapsePlayer').addEventListener('click', event => {
  const collapsed = document.getElementById('player').classList.toggle('player--collapsed');
  event.currentTarget.setAttribute('aria-expanded', String(!collapsed));
  event.currentTarget.setAttribute('aria-label', collapsed ? 'Expandir reproductor' : 'Contraer reproductor');
  event.currentTarget.textContent = collapsed ? '⌃' : '⌄';
});
updateTimeline();

show(0);
setTrack(0, { autoplay: false, fade: false });
nowPlaying.textContent = tracks[0].title;
