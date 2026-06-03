import { describe, it, expect } from 'vitest';
import {
  createInitialGameState,
  rollDice,
  moveToken,
  calculateNextPosition
} from '../../engine/ludoEngine';
import type { GameState } from '../../engine/types';

describe('Ludo Game Engine Tests', () => {
  const createTestGame = (): GameState => {
    return createInitialGameState('test-match', [
      { userId: 'user-1', displayName: 'Red Player', color: 'RED', isAi: false },
      { userId: 'user-2', displayName: 'Green Player', color: 'GREEN', isAi: false }
    ]);
  };

  it('should calculate correct next positions for token releases and moves', () => {
    // Red Start = 0
    expect(calculateNextPosition('RED', -1, 6)).toBe(0);
    expect(calculateNextPosition('RED', -1, 5)).toBe(null);
    expect(calculateNextPosition('RED', 0, 4)).toBe(4);
    
    // Wrap around check for track
    expect(calculateNextPosition('RED', 50, 1)).toBe(52); // Red enters home path at 51 steps (position 52)
    expect(calculateNextPosition('RED', 50, 6)).toBe(57); // Red enters goal exactly
    expect(calculateNextPosition('RED', 50, 7)).toBe(null); // Overshoot
    
    // Home path moves
    expect(calculateNextPosition('RED', 52, 2)).toBe(54);
    expect(calculateNextPosition('RED', 55, 2)).toBe(57);
    expect(calculateNextPosition('RED', 55, 3)).toBe(null); // Overshoot from home path
  });

  it('should initialize game state with all tokens in base', () => {
    const game = createTestGame();
    expect(game.status).toBe('ACTIVE');
    expect(game.activeColor).toBe('RED');
    expect(game.turnPhase).toBe('WAITING_FOR_ROLL');
    expect(game.players.RED.tokens.every((t) => t.position === -1)).toBe(true);
  });

  it('should release token from base when a 6 is rolled', () => {
    let state = createTestGame();
    
    // Roll 6
    const rollResult = rollDice(state, 6);
    state = rollResult.nextState;
    expect(state.lastRoll).toBe(6);
    expect(state.turnPhase).toBe('WAITING_FOR_MOVE');
    expect(state.consecutiveSixesCount).toBe(1);
    expect(state.availableMoves.length).toBe(4); // All 4 tokens can release
    
    // Move token index 0
    const moveResult = moveToken(state, 0);
    state = moveResult.nextState;
    
    expect(state.players.RED.tokens[0].position).toBe(0);
    expect(state.players.RED.tokens[0].status).toBe('TRACK');
    expect(state.turnPhase).toBe('WAITING_FOR_ROLL');
    expect(state.activeColor).toBe('RED'); // Should get extra turn for rolling 6
  });

  it('should pass turn to green if 1-5 is rolled and all tokens are in base', () => {
    let state = createTestGame();
    
    const rollResult = rollDice(state, 3);
    state = rollResult.nextState;
    
    expect(state.activeColor).toBe('GREEN');
    expect(state.turnPhase).toBe('WAITING_FOR_ROLL');
    expect(state.lastRoll).toBe(null); // Reset for next turn
  });

  it('should enforce the triple six forfeit rule', () => {
    let state = createTestGame();
    
    // Roll 1: Six
    state = rollDice(state, 6).nextState;
    state = moveToken(state, 0).nextState; // Release token 0 to pos 0
    expect(state.activeColor).toBe('RED');
    expect(state.consecutiveSixesCount).toBe(1);

    // Roll 2: Six
    state = rollDice(state, 6).nextState;
    state = moveToken(state, 0).nextState; // Move token 0 from pos 0 to 6
    expect(state.activeColor).toBe('RED');
    expect(state.consecutiveSixesCount).toBe(2);

    // Roll 3: Six -> Should immediately forfeit turn and switch to Green
    state = rollDice(state, 6).nextState;
    expect(state.activeColor).toBe('GREEN');
    expect(state.consecutiveSixesCount).toBe(0); // Reset
    expect(state.lastRoll).toBe(null);
    expect(state.turnPhase).toBe('WAITING_FOR_ROLL');
  });

  it('should capture opponent token when landing on same cell if not in safe zone', () => {
    let state = createTestGame();
    
    // Setup: Red token 0 is at global position 10.
    state.players.RED.tokens[0].position = 10;
    state.players.RED.tokens[0].status = 'TRACK';
    
    // Opponent is at position 12 (not a safe cell).
    state.players.GREEN.tokens[0].position = 12;
    state.players.GREEN.tokens[0].status = 'TRACK';
    
    // Red rolls a 2 (to move from 10 to 12)
    state.activeColor = 'RED';
    state.turnPhase = 'WAITING_FOR_ROLL';
    state.consecutiveSixesCount = 0;
    
    state = rollDice(state, 2).nextState;
    
    // Verify move is marked as capture
    const move = state.availableMoves.find((m) => m.tokenIndex === 0);
    expect(move).toBeDefined();
    expect(move?.isCapture).toBe(true);
    
    // Execute move
    const moveResult = moveToken(state, 0);
    state = moveResult.nextState;
    
    // Red token 0 should land on 12
    expect(state.players.RED.tokens[0].position).toBe(12);
    // Green token 0 should be sent back to base (-1)
    expect(state.players.GREEN.tokens[0].position).toBe(-1);
    expect(state.players.GREEN.tokens[0].status).toBe('BASE');
    
    // Red player should receive extra turn (activeColor RED, WAITING_FOR_ROLL)
    expect(state.activeColor).toBe('RED');
    expect(state.turnPhase).toBe('WAITING_FOR_ROLL');
  });

  it('should not capture opponent token when landing in a safe zone', () => {
    let state = createTestGame();
    
    // Safe cell 8
    state.players.RED.tokens[0].position = 5;
    state.players.RED.tokens[0].status = 'TRACK';
    
    state.players.GREEN.tokens[0].position = 8; // On safe cell 8
    state.players.GREEN.tokens[0].status = 'TRACK';
    
    state.activeColor = 'RED';
    state.turnPhase = 'WAITING_FOR_ROLL';
    
    state = rollDice(state, 3).nextState; // Move Red token 0 to 8
    
    const move = state.availableMoves.find((m) => m.tokenIndex === 0);
    expect(move?.isCapture).toBe(false); // Should be false since 8 is a Safe Zone
    
    state = moveToken(state, 0).nextState;
    
    expect(state.players.RED.tokens[0].position).toBe(8);
    expect(state.players.GREEN.tokens[0].position).toBe(8); // Still co-existing
    
    // Turn should pass to Green
    expect(state.activeColor).toBe('GREEN');
    expect(state.turnPhase).toBe('WAITING_FOR_ROLL');
  });

  it('should award extra turn on goal entry and complete game when all 4 reach goal', () => {
    let state = createTestGame();
    
    // Set 3 tokens home, and 1 token on home path cell 55 (2 steps from goal 57)
    state.players.RED.tokens[0].position = 57;
    state.players.RED.tokens[0].status = 'HOME';
    state.players.RED.tokens[1].position = 57;
    state.players.RED.tokens[1].status = 'HOME';
    state.players.RED.tokens[2].position = 57;
    state.players.RED.tokens[2].status = 'HOME';
    state.players.RED.tokens[3].position = 55;
    state.players.RED.tokens[3].status = 'HOME_PATH';
    
    state.activeColor = 'RED';
    state.turnPhase = 'WAITING_FOR_ROLL';
    
    // Roll 2 (exact entry)
    state = rollDice(state, 2).nextState;
    
    const moveResult = moveToken(state, 3);
    state = moveResult.nextState;
    
    expect(state.players.RED.tokens[3].position).toBe(57);
    expect(state.players.RED.tokens[3].status).toBe('HOME');
    expect(state.players.RED.finishOrder).toBe(1);
    
    // Match should be completed
    expect(state.status).toBe('COMPLETED');
    expect(state.winnerColor).toBe('RED');
  });
});
