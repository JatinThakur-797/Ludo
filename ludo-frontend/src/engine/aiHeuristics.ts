import type { GameState, ValidMove, PlayerColor } from './types';
import { SAFE_CELLS, BASE_POSITION, HOME_GOAL_POSITION, COLOR_OFFSETS, TRACK_CELL_COUNT } from './constants';

/**
 * Calculates steps taken from starting cell on the global track (0 to 51).
 */
function getStepsTaken(color: PlayerColor, position: number): number {
  if (position === BASE_POSITION) return -1;
  if (position === HOME_GOAL_POSITION) return 56;
  if (position >= 52 && position <= 56) {
    return 50 + (position - 51);
  }
  const offset = COLOR_OFFSETS[color].start;
  return (position - offset + TRACK_CELL_COUNT) % TRACK_CELL_COUNT;
}

/**
 * Checks if a token at global track cell position is threatened by trailing opponents.
 */
function isPositionThreatened(state: GameState, activeColor: PlayerColor, position: number): boolean {
  if (position === BASE_POSITION || position === HOME_GOAL_POSITION || position >= 52) {
    return false; // Safe areas
  }
  if (SAFE_CELLS.has(position)) {
    return false; // Safe star cells
  }

  // Iterate over all opponents to find if any are within 6 cells trailing this position
  for (const oppColor of Object.keys(state.players) as PlayerColor[]) {
    if (oppColor === activeColor) continue;
    const player = state.players[oppColor];
    if (!player || player.finishOrder !== null) continue;

    for (const token of player.tokens) {
      if (token.position === BASE_POSITION || token.position === HOME_GOAL_POSITION || token.position >= 52) {
        continue;
      }

      const distance = (position - token.position + TRACK_CELL_COUNT) % TRACK_CELL_COUNT;
      if (distance > 0 && distance <= 6) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Evaluates the heuristic weight of a candidate move.
 */
export function evaluateMove(
  state: GameState,
  move: ValidMove,
  color: PlayerColor
): number {
  let score = 0;

  const fromPos = move.fromPosition;
  const toPos = move.toPosition;

  // 1. Capture Opportunity (Highest priority)
  if (move.isCapture) {
    score += 500;
  }

  // 2. Goal Entry (High priority)
  if (move.isGoalEntry) {
    score += 400;
  }

  // 3. Releasing from Base (Release tokens early)
  if (fromPos === BASE_POSITION && toPos !== BASE_POSITION) {
    score += 150;
  }

  // 4. Progress and positioning
  if (fromPos !== BASE_POSITION && toPos !== BASE_POSITION) {
    const prevSteps = getStepsTaken(color, fromPos);
    const nextSteps = getStepsTaken(color, toPos);
    const stepsProgress = nextSteps - prevSteps;

    // Base progression score
    score += stepsProgress * 3;

    // Prefer advancing tokens that are further ahead on the board (push to goal)
    score += nextSteps * 1.5;
  }

  // 5. Danger Escape Checks
  const wasThreatened = isPositionThreatened(state, color, fromPos);
  const isThreatened = isPositionThreatened(state, color, toPos);

  if (wasThreatened && !isThreatened) {
    score += 200; // Reward escaping a threat
  }

  // 6. Safe Zone Entry
  const wasSafe = fromPos === BASE_POSITION || fromPos === HOME_GOAL_POSITION || fromPos >= 52 || SAFE_CELLS.has(fromPos);
  const isSafe = toPos === HOME_GOAL_POSITION || toPos >= 52 || SAFE_CELLS.has(toPos);

  if (!wasSafe && isSafe) {
    score += 100; // Reward landing in safe zone
  }

  // 7. Danger Zone Landing Penalty
  if (!isSafe && isThreatened) {
    score -= 80; // Penalize landing in front of opponents
  }

  // 8. Safe Zone Escape Penalty
  if (wasSafe && !isSafe && isPositionThreatened(state, color, toPos)) {
    score -= 100; // Discourage leaving a safe cell if it leads directly to danger
  }

  return score;
}

/**
 * Evaluates a list of valid moves and returns the best one.
 * Returns null if the moves list is empty.
 */
export function selectBestMove(
  state: GameState,
  moves: ValidMove[],
  color: PlayerColor
): ValidMove | null {
  if (moves.length === 0) return null;

  let bestMove = moves[0];
  let maxScore = -Infinity;

  moves.forEach((move) => {
    const score = evaluateMove(state, move, color);
    if (score > maxScore) {
      maxScore = score;
      bestMove = move;
    }
  });

  return bestMove;
}
