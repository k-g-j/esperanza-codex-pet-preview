const canvas = document.getElementById("esperanza");
const context = canvas.getContext("2d");
const title = document.getElementById("current-animation");
const detail = document.getElementById("animation-detail");
const pauseButton = document.getElementById("pause");
const playAllButton = document.getElementById("play-all");
const previousFrameButton = document.getElementById("previous-frame");
const nextFrameButton = document.getElementById("next-frame");
const frameStatus = document.getElementById("frame-status");
const animationButtons = [...document.querySelectorAll("[data-animation]")];
const buildVersion = new URL(import.meta.url).searchParams.get("v") || "local";

const CELL_WIDTH = 192;
const CELL_HEIGHT = 208;
const UPDATE_INTERVAL_MS = 30_000;
const FRAME_SEQUENCE = (row, count) =>
  Array.from({ length: count }, (_, column) => ({ row, column }));

const animations = {
  idle: {
    label: "Idle",
    detail: "Slow blink, ear flick, and tail-tip twitch",
    delay: 420,
    frames: FRAME_SEQUENCE(0, 6),
  },
  hello: {
    label: "Hello",
    detail: "Friendly white-paw wave",
    delay: 260,
    frames: FRAME_SEQUENCE(3, 4),
  },
  chase: {
    label: "Chase",
    detail: "Right and left running loops",
    delay: 150,
    frames: [...FRAME_SEQUENCE(1, 8), ...FRAME_SEQUENCE(2, 8)],
  },
  jump: {
    label: "Jump",
    detail: "Crouch, leap, land, and settle",
    delay: 210,
    frames: FRAME_SEQUENCE(4, 5),
  },
  "needs-input": {
    label: "Needs input",
    detail: "Patient white-paw tap",
    delay: 320,
    frames: FRAME_SEQUENCE(6, 6),
  },
  think: {
    label: "Think",
    detail: "Focused eye scan and a quiet thinking paw",
    delay: 280,
    frames: FRAME_SEQUENCE(7, 6),
  },
  ready: {
    label: "Ready",
    detail: "Attentive blink, head tilt, and ready paw",
    delay: 300,
    frames: FRAME_SEQUENCE(8, 6),
  },
  blocked: {
    label: "Blocked",
    detail: "A gentle facepaw followed by recovery",
    delay: 280,
    frames: FRAME_SEQUENCE(5, 8),
  },
  "look-around": {
    label: "Look around",
    detail: "A smooth seated scan through all directions",
    delay: 220,
    frames: [...FRAME_SEQUENCE(9, 8), ...FRAME_SEQUENCE(10, 8)],
  },
};

const tour = [
  "hello",
  "jump",
  "needs-input",
  "think",
  "ready",
  "blocked",
  "look-around",
  "chase",
  "idle",
];

const atlas = new Image();
let currentKey = "idle";
let frameIndex = 0;
let frameTimer;
let tourTimer;
let tourIndex = 0;
let playing = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function drawFrame() {
  if (!atlas.complete || atlas.naturalWidth === 0) return;

  const animation = animations[currentKey];
  const frame = animation.frames[frameIndex % animation.frames.length];
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    atlas,
    frame.column * CELL_WIDTH,
    frame.row * CELL_HEIGHT,
    CELL_WIDTH,
    CELL_HEIGHT,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  canvas.setAttribute(
    "aria-label",
    `Esperanza performing the ${animation.label} animation`,
  );
  frameStatus.textContent = `Frame ${frameIndex + 1} of ${animation.frames.length}`;
}

function clearTimers() {
  window.clearTimeout(frameTimer);
  window.clearTimeout(tourTimer);
}

function scheduleFrames() {
  window.clearTimeout(frameTimer);
  if (!playing) return;

  frameTimer = window.setTimeout(() => {
    const animation = animations[currentKey];
    frameIndex = (frameIndex + 1) % animation.frames.length;
    drawFrame();
    scheduleFrames();
  }, animations[currentKey].delay);
}

function updateControls(key) {
  animationButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.animation === key));
  });
}

function selectAnimation(key, { preserveTour = false } = {}) {
  if (!preserveTour) window.clearTimeout(tourTimer);
  currentKey = key;
  frameIndex = 0;
  playing = true;
  pauseButton.textContent = "Pause";
  pauseButton.setAttribute("aria-pressed", "false");

  const animation = animations[key];
  title.textContent = animation.label;
  detail.textContent = animation.detail;
  updateControls(key);
  drawFrame();
  scheduleFrames();
}

function stepFrame(delta) {
  clearTimers();
  playing = false;
  pauseButton.textContent = "Play";
  pauseButton.setAttribute("aria-pressed", "true");

  const animation = animations[currentKey];
  frameIndex =
    (frameIndex + delta + animation.frames.length) % animation.frames.length;
  drawFrame();
}

function playTourStep() {
  const key = tour[tourIndex % tour.length];
  selectAnimation(key, { preserveTour: true });
  tourIndex += 1;

  const animation = animations[key];
  const duration = Math.max(animation.frames.length * animation.delay, 1500);
  tourTimer = window.setTimeout(playTourStep, duration);
}

animationButtons.forEach((button) => {
  button.addEventListener("click", () => selectAnimation(button.dataset.animation));
});

pauseButton.addEventListener("click", () => {
  window.clearTimeout(tourTimer);
  playing = !playing;
  pauseButton.textContent = playing ? "Pause" : "Play";
  pauseButton.setAttribute("aria-pressed", String(!playing));

  if (playing) scheduleFrames();
  else window.clearTimeout(frameTimer);
});

previousFrameButton.addEventListener("click", () => stepFrame(-1));
nextFrameButton.addEventListener("click", () => stepFrame(1));

playAllButton.addEventListener("click", () => {
  clearTimers();
  tourIndex = 0;
  playTourStep();
});

atlas.addEventListener("load", () => {
  drawFrame();
  pauseButton.textContent = playing ? "Pause" : "Play";
  pauseButton.setAttribute("aria-pressed", String(!playing));
  if (playing) scheduleFrames();
});
atlas.addEventListener("error", () => {
  title.textContent = "Preview unavailable";
  detail.textContent = "The spritesheet could not be loaded.";
});
atlas.src = `assets/esperanza.webp?v=${encodeURIComponent(buildVersion)}`;

document.addEventListener("visibilitychange", () => {
  window.clearTimeout(frameTimer);
  if (!document.hidden && playing) scheduleFrames();
});

document.addEventListener("keydown", (event) => {
  if (
    event.target instanceof HTMLButtonElement ||
    event.target instanceof HTMLAnchorElement
  ) {
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    stepFrame(-1);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    stepFrame(1);
  } else if (event.key === " ") {
    event.preventDefault();
    pauseButton.click();
  }
});

async function refreshIfUpdated() {
  if (buildVersion === "local") return;

  try {
    const manifestUrl = new URL("version.json", window.location.href);
    manifestUrl.searchParams.set("t", String(Date.now()));
    const response = await fetch(manifestUrl, { cache: "no-store" });
    if (!response.ok) return;

    const manifest = await response.json();
    if (!manifest.revision || manifest.revision === buildVersion) return;

    const latestUrl = new URL(window.location.href);
    latestUrl.searchParams.set("build", manifest.revision.slice(0, 12));
    window.location.replace(latestUrl);
  } catch {
    // Keep the current working preview if an update check fails.
  }
}

window.setInterval(refreshIfUpdated, UPDATE_INTERVAL_MS);
