import { describe, it, expect } from 'vitest';
import { selectBestMove, evaluateMove } from '../../engine/aiHeuristics';
import { createInitialGameState } from '../../engine/ludoEngine';
import type { GameState, ValidMove } from '../../engine/types';

describe('AI Heuristics Engine Tests', () => {
  const createTestGame = (): GameState => {
    return createInitialGameState('ai-test-match', [
      { userId: null, displayName: 'Red Bot', color: 'RED', isAi: true },
      { userId: 'user-2', displayName: 'Green Player', color: 'GREEN', isAi: false }
    ]);
  };

  it('should prioritize capture moves over simple progression', () => {
    const state = createTestGame();
    
    // Set up RED token 0 so it can capture GREEN token 0 on cell 12
    state.players.RED.tokens[0].position = 10;
    state.players.RED.tokens[0].status = 'TRACK';
    
    state.players.GREEN.tokens[0].position = 12;
    state.players.GREEN.tokens[0].status = 'TRACK';

    // Set up RED token 1 at cell 20 (safe from capturing anything)
    state.players.RED.tokens[1].position = 20;
    state.players.RED.tokens[1].status = 'TRACK';

    const candidateMoves: ValidMove[] = [
      {
        tokenIndex: 0,
        fromPosition: 10,
        toPosition: 12,
        isCapture: true,
        isGoalEntry: false
      },
      {
        tokenIndex: 1,
        fromPosition: 20,
        toPosition: 22,
        isCapture: false,
        isGoalEntry: false
      }
    ];

    const best = selectBestMove(state, candidateMoves, 'RED');
    expect(best).toBeDefined();
    expect(best?.tokenIndex).toBe(0); // Should select token 0 (capture)
    expect(best?.isCapture).toBe(true);
  });

  it('should escape danger when threatened by trailing opponent', () => {
    const state = createTestGame();

    // RED token 0 is at 10. GREEN token 0 is trailing at 8 (distance 2, in danger!)
    state.players.RED.tokens[0].position = 10;
    state.players.RED.tokens[0].status = 'TRACK';
    
    state.players.GREEN.tokens[0].position = 8;
    state.players.GREEN.tokens[0].status = 'TRACK';

    // RED token 1 is safe at 30 (no green token trails it)
    state.players.RED.tokens[1].position = 30;
    state.players.RED.tokens[1].status = 'TRACK';

    // Move options for a roll of 5
    // Moving token 0 moves it to 15 (no longer trailed within 6 steps from 8)
    // Moving token 1 moves it to 35 (not threatened, but no danger escaped)
    const candidateMoves: ValidMove[] = [
      {
        tokenIndex: 0,
        fromPosition: 10,
        toPosition: 15,
        isCapture: false,
        isGoalEntry: false
      },
      {
        tokenIndex: 1,
        fromPosition: 30,
        toPosition: 35,
        isCapture: false,
        isGoalEntry: false
      }
    ];

    // Score of escaping danger should be higher
    const score0 = evaluateMove(state, candidateMoves[0], 'RED');
    const score1 = evaluateMove(state, candidateMoves[1], 'RED');
    
    expect(score0).toBeGreaterThan(score1);
    
    const best = selectBestMove(state, candidateMoves, 'RED');
    expect(best?.tokenIndex).toBe(0); // Escapes danger
  });

  it('should prefer entering goal over other moves if no captures are available', () => {
    const state = createTestGame();

    // RED token 0 is 2 steps away from goal (position 55)
    state.players.RED.tokens[0].position = 55;
    state.players.RED.tokens[0].status = 'HOME_PATH';

    // RED token 1 is at 10 (global track)
    state.players.RED.tokens[1].position = 10;
    state.players.RED.tokens[1].status = 'TRACK';

    const candidateMoves: ValidMove[] = [
      {
        tokenIndex: 0,
        fromPosition: 55,
        toPosition: 57, // Goal entry
        isCapture: false,
        isGoalEntry: true
      },
      {
        tokenIndex: 1,
        fromPosition: 10,
        toPosition: 12,
        isCapture: false,
        isGoalEntry: false
      }
    ];

    const best = selectBestMove(state, candidateMoves, 'RED');
    expect(best?.tokenIndex).toBe(0); // Enters goal
    expect(best?.isGoalEntry).toBe(true);
  });
});
