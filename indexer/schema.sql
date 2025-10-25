-- Database schema for memecoin indexer

-- Tokens table (all memecoins)
CREATE TABLE IF NOT EXISTS tokens (
    id VARCHAR(66) PRIMARY KEY,
    coin_type TEXT NOT NULL UNIQUE,
    ticker VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
    creator VARCHAR(66) NOT NULL,
    curve_supply NUMERIC(20, 0) NOT NULL DEFAULT 0,
    curve_balance NUMERIC(20, 0) NOT NULL DEFAULT 0,
    graduated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_ticker (ticker),
    INDEX idx_created_at (created_at DESC),
    INDEX idx_graduated (graduated)
);

-- Trades table (all buys and sells)
CREATE TABLE IF NOT EXISTS trades (
    id SERIAL PRIMARY KEY,
    tx_digest VARCHAR(66) NOT NULL UNIQUE,
    coin_type TEXT NOT NULL,
    curve_id VARCHAR(66) NOT NULL,
    trader VARCHAR(66) NOT NULL,
    trade_type VARCHAR(10) NOT NULL, -- 'buy' or 'sell'
    sui_amount NUMERIC(20, 0) NOT NULL,
    token_amount NUMERIC(20, 0) NOT NULL,
    price_per_token NUMERIC(20, 10) NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    INDEX idx_coin_type (coin_type),
    INDEX idx_timestamp (timestamp DESC),
    INDEX idx_trader (trader),
    INDEX idx_curve_id (curve_id)
);

-- Price snapshots (for charts - aggregated every minute)
CREATE TABLE IF NOT EXISTS price_snapshots (
    coin_type TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    open NUMERIC(20, 10) NOT NULL,
    high NUMERIC(20, 10) NOT NULL,
    low NUMERIC(20, 10) NOT NULL,
    close NUMERIC(20, 10) NOT NULL,
    volume NUMERIC(20, 0) NOT NULL,
    PRIMARY KEY (coin_type, timestamp),
    INDEX idx_timestamp (timestamp DESC)
);

-- Indexer state (tracks last processed event)
CREATE TABLE IF NOT EXISTS indexer_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_cursor TEXT,
    last_timestamp BIGINT,
    updated_at TIMESTAMP DEFAULT NOW(),
    CHECK (id = 1) -- Only one row allowed
);

-- Insert initial state
INSERT INTO indexer_state (id, last_cursor, last_timestamp) 
VALUES (1, NULL, 0) 
ON CONFLICT (id) DO NOTHING;
