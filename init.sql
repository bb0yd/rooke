CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  avatar_url TEXT,
  bio TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  pgn TEXT,
  result VARCHAR(50) DEFAULT 'in_progress',
  moves_count INTEGER DEFAULT 0,
  opening_name VARCHAR(255),
  opponent VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS trainer_stats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  opening_id VARCHAR(100) NOT NULL,
  line_id VARCHAR(100) NOT NULL,
  attempts INTEGER DEFAULT 0,
  clean INTEGER DEFAULT 0,
  mistakes INTEGER DEFAULT 0,
  last_practiced BIGINT DEFAULT 0,
  ease_factor REAL DEFAULT 2.5,
  interval_days INTEGER DEFAULT 0,
  next_review BIGINT DEFAULT 0,
  UNIQUE(user_id, opening_id, line_id)
);

CREATE TABLE IF NOT EXISTS challenges (
  id SERIAL PRIMARY KEY,
  from_user_id INTEGER REFERENCES users(id),
  to_user_id INTEGER REFERENCES users(id),
  time_control VARCHAR(20) DEFAULT 'none',
  color_preference VARCHAR(10) DEFAULT 'random',
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS multiplayer_games (
  id SERIAL PRIMARY KEY,
  white_user_id INTEGER REFERENCES users(id),
  black_user_id INTEGER REFERENCES users(id),
  pgn TEXT DEFAULT '',
  fen TEXT DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  result VARCHAR(50) DEFAULT 'in_progress',
  moves TEXT DEFAULT '',
  time_control VARCHAR(20) DEFAULT 'none',
  draw_offered_by INTEGER,
  white_time_remaining_ms INTEGER,
  black_time_remaining_ms INTEGER,
  last_move_timestamp BIGINT,
  move_timestamps TEXT DEFAULT '',
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  last_move_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_ratings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  rating_type VARCHAR(50) NOT NULL,
  rating REAL DEFAULT 1500,
  rd REAL DEFAULT 350,
  volatility REAL DEFAULT 0.06,
  games_count INTEGER DEFAULT 0,
  UNIQUE(user_id, rating_type)
);

CREATE TABLE IF NOT EXISTS rating_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  rating_type VARCHAR(50) NOT NULL,
  rating REAL NOT NULL,
  recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quick_play_pool (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id),
  time_control VARCHAR(20) DEFAULT '10+0',
  color_preference VARCHAR(10) DEFAULT 'random',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS puzzle_stats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  puzzle_id VARCHAR(50) NOT NULL,
  attempts INTEGER DEFAULT 0,
  solves INTEGER DEFAULT 0,
  best_time_ms INTEGER,
  UNIQUE(user_id, puzzle_id)
);

CREATE TABLE IF NOT EXISTS openings (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  player_color VARCHAR(1) NOT NULL,
  thumbnail_fen TEXT,
  is_custom BOOLEAN DEFAULT FALSE,
  user_id INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS opening_lines (
  id SERIAL PRIMARY KEY,
  opening_id INTEGER REFERENCES openings(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  moves JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS user_repertoire (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  opening_id INTEGER REFERENCES openings(id) ON DELETE CASCADE,
  line_id INTEGER REFERENCES opening_lines(id) ON DELETE CASCADE,
  notes TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, opening_id, line_id)
);

CREATE TABLE IF NOT EXISTS friends (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  friend_id INTEGER REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS game_chat (
  id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES multiplayer_games(id),
  user_id INTEGER REFERENCES users(id),
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add columns if they don't exist (for existing databases)
DO $$
BEGIN
  -- users table additions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='display_name') THEN
    ALTER TABLE users ADD COLUMN display_name VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='avatar_url') THEN
    ALTER TABLE users ADD COLUMN avatar_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bio') THEN
    ALTER TABLE users ADD COLUMN bio TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='created_at') THEN
    ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='preferences') THEN
    ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT '{}';
  END IF;
  -- games table additions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='games' AND column_name='opening_name') THEN
    ALTER TABLE games ADD COLUMN opening_name VARCHAR(255);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='games' AND column_name='opponent') THEN
    ALTER TABLE games ADD COLUMN opponent VARCHAR(255);
  END IF;
  -- multiplayer_games additions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='multiplayer_games' AND column_name='draw_offered_by') THEN
    ALTER TABLE multiplayer_games ADD COLUMN draw_offered_by INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='multiplayer_games' AND column_name='white_time_remaining_ms') THEN
    ALTER TABLE multiplayer_games ADD COLUMN white_time_remaining_ms INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='multiplayer_games' AND column_name='black_time_remaining_ms') THEN
    ALTER TABLE multiplayer_games ADD COLUMN black_time_remaining_ms INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='multiplayer_games' AND column_name='last_move_timestamp') THEN
    ALTER TABLE multiplayer_games ADD COLUMN last_move_timestamp BIGINT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='multiplayer_games' AND column_name='move_timestamps') THEN
    ALTER TABLE multiplayer_games ADD COLUMN move_timestamps TEXT DEFAULT '';
  END IF;
  -- trainer_stats additions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trainer_stats' AND column_name='ease_factor') THEN
    ALTER TABLE trainer_stats ADD COLUMN ease_factor REAL DEFAULT 2.5;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trainer_stats' AND column_name='interval_days') THEN
    ALTER TABLE trainer_stats ADD COLUMN interval_days INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='trainer_stats' AND column_name='next_review') THEN
    ALTER TABLE trainer_stats ADD COLUMN next_review BIGINT DEFAULT 0;
  END IF;
END $$;
