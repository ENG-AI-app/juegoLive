const floor = document.querySelector("#danceFloor");
const viewerName = document.querySelector("#viewerName");
const ticker = document.querySelector("#ticker");
const vipName = document.querySelector("#vipName");
const soundSelect = document.querySelector("#soundSelect");
const musicPill = document.querySelector("#musicPill");
const scoreList = document.querySelector("#scoreList");
const joinPop = document.querySelector("#joinPop");

if (new URLSearchParams(window.location.search).get("overlay") === "1") {
  document.body.classList.add("overlay-mode");
}

const colors = ["#ff4f88", "#2ee8c6", "#ffd166", "#5ea3ff", "#9dff62", "#f28cff"];
const sampleNames = ["Luna", "Mateo", "Sofi", "Tomi", "Cami", "Dani", "Valen", "Mora"];
const soundLabels = {
  fiesta: "Fiesta",
  arcade: "Arcade",
  club: "Club",
  rock: "Rock"
};
const soundPatterns = {
  fiesta: {
    comment: [523, 659],
    gift: [392, 523, 659, 784],
    vip: [523, 659, 784, 1046]
  },
  arcade: {
    comment: [660, 880],
    gift: [440, 660, 880, 1320],
    vip: [880, 1320, 1760, 1320]
  },
  club: {
    comment: [196, 294],
    gift: [130, 196, 262, 330],
    vip: [98, 196, 392, 523]
  },
  rock: {
    comment: [147, 220],
    gift: [147, 196, 220, 294],
    vip: [147, 220, 294, 440]
  }
};

let dancers = new Map();
let audioContext;

function cleanName(value) {
  const fallback = sampleNames[Math.floor(Math.random() * sampleNames.length)];
  return (value || fallback).trim().slice(0, 18) || fallback;
}

function laneFor(index) {
  return index % 4;
}

function positionFor(dancer) {
  const lane = laneFor(dancer.order);
  const x = 8 + dancer.progress * 18 + (lane % 2) * 5;
  const y = 3 + lane * 24;
  const scale = 0.78 + lane * 0.08 + dancer.progress * 0.03;
  return { x: `${Math.min(x, 88)}%`, y: `${y}%`, scale };
}

function createDancer(name) {
  const dancer = {
    name,
    progress: 0,
    score: 0,
    gifts: 0,
    order: dancers.size,
    color: colors[dancers.size % colors.length],
    element: document.createElement("div")
  };

  dancer.element.className = "dancer dance";
  dancer.element.innerHTML = `
    <div class="name-tag"></div>
    <div class="head"></div>
    <div class="arm left"></div>
    <div class="arm right"></div>
    <div class="body"></div>
    <div class="leg left"></div>
    <div class="leg right"></div>
  `;
  dancer.element.querySelector(".name-tag").textContent = name;
  dancer.element.style.setProperty("--color", dancer.color);
  floor.appendChild(dancer.element);
  dancers.set(name.toLowerCase(), dancer);
  updateDancer(dancer);
  setTimeout(() => dancer.element.classList.remove("dance"), 1400);
  return dancer;
}

function getDancer(rawName = viewerName.value) {
  const name = cleanName(rawName);
  const key = name.toLowerCase();
  return dancers.get(key) || createDancer(name);
}

function updateDancer(dancer) {
  const pos = positionFor(dancer);
  dancer.element.style.setProperty("--x", pos.x);
  dancer.element.style.setProperty("--y", pos.y);
  dancer.element.style.setProperty("--scale", pos.scale);
  dancer.element.classList.toggle("vip", dancer.progress >= 4);
  dancer.element.classList.toggle("supporter", dancer.gifts > 0);
}

function pulseDance(dancer) {
  dancer.element.classList.add("dance");
  setTimeout(() => dancer.element.classList.remove("dance"), 1600);
}

function comment(rawName = viewerName.value) {
  const dancer = getDancer(rawName);
  pulseDance(dancer);
  ticker.textContent = `${dancer.name} entro al baile con un comentario`;
  showJoinPop(`${dancer.name} entro al juego`);
  playEventSound("comment", 1);
  renderScores();
}

function gift(amount, label, rawName = viewerName.value) {
  const dancer = getDancer(rawName);
  dancer.progress = Math.min(4, dancer.progress + amount);
  dancer.gifts += 1;
  dancer.score += amount * 10;
  updateDancer(dancer);
  pulseDance(dancer);
  ticker.textContent = `${dancer.name} mando ${label} y avanzo ${amount} puesto${amount > 1 ? "s" : ""}`;
  showJoinPop(`${dancer.name} mando ${label} y esta bailando`);

  if (dancer.progress >= 4) {
    vipName.textContent = `${dancer.name} esta bailando en el VIP`;
    dancer.score += 15;
  }

  playEventSound(dancer.progress >= 4 ? "vip" : "gift", amount + 1);
  renderScores();
}

function renderScores() {
  const sorted = [...dancers.values()].sort((a, b) => b.score - a.score).slice(0, 5);
  scoreList.innerHTML = "";

  if (!sorted.length) {
    const empty = document.createElement("li");
    empty.textContent = "Todavia no hay participantes";
    scoreList.appendChild(empty);
    return;
  }

  sorted.forEach((dancer) => {
    const item = document.createElement("li");
    item.textContent = `${dancer.name} - ${dancer.score} pts`;
    scoreList.appendChild(item);
  });
}

function setSoundStyle(value) {
  musicPill.textContent = `Musica externa + FX: ${soundLabels[value]}`;
  ticker.textContent = `Efectos de evento: ${soundLabels[value]}. La musica va por fuera.`;
  playEventSound("gift", 2);
}

function showJoinPop(text) {
  joinPop.textContent = text;
  joinPop.classList.remove("show");
  void joinPop.offsetWidth;
  joinPop.classList.add("show");
}

function ensureAudio() {
  audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
}

function playEventSound(kind, strength) {
  const context = ensureAudio();
  const style = soundPatterns[soundSelect.value] || soundPatterns.fiesta;
  const pattern = style[kind] || style.gift;
  const now = context.currentTime;
  const volume = Math.min(0.09, 0.035 + strength * 0.012);

  pattern.forEach((freq, index) => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = kind === "vip" ? "sawtooth" : index % 2 ? "triangle" : "sine";
    osc.frequency.value = freq;
    const start = now + index * 0.1;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.105);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(start);
    osc.stop(start + 0.12);
  });
}

function randomEvent() {
  viewerName.value = sampleNames[Math.floor(Math.random() * sampleNames.length)];
  const roll = Math.random();
  if (roll > 0.78) {
    gift(4, "regalo grande");
  } else if (roll > 0.48) {
    gift(2, "regalo medio");
  } else if (roll > 0.24) {
    gift(1, "regalo chico");
  } else {
    comment();
  }
}

function reset() {
  dancers.forEach((dancer) => dancer.element.remove());
  dancers = new Map();
  vipName.textContent = "Esperando primer baile...";
  joinPop.textContent = "Esperando comentarios...";
  joinPop.classList.remove("show");
  ticker.textContent = "Escenario reiniciado";
  renderScores();
}

function handleLiveEvent(event) {
  if (event.type === "status") {
    ticker.textContent = event.message;
    if (event.state === "connected") {
      showJoinPop(event.message);
    }
    return;
  }

  if (event.type === "comment") {
    comment(event.name);
    return;
  }

  if (event.type === "gift") {
    gift(Number(event.amount || 1), event.label || "regalo", event.name);
    return;
  }

  if (event.type === "dance") {
    const dancer = getDancer(event.name);
    pulseDance(dancer);
    ticker.textContent = `${dancer.name} activo un baile con ${event.label || "interaccion"}`;
    renderScores();
  }
}

function connectLiveEvents() {
  const events = new EventSource("/events");

  events.onmessage = (message) => {
    try {
      handleLiveEvent(JSON.parse(message.data));
    } catch (error) {
      console.warn("Evento live invalido", error);
    }
  };

  events.onerror = () => {
    ticker.textContent = "Servidor live desconectado. Reintentando...";
  };
}

document.querySelector("#commentBtn").addEventListener("click", comment);
document.querySelector("#smallGiftBtn").addEventListener("click", () => gift(1, "regalo chico"));
document.querySelector("#mediumGiftBtn").addEventListener("click", () => gift(2, "regalo medio"));
document.querySelector("#bigGiftBtn").addEventListener("click", () => gift(4, "regalo grande"));
document.querySelector("#randomBtn").addEventListener("click", randomEvent);
document.querySelector("#resetBtn").addEventListener("click", reset);
soundSelect.addEventListener("change", (event) => setSoundStyle(event.target.value));
viewerName.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    comment();
  }
});

renderScores();
connectLiveEvents();
