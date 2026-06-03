package com.ludo.game.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ludo.game.dto.*;
import com.ludo.game.model.enums.Color;
import com.ludo.game.model.enums.GameStatus;

import java.util.*;

public class LudoEngine {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    public static class EngineResult {
        private final GameState nextState;
        private final List<GameEffect> effects;

        public EngineResult(GameState nextState, List<GameEffect> effects) {
            this.nextState = nextState;
            this.effects = effects;
        }

        public GameState getNextState() {
            return nextState;
        }

        public List<GameEffect> getEffects() {
            return effects;
        }
    }

    private static GameState deepCopy(GameState state) {
        try {
            return objectMapper.readValue(objectMapper.writeValueAsString(state), GameState.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to deep copy GameState", e);
        }
    }

    /**
     * Calculates the next position of a token on the board.
     * Returns null if the move is an overshoot (invalid).
     */
    public static Integer calculateNextPosition(Color color, int currentPosition, int roll) {
        if (currentPosition == LudoEngineConstants.BASE_POSITION) {
            if (roll == 6) {
                return LudoEngineConstants.getOffsetInfo(color).start;
            }
            return null; // Cannot move out of base without a 6
        }

        if (currentPosition == LudoEngineConstants.HOME_GOAL_POSITION) {
            return null; // Already finished
        }

        LudoEngineConstants.OffsetInfo offsetInfo = LudoEngineConstants.getOffsetInfo(color);

        // If token is on the global track (0 to 51)
        if (currentPosition >= 0 && currentPosition < LudoEngineConstants.TRACK_CELL_COUNT) {
            // Calculate steps taken from the start cell
            int stepsTaken = (currentPosition - offsetInfo.start + LudoEngineConstants.TRACK_CELL_COUNT) % LudoEngineConstants.TRACK_CELL_COUNT;
            int newSteps = stepsTaken + roll;

            if (newSteps <= 50) {
                // Stays on global track
                return (currentPosition + roll) % LudoEngineConstants.TRACK_CELL_COUNT;
            } else if (newSteps <= 56) {
                // Enters the home path:
                // Steps 51-55 map to 52-56 (Home Path)
                // Step 56 maps to 57 (Goal)
                return LudoEngineConstants.HOME_PATH_START_POSITION + (newSteps - 51);
            } else {
                // Overshoot
                return null;
            }
        }

        // If token is already on the home path (52 to 56)
        if (currentPosition >= LudoEngineConstants.HOME_PATH_START_POSITION && currentPosition < LudoEngineConstants.HOME_GOAL_POSITION) {
            int nextPos = currentPosition + roll;
            if (nextPos <= LudoEngineConstants.HOME_GOAL_POSITION) {
                return nextPos;
            }
            return null; // Overshoot
        }

        return null;
    }

    /**
     * Evaluates all valid moves for the active player's tokens given a dice roll.
     */
    public static List<ValidMove> getValidMoves(GameState state, Color color, int roll) {
        PlayerState player = state.getPlayers().get(color);
        if (player == null || player.getFinishOrder() != null) {
            return Collections.emptyList();
        }

        List<ValidMove> validMoves = new ArrayList<>();

        for (TokenState token : player.getTokens()) {
            Integer nextPos = calculateNextPosition(color, token.getPosition(), roll);
            if (nextPos != null) {
                boolean isCapture = false;
                if (nextPos >= 0 && nextPos < LudoEngineConstants.TRACK_CELL_COUNT && !LudoEngineConstants.SAFE_CELLS.contains(nextPos)) {
                    // Find if any opponent token occupies this coordinate
                    for (Color otherColor : LudoEngineConstants.TURN_ORDER) {
                        if (otherColor == color) continue;
                        PlayerState otherPlayer = state.getPlayers().get(otherColor);
                        if (otherPlayer == null || otherPlayer.getFinishOrder() != null) continue;

                        boolean hasOpponentToken = false;
                        for (TokenState otherToken : otherPlayer.getTokens()) {
                            if (otherToken.getPosition() == nextPos) {
                                hasOpponentToken = true;
                                break;
                            }
                        }
                        if (hasOpponentToken) {
                            isCapture = true;
                            break;
                        }
                    }
                }

                validMoves.add(new ValidMove(
                        token.getIndex(),
                        token.getPosition(),
                        nextPos,
                        isCapture,
                        nextPos == LudoEngineConstants.HOME_GOAL_POSITION
                ));
            }
        }

        return validMoves;
    }

    /**
     * Helper to get the next active player color clockwise.
     */
    public static Color getNextPlayerColor(Map<Color, PlayerState> players, Color activeColor) {
        int currentIndex = -1;
        for (int i = 0; i < LudoEngineConstants.TURN_ORDER.length; i++) {
            if (LudoEngineConstants.TURN_ORDER[i] == activeColor) {
                currentIndex = i;
                break;
            }
        }

        for (int i = 1; i <= 4; i++) {
            int nextIndex = (currentIndex + i) % 4;
            Color nextColor = LudoEngineConstants.TURN_ORDER[nextIndex];
            PlayerState player = players.get(nextColor);
            if (player != null && player.getFinishOrder() == null) {
                return nextColor;
            }
        }
        return activeColor;
    }

    /**
     * Triggers a dice roll.
     */
    public static EngineResult rollDice(GameState state, Integer diceOverride) {
        if (state.getStatus() != GameStatus.ACTIVE) {
            throw new IllegalStateException("Game is not active");
        }
        if (!"WAITING_FOR_ROLL".equals(state.getTurnPhase())) {
            throw new IllegalStateException("Invalid turn phase: must be WAITING_FOR_ROLL");
        }

        Color activeColor = state.getActiveColor();
        if (activeColor == null) {
            throw new IllegalStateException("No active player color set");
        }

        int roll = diceOverride != null ? diceOverride : new Random().nextInt(6) + 1;
        GameState nextState = deepCopy(state);
        nextState.setSequenceNumber(nextState.getSequenceNumber() + 1);
        nextState.setLastRoll(roll);

        List<GameEffect> effects = new ArrayList<>();
        
        // Sound roll effect payload
        Map<String, Object> rollPayload = new HashMap<>();
        rollPayload.put("color", activeColor.name());
        rollPayload.put("roll", roll);
        effects.add(new GameEffect("PLAY_SOUND_ROLL", rollPayload));

        if (roll == 6) {
            nextState.setConsecutiveSixesCount(nextState.getConsecutiveSixesCount() + 1);
            if (nextState.getConsecutiveSixesCount() == 3) {
                // Forfeit turn
                nextState.setConsecutiveSixesCount(0);
                nextState.setLastRoll(null);
                nextState.setAvailableMoves(Collections.emptyList());
                nextState.setActiveColor(getNextPlayerColor(nextState.getPlayers(), activeColor));
                nextState.setTurnPhase("WAITING_FOR_ROLL");

                Map<String, Object> forfeitPayload = new HashMap<>();
                forfeitPayload.put("message", "Player " + activeColor + " forfeited turn due to 3 consecutive sixes");
                effects.add(new GameEffect("PLAY_SOUND_MOVE", forfeitPayload));

                return new EngineResult(nextState, effects);
            }
        } else {
            nextState.setConsecutiveSixesCount(0);
        }

        List<ValidMove> validMoves = getValidMoves(nextState, activeColor, roll);

        if (validMoves.isEmpty()) {
            // Forfeit turn
            nextState.setConsecutiveSixesCount(0);
            nextState.setLastRoll(null);
            nextState.setAvailableMoves(Collections.emptyList());
            nextState.setActiveColor(getNextPlayerColor(nextState.getPlayers(), activeColor));
            nextState.setTurnPhase("WAITING_FOR_ROLL");
        } else {
            nextState.setAvailableMoves(validMoves);
            nextState.setTurnPhase("WAITING_FOR_MOVE");
        }

        return new EngineResult(nextState, effects);
    }

    /**
     * Moves a token to a new position.
     */
    public static EngineResult moveToken(GameState state, int tokenIndex) {
        if (state.getStatus() != GameStatus.ACTIVE) {
            throw new IllegalStateException("Game is not active");
        }
        if (!"WAITING_FOR_MOVE".equals(state.getTurnPhase())) {
            throw new IllegalStateException("Invalid turn phase: must be WAITING_FOR_MOVE");
        }

        Color activeColor = state.getActiveColor();
        if (activeColor == null) {
            throw new IllegalStateException("No active player color set");
        }

        ValidMove move = null;
        for (ValidMove m : state.getAvailableMoves()) {
            if (m.getTokenIndex() == tokenIndex) {
                move = m;
                break;
            }
        }

        if (move == null) {
            throw new IllegalArgumentException("Token " + tokenIndex + " is not eligible to move");
        }

        GameState nextState = deepCopy(state);
        nextState.setSequenceNumber(nextState.getSequenceNumber() + 1);

        PlayerState player = nextState.getPlayers().get(activeColor);
        TokenState token = player.getTokens().get(tokenIndex);

        int fromPos = token.getPosition();
        int toPos = move.getToPosition();

        // Move token
        token.setPosition(toPos);
        if (toPos == LudoEngineConstants.BASE_POSITION) {
            token.setStatus("BASE");
            token.setSafe(false);
        } else if (toPos >= 0 && toPos < LudoEngineConstants.TRACK_CELL_COUNT) {
            token.setStatus("TRACK");
            token.setSafe(LudoEngineConstants.SAFE_CELLS.contains(toPos));
        } else if (toPos >= LudoEngineConstants.HOME_PATH_START_POSITION && toPos < LudoEngineConstants.HOME_GOAL_POSITION) {
            token.setStatus("HOME_PATH");
            token.setSafe(true); // Home path is always safe
        } else if (toPos == LudoEngineConstants.HOME_GOAL_POSITION) {
            token.setStatus("HOME");
            token.setSafe(true);
        }

        List<GameEffect> effects = new ArrayList<>();

        // Generate movement sound effect
        Map<String, Object> movePayload = new HashMap<>();
        movePayload.put("color", activeColor.name());
        movePayload.put("tokenIndex", tokenIndex);
        movePayload.put("fromPosition", fromPos);
        movePayload.put("toPosition", toPos);
        effects.add(new GameEffect("PLAY_SOUND_MOVE", movePayload));

        // Resolve captures
        boolean hasCapture = false;
        if (move.isCapture()) {
            for (Color otherColor : LudoEngineConstants.TURN_ORDER) {
                if (otherColor == activeColor) continue;
                PlayerState otherPlayer = nextState.getPlayers().get(otherColor);
                if (otherPlayer == null || otherPlayer.getFinishOrder() != null) continue;

                for (TokenState otherToken : otherPlayer.getTokens()) {
                    if (otherToken.getPosition() == toPos) {
                        otherToken.setPosition(LudoEngineConstants.BASE_POSITION);
                        otherToken.setStatus("BASE");
                        otherToken.setSafe(false);
                        hasCapture = true;

                        Map<String, Object> capturePayload = new HashMap<>();
                        capturePayload.put("capturerColor", activeColor.name());
                        capturePayload.put("capturedColor", otherColor.name());
                        capturePayload.put("tokenIndex", otherToken.getIndex());
                        effects.add(new GameEffect("PLAY_SOUND_CAPTURE", capturePayload));
                    }
                }
            }
        }

        // Resolve goal arrivals
        boolean reachedGoal = false;
        if (toPos == LudoEngineConstants.HOME_GOAL_POSITION) {
            reachedGoal = true;
            Map<String, Object> goalPayload = new HashMap<>();
            goalPayload.put("color", activeColor.name());
            goalPayload.put("tokenIndex", tokenIndex);
            effects.add(new GameEffect("PLAY_SOUND_GOAL", goalPayload));

            // Check if player has finished all 4 tokens
            boolean allHome = true;
            for (TokenState t : player.getTokens()) {
                if (t.getPosition() != LudoEngineConstants.HOME_GOAL_POSITION) {
                    allHome = false;
                    break;
                }
            }

            if (allHome) {
                int maxFinish = 0;
                for (PlayerState p : nextState.getPlayers().values()) {
                    if (p.getFinishOrder() != null && p.getFinishOrder() > maxFinish) {
                        maxFinish = p.getFinishOrder();
                    }
                }

                player.setFinishOrder(maxFinish + 1);
                Map<String, Object> winPayload = new HashMap<>();
                winPayload.put("color", activeColor.name());
                winPayload.put("rank", player.getFinishOrder());
                effects.add(new GameEffect("PLAYER_WON", winPayload));

                // First player to get all tokens home wins, ending the game
                nextState.setWinnerColor(activeColor);
                nextState.setStatus(GameStatus.COMPLETED);
                nextState.setTurnPhase("RESOLVING_BONUS");
                nextState.setActiveColor(null);
                nextState.setAvailableMoves(Collections.emptyList());

                Map<String, Object> gameOverPayload = new HashMap<>();
                gameOverPayload.put("winnerColor", activeColor.name());
                effects.add(new GameEffect("GAME_OVER", gameOverPayload));

                return new EngineResult(nextState, effects);
            }
        }

        // Determine bonus rolls and turn switching
        boolean hasBonusRoll = (state.getLastRoll() != null && state.getLastRoll() == 6) || hasCapture || reachedGoal;

        nextState.setLastRoll(null);
        nextState.setAvailableMoves(Collections.emptyList());

        if (hasBonusRoll) {
            if (state.getLastRoll() == null || state.getLastRoll() != 6) {
                nextState.setConsecutiveSixesCount(0);
            }
            nextState.setTurnPhase("WAITING_FOR_ROLL");
        } else {
            nextState.setConsecutiveSixesCount(0);
            nextState.setActiveColor(getNextPlayerColor(nextState.getPlayers(), activeColor));
            nextState.setTurnPhase("WAITING_FOR_ROLL");
        }

        return new EngineResult(nextState, effects);
    }

    /**
     * Bootstraps an initial GameState.
     */
    public static GameState createInitialGameState(String gameId, List<PlayerConfig> playerConfigs) {
        Map<Color, PlayerState> players = new EnumMap<>(Color.class);

        for (PlayerConfig config : playerConfigs) {
            List<TokenState> tokens = new ArrayList<>();
            for (int i = 0; i < 4; i++) {
                tokens.add(new TokenState(i, LudoEngineConstants.BASE_POSITION, "BASE", false));
            }

            PlayerState player = PlayerState.builder()
                    .userId(config.getUserId())
                    .displayName(config.getDisplayName())
                    .color(config.getColor())
                    .isOnline(true)
                    .isAi(config.isAi())
                    .tokens(tokens)
                    .finishOrder(null)
                    .build();

            players.put(config.getColor(), player);
        }

        Color activeColor = !playerConfigs.isEmpty() ? playerConfigs.get(0).getColor() : Color.RED;

        return GameState.builder()
                .gameId(gameId)
                .status(GameStatus.ACTIVE)
                .players(players)
                .activeColor(activeColor)
                .turnPhase("WAITING_FOR_ROLL")
                .lastRoll(null)
                .consecutiveSixesCount(0)
                .availableMoves(Collections.emptyList())
                .winnerColor(null)
                .sequenceNumber(0)
                .build();
    }

    public static ValidMove selectBestMove(List<ValidMove> moves) {
        if (moves == null || moves.isEmpty()) {
            return null;
        }

        // 1. Capture moves
        for (ValidMove m : moves) {
            if (m.isCapture()) {
                return m;
            }
        }

        // 2. Goal entry moves
        for (ValidMove m : moves) {
            if (m.isGoalEntry()) {
                return m;
            }
        }

        // 3. Furthest progressing move
        ValidMove best = moves.get(0);
        for (ValidMove m : moves) {
            if (m.getToPosition() > best.getToPosition()) {
                best = m;
            }
        }
        return best;
    }

    public static class PlayerConfig {
        private String userId;
        private String displayName;
        private Color color;
        private boolean isAi;

        public PlayerConfig() {}

        public PlayerConfig(String userId, String displayName, Color color, boolean isAi) {
            this.userId = userId;
            this.displayName = displayName;
            this.color = color;
            this.isAi = isAi;
        }

        public String getUserId() {
            return userId;
        }

        public void setUserId(String userId) {
            this.userId = userId;
        }

        public String getDisplayName() {
            return displayName;
        }

        public void setDisplayName(String displayName) {
            this.displayName = displayName;
        }

        public Color getColor() {
            return color;
        }

        public void setColor(Color color) {
            this.color = color;
        }

        public boolean isAi() {
            return isAi;
        }

        public void setAi(boolean ai) {
            isAi = ai;
        }
    }
}
