import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GameState, PlayerColor } from '../engine/types';
import { createInitialGameState, rollDice, moveToken } from '../engine/ludoEngine';
import { gameAudio } from '../utils/audio';
import { selectBestMove } from '../engine/aiHeuristics';

interface GameStoreActions {
  startNewLocalGame: (
    playerConfigs: Array<{ userId: string | null; displayName: string; color: PlayerColor; isAi: boolean }>
  ) => void;
  rollDiceAction: (diceOverride?: number) => void;
  moveTokenAction: (tokenIndex: number) => void;
  triggerAiTurn: () => void | Promise<void>;
  resetGameAction: () => void;
}

export type GameStore = GameState & GameStoreActions & { isAiThinking: boolean };

const defaultState: GameState = {
  gameId: '',
  status: 'LOBBY',
  players: {} as any,
  activeColor: null,
  turnPhase: 'WAITING_FOR_ROLL',
  lastRoll: null,
  consecutiveSixesCount: 0,
  availableMoves: [],
  winnerColor: null,
  sequenceNumber: 0
};

// Play audio effects based on engine transition outputs
function handleEffects(effects: any[]) {
  effects.forEach((effect) => {
    switch (effect.type) {
      case 'PLAY_SOUND_ROLL':
        gameAudio.playRoll();
        break;
      case 'PLAY_SOUND_MOVE':
        gameAudio.playMove();
        break;
      case 'PLAY_SOUND_CAPTURE':
        gameAudio.playCapture();
        break;
      case 'PLAY_SOUND_GOAL':
        gameAudio.playGoal();
        break;
      case 'PLAYER_WON':
        gameAudio.playVictory();
        break;
      case 'GAME_OVER':
        gameAudio.playVictory();
        break;
    }
  });
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      ...defaultState,
      isAiThinking: false,

      startNewLocalGame: (playerConfigs) => {
        const gameId = Math.random().toString(36).substring(2, 9);
        const initialState = createInitialGameState(gameId, playerConfigs);
        set({ ...initialState, isAiThinking: false });
      },

      rollDiceAction: (diceOverride) => {
        const state = get();
        if (state.status !== 'ACTIVE' || state.turnPhase !== 'WAITING_FOR_ROLL') {
          return;
        }

        try {
          const { nextState, effects } = rollDice(state as GameState, diceOverride);
          set({ ...nextState });
          handleEffects(effects);

          // Handle AI Turn Auto-Trigger (if the next player is AI)
          if (nextState.status === 'ACTIVE' && nextState.activeColor) {
            const nextPlayer = nextState.players[nextState.activeColor];
            if (nextPlayer && nextPlayer.isAi && !get().isAiThinking) {
              setTimeout(() => {
                get().triggerAiTurn();
              }, 800);
            }
          }
        } catch (error) {
          console.error('Failed to roll dice', error);
        }
      },

      moveTokenAction: (tokenIndex) => {
        const state = get();
        if (state.status !== 'ACTIVE' || state.turnPhase !== 'WAITING_FOR_MOVE') {
          return;
        }

        try {
          const { nextState, effects } = moveToken(state as GameState, tokenIndex);
          set({ ...nextState });
          handleEffects(effects);

          // Handle AI Turn Auto-Trigger (if the next player is AI)
          if (nextState.status === 'ACTIVE' && nextState.activeColor) {
            const nextPlayer = nextState.players[nextState.activeColor];
            if (nextPlayer && nextPlayer.isAi && !get().isAiThinking) {
              setTimeout(() => {
                get().triggerAiTurn();
              }, 800);
            }
          }
        } catch (error) {
          console.error('Failed to move token', error);
        }
      },

      // Evaluates and triggers AI rolls and moves sequentially
      triggerAiTurn: async () => {
        const state = get();
        if (state.status !== 'ACTIVE' || !state.activeColor) return;

        const activePlayer = state.players[state.activeColor];
        if (!activePlayer || !activePlayer.isAi) return;

        if (get().isAiThinking) return;
        set({ isAiThinking: true });

        try {
          while (true) {
            const curState = get();
            if (curState.status !== 'ACTIVE' || !curState.activeColor) break;
            const p = curState.players[curState.activeColor];
            if (!p || !p.isAi) break;

            if (curState.turnPhase === 'WAITING_FOR_ROLL') {
              get().rollDiceAction();
              // Wait for rolling animation (1650ms to allow 1500ms anim + transition buffer)
              await new Promise((resolve) => setTimeout(resolve, 1650));
            } else if (curState.turnPhase === 'WAITING_FOR_MOVE') {
              const bestMove = selectBestMove(curState as GameState, curState.availableMoves, curState.activeColor);
              if (bestMove) {
                get().moveTokenAction(bestMove.tokenIndex);
                // Wait for moving animation (850ms)
                await new Promise((resolve) => setTimeout(resolve, 850));
              } else {
                break;
              }
            } else {
              break;
            }
          }
        } finally {
          set({ isAiThinking: false });

          // After AI finished its loop, check if the next player is AI and trigger
          const nextState = get();
          if (nextState.status === 'ACTIVE' && nextState.activeColor) {
            const nextPlayer = nextState.players[nextState.activeColor];
            if (nextPlayer && nextPlayer.isAi) {
              setTimeout(() => {
                get().triggerAiTurn();
              }, 800);
            }
          }
        }
      },

      resetGameAction: () => {
        set({ ...defaultState, isAiThinking: false });
      }
    }),
    {
      name: 'ludo-local-match',
      partialize: (state) => {
        // Only persist GameState properties, not actions or ephemeral AI state
        const {
          gameId,
          status,
          players,
          activeColor,
          turnPhase,
          lastRoll,
          consecutiveSixesCount,
          availableMoves,
          winnerColor,
          sequenceNumber
        } = state;
        return {
          gameId,
          status,
          players,
          activeColor,
          turnPhase,
          lastRoll,
          consecutiveSixesCount,
          availableMoves,
          winnerColor,
          sequenceNumber
        };
      }
    }
  )
);
