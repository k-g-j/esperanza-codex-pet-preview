const canvas = document.getElementById("esperanza");
const context = canvas.getContext("2d");
const title = document.getElementById("current-animation");
const detail = document.getElementById("animation-detail");
const pauseButton = document.getElementById("pause");
const playAllButton = document.getElementById("play-all");
const animationButtons = [...document.querySelectorAll("[data-animation]")];

const CELL_WIDTH = 192;
const CELL_HEIGHT = 208;
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
    delay: 230,
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
    detail: "A full-size facepaw pondering loop",
    delay: 300,
    frames: FRAME_SEQUENCE(7, 6),
  },
  ready: {
    label: "Ready",
    detail: "Happy paw wave, blink, and tail curl",
    delay: 340,
    frames: FRAME_SEQUENCE(8, 6),
  },
  blocked: {
    label: "Blocked",
    detail: "Facepaw, flop, and curled rest",
    delay: 300,
    frames: FRAME_SEQUENCE(5, 8),
  },
  "look-around": {
    label: "Look around",
    detail: "A gentle left-and-right seated scan",
    delay: 260,
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
let playing = true;

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

playAllButton.addEventListener("click", () => {
  clearTimers();
  tourIndex = 0;
  playTourStep();
});

atlas.addEventListener("load", () => {
  drawFrame();
  scheduleFrames();
});
atlas.addEventListener("error", () => {
  title.textContent = "Preview unavailable";
  detail.textContent = "The spritesheet could not be loaded.";
});
atlas.src = "assets/esperanza.webp";
