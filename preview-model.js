export const CELL_WIDTH = 192;
export const CELL_HEIGHT = 208;
export const PET_SIZE_MIN = 80;
export const PET_SIZE_MAX = 224;
export const PET_SIZE_DEFAULT = 112;
export const DRAG_DIRECTION_THRESHOLD = 4;

const FRAME_SEQUENCE = (row, durations) =>
  durations.map((durationMs, column) => ({ row, column, durationMs }));

const IDLE_DURATIONS = [1680, 660, 660, 840, 840, 1920];
const RUN_DURATIONS = [120, 120, 120, 120, 120, 120, 120, 220];

export const animations = {
  idle: {
    label: "Idle",
    stateLabel: "idle",
    detail: "Slow blink, ear flick, and tail-tip twitch",
    frames: FRAME_SEQUENCE(0, IDLE_DURATIONS),
  },
  hello: {
    label: "Hello",
    stateLabel: "waving",
    detail: "Friendly white-paw wave",
    frames: FRAME_SEQUENCE(3, [140, 140, 140, 280]),
  },
  chase: {
    label: "Chase",
    stateLabel: "running-right / running-left",
    detail: "Right and left running loops",
    frames: [
      ...FRAME_SEQUENCE(1, RUN_DURATIONS),
      ...FRAME_SEQUENCE(2, RUN_DURATIONS),
    ],
  },
  "run-right": {
    label: "Run right",
    stateLabel: "running-right",
    detail: "A smooth right-facing run while you drag her",
    frames: FRAME_SEQUENCE(1, RUN_DURATIONS),
  },
  "run-left": {
    label: "Run left",
    stateLabel: "running-left",
    detail: "A smooth left-facing run while you drag her",
    frames: FRAME_SEQUENCE(2, RUN_DURATIONS),
  },
  jump: {
    label: "Jump",
    stateLabel: "jumping",
    detail: "Crouch, leap, land, and settle",
    frames: FRAME_SEQUENCE(4, [140, 140, 140, 140, 280]),
  },
  "needs-input": {
    label: "Needs input",
    stateLabel: "waiting",
    detail: "Patient white-paw tap",
    frames: FRAME_SEQUENCE(6, [150, 150, 150, 150, 150, 260]),
  },
  working: {
    label: "Working",
    stateLabel: "running",
    detail: "Focused eye scan and a quiet thinking paw",
    frames: FRAME_SEQUENCE(7, [120, 120, 120, 120, 120, 220]),
  },
  review: {
    label: "Review",
    stateLabel: "review",
    detail: "Focused blink, head tilt, and review paw",
    frames: FRAME_SEQUENCE(8, [150, 150, 150, 150, 150, 280]),
  },
  blocked: {
    label: "Blocked",
    stateLabel: "failed",
    detail: "A gentle facepaw followed by recovery",
    frames: FRAME_SEQUENCE(5, [140, 140, 140, 140, 140, 140, 140, 240]),
  },
  "look-around": {
    label: "Look around",
    stateLabel: "look frames",
    detail: "A smooth seated scan through all directions",
    frames: [
      ...FRAME_SEQUENCE(9, Array(8).fill(220)),
      ...FRAME_SEQUENCE(10, Array(8).fill(220)),
    ],
  },
};

export const tour = [
  "hello",
  "jump",
  "needs-input",
  "working",
  "review",
  "blocked",
  "look-around",
  "chase",
  "idle",
];

export function clampPetSize(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return PET_SIZE_DEFAULT;
  return Math.round(
    Math.min(PET_SIZE_MAX, Math.max(PET_SIZE_MIN, numericValue)),
  );
}

export function getRenderedPetHeight(width) {
  return Math.round((clampPetSize(width) * CELL_HEIGHT) / CELL_WIDTH);
}

export function getRunAnimation(deltaX) {
  if (deltaX >= DRAG_DIRECTION_THRESHOLD) return "run-right";
  if (deltaX <= -DRAG_DIRECTION_THRESHOLD) return "run-left";
  return null;
}

export function clampPetOffset(offset, stageWidth, petWidth, edgePadding = 24) {
  const maxOffset = Math.max(0, (stageWidth - petWidth) / 2 - edgePadding);
  return Math.min(maxOffset, Math.max(-maxOffset, offset));
}

export function getAnimationDuration(key) {
  return animations[key].frames.reduce(
    (total, frame) => total + frame.durationMs,
    0,
  );
}

export function buildPlayback(key, actionCycles = 3) {
  const animation = animations[key];
  if (animation == null) throw new Error(`Unknown Esperanza animation: ${key}`);

  if (key === "idle") {
    return {
      frames: animation.frames.map((frame, sourceFrameIndex) => ({
        ...frame,
        sourceFrameIndex,
        sourceKey: key,
      })),
      loopStartIndex: 0,
    };
  }

  const actionFrames = Array.from({ length: actionCycles }, () =>
    animation.frames.map((frame, sourceFrameIndex) => ({
      ...frame,
      sourceFrameIndex,
      sourceKey: key,
    })),
  ).flat();
  const idleFrames = animations.idle.frames.map((frame, sourceFrameIndex) => ({
    ...frame,
    sourceFrameIndex,
    sourceKey: "idle",
  }));

  return {
    frames: [...actionFrames, ...idleFrames],
    loopStartIndex: actionFrames.length,
  };
}
