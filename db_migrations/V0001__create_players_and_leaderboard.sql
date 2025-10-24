CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    nickname VARCHAR(50) UNIQUE NOT NULL,
    total_stars INTEGER DEFAULT 0,
    levels_completed INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS level_completions (
    id SERIAL PRIMARY KEY,
    player_id INTEGER REFERENCES players(id),
    level_id VARCHAR(100) NOT NULL,
    level_name VARCHAR(200) NOT NULL,
    difficulty INTEGER NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_id, level_id)
);

CREATE INDEX idx_players_stars ON players(total_stars DESC);
CREATE INDEX idx_level_completions_player ON level_completions(player_id);