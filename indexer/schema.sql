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
    -- Price & Market Data (updated on every trade)
    current_price_sui NUMERIC(20, 10),              -- Current price per token in SUI
    market_cap_sui NUMERIC(20, 10),                 -- Market cap = price * circulating_supply
    fully_diluted_valuation_sui NUMERIC(20, 10),   -- FDV = price * total_supply
    volume_24h_sui NUMERIC(20, 0) DEFAULT 0,        -- 24h trading volume in SUI
    price_change_24h NUMERIC(10, 4) DEFAULT 0,      -- 24h price change %
    all_time_high_sui NUMERIC(20, 10),              -- ATH price
    all_time_high_at TIMESTAMP,                     -- When ATH was reached
    all_time_low_sui NUMERIC(20, 10),               -- ATL price
    all_time_low_at TIMESTAMP,                      -- When ATL was reached
    last_trade_at TIMESTAMP,                        -- Last trade timestamp
    INDEX idx_ticker (ticker),
    INDEX idx_created_at (created_at DESC),
    INDEX idx_graduated (graduated),
    INDEX idx_market_cap (market_cap_sui DESC),
    INDEX idx_volume_24h (volume_24h_sui DESC),
    INDEX idx_price_change (price_change_24h DESC)
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

-- Referrals table (tracks referrer-referee relationships)
CREATE TABLE IF NOT EXISTS referrals (
    referee VARCHAR(66) PRIMARY KEY,
    referrer VARCHAR(66) NOT NULL,
    first_trade_at TIMESTAMP NOT NULL,
    total_rewards NUMERIC(20, 0) DEFAULT 0,
    trade_count INTEGER DEFAULT 0,
    INDEX idx_referrer (referrer),
    INDEX idx_first_trade (first_trade_at DESC)
);

-- User PnL table (per user per token)
CREATE TABLE IF NOT EXISTS user_pnl (
    user_address VARCHAR(66) NOT NULL,
    coin_type TEXT NOT NULL,
    total_sui_spent NUMERIC(20, 0) DEFAULT 0,
    total_sui_received NUMERIC(20, 0) DEFAULT 0,
    total_tokens_bought NUMERIC(20, 0) DEFAULT 0,
    total_tokens_sold NUMERIC(20, 0) DEFAULT 0,
    buy_count INTEGER DEFAULT 0,
    sell_count INTEGER DEFAULT 0,
    realized_pnl NUMERIC(20, 0) DEFAULT 0,
    last_trade_at TIMESTAMP,
    PRIMARY KEY (user_address, coin_type),
    INDEX idx_user (user_address),
    INDEX idx_coin (coin_type),
    INDEX idx_pnl (realized_pnl DESC)
);

-- Token holders (current holdings per user per token)
CREATE TABLE IF NOT EXISTS token_holders (
    user_address VARCHAR(66) NOT NULL,
    coin_type TEXT NOT NULL,
    balance NUMERIC(20, 0) NOT NULL DEFAULT 0,
    first_acquired_at TIMESTAMP NOT NULL,
    last_updated_at TIMESTAMP NOT NULL,
    PRIMARY KEY (user_address, coin_type),
    INDEX idx_coin_type (coin_type),
    INDEX idx_balance (balance DESC),
    INDEX idx_user (user_address)
);

-- Insert initial state
INSERT INTO indexer_state (id, last_cursor, last_timestamp) 
VALUES (1, NULL, 0) 
ON CONFLICT (id) DO NOTHING;
