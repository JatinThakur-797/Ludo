export type PlayerColor = 'RED' | 'GREEN' | 'YELLOW' | 'BLUE';

export type TokenStatus = 'BASE' | 'TRACK' | 'HOME_PATH' | 'HOME';

export interface TokenState {
  index: number;        // 0 to 3
  position: number;     // -1 (Base), 0 to 51 (Global Track), 52 to 56 (Home Path), 57 (Goal)
  status: TokenStatus;
  isSafe: boolean;
}

export interface PlayerState {
  userId: string | null;     // null for AI or Guest
  displayName: string;
  color: PlayerColor;
  isOnline: boolean;
  isAi: boolean;
  tokens: [TokenState, TokenState, TokenState, TokenState];
  finishOrder: number | null; // 1 for first winner, 2 for second, etc.
}

export type GameStatus = 'LOBBY' | 'ACTIVE' | 'COMPLETED';

export type TurnPhase = 'WAITING_FOR_ROLL' | 'WAITING_FOR_MOVE' | 'RESOLVING_BONUS';

export interface ValidMove {
  tokenIndex: number;
  fromPosition: number;
  toPosition: number;
  isCapture: boolean;
  isGoalEntry: boolean;
}

export interface GameState {
  gameId: string;
  status: GameStatus;
  players: Record<PlayerColor, PlayerState>;
  activeColor: PlayerColor | null;
  turnPhase: TurnPhase;
  lastRoll: number | null;
  consecutiveSixesCount: number;
  availableMoves: ValidMove[];
  winnerColor: PlayerColor | null;
  sequenceNumber: number;
}

export type EffectType =
  | 'PLAY_SOUND_ROLL'
  | 'PLAY_SOUND_MOVE'
  | 'PLAY_SOUND_CAPTURE'
  | 'PLAY_SOUND_GOAL'
  | 'PLAYER_WON'
  | 'GAME_OVER';

export interface GameEffect {
  type: EffectType;
  payload: any;
}
