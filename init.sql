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

-- Puzzle database (can be seeded from Lichess puzzle CSV)
CREATE TABLE IF NOT EXISTS puzzles (
  id VARCHAR(20) PRIMARY KEY,
  fen TEXT NOT NULL,
  moves TEXT NOT NULL,           -- space-separated UCI moves
  rating INTEGER NOT NULL,
  rating_deviation INTEGER DEFAULT 75,
  popularity INTEGER DEFAULT 0,
  themes TEXT[] DEFAULT '{}',
  game_url TEXT,
  opening_tags TEXT[] DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_puzzles_rating ON puzzles(rating);
CREATE INDEX IF NOT EXISTS idx_puzzles_themes ON puzzles USING GIN(themes);

-- Per-game analysis results (posted from client after Stockfish analysis)
CREATE TABLE IF NOT EXISTS game_analysis (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  game_id INTEGER REFERENCES games(id),
  multiplayer_game_id INTEGER REFERENCES multiplayer_games(id),
  accuracy REAL,
  blunders INTEGER DEFAULT 0,
  mistakes INTEGER DEFAULT 0,
  inaccuracies INTEGER DEFAULT 0,
  hung_pieces INTEGER DEFAULT 0,
  missed_tactics JSONB DEFAULT '[]',
  phase_accuracy JSONB,
  analyzed_at TIMESTAMP DEFAULT NOW()
);

-- Per-move evidence captured during analysis, so the coach can react to
-- specific recurring mistakes instead of only aggregate scores.
CREATE TABLE IF NOT EXISTS game_analysis_moves (
  id SERIAL PRIMARY KEY,
  analysis_id INTEGER REFERENCES game_analysis(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  move_number INTEGER NOT NULL,
  ply_index INTEGER NOT NULL,
  player_color VARCHAR(1) NOT NULL,
  fen_before TEXT,
  move_san VARCHAR(50) NOT NULL,
  best_move_uci VARCHAR(20),
  best_move_san VARCHAR(50),
  cp_loss REAL NOT NULL,
  classification VARCHAR(20) NOT NULL,
  phase VARCHAR(20) NOT NULL,
  is_hung_piece BOOLEAN DEFAULT FALSE,
  mistake_theme VARCHAR(50),
  analyzed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_analysis_moves_user_analyzed_at
  ON game_analysis_moves(user_id, analyzed_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_analysis_moves_theme
  ON game_analysis_moves(user_id, mistake_theme);

-- Aggregated skill scores per user
CREATE TABLE IF NOT EXISTS skill_profile (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) UNIQUE,
  piece_safety REAL DEFAULT 50,
  tactics REAL DEFAULT 50,
  checkmate_patterns REAL DEFAULT 50,
  opening_play REAL DEFAULT 50,
  endgame_play REAL DEFAULT 50,
  games_analyzed INTEGER DEFAULT 0,
  weakest_area VARCHAR(50),
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Track skill changes over time
CREATE TABLE IF NOT EXISTS skill_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  skill_area VARCHAR(50) NOT NULL,
  score REAL NOT NULL,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Log training exercises completed
CREATE TABLE IF NOT EXISTS training_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  module VARCHAR(50) NOT NULL,
  exercise_type VARCHAR(100),
  difficulty INTEGER DEFAULT 1,
  score REAL,
  attempts INTEGER DEFAULT 0,
  successes INTEGER DEFAULT 0,
  first_try_successes INTEGER DEFAULT 0,
  hints_used INTEGER DEFAULT 0,
  elapsed_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  completed_at TIMESTAMP DEFAULT NOW()
);

-- Scheduled review state for non-opening training items such as tactics and endgames
CREATE TABLE IF NOT EXISTS training_item_reviews (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  module VARCHAR(50) NOT NULL,
  item_id VARCHAR(100) NOT NULL,
  theme VARCHAR(100),
  ease_factor REAL DEFAULT 2.5,
  interval_days INTEGER DEFAULT 0,
  next_review BIGINT DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  successes INTEGER DEFAULT 0,
  last_score REAL DEFAULT 0,
  last_practiced BIGINT DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, module, item_id)
);

CREATE INDEX IF NOT EXISTS idx_training_item_reviews_due
  ON training_item_reviews(user_id, module, next_review);

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
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='game_analysis_moves' AND column_name='fen_before') THEN
    ALTER TABLE game_analysis_moves ADD COLUMN fen_before TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='game_analysis_moves' AND column_name='best_move_uci') THEN
    ALTER TABLE game_analysis_moves ADD COLUMN best_move_uci VARCHAR(20);
  END IF;
  -- training_sessions additions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='training_sessions' AND column_name='attempts') THEN
    ALTER TABLE training_sessions ADD COLUMN attempts INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='training_sessions' AND column_name='successes') THEN
    ALTER TABLE training_sessions ADD COLUMN successes INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='training_sessions' AND column_name='first_try_successes') THEN
    ALTER TABLE training_sessions ADD COLUMN first_try_successes INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='training_sessions' AND column_name='hints_used') THEN
    ALTER TABLE training_sessions ADD COLUMN hints_used INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='training_sessions' AND column_name='elapsed_ms') THEN
    ALTER TABLE training_sessions ADD COLUMN elapsed_ms INTEGER;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='training_sessions' AND column_name='metadata') THEN
    ALTER TABLE training_sessions ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
  -- training_item_reviews additions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='training_item_reviews' AND column_name='theme') THEN
    ALTER TABLE training_item_reviews ADD COLUMN theme VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='training_item_reviews' AND column_name='ease_factor') THEN
    ALTER TABLE training_item_reviews ADD COLUMN ease_factor REAL DEFAULT 2.5;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='training_item_reviews' AND column_name='interval_days') THEN
    ALTER TABLE training_item_reviews ADD COLUMN interval_days INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='training_item_reviews' AND column_name='next_review') THEN
    ALTER TABLE training_item_reviews ADD COLUMN next_review BIGINT DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='training_item_reviews' AND column_name='attempts') THEN
    ALTER TABLE training_item_reviews ADD COLUMN attempts INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='training_item_reviews' AND column_name='successes') THEN
    ALTER TABLE training_item_reviews ADD COLUMN successes INTEGER DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='training_item_reviews' AND column_name='last_score') THEN
    ALTER TABLE training_item_reviews ADD COLUMN last_score REAL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='training_item_reviews' AND column_name='last_practiced') THEN
    ALTER TABLE training_item_reviews ADD COLUMN last_practiced BIGINT DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='training_item_reviews' AND column_name='metadata') THEN
    ALTER TABLE training_item_reviews ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;
