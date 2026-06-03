import type { PlayerColor } from './types';

export const TRACK_CELL_COUNT = 52;
export const BASE_POSITION = -1;
export const HOME_PATH_START_POSITION = 52;
export const HOME_GOAL_POSITION = 57;

export const COLOR_OFFSETS: Record<PlayerColor, { start: number; threshold: number }> = {
  RED: { start: 0, threshold: 50 },
  GREEN: { start: 13, threshold: 11 },
  YELLOW: { start: 26, threshold: 24 },
  BLUE: { start: 39, threshold: 37 }
};

export const SAFE_CELLS = new Set<number>([
  0, 8, 13, 21, 26, 34, 39, 47
]);

export const TURN_ORDER: PlayerColor[] = ['RED', 'GREEN', 'YELLOW', 'BLUE'];

export const TURN_TIMER_DURATION = 15; // in seconds
