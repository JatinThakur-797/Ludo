import type { PlayerColor } from '../engine/types';

export interface Point {
  x: number;
  y: number;
}

// Cell dimension: 40px on a 600x600 board (15x15 cells)
const CELL_SIZE = 40;
const HALF_CELL = CELL_SIZE / 2;

// Maps a column and row (0-14 index) to pixel coordinates (center of the cell)
function getCellCenter(col: number, row: number): Point {
  return {
    x: col * CELL_SIZE + HALF_CELL,
    y: row * CELL_SIZE + HALF_CELL
  };
}

// 52 common global track cell column-row index configurations clockwise
export const GLOBAL_TRACK_CELLS_GRID: Array<[number, number]> = [
  // Left arm going right (Row 6)
  [1, 6],   // 0 (RED Start)
  [2, 6],   // 1
  [3, 6],   // 2
  [4, 6],   // 3
  [5, 6],   // 4
  // Top arm going up (Col 6)
  [6, 5],   // 5
  [6, 4],   // 6
  [6, 3],   // 7
  [6, 2],   // 8 (Safe Zone)
  [6, 1],   // 9
  [6, 0],   // 10
  // Top arm crossover (Col 7)
  [7, 0],   // 11
  // Top arm going down (Col 8)
  [8, 0],   // 12
  [8, 1],   // 13 (GREEN Start)
  [8, 2],   // 14
  [8, 3],   // 15
  [8, 4],   // 16
  [8, 5],   // 17
  // Right arm going right (Row 6)
  [9, 6],   // 18
  [10, 6],  // 19
  [11, 6],  // 20
  [12, 6],  // 21 (Safe Zone)
  [13, 6],  // 22
  [14, 6],  // 23
  // Right arm crossover (Row 7)
  [14, 7],  // 24
  // Right arm going left (Row 8)
  [14, 8],  // 25
  [13, 8],  // 26 (YELLOW Start)
  [12, 8],  // 27
  [11, 8],  // 28
  [10, 8],  // 29
  [9, 8],   // 30
  // Bottom arm going down (Col 8)
  [8, 9],   // 31
  [8, 10],  // 32
  [8, 11],  // 33
  [8, 12],  // 34 (Safe Zone)
  [8, 13],  // 35
  [8, 14],  // 36
  // Bottom arm crossover (Col 7)
  [7, 14],  // 37
  // Bottom arm going up (Col 6)
  [6, 14],  // 38
  [6, 13],  // 39 (BLUE Start)
  [6, 12],  // 40
  [6, 11],  // 41
  [6, 10],  // 42
  [6, 9],   // 43
  // Left arm going left (Row 8)
  [5, 8],   // 44
  [4, 8],   // 45
  [3, 8],   // 46
  [2, 8],   // 47 (Safe Zone)
  [1, 8],   // 48
  [0, 8],   // 49
  // Left arm crossover (Row 7)
  [0, 7],   // 50
  // Left arm going right (Row 6)
  [0, 6]    // 51
];

// Color specific home path layouts (cells 52 - 56)
export const HOME_PATH_CELLS_GRID: Record<PlayerColor, Array<[number, number]>> = {
  RED: [
    [1, 7], [2, 7], [3, 7], [4, 7], [5, 7]
  ],
  GREEN: [
    [7, 1], [7, 2], [7, 3], [7, 4], [7, 5]
  ],
  YELLOW: [
    [13, 7], [12, 7], [11, 7], [10, 7], [9, 7]
  ],
  BLUE: [
    [7, 13], [7, 12], [7, 11], [7, 10], [7, 9]
  ]
};

// Base Yard locations for 4 tokens per color (index 0 - 3)
const BASE_YARD_OFFSETS: Record<PlayerColor, Point[]> = {
  RED: [
    { x: 80, y: 80 },
    { x: 160, y: 80 },
    { x: 80, y: 160 },
    { x: 160, y: 160 }
  ],
  GREEN: [
    { x: 440, y: 80 },
    { x: 520, y: 80 },
    { x: 440, y: 160 },
    { x: 520, y: 160 }
  ],
  YELLOW: [
    { x: 440, y: 440 },
    { x: 520, y: 440 },
    { x: 440, y: 520 },
    { x: 520, y: 520 }
  ],
  BLUE: [
    { x: 80, y: 440 },
    { x: 160, y: 440 },
    { x: 80, y: 520 },
    { x: 160, y: 520 }
  ]
};

// Center Goal triangle absolute coordinate centers (position 57)
const HOME_GOALS: Record<PlayerColor, Point> = {
  RED: { x: 260, y: 300 },
  GREEN: { x: 300, y: 260 },
  YELLOW: { x: 340, y: 300 },
  BLUE: { x: 300, y: 340 }
};

/**
 * Returns absolute SVG coordinate Point {x, y} for a token on a 600x600 board.
 */
export function getTokenCoordinates(
  color: PlayerColor,
  position: number,
  tokenIndex: number
): Point {
  // 1. Base position
  if (position === -1) {
    return BASE_YARD_OFFSETS[color][tokenIndex] || { x: 0, y: 0 };
  }

  // 2. Goal position
  if (position === 57) {
    return HOME_GOALS[color];
  }

  // 3. Home path
  if (position >= 52 && position <= 56) {
    const pathIndex = position - 52;
    const [col, row] = HOME_PATH_CELLS_GRID[color][pathIndex];
    return getCellCenter(col, row);
  }

  // 4. Global common track
  if (position >= 0 && position < 52) {
    const [col, row] = GLOBAL_TRACK_CELLS_GRID[position];
    return getCellCenter(col, row);
  }

  return { x: 0, y: 0 };
}
