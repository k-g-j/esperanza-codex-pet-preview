const canvas = document.getElementById("esperanza");
const context = canvas.getContext("2d");
const stage = document.querySelector(".stage");
const title = document.getElementById("current-animation");
const detail = document.getElementById("animation-detail");
const codexState = document.getElementById("codex-state");
const pauseButton = document.getElementById("pause");
const playAllButton = document.getElementById("play-all");
const previousFrameButton = document.getElementById("previous-frame");
const nextFrameButton = document.getElementById("next-frame");
const frameStatus = document.getElementById("frame-status");
const petSizeInput = document.getElementById("pet-size");
const petSizeOutput = document.getElementById("pet-size-output");
const resetPetSizeButton = document.getElementById("reset-pet-size");
const animationButtons = [...document.querySelectorAll("[data-animation]")];
const buildVersion = new URL(import.meta.url).searchParams.get("v") || "local";
const reducedMotionQuery = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
);

const previewModel = await import(
  `./preview-model.js?v=${encodeURIComponent(buildVersion)}`
);
const {
  CELL_HEIGHT,
  CELL_WIDTH,
  PET_SIZE_DEFAULT,
  animations,
  buildPlayback,
  clampPetOffset,
  clampPetSize,
  getAnimationDuration,
  getRenderedPetHeight,
  getRunAnimation,
  tour,
} = previewModel;

const UPDATE_INTERVAL_MS = 30_000;

const atlas = new Image();
let currentKey = "idle";
let selectedKey = "idle";
let playback = buildPlayback("idle");
let frameIndex = 0;
let frameTimer;
let tourTimer;
let tourIndex = 0;
let tourActive = false;
let prefersReducedMotion = reducedMotionQuery.matches;
let playing = !prefersReducedMotion;
let petSize = PET_SIZE_DEFAULT;
let petOffsetX = 0;
let dragState = null;
let interactionResumeState = null;

function drawFrame() {
  if (!atlas.complete || atlas.naturalWidth === 0) return;

  const frame = playback.frames[frameIndex % playback.frames.length];
  const sourceAnimation = animations[frame.sourceKey];
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
    `Esperanza performing the ${sourceAnimation.label} animation`,
  );
  frameStatus.textContent =
    frame.sourceKey === currentKey
      ? `Frame ${frame.sourceFrameIndex + 1} of ${sourceAnimation.frames.length}`
      : `Idling after three ${animations[currentKey].label.toLowerCase()} cycles`;
}

function clearTimers() {
  window.clearTimeout(frameTimer);
  window.clearTimeout(tourTimer);
}

function updatePlaybackControl() {
  pauseButton.textContent = playing ? "Pause" : "Play";
  pauseButton.setAttribute("aria-pressed", String(!playing));
}

function updateAnimationCopy(key) {
  const animation = animations[key];
  title.textContent = animation.label;
  detail.textContent = animation.detail;
  codexState.textContent = `Codex state: ${animation.stateLabel}`;
}

function scheduleFrames() {
  window.clearTimeout(frameTimer);
  if (!playing) return;

  const frame = playback.frames[frameIndex % playback.frames.length];
  frameTimer = window.setTimeout(() => {
    frameIndex += 1;
    if (frameIndex >= playback.frames.length)
      frameIndex = playback.loopStartIndex;
    drawFrame();
    scheduleFrames();
  }, frame.durationMs);
}

function updateControls(key) {
  animationButtons.forEach((button) => {
    button.setAttribute(
      "aria-pressed",
      String(button.dataset.animation === key),
    );
  });
}

function selectAnimation(key, { preserveTour = false } = {}) {
  if (!preserveTour) {
    window.clearTimeout(tourTimer);
    tourActive = false;
  }
  interactionResumeState = null;
  currentKey = key;
  selectedKey = key;
  playback = buildPlayback(key);
  frameIndex = 0;
  playing = true;
  updatePlaybackControl();
  updateAnimationCopy(key);
  updateControls(selectedKey);
  drawFrame();
  scheduleFrames();
}

function showInteractionAnimation(key) {
  window.clearTimeout(tourTimer);
  if (interactionResumeState == null) {
    interactionResumeState = {
      key: currentKey,
      playing,
      selectedKey,
      tourActive,
    };
  }
  tourActive = false;

  if (currentKey === key) return;
  currentKey = key;
  playback = buildPlayback(key);
  frameIndex = 0;
  playing = !prefersReducedMotion;
  updatePlaybackControl();
  updateAnimationCopy(key);
  updateControls(selectedKey);
  drawFrame();
  scheduleFrames();
}

function restoreSelectedAnimation() {
  if (interactionResumeState == null) return;
  const resumeState = interactionResumeState;
  interactionResumeState = null;
  currentKey = resumeState.key;
  selectedKey = resumeState.selectedKey;
  tourActive = resumeState.tourActive;
  playback = buildPlayback(currentKey);
  frameIndex = 0;
  playing = resumeState.playing;
  updatePlaybackControl();
  updateAnimationCopy(currentKey);
  updateControls(selectedKey);
  drawFrame();
  if (playing) scheduleFrames();
  else window.clearTimeout(frameTimer);
  if (tourActive) scheduleNextTourStep(currentKey);
}

function updatePetPosition() {
  petOffsetX = clampPetOffset(petOffsetX, stage.clientWidth, petSize);
  canvas.style.transform = `translate3d(${petOffsetX}px, 0, 0)`;
}

function updatePetSize(value) {
  petSize = clampPetSize(value);
  petSizeInput.value = String(petSize);
  petSizeOutput.value = `${petSize} px`;
  canvas.style.width = `${petSize}px`;
  canvas.style.height = `${getRenderedPetHeight(petSize)}px`;
  updatePetPosition();
}

function stepFrame(delta) {
  clearTimers();
  tourActive = false;
  playing = false;
  updatePlaybackControl();

  const animation = animations[currentKey];
  const sourceFrameIndex = playback.frames[frameIndex]?.sourceFrameIndex ?? 0;
  playback = {
    frames: animation.frames.map((frame, index) => ({
      ...frame,
      sourceFrameIndex: index,
      sourceKey: currentKey,
    })),
    loopStartIndex: 0,
  };
  frameIndex =
    (sourceFrameIndex + delta + animation.frames.length) %
    animation.frames.length;
  drawFrame();
}

function playTourStep() {
  tourActive = true;
  const key = tour[tourIndex % tour.length];
  selectAnimation(key, { preserveTour: true });
  tourIndex += 1;

  scheduleNextTourStep(key);
}

function scheduleNextTourStep(key) {
  const cycles = key === "idle" ? 1 : 3;
  const duration = Math.max(getAnimationDuration(key) * cycles, 1500);
  tourTimer = window.setTimeout(playTourStep, duration);
}

animationButtons.forEach((button) => {
  button.addEventListener("click", () =>
    selectAnimation(button.dataset.animation),
  );
});

petSizeInput.addEventListener("input", () => updatePetSize(petSizeInput.value));
resetPetSizeButton.addEventListener("click", () =>
  updatePetSize(PET_SIZE_DEFAULT),
);

canvas.addEventListener("pointerenter", (event) => {
  if (event.pointerType === "mouse" && dragState == null) {
    showInteractionAnimation("jump");
  }
});

canvas.addEventListener("pointerleave", () => {
  if (dragState == null) restoreSelectedAnimation();
});

canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  event.preventDefault();
  canvas.setPointerCapture?.(event.pointerId);
  dragState = {
    directionX: event.clientX,
    pointerId: event.pointerId,
    pointerType: event.pointerType,
    startOffsetX: petOffsetX,
    startX: event.clientX,
  };
  canvas.classList.add("is-dragging");
});

canvas.addEventListener("pointermove", (event) => {
  if (dragState == null || dragState.pointerId !== event.pointerId) return;

  petOffsetX = dragState.startOffsetX + event.clientX - dragState.startX;
  updatePetPosition();

  const runAnimation = getRunAnimation(event.clientX - dragState.directionX);
  if (runAnimation != null) {
    dragState.directionX = event.clientX;
    showInteractionAnimation(runAnimation);
  }
});

function finishDrag(event, canceled = false) {
  if (dragState == null || dragState.pointerId !== event.pointerId) return;
  const pointerType = dragState.pointerType;
  dragState = null;
  canvas.classList.remove("is-dragging");
  if (canvas.hasPointerCapture?.(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }

  if (!canceled && pointerType === "mouse" && canvas.matches(":hover")) {
    showInteractionAnimation("jump");
  } else {
    restoreSelectedAnimation();
  }
}

canvas.addEventListener("pointerup", (event) => finishDrag(event));
canvas.addEventListener("pointercancel", (event) => finishDrag(event, true));

pauseButton.addEventListener("click", () => {
  window.clearTimeout(tourTimer);
  tourActive = false;
  playing = !playing;
  updatePlaybackControl();

  if (playing) scheduleFrames();
  else window.clearTimeout(frameTimer);
});

previousFrameButton.addEventListener("click", () => stepFrame(-1));
nextFrameButton.addEventListener("click", () => stepFrame(1));

playAllButton.addEventListener("click", () => {
  clearTimers();
  tourActive = true;
  tourIndex = 0;
  playTourStep();
});

atlas.addEventListener("load", () => {
  drawFrame();
  updatePlaybackControl();
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

reducedMotionQuery.addEventListener("change", (event) => {
  prefersReducedMotion = event.matches;
  if (!prefersReducedMotion || interactionResumeState == null) return;
  playing = false;
  window.clearTimeout(frameTimer);
  updatePlaybackControl();
});

document.addEventListener("keydown", (event) => {
  if (
    event.target instanceof HTMLButtonElement ||
    event.target instanceof HTMLAnchorElement ||
    event.target instanceof HTMLInputElement
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

window.addEventListener("resize", updatePetPosition);
updatePetSize(PET_SIZE_DEFAULT);

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
