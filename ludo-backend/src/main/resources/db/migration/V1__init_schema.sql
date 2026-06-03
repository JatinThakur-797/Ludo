-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(50) NOT NULL,
    rating_mmr INTEGER NOT NULL DEFAULT 1200,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_rating_mmr ON users(rating_mmr DESC);

-- Create matches table
CREATE TABLE matches (
    id UUID PRIMARY KEY,
    room_code VARCHAR(10) NOT NULL,
    status VARCHAR(20) NOT NULL, -- e.g., 'ACTIVE', 'COMPLETED', 'ABANDONED'
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP WITH TIME ZONE,
    winner_id UUID REFERENCES users(id),
    game_state_snapshot JSONB
);

CREATE INDEX idx_matches_winner_id ON matches(winner_id);

-- Create match_players table
CREATE TABLE match_players (
    id UUID PRIMARY KEY,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Null implies AI or Guest
    player_color VARCHAR(10) NOT NULL, -- e.g., 'RED', 'GREEN', 'YELLOW', 'BLUE'
    rank_position INTEGER, -- e.g., 1, 2, 3, 4
    total_kills INTEGER NOT NULL DEFAULT 0,
    total_deaths INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT unique_match_player_color UNIQUE(match_id, player_color)
);

CREATE INDEX idx_match_players_match_id ON match_players(match_id);
CREATE INDEX idx_match_players_user_id ON match_players(user_id);
