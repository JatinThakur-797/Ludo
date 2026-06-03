package com.ludo.game.engine;

import com.ludo.game.dto.*;
import com.ludo.game.model.enums.Color;
import com.ludo.game.model.enums.GameStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

public class LudoEngineTest {

    private GameState initialState;

    @BeforeEach
    void setUp() {
        List<LudoEngine.PlayerConfig> configs = new ArrayList<>();
        configs.add(new LudoEngine.PlayerConfig("user1", "RedPlayer", Color.RED, false));
        configs.add(new LudoEngine.PlayerConfig("user2", "GreenPlayer", Color.GREEN, false));

        initialState = LudoEngine.createInitialGameState("test-game", configs);
    }

    @Test
    void testCreateInitialGameState() {
        assertNotNull(initialState);
        assertEquals("test-game", initialState.getGameId());
        assertEquals(GameStatus.ACTIVE, initialState.getStatus());
        assertEquals(2, initialState.getPlayers().size());
        assertEquals(Color.RED, initialState.getActiveColor());
        assertEquals("WAITING_FOR_ROLL", initialState.getTurnPhase());
        assertNull(initialState.getLastRoll());
        assertEquals(0, initialState.getSequenceNumber());

        PlayerState red = initialState.getPlayers().get(Color.RED);
        assertNotNull(red);
        assertEquals(4, red.getTokens().size());
        for (TokenState t : red.getTokens()) {
            assertEquals(-1, t.getPosition());
            assertEquals("BASE", t.getStatus());
            assertFalse(t.isSafe());
        }
    }

    @Test
    void testCalculateNextPosition() {
        // From base, need a 6
        assertNull(LudoEngine.calculateNextPosition(Color.RED, -1, 3));
        assertEquals(0, LudoEngine.calculateNextPosition(Color.RED, -1, 6)); // Red start is 0
        assertEquals(13, LudoEngine.calculateNextPosition(Color.GREEN, -1, 6)); // Green start is 13

        // Normal move
        assertEquals(5, LudoEngine.calculateNextPosition(Color.RED, 0, 5));

        // Wrap around track cell 51 -> 0
        assertEquals(2, LudoEngine.calculateNextPosition(Color.GREEN, 48, 6));

        // Red enters home path (starts at 52) when steps > 50
        // Red start is 0. Threshold is 50. If at 50, + 1 -> 51 (enters home path cell 52)
        assertEquals(52, LudoEngine.calculateNextPosition(Color.RED, 50, 1));
        assertEquals(57, LudoEngine.calculateNextPosition(Color.RED, 50, 6)); // Home goal
        assertNull(LudoEngine.calculateNextPosition(Color.RED, 50, 7)); // Overshoot

        // Home path movement
        assertEquals(56, LudoEngine.calculateNextPosition(Color.RED, 52, 4));
        assertEquals(57, LudoEngine.calculateNextPosition(Color.RED, 52, 5));
        assertNull(LudoEngine.calculateNextPosition(Color.RED, 52, 6)); // Overshoot
    }

    @Test
    void testRollDice_BaseRelease() {
        // Roll 6
        LudoEngine.EngineResult result = LudoEngine.rollDice(initialState, 6);
        GameState nextState = result.getNextState();

        assertEquals(6, nextState.getLastRoll());
        assertEquals("WAITING_FOR_MOVE", nextState.getTurnPhase());
        assertEquals(4, nextState.getAvailableMoves().size());
        assertEquals(0, nextState.getAvailableMoves().get(0).getTokenIndex());
        assertEquals(-1, nextState.getAvailableMoves().get(0).getFromPosition());
        assertEquals(0, nextState.getAvailableMoves().get(0).getToPosition());

        // Roll 3 -> No moves possible (all in base) -> turn shifts to GREEN
        LudoEngine.EngineResult resultFail = LudoEngine.rollDice(initialState, 3);
        GameState nextStateFail = resultFail.getNextState();

        assertNull(nextStateFail.getLastRoll());
        assertEquals(Color.GREEN, nextStateFail.getActiveColor());
        assertEquals("WAITING_FOR_ROLL", nextStateFail.getTurnPhase());
    }

    @Test
    void testConsecutiveSixesForfeit() {
        // First 6
        LudoEngine.EngineResult r1 = LudoEngine.rollDice(initialState, 6);
        GameState s1 = r1.getNextState();
        assertEquals(1, s1.getConsecutiveSixesCount());

        // We simulate that the user moved a token to avoid invalid phase error,
        // but to test rolling consecutively we can just reset turnPhase back to WAITING_FOR_ROLL
        s1.setTurnPhase("WAITING_FOR_ROLL");

        // Second 6
        LudoEngine.EngineResult r2 = LudoEngine.rollDice(s1, 6);
        GameState s2 = r2.getNextState();
        assertEquals(2, s2.getConsecutiveSixesCount());

        s2.setTurnPhase("WAITING_FOR_ROLL");

        // Third 6 -> turn forfeited, shifts to GREEN
        LudoEngine.EngineResult r3 = LudoEngine.rollDice(s2, 6);
        GameState s3 = r3.getNextState();

        assertEquals(0, s3.getConsecutiveSixesCount());
        assertNull(s3.getLastRoll());
        assertEquals(Color.GREEN, s3.getActiveColor());
        assertEquals("WAITING_FOR_ROLL", s3.getTurnPhase());
    }

    @Test
    void testMoveToken_AndBonus() {
        // Roll 6 to move Red token 0 to cell 0
        LudoEngine.EngineResult r1 = LudoEngine.rollDice(initialState, 6);
        LudoEngine.EngineResult m1 = LudoEngine.moveToken(r1.getNextState(), 0);
        GameState s1 = m1.getNextState();

        assertEquals(Color.RED, s1.getActiveColor()); // Bonus turn because of rolling a 6!
        assertEquals("WAITING_FOR_ROLL", s1.getTurnPhase());
        assertEquals(0, s1.getPlayers().get(Color.RED).getTokens().get(0).getPosition());
        assertEquals("TRACK", s1.getPlayers().get(Color.RED).getTokens().get(0).getStatus());

        // Roll 3 and move
        LudoEngine.EngineResult r2 = LudoEngine.rollDice(s1, 3);
        LudoEngine.EngineResult m2 = LudoEngine.moveToken(r2.getNextState(), 0);
        GameState s2 = m2.getNextState();

        assertEquals(Color.GREEN, s2.getActiveColor()); // Turn shifts to Green (no 6, capture or goal)
        assertEquals("WAITING_FOR_ROLL", s2.getTurnPhase());
        assertEquals(3, s2.getPlayers().get(Color.RED).getTokens().get(0).getPosition());
    }

    @Test
    void testCaptureToken() {
        // Red token 0 is at cell 10
        initialState.getPlayers().get(Color.RED).getTokens().get(0).setPosition(10);
        initialState.getPlayers().get(Color.RED).getTokens().get(0).setStatus("TRACK");

        // Green token 0 is at cell 8
        initialState.getPlayers().get(Color.GREEN).getTokens().get(0).setPosition(8);
        initialState.getPlayers().get(Color.GREEN).getTokens().get(0).setStatus("TRACK");

        // Shift turn to Green
        initialState.setActiveColor(Color.GREEN);
        initialState.setTurnPhase("WAITING_FOR_ROLL");

        // Green rolls a 2 (valid move to cell 10, which is occupied by Red)
        LudoEngine.EngineResult r = LudoEngine.rollDice(initialState, 2);
        assertTrue(r.getNextState().getAvailableMoves().get(0).isCapture());

        // Move Green token 0 -> Red token 0 gets captured and sent back to base
        LudoEngine.EngineResult m = LudoEngine.moveToken(r.getNextState(), 0);
        GameState nextState = m.getNextState();

        assertEquals(-1, nextState.getPlayers().get(Color.RED).getTokens().get(0).getPosition());
        assertEquals("BASE", nextState.getPlayers().get(Color.RED).getTokens().get(0).getStatus());
        assertEquals(10, nextState.getPlayers().get(Color.GREEN).getTokens().get(0).getPosition());
        assertEquals(Color.GREEN, nextState.getActiveColor()); // Bonus roll awarded for capture!
    }

    @Test
    void testWinCondition() {
        // Give Red Player 3 tokens in goal, and token 0 at cell 56
        PlayerState red = initialState.getPlayers().get(Color.RED);
        red.getTokens().get(0).setPosition(56);
        red.getTokens().get(0).setStatus("HOME_PATH");
        red.getTokens().get(1).setPosition(57);
        red.getTokens().get(1).setStatus("HOME");
        red.getTokens().get(2).setPosition(57);
        red.getTokens().get(2).setStatus("HOME");
        red.getTokens().get(3).setPosition(57);
        red.getTokens().get(3).setStatus("HOME");

        // Red rolls a 1
        LudoEngine.EngineResult r = LudoEngine.rollDice(initialState, 1);
        // Move token 0 to Goal
        LudoEngine.EngineResult m = LudoEngine.moveToken(r.getNextState(), 0);
        GameState nextState = m.getNextState();

        assertEquals(GameStatus.COMPLETED, nextState.getStatus());
        assertEquals(Color.RED, nextState.getWinnerColor());
        assertEquals(1, nextState.getPlayers().get(Color.RED).getFinishOrder());
    }
}
