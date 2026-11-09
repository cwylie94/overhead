import type { Silhouette } from '@/domain/silhouette';

export const SHAPE_BOX = { width: 120, height: 80 } as const;

export type Shape =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; filled: boolean; round?: number }
  | { kind: 'circle'; cx: number; cy: number; r: number; filled: boolean };

const rect = (x: number, y: number, w: number, h: number, filled = true, round = 0): Shape => ({
  kind: 'rect',
  x,
  y,
  w,
  h,
  filled,
  round,
});
const circle = (cx: number, cy: number, r: number, filled = true): Shape => ({
  kind: 'circle',
  cx,
  cy,
  r,
  filled,
});

export const SILHOUETTE_SHAPES: Readonly<Record<Silhouette, readonly Shape[]>> = {
  station: [
    rect(6, 27, 34, 10),
    rect(80, 27, 34, 10),
    rect(6, 43, 34, 10),
    rect(80, 43, 34, 10),
    rect(6, 39, 108, 2),
    rect(46, 26, 28, 28, false, 3),
    rect(55, 16, 10, 10, false, 2),
    rect(55, 54, 10, 10, false, 2),
  ],
  telescope: [
    rect(26, 26, 62, 28, false, 4),
    rect(88, 22, 8, 36),
    rect(38, 6, 34, 14),
    rect(38, 60, 34, 14),
    rect(54, 20, 2, 6),
    rect(54, 54, 2, 6),
  ],
  earthWatcher: [
    rect(44, 22, 28, 34, false, 3),
    rect(72, 37, 6, 2),
    rect(78, 30, 36, 16),
    rect(57, 10, 2, 12),
    circle(58, 9, 3),
    circle(58, 64, 6),
  ],
  constellation: [
    rect(14, 20, 92, 14),
    rect(58, 34, 4, 6),
    rect(30, 40, 60, 12, false, 2),
    circle(42, 60, 4),
    circle(78, 60, 4),
  ],
  spy: [
    circle(60, 32, 24, false),
    circle(60, 32, 4),
    rect(59, 32, 2, 26),
    rect(50, 58, 20, 16, true, 2),
  ],
  payload: [
    circle(60, 40, 18, false),
    circle(60, 40, 6),
    rect(16, 39, 26, 2),
    rect(78, 39, 26, 2),
    rect(59, 6, 2, 16),
    rect(59, 58, 2, 16),
  ],
  rocketStage: [
    rect(46, 6, 28, 56, false, 4),
    rect(46, 22, 28, 2),
    rect(46, 44, 28, 2),
    rect(50, 62, 20, 6),
    rect(54, 68, 12, 6),
  ],
  debris: [
    rect(28, 30, 16, 10),
    rect(62, 20, 12, 9, false, 1),
    rect(76, 46, 18, 8),
    rect(46, 52, 9, 9, false, 1),
    circle(92, 26, 3),
    circle(34, 60, 2.5),
    circle(60, 40, 2),
  ],
};
