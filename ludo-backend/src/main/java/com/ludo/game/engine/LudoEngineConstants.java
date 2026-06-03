package com.ludo.game.engine;

import com.ludo.game.model.enums.Color;
import java.util.Set;

public class LudoEngineConstants {
    public static final int TRACK_CELL_COUNT = 52;
    public static final int BASE_POSITION = -1;
    public static final int HOME_PATH_START_POSITION = 52;
    public static final int HOME_GOAL_POSITION = 57;

    public static final Set<Integer> SAFE_CELLS = Set.of(0, 8, 13, 21, 26, 34, 39, 47);

    public static class OffsetInfo {
        public final int start;
        public final int threshold;

        public OffsetInfo(int start, int threshold) {
            this.start = start;
            this.threshold = threshold;
        }
    }

    public static OffsetInfo getOffsetInfo(Color color) {
        switch (color) {
            case RED: return new OffsetInfo(0, 50);
            case GREEN: return new OffsetInfo(13, 11);
            case YELLOW: return new OffsetInfo(26, 24);
            case BLUE: return new OffsetInfo(39, 37);
            default: throw new IllegalArgumentException("Unknown color: " + color);
        }
    }

    public static final Color[] TURN_ORDER = {Color.RED, Color.GREEN, Color.YELLOW, Color.BLUE};
    public static final int TURN_TIMER_DURATION = 15; // in seconds
}
