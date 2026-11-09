export const SCENE_BOX = { width: 260, height: 210 } as const;
export const STEP_MS = 1_600;
export const MOON = { x: 196, y: 128 } as const;
export const SATELLITE = { x: 150, y: 56 } as const;
const CENTRE = { x: 130, y: 105 } as const;
const COMPASS_ERROR = { x: -26, y: -14 } as const;
const LINED_UP = { x: 0, y: 0 } as const;

export const CAMERA_FRAMES = ['show', 'moon', 'hold'] as const;
export type CameraFrame = (typeof CAMERA_FRAMES)[number];

const BEATS: Readonly<Record<CameraFrame, number>> = { show: 2, moon: 2, hold: 3 };

export type WalkthroughPosition = { frame: CameraFrame; beat: number };

export type SceneBadge = 'off' | 'linedUp' | 'holding' | 'caught' | null;

export type Scene = {
  overlay: number;
  offset: { x: number; y: number };
  crosshair: { x: number; y: number };
  marker: 'hidden' | 'off' | 'linedUp';
  ring: number | null;
  badge: SceneBadge;
  showSet: boolean;
};

export const FIRST_POSITION: WalkthroughPosition = { frame: 'show', beat: 0 };

export function advance({ frame, beat }: WalkthroughPosition): WalkthroughPosition {
  if (beat + 1 < BEATS[frame]) {
    return { frame, beat: beat + 1 };
  }
  const next = CAMERA_FRAMES[(CAMERA_FRAMES.indexOf(frame) + 1) % CAMERA_FRAMES.length]!;
  return { frame: next, beat: 0 };
}

export function settled(frame: CameraFrame): WalkthroughPosition {
  return { frame, beat: BEATS[frame] - 1 };
}

export function sceneFor({ frame, beat }: WalkthroughPosition): Scene {
  switch (frame) {
    case 'show':
      return {
        overlay: beat === 0 ? 0.15 : 1,
        offset: LINED_UP,
        crosshair: CENTRE,
        marker: 'hidden',
        ring: null,
        badge: null,
        showSet: false,
      };
    case 'moon':
      return {
        overlay: 1,
        offset: beat === 0 ? COMPASS_ERROR : LINED_UP,
        crosshair: MOON,
        marker: beat === 0 ? 'off' : 'linedUp',
        ring: null,
        badge: beat === 0 ? 'off' : 'linedUp',
        showSet: beat === 0,
      };
    case 'hold':
      return {
        overlay: 1,
        offset: LINED_UP,
        crosshair: SATELLITE,
        marker: 'hidden',
        ring: beat === 0 ? 0 : 1,
        badge: beat === 0 ? null : beat === 1 ? 'holding' : 'caught',
        showSet: false,
      };
  }
}
