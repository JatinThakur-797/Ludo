import type {
  GameState,
  PlayerColor,
  TokenState,
  ValidMove,
  GameEffect,
  PlayerState
} from './types';
import {
  BASE_POSITION,
  COLOR_OFFSETS,
  HOME_GOAL_POSITION,
  HOME_PATH_START_POSITION,
  SAFE_CELLS,
  TRACK_CELL_COUNT,
  TURN_ORDER
} from './constants';

/**
 * Calculates the next position of a token on the board.
 * Returns null if the move is an overshoot (invalid).
 */
export function calculateNextPosition(
  color: PlayerColor,
  currentPosition: number,
  roll: number
): number | null {
  if (currentPosition === BASE_POSITION) {
    if (roll === 6) {
      return COLOR_OFFSETS[color].start;
    }
    return null; // Cannot move out of base without a 6
  }

  if (currentPosition === HOME_GOAL_POSITION) {
    return null; // Already finished
  }

  const offsetInfo = COLOR_OFFSETS[color];

  // If token is on the global track (0 to 51)
  if (currentPosition >= 0 && currentPosition < TRACK_CELL_COUNT) {
    // Calculate steps taken from the start cell
    const stepsTaken = (currentPosition - offsetInfo.start + TRACK_CELL_COUNT) % TRACK_CELL_COUNT;
    const newSteps = stepsTaken + roll;

    if (newSteps <= 50) {
      // Stays on global track
      return (currentPosition + roll) % TRACK_CELL_COUNT;
    } else if (newSteps <= 56) {
      // Enters the home path:
      // Steps 51-55 map to 52-56 (Home Path)
      // Step 56 maps to 57 (Goal)
      return HOME_PATH_START_POSITION + (newSteps - 51);
    } else {
      // Overshoot (e.g. newSteps > 56)
      return null;
    }
  }

  // If token is already on the home path (52 to 56)
  if (currentPosition >= HOME_PATH_START_POSITION && currentPosition < HOME_GOAL_POSITION) {
    const nextPos = currentPosition + roll;
    if (nextPos <= HOME_GOAL_POSITION) {
      return nextPos;
    }
    return null; // Overshoot
  }

  return null;
}

/**
 * Evaluates all valid moves for the active player's tokens given a dice roll.
 */
export function getValidMoves(
  state: GameState,
  color: PlayerColor,
  roll: number
): ValidMove[] {
  const player = state.players[color];
  if (!player || player.finishOrder !== null) {
    return [];
  }

  const validMoves: ValidMove[] = [];

  player.tokens.forEach((token) => {
    const nextPos = calculateNextPosition(color, token.position, roll);
    if (nextPos !== null) {
      // Check if this move triggers a capture
      let isCapture = false;
      if (nextPos >= 0 && nextPos < TRACK_CELL_COUNT && !SAFE_CELLS.has(nextPos)) {
        // Find if any opponent token occupies this coordinate
        for (const otherColor of TURN_ORDER) {
          if (otherColor === color) continue;
          const otherPlayer = state.players[otherColor];
          if (!otherPlayer || otherPlayer.finishOrder !== null) continue;

          const hasOpponentToken = otherPlayer.tokens.some(
            (t) => t.position === nextPos
          );
          if (hasOpponentToken) {
            isCapture = true;
            break;
          }
        }
      }

      validMoves.push({
        tokenIndex: token.index,
        fromPosition: token.position,
        toPosition: nextPos,
        isCapture,
        isGoalEntry: nextPos === HOME_GOAL_POSITION
      });
    }
  });

  return validMoves;
}

/**
 * Helper to get the next active player color clockwise.
 */
export function getNextPlayerColor(
  players: Record<PlayerColor, PlayerState>,
  activeColor: PlayerColor
): PlayerColor {
  const currentIndex = TURN_ORDER.indexOf(activeColor);
  for (let i = 1; i <= 4; i++) {
    const nextIndex = (currentIndex + i) % 4;
    const nextColor = TURN_ORDER[nextIndex];
    const player = players[nextColor];
    if (player && player.finishOrder === null) {
      return nextColor;
    }
  }
  return activeColor;
}

/**
 * Triggers a dice roll.
 */
export function rollDice(
  state: GameState,
  diceOverride?: number
): {
  nextState: GameState;
  effects: GameEffect[];
} {
  if (state.status !== 'ACTIVE') {
    throw new Error('Game is not active');
  }
  if (state.turnPhase !== 'WAITING_FOR_ROLL') {
    throw new Error('Invalid turn phase: must be WAITING_FOR_ROLL');
  }

  const activeColor = state.activeColor;
  if (!activeColor) {
    throw new Error('No active player color set');
  }

  const roll = diceOverride !== undefined ? diceOverride : Math.floor(Math.random() * 6) + 1;
  const nextState: GameState = JSON.parse(JSON.stringify(state));
  nextState.sequenceNumber += 1;
  nextState.lastRoll = roll;

  const effects: GameEffect[] = [
    {
      type: 'PLAY_SOUND_ROLL',
      payload: { color: activeColor, roll }
    }
  ];

  if (roll === 6) {
    nextState.consecutiveSixesCount += 1;
    if (nextState.consecutiveSixesCount === 3) {
      // Forfeit turn
      nextState.consecutiveSixesCount = 0;
      nextState.lastRoll = null;
      nextState.availableMoves = [];
      nextState.activeColor = getNextPlayerColor(nextState.players, activeColor);
      nextState.turnPhase = 'WAITING_FOR_ROLL';

      return {
        nextState,
        effects: [
          ...effects,
          {
            type: 'PLAY_SOUND_MOVE', // Or warning sound/forfeit sound
            payload: { message: `Player ${activeColor} forfeited turn due to 3 consecutive sixes` }
          }
        ]
      };
    }
  } else {
    nextState.consecutiveSixesCount = 0;
  }

  const validMoves = getValidMoves(nextState, activeColor, roll);

  if (validMoves.length === 0) {
    // If we roll a 6 but have no valid moves, we STILL lose the extra roll turn in standard forfeit?
    // In Ludo, rolling a 6 but having no possible moves means the turn advances to the next player.
    nextState.consecutiveSixesCount = 0;
    nextState.lastRoll = null;
    nextState.availableMoves = [];
    nextState.activeColor = getNextPlayerColor(nextState.players, activeColor);
    nextState.turnPhase = 'WAITING_FOR_ROLL';
  } else {
    nextState.availableMoves = validMoves;
    nextState.turnPhase = 'WAITING_FOR_MOVE';
  }

  return {
    nextState,
    effects
  };
}

/**
 * Moves a token to a new position.
 */
export function moveToken(
  state: GameState,
  tokenIndex: number
): {
  nextState: GameState;
  effects: GameEffect[];
} {
  if (state.status !== 'ACTIVE') {
    throw new Error('Game is not active');
  }
  if (state.turnPhase !== 'WAITING_FOR_MOVE') {
    throw new Error('Invalid turn phase: must be WAITING_FOR_MOVE');
  }

  const activeColor = state.activeColor;
  if (!activeColor) {
    throw new Error('No active player color set');
  }

  const move = state.availableMoves.find((m) => m.tokenIndex === tokenIndex);
  if (!move) {
    throw new Error(`Token ${tokenIndex} is not eligible to move`);
  }

  const nextState: GameState = JSON.parse(JSON.stringify(state));
  nextState.sequenceNumber += 1;

  const player = nextState.players[activeColor];
  const token = player.tokens[tokenIndex];

  const fromPos = token.position;
  const toPos = move.toPosition;

  // Move token
  token.position = toPos;
  if (toPos === BASE_POSITION) {
    token.status = 'BASE';
    token.isSafe = false;
  } else if (toPos >= 0 && toPos < TRACK_CELL_COUNT) {
    token.status = 'TRACK';
    token.isSafe = SAFE_CELLS.has(toPos);
  } else if (toPos >= HOME_PATH_START_POSITION && toPos < HOME_GOAL_POSITION) {
    token.status = 'HOME_PATH';
    token.isSafe = true; // Home path is always safe
  } else if (toPos === HOME_GOAL_POSITION) {
    token.status = 'HOME';
    token.isSafe = true;
  }

  const effects: GameEffect[] = [];

  // Generate basic movement sound effect
  effects.push({
    type: 'PLAY_SOUND_MOVE',
    payload: { color: activeColor, tokenIndex, fromPosition: fromPos, toPosition: toPos }
  });

  // Resolve captures
  let hasCapture = false;
  if (move.isCapture) {
    // Find opposing tokens on toPos and send them back to base
    for (const otherColor of TURN_ORDER) {
      if (otherColor === activeColor) continue;
      const otherPlayer = nextState.players[otherColor];
      if (!otherPlayer || otherPlayer.finishOrder !== null) continue;

      otherPlayer.tokens.forEach((otherToken) => {
        if (otherToken.position === toPos) {
          otherToken.position = BASE_POSITION;
          otherToken.status = 'BASE';
          otherToken.isSafe = false;
          hasCapture = true;

          effects.push({
            type: 'PLAY_SOUND_CAPTURE',
            payload: {
              capturerColor: activeColor,
              capturedColor: otherColor,
              tokenIndex: otherToken.index
            }
          });
        }
      });
    }
  }

  // Resolve goal arrivals
  let reachedGoal = false;
  if (toPos === HOME_GOAL_POSITION) {
    reachedGoal = true;
    effects.push({
      type: 'PLAY_SOUND_GOAL',
      payload: { color: activeColor, tokenIndex }
    });

    // Check if player has finished all 4 tokens
    const allHome = player.tokens.every((t) => t.position === HOME_GOAL_POSITION);
    if (allHome) {
      // Find current max finish order
      let maxFinish = 0;
      Object.values(nextState.players).forEach((p) => {
        if (p.finishOrder !== null && p.finishOrder > maxFinish) {
          maxFinish = p.finishOrder;
        }
      });

      player.finishOrder = maxFinish + 1;
      effects.push({
        type: 'PLAYER_WON',
        payload: { color: activeColor, rank: player.finishOrder }
      });

      // Check if game is completed
      // Standard game ends when the first player wins, or when only one player remains unfinished.
      // Let's implement standard "First player to get all tokens home wins, ending the game"
      nextState.winnerColor = activeColor;
      nextState.status = 'COMPLETED';
      nextState.turnPhase = 'RESOLVING_BONUS'; // Terminal phase
      nextState.activeColor = null;
      nextState.availableMoves = [];

      effects.push({
        type: 'GAME_OVER',
        payload: { winnerColor: activeColor }
      });

      return {
        nextState,
        effects
      };
    }
  }

  // Determine bonus rolls and turn switching
  // Rules: Rolling a 6, capturing an opponent, or entering a token into home goal awards a bonus roll.
  const hasBonusRoll = (state.lastRoll === 6) || hasCapture || reachedGoal;

  nextState.lastRoll = null;
  nextState.availableMoves = [];

  if (hasBonusRoll) {
    // Active player gets another roll.
    // Reset consecutive 6s count IF the bonus came from capture or goal entry, NOT from a 6.
    if (! (state.lastRoll === 6)) {
      nextState.consecutiveSixesCount = 0;
    }
    nextState.turnPhase = 'WAITING_FOR_ROLL';
  } else {
    // Shift turn to next clockwise player
    nextState.consecutiveSixesCount = 0;
    nextState.activeColor = getNextPlayerColor(nextState.players, activeColor);
    nextState.turnPhase = 'WAITING_FOR_ROLL';
  }

  return {
    nextState,
    effects
  };
}

/**
 * Creates a helper function to bootstrap an initial GameState.
 */
export function createInitialGameState(
  gameId: string,
  playerConfigs: Array<{ userId: string | null; displayName: string; color: PlayerColor; isAi: boolean }>
): GameState {
  const players: Record<PlayerColor, PlayerState> = {} as any;

  playerConfigs.forEach((config) => {
    const tokens: TokenState[] = Array.from({ length: 4 }).map((_, index) => ({
      index,
      position: BASE_POSITION,
      status: 'BASE',
      isSafe: false
    }));

    players[config.color] = {
      userId: config.userId,
      displayName: config.displayName,
      color: config.color,
      isOnline: true,
      isAi: config.isAi,
      tokens: tokens as any,
      finishOrder: null
    };
  });

  // Pick first active color from playerConfigs
  const activeColor = playerConfigs.length > 0 ? playerConfigs[0].color : 'RED';

  return {
    gameId,
    status: 'ACTIVE',
    players,
    activeColor,
    turnPhase: 'WAITING_FOR_ROLL',
    lastRoll: null,
    consecutiveSixesCount: 0,
    availableMoves: [],
    winnerColor: null,
    sequenceNumber: 0
  };
}
