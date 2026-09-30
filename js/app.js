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

const scene = document.getElementById('scene');
const sctx = scene.getContext('2d');
const overlayText = document.getElementById('overlayText');

let sParticles = [];
let sAnimId = null;
let sStart = 0;
let sPhase = 0;
let sZoomT = 0;
let sRunning = false;
const secret = 'amor';
let secretStarUnlocked = false;
let sDpr = 1;

function resizeScene() {
  sDpr = Math.min(devicePixelRatio || 1, 2);
  const cw = scene.clientWidth || scene.getBoundingClientRect().width || window.innerWidth;
  const ch = scene.clientHeight || scene.getBoundingClientRect().height || Math.round(window.innerHeight * 0.6);
  scene.width = Math.round(cw * sDpr);
  scene.height = Math.round(ch * sDpr);
  sctx.setTransform(sDpr, 0, 0, sDpr, 0, 0);
}

addEventListener('resize', () => {
  if (sRunning) resizeScene();
});

function sceneW() { return scene.width / sDpr; }

function sceneH() { return scene.height / sDpr; }

function startScene() {
  sRunning = true;
  resizeScene();
  cancelAnimationFrame(sAnimId);
  sParticles = [];
  sPhase = prefersReducedMotion ? 3 : 0;
  sZoomT = prefersReducedMotion ? 15 : 0;
  overlayText.textContent = '';
  overlayText.classList.remove('show');
  sStart = performance.now();
  for (let i = 0; i < 260; i++) {
    sParticles.push({
      t: 'star',
      x: Math.random() * sceneW(),
      y: Math.random() * sceneH(),
      r: Math.random() * 1.8 + 0.4,
      a: Math.random() * 0.6 + 0.4
    });
  }
  sLoop();
}

function stopScene() {
  sRunning = false;
  cancelAnimationFrame(sAnimId);
}

function addShooting() {
  const y = Math.random() * sceneH() * 0.6;
  const ang = Math.random() * 0.3 + 0.2;
  const sp = 8 + Math.random() * 6;
  sParticles.push({
    t: 'shoot',
    x: -50,
    y: y,
    vx: Math.cos(ang) * sp,
    vy: Math.sin(ang) * sp,
    life: 0,
    max: 120
  });
}

function drawSky(now) {
  const W = sceneW();
  const H = sceneH();
  const g = sctx.createRadialGradient(W * 0.6, H * 0.2, 0, W * 0.6, H * 0.2, Math.max(W, H));
  g.addColorStop(0, '#100826');
  g.addColorStop(1, '#020103');
  sctx.fillStyle = g;
  sctx.fillRect(0, 0, W, H);
  for (const p of sParticles) {
    if (p.t === 'star') {
      sctx.globalAlpha = p.a * (0.85 + Math.sin((now + p.x * 3) / 800) * 0.15);
      sctx.beginPath();
      sctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      sctx.fillStyle = '#ffffff';
      sctx.fill();
      sctx.globalAlpha = 1;
    } else {
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      sctx.globalAlpha = 1 - p.life / p.max;
      sctx.strokeStyle = '#d8c9ff';
      sctx.lineWidth = 2;
      sctx.beginPath();
      sctx.moveTo(p.x - p.vx * 4, p.y - p.vy * 4);
      sctx.lineTo(p.x, p.y);
      sctx.stroke();
      sctx.globalAlpha = 1;
    }
  }
  sParticles = sParticles.filter(p => p.t !== 'shoot' || p.life < p.max);
}

function drawCentered(s) {
  overlayText.textContent = s;
  overlayText.classList.add('show');
}

function hideCentered() {
  overlayText.classList.remove('show');
  overlayText.textContent = '';
}

function drawEarth(cx, cy, R) {
  const g = sctx.createRadialGradient(cx - R * 0.4, cy - R * 0.4, R * 0.2, cx, cy, R);
  g.addColorStop(0, '#9ad0ff');
  g.addColorStop(1, '#004b8f');
  sctx.fillStyle = g;
  sctx.beginPath();
  sctx.arc(cx, cy, R, 0, Math.PI * 2);
  sctx.fill();
  sctx.fillStyle = '#2a8e4b';
  sctx.beginPath();
  sctx.ellipse(cx - R * 0.2, cy, R * 0.45, R * 0.28, 0, 0, Math.PI * 2);
  sctx.fill();
  sctx.beginPath();
  sctx.ellipse(cx + R * 0.25, cy - R * 0.1, R * 0.3, R * 0.2, 0, 0, Math.PI * 2);
  sctx.fill();
  sctx.strokeStyle = 'rgba(255,255,255,0.6)';
  sctx.lineWidth = 2;
  sctx.beginPath();
  sctx.arc(cx, cy, R, 0, Math.PI * 2);
  sctx.stroke();
}

function sLoop(now = performance.now()) {
  if (!sRunning) return;
  sAnimId = requestAnimationFrame(sLoop);
  drawSky(now);
  const elapsed = (now - sStart) / 1000;
  const W = sceneW();
  const H = sceneH();
  if (!prefersReducedMotion && elapsed < 5 && Math.random() < 0.06) addShooting();
  if (elapsed >= 5 && sPhase === 0) {
    drawCentered('pide un deseo..');
    sPhase = 1;
  }
  if (elapsed >= 10 && sPhase === 1) {
    drawCentered('yo ya pedí el mío y eres tú, lo mejor que me pudo pasar');
    sPhase = 2;
  }
  if (elapsed >= 20 && sPhase === 2) {
    hideCentered();
    sPhase = 3;
    sZoomT = 0;
  }
  if (sPhase >= 3) {
    if (!prefersReducedMotion) sZoomT += 1 / 60;
    const stageDur = 3;
    const stage = Math.min(5, Math.floor(sZoomT / stageDur));
    const local = (sZoomT % stageDur) / stageDur;
    const cx = W / 2;
    const cy = H / 2;
    const baseR = Math.min(W, H) * 0.16;
    sctx.textAlign = 'center';
    sctx.fillStyle = '#fff';
    sctx.font = 'italic 20px Fraunces, Georgia, serif';
    switch (stage) {
      case 0: {
        const R = Math.max(40, baseR * (1 - local * 0.4));
        drawEarth(cx, cy, R);
        sctx.fillText('Tierra', cx, cy - R * 1.4);
        break;
      }
      case 1: {
        const R = Math.max(40, baseR * (0.8 - local * 0.2));
        drawEarth(cx, cy, R);
        sctx.strokeStyle = 'rgba(255,255,255,0.20)';
        sctx.lineWidth = 1.5;
        for (let i = 1; i <= 4; i++) {
          sctx.beginPath();
          sctx.arc(cx, cy, R * (1 + i * 0.6), 0, Math.PI * 2);
          sctx.stroke();
        }
        sctx.fillText('Sistema Solar', cx, cy - R * 1.4);
        break;
      }
      case 2: {
        const R = baseR * 0.6;
        sctx.save();
        sctx.translate(cx, cy);
        sctx.rotate(-0.2);
        const g = sctx.createRadialGradient(0, 0, 10, 0, 0, R * 4);
        g.addColorStop(0, 'rgba(255,255,255,0.85)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        sctx.fillStyle = g;
        sctx.beginPath();
        sctx.ellipse(0, 0, R * 4, R * 1.2, 0, 0, Math.PI * 2);
        sctx.fill();
        sctx.restore();
        sctx.fillText('Vía Láctea', cx, cy - R * 1.8);
        break;
      }
      case 3: {
        const R = baseR * 0.55;
        for (let i = 0; i < 20; i++) {
          sctx.beginPath();
          sctx.arc(cx + (Math.random() - 0.5) * R * 8, cy + (Math.random() - 0.5) * R * 6, 1.8, 0, Math.PI * 2);
          sctx.fillStyle = '#d7e9ff';
          sctx.fill();
        }
        sctx.fillText('Grupo Local', cx, cy - R * 1.4);
        break;
      }
      case 4: {
        const R = baseR * 0.5;
        for (let i = 0; i < 4; i++) {
          sctx.beginPath();
          sctx.ellipse(
            cx + (i - 1.5) * R * 3.5,
            cy + (Math.sin(performance.now() / 900 + i) * R * 0.8),
            R * 2.6, R * 0.8, 0, 0, Math.PI * 2
          );
          sctx.fillStyle = 'rgba(255,255,255,0.07)';
          sctx.fill();
        }
        sctx.fillText('Supercúmulo de Virgo', cx, cy - R * 1.6);
        break;
      }
      case 5: {
        const R = baseR * 0.45;
        sctx.strokeStyle = 'rgba(255,255,255,0.18)';
        sctx.lineWidth = 1.2;
        for (let i = 1; i <= 6; i++) {
          sctx.beginPath();
          sctx.arc(cx, cy, R * (0.6 + i * 0.35), 0, Math.PI * 2);
          sctx.stroke();
        }
        const s = Math.min(W, H) * 0.35;
        sctx.save();
        sctx.translate(cx, cy);
        sctx.scale(s / 100, s / 100);
        sctx.fillStyle = '#ff8fc0';
        sctx.beginPath();
        sctx.moveTo(0, 30);
        sctx.bezierCurveTo(0, -10, 50, -10, 50, 20);
        sctx.bezierCurveTo(50, 45, 25, 60, 0, 80);
        sctx.bezierCurveTo(-25, 60, -50, 45, -50, 20);
        sctx.bezierCurveTo(-50, -10, 0, -10, 0, 30);
        sctx.fill();
        sctx.restore();
        sctx.fillText('Universo observable', cx, cy - R * 1.6);
        sctx.font = 'italic 22px Fraunces, Georgia, serif';
        drawCanvasMessage('mi amor por ti es más grande que todo esto', cx, cy + s * 0.95, W - 40);
        break;
      }
    }
  }
}

document.getElementById('btnShot').onclick = () => {
  const a = document.createElement('a');
  a.download = 'bajo-las-estrellas.png';
  a.href = scene.toDataURL('image/png');
  a.click();
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

const hourglassWrap = document.getElementById('hourglass');
const hgCanvas = document.getElementById('hgCanvas');
const hctx = hgCanvas.getContext('2d');
const hgMsg2 = document.getElementById('hgMsg2');

let hgStart = 0;
let hgPhase = 'fall';
let hgAnimId = null;
let hgRunning = false;
let hgDpr = 1;
let hgGrains = [];
let hgSparks = [];
let hgAmbient = [];
let hgLastPhase = 'fall';
let hgFlipCount = 0;
let hgNoisePattern = null;
let hgMsgTimer = null;

function buildSandNoise() {
  const tile = document.createElement('canvas');
  tile.width = 48;
  tile.height = 48;
  const tctx = tile.getContext('2d');
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * 48;
    const y = Math.random() * 48;
    const r = Math.random() * 0.9 + 0.2;
    const shade = Math.random();
    tctx.fillStyle = shade > 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(120,80,30,0.14)';
    tctx.beginPath();
    tctx.arc(x, y, r, 0, Math.PI * 2);
    tctx.fill();
  }
  hgNoisePattern = hctx.createPattern(tile, 'repeat');
}

function resizeHG() {
  hgDpr = Math.min(devicePixelRatio || 1, 2);
  hgCanvas.width = Math.round(hgCanvas.clientWidth * hgDpr);
  hgCanvas.height = Math.round(hgCanvas.clientHeight * hgDpr);
  hctx.setTransform(hgDpr, 0, 0, hgDpr, 0, 0);
  if (!hgNoisePattern) buildSandNoise();
}

addEventListener('resize', () => {
  if (hgRunning) resizeHG();
});

function startHourglass() {
  hgRunning = true;
  resizeHG();
  hgStart = performance.now();
  hgPhase = 'fall';
  hgLastPhase = 'fall';
  hgGrains = [];
  hgSparks = [];
  hgAmbient = Array.from({ length: 16 }, (_, i) => ({
    ang: (i / 16) * Math.PI * 2,
    radius: 0.75 + Math.random() * 0.35,
    speed: 0.06 + Math.random() * 0.08,
    bob: Math.random() * Math.PI * 2,
    size: 0.6 + Math.random() * 1.1
  }));
  cancelAnimationFrame(hgAnimId);
  hgMsg2.classList.remove('show');
  clearTimeout(hgMsgTimer);
  hgMsgTimer = setTimeout(() => {
    if (hgRunning) hgMsg2.classList.add('show');
  }, 60000);
  hgLoop();
}

function stopHourglass() {
  hgRunning = false;
  cancelAnimationFrame(hgAnimId);
  clearTimeout(hgMsgTimer);
  hctx.clearRect(0, 0, hgCanvas.width, hgCanvas.height);
  hgGrains = [];
  hgSparks = [];
}

hourglassWrap.addEventListener('click', flipHourglass);
hourglassWrap.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flipHourglass(); } });

function flipHourglass() {
  if (!hgRunning) return;
  hgFlipCount++;
  const tilt = (hgFlipCount % 2 === 0) ? 10 : -10;
  hourglassWrap.style.transform = `rotateX(${tilt * 1.6}deg) rotateZ(${tilt * 0.4}deg) translate3d(0, 0, 0) scale(1.03)`;
  setTimeout(() => {
    hourglassWrap.style.transform = 'rotateX(0deg) rotateZ(0deg) translate3d(0, 0, 0) scale(1)';
  }, 90);
  hgStart = performance.now();
  hgPhase = 'fall';
  hgLastPhase = 'fall';
  hgGrains = [];
  const cx = hgW() / 2;
  const cy = hgH() / 2;
  const R = Math.min(hgW() * 0.35, hgH() * 0.38);
  for (let i = 0; i < 26; i++) {
    const ang = Math.random() * Math.PI * 2;
    const sp = 1 + Math.random() * 2.5;
    hgSparks.push({
      x: cx,
      y: cy,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp - 1,
      life: 0,
      max: 40 + Math.random() * 20,
      size: R * 0.01 + Math.random() * R * 0.01
    });
  }
}

function hgW() { return hgCanvas.width / hgDpr; }

function hgH() { return hgCanvas.height / hgDpr; }

function hgLoop(now = performance.now()) {
  if (!hgRunning) return;
  hgAnimId = requestAnimationFrame(hgLoop);
  const W = hgW();
  const H = hgH();
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W * 0.35, H * 0.38);
  hctx.clearRect(0, 0, W, H);
  const bgGrad = hctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#0a0a0d');
  bgGrad.addColorStop(1, '#000');
  hctx.fillStyle = bgGrad;
  hctx.fillRect(0, 0, W, H);
  const pulse = 0.5 + Math.sin(now / 1400) * 0.5;
  const halo = hctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.9);
  halo.addColorStop(0, `rgba(243, 216, 143, ${0.10 + pulse * 0.10})`);
  halo.addColorStop(1, 'rgba(243, 216, 143, 0)');
  hctx.fillStyle = halo;
  hctx.fillRect(0, 0, W, H);
  for (const p of hgAmbient) {
    p.ang += p.speed / 60;
    const bobY = Math.sin(now / 900 + p.bob) * R * 0.06;
    const x = cx + Math.cos(p.ang) * R * p.radius;
    const y = cy + Math.sin(p.ang) * R * p.radius * 1.15 + bobY;
    hctx.save();
    hctx.globalAlpha = 0.35 + Math.sin(now / 700 + p.bob) * 0.2;
    hctx.shadowColor = '#f3d88f';
    hctx.shadowBlur = 6;
    hctx.fillStyle = '#f3d88f';
    hctx.beginPath();
    hctx.arc(x, y, p.size, 0, Math.PI * 2);
    hctx.fill();
    hctx.restore();
  }
  hctx.save();
  hctx.translate(cx, cy);
  hctx.strokeStyle = '#000';
  hctx.lineWidth = 10;
  hctx.beginPath();
  hctx.roundRect(-R * 0.8, -R * 1.1, R * 1.6, R * 2.2, 20);
  hctx.stroke();
  const goldGrad = hctx.createLinearGradient(-R, -R, R, R);
  goldGrad.addColorStop(0, '#8e6f29');
  goldGrad.addColorStop(0.22, '#f3d88f');
  goldGrad.addColorStop(0.45, '#a07d2d');
  goldGrad.addColorStop(0.62, '#f8e7b8');
  goldGrad.addColorStop(0.8, '#a07d2d');
  goldGrad.addColorStop(1, '#8e6f29');
  hctx.lineWidth = 8;
  hctx.strokeStyle = goldGrad;
  hctx.stroke();
  hctx.strokeStyle = 'rgba(255,255,255,0.35)';
  hctx.lineWidth = 1.4;
  hctx.beginPath();
  hctx.roundRect(-R * 0.78, -R * 1.08, R * 1.56, R * 2.16, 18);
  hctx.stroke();
  function bulbPath() {
    hctx.beginPath();
    hctx.moveTo(0, -R * 0.9);
    hctx.bezierCurveTo(R * 0.7, -R * 0.9, R * 0.5, -R * 0.15, 0, -R * 0.05);
    hctx.bezierCurveTo(-R * 0.5, -R * 0.15, -R * 0.7, -R * 0.9, 0, -R * 0.9);
    hctx.moveTo(0, R * 0.9);
    hctx.bezierCurveTo(R * 0.7, R * 0.9, R * 0.5, R * 0.15, 0, R * 0.05);
    hctx.bezierCurveTo(-R * 0.5, R * 0.15, -R * 0.7, R * 0.9, 0, R * 0.9);
  }
  hctx.strokeStyle = 'rgba(255,255,255,0.45)';
  hctx.lineWidth = 3;
  bulbPath();
  hctx.stroke();
  hctx.strokeStyle = 'rgba(255,255,255,0.18)';
  hctx.lineWidth = 6;
  hctx.beginPath();
  hctx.moveTo(-R * 0.32, -R * 0.78);
  hctx.quadraticCurveTo(-R * 0.42, -R * 0.4, -R * 0.2, -R * 0.12);
  hctx.stroke();
  const fallDur = 30000;
  const revDur = 2000;
  let phaseT = now - hgStart;
  if (hgPhase === 'fall') {
    if (phaseT >= fallDur) {
      hgPhase = 'reverse';
      hgStart = now;
      phaseT = 0;
    }
  } else {
    if (phaseT >= revDur) {
      hgPhase = 'fall';
      hgStart = now;
      phaseT = 0;
    }
  }
  if (hgPhase !== hgLastPhase) {
    pulseHourglass();
    hgLastPhase = hgPhase;
  }
  const fracFall = Math.min(1, phaseT / fallDur);
  const fracRev = Math.min(1, phaseT / revDur);
  let levelTop, levelBottom, throatFlow;
  if (hgPhase === 'fall') {
    const k = Easing.inQuad(fracFall);
    levelTop = 1 - k * 0.98;
    levelBottom = k * 0.98;
    throatFlow = Easing.inOutSine(Math.sin(fracFall * Math.PI) * 0.8 + 0.2);
    if (fracFall > 0.93) {
      const s = Easing.outExpo((fracFall - 0.93) / 0.07);
      levelTop = 1 - 0.98 + (0.98 * (1 - s));
      levelBottom = 0.98 - (0.98 * (1 - s));
    }
  } else {
    const k = Easing.inOutQuint(fracRev);
    levelTop = 0.02 + k * 0.96;
    levelBottom = 0.98 - k * 0.96;
    throatFlow = 0.4 * (1 - k);
  }
  function drawSand(top, level) {
    const clipPath = new Path2D();
    if (top) {
      clipPath.moveTo(0, -R * 0.9);
      clipPath.bezierCurveTo(R * 0.7, -R * 0.9, R * 0.5, -R * 0.15, 0, -R * 0.05);
      clipPath.bezierCurveTo(-R * 0.5, -R * 0.15, -R * 0.7, -R * 0.9, 0, -R * 0.9);
      hctx.save();
      hctx.clip(clipPath);
      const h = R * 0.75 * level;
      const grad = hctx.createLinearGradient(0, -R * 0.9, 0, -R * 0.9 + h);
      grad.addColorStop(0, '#f5e1a4');
      grad.addColorStop(1, '#d9b96c');
      hctx.fillStyle = grad;
      hctx.fillRect(-R * 0.8, -R * 0.9, R * 1.6, h);
      if (hgNoisePattern) {
        hctx.globalAlpha = 0.5;
        hctx.fillStyle = hgNoisePattern;
        hctx.fillRect(-R * 0.8, -R * 0.9, R * 1.6, h);
        hctx.globalAlpha = 1;
      }
      hctx.restore();
      return -R * 0.9 + h;
    } else {
      const h = R * 0.75 * level;
      const baseY = R * 0.9;
      const topY = baseY - h;
      clipPath.moveTo(0, R * 0.9);
      clipPath.bezierCurveTo(R * 0.7, R * 0.9, R * 0.5, R * 0.15, 0, R * 0.05);
      clipPath.bezierCurveTo(-R * 0.5, R * 0.15, -R * 0.7, R * 0.9, 0, R * 0.9);
      hctx.save();
      hctx.clip(clipPath);
      const grad = hctx.createLinearGradient(0, baseY, 0, topY);
      grad.addColorStop(0, '#f5e1a4');
      grad.addColorStop(1, '#d9b96c');
      hctx.fillStyle = grad;
      hctx.beginPath();
      hctx.moveTo(-R * 0.8, baseY);
      const mound = Math.min(1, h / (R * 0.75)) * R * 0.09;
      const sway = Math.sin(now / 1600) * R * 0.01 * Math.min(1, h / (R * 0.2));
      hctx.lineTo(-R * 0.8, topY + mound * 0.3);
      hctx.quadraticCurveTo(-R * 0.25 + sway, topY - mound, 0, topY - mound * 0.2 + sway);
      hctx.quadraticCurveTo(R * 0.25 + sway, topY - mound * 0.7, R * 0.8, topY + mound * 0.4);
      hctx.lineTo(R * 0.8, baseY);
      hctx.closePath();
      hctx.fill();
      if (hgNoisePattern) {
        hctx.globalAlpha = 0.5;
        hctx.fillStyle = hgNoisePattern;
        hctx.fill();
        hctx.globalAlpha = 1;
      }
      hctx.fillStyle = 'rgba(0,0,0,0.08)';
      hctx.beginPath();
      hctx.ellipse(0, baseY - h * 0.1, R * 0.3, R * 0.08, 0, 0, Math.PI * 2);
      hctx.fill();
      hctx.restore();
      return topY - mound * 0.5;
    }
  }
  drawSand(true, levelTop);
  const pileTopY = drawSand(false, levelBottom);
  hctx.globalAlpha = throatFlow;
  hctx.strokeStyle = '#f3d88f';
  hctx.lineWidth = 2;
  hctx.beginPath();
  hctx.moveTo(0, -R * 0.02);
  hctx.lineTo(0, R * 0.02);
  hctx.stroke();
  hctx.globalAlpha = 1;
  hctx.strokeStyle = 'rgba(255,255,255,0.25)';
  hctx.lineWidth = 2;
  hctx.beginPath();
  hctx.moveTo(-R * 0.5, -R * 0.75);
  hctx.lineTo(-R * 0.3, -R * 0.45);
  hctx.stroke();
  hctx.beginPath();
  hctx.moveTo(R * 0.5, R * 0.75);
  hctx.lineTo(R * 0.3, R * 0.45);
  hctx.stroke();
  if (hgPhase === 'fall' && throatFlow > 0.08 && fracFall < 0.97) {
    if (Math.random() < throatFlow * 0.9) {
      hgGrains.push({
        x: (Math.random() - 0.5) * R * 0.05,
        y: -R * 0.03,
        vy: R * 0.02 + Math.random() * R * 0.01,
        drift: (Math.random() - 0.5) * 0.15,
        size: Math.max(1, R * 0.012)
      });
    }
  }
  hctx.fillStyle = '#fbe9bd';
  hgGrains = hgGrains.filter(g => {
    g.y += g.vy;
    g.vy += R * 0.0012;
    g.x += g.drift;
    if (g.y >= pileTopY) return false;
    hctx.beginPath();
    hctx.arc(g.x, g.y, g.size, 0, Math.PI * 2);
    hctx.fill();
    return true;
  });
  hgSparks = hgSparks.filter(s => {
    s.x += s.vx;
    s.y += s.vy;
    s.vy += 0.06;
    s.life++;
    hctx.save();
    hctx.globalAlpha = Math.max(0, 1 - s.life / s.max);
    hctx.shadowColor = '#ffe9a8';
    hctx.shadowBlur = 8;
    hctx.fillStyle = '#ffe9a8';
    hctx.beginPath();
    hctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    hctx.fill();
    hctx.restore();
    return s.life < s.max;
  });
  hctx.restore();
}

function pulseHourglass() {
  if (prefersReducedMotion) return;
  hourglassWrap.classList.add('pulse');
  setTimeout(() => hourglassWrap.classList.remove('pulse'), 320);
}

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
document.getElementById('skipScene').addEventListener('click', () => {
  sPhase = 3; sZoomT = 15; hideCentered();
});
function drawCanvasMessage(text, x, y, maxWidth) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const candidate = line ? line + ' ' + word : word;
    if (line && sctx.measureText(candidate).width > maxWidth) {
      sctx.fillText(line, x, y); y += 28; line = word;
    } else line = candidate;
  }
  sctx.fillText(line, x, y);
}

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
