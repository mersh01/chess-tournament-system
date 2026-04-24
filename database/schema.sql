-- PostgreSQL schema
CREATE DATABASE chess_tournament;

\c chess_tournament;

-- Players table
CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    rating INTEGER DEFAULT 1200,
    club VARCHAR(100),
    federation VARCHAR(3),
    birth_date DATE,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tournaments table
CREATE TABLE tournaments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    rounds INTEGER DEFAULT 5,
    status VARCHAR(20) DEFAULT 'registration',
    config JSONB, -- Store tournament configuration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tournament registrations with payments
CREATE TABLE registrations (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER REFERENCES tournaments(id),
    player_id INTEGER REFERENCES players(id),
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    payment_status VARCHAR(20) DEFAULT 'pending',
    payment_amount DECIMAL(10,2),
    payment_method VARCHAR(30),
    discount_applied DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'active',
    UNIQUE(tournament_id, player_id)
);

-- Matches (pairings)
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    tournament_id INTEGER REFERENCES tournaments(id),
    round_number INTEGER NOT NULL,
    white_player_id INTEGER REFERENCES players(id),
    black_player_id INTEGER REFERENCES players(id),
    result VARCHAR(10), -- '1-0', '0-1', '1/2-1/2', '*'
    pgn TEXT,
    played_at TIMESTAMP,
    is_bye BOOLEAN DEFAULT FALSE
);

-- Payments table
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    registration_id INTEGER REFERENCES registrations(id),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    method VARCHAR(30) NOT NULL,
    transaction_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'pending',
    payment_date TIMESTAMP,
    metadata JSONB
);

-- Indexes for performance
CREATE INDEX idx_registrations_tournament ON registrations(tournament_id);
CREATE INDEX idx_matches_tournament_round ON matches(tournament_id, round_number);
CREATE INDEX idx_payments_status ON payments(status);