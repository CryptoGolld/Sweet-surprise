-- Database schema for memecoin indexer
-- PostgreSQL compatible (indexes created separately)

-- Tokens table (all memecoins)
CREATE TABLE mainnet_IF NOT EXISTS tokens (
    id VARCHAR(66) PRIMARY KEY,
    coin_type TEXT NOT NULL UNIQUE,
    ticker VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
  twitter TEXT,
  telegram TEXT,
  website TEXT,
  cetus_pool_address TEXT,
    creator VARCHAR(66) NOT NULL,
    curve_supply NUMERIC(20, 0) NOT NULL DEFAULT 0,
    curve_balance NUMERIC(20, 0) NOT NULL DEFAULT 0,
    graduated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    current_price_sui NUMERIC(20, 10),
    market_cap_sui NUMERIC(20, 10),
    fully_diluted_valuation_sui NUMERIC(20, 10),
    volume_24h_sui NUMERIC(20, 0) DEFAULT 0,
    price_change_24h NUMERIC(10, 4) DEFAULT 0,
    all_time_high_sui NUMERIC(20, 10),
    all_time_high_at TIMESTAMP,
    all_time_low_sui NUMERIC(20, 10),
    all_time_low_at TIMESTAMP,
    last_trade_at TIMESTAMP
);

CREATE INDEX mainnet_IF NOT EXISTS idx_ticker ON tokens(ticker);
CREATE INDEX mainnet_IF NOT EXISTS idx_created_at ON tokens(created_at DESC);
CREATE INDEX mainnet_IF NOT EXISTS idx_graduated ON tokens(graduated);
CREATE INDEX mainnet_IF NOT EXISTS idx_market_cap ON tokens(market_cap_sui DESC);
CREATE INDEX mainnet_IF NOT EXISTS idx_volume_24h ON tokens(volume_24h_sui DESC);
CREATE INDEX mainnet_IF NOT EXISTS idx_price_change ON tokens(price_change_24h DESC);

-- Trades table (all buys and sells)
CREATE TABLE mainnet_IF NOT EXISTS trades (
    id SERIAL PRIMARY KEY,
    tx_digest VARCHAR(66) NOT NULL UNIQUE,
    coin_type TEXT NOT NULL,
    curve_id VARCHAR(66) NOT NULL,
    trader VARCHAR(66) NOT NULL,
    trade_type VARCHAR(10) NOT NULL,
    sui_amount NUMERIC(20, 0) NOT NULL,
    token_amount NUMERIC(20, 0) NOT NULL,
    price_per_token NUMERIC(20, 10) NOT NULL,
    timestamp TIMESTAMP NOT NULL
);

CREATE INDEX mainnet_IF NOT EXISTS idx_coin_type ON trades(coin_type);
CREATE INDEX mainnet_IF NOT EXISTS idx_timestamp ON trades(timestamp DESC);
CREATE INDEX mainnet_IF NOT EXISTS idx_trader ON trades(trader);
CREATE INDEX mainnet_IF NOT EXISTS idx_curve_id ON trades(curve_id);

-- Price snapshots (for charts)
CREATE TABLE mainnet_IF NOT EXISTS price_snapshots (
    coin_type TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    open NUMERIC(20, 10) NOT NULL,
    high NUMERIC(20, 10) NOT NULL,
    low NUMERIC(20, 10) NOT NULL,
    close NUMERIC(20, 10) NOT NULL,
    volume NUMERIC(20, 0) NOT NULL,
    PRIMARY KEY (coin_type, timestamp)
);

CREATE INDEX mainnet_IF NOT EXISTS idx_snapshot_timestamp ON price_snapshots(timestamp DESC);

-- Indexer state
CREATE TABLE mainnet_IF NOT EXISTS indexer_state (
    id INTEGER PRIMARY KEY DEFAULT 1,
    last_cursor TEXT,
    last_timestamp BIGINT,
    updated_at TIMESTAMP DEFAULT NOW(),
    CHECK (id = 1)
);

-- Referrals table
CREATE TABLE mainnet_IF NOT EXISTS referrals (
    referee VARCHAR(66) PRIMARY KEY,
    referrer VARCHAR(66) NOT NULL,
    first_trade_at TIMESTAMP NOT NULL,
    total_rewards NUMERIC(20, 0) DEFAULT 0,
    trade_count INTEGER DEFAULT 0
);

CREATE INDEX mainnet_IF NOT EXISTS idx_referrer ON referrals(referrer);
CREATE INDEX mainnet_IF NOT EXISTS idx_first_trade ON referrals(first_trade_at DESC);

-- User PnL table
CREATE TABLE mainnet_IF NOT EXISTS user_pnl (
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
    PRIMARY KEY (user_address, coin_type)
);

CREATE INDEX mainnet_IF NOT EXISTS idx_user ON user_pnl(user_address);
CREATE INDEX mainnet_IF NOT EXISTS idx_coin ON user_pnl(coin_type);
CREATE INDEX mainnet_IF NOT EXISTS idx_pnl ON user_pnl(realized_pnl DESC);

-- Token holders
CREATE TABLE mainnet_IF NOT EXISTS token_holders (
    user_address VARCHAR(66) NOT NULL,
    coin_type TEXT NOT NULL,
    balance NUMERIC(20, 0) NOT NULL DEFAULT 0,
    first_acquired_at TIMESTAMP NOT NULL,
    last_updated_at TIMESTAMP NOT NULL,
    PRIMARY KEY (user_address, coin_type)
);

CREATE INDEX mainnet_IF NOT EXISTS idx_holder_coin_type ON token_holders(coin_type);
CREATE INDEX mainnet_IF NOT EXISTS idx_holder_balance ON token_holders(balance DESC);
CREATE INDEX mainnet_IF NOT EXISTS idx_holder_user ON token_holders(user_address);

-- Insert initial state
INSERT INTO indexer_state (id, last_cursor, last_timestamp) 
VALUES (1, NULL, 0) 
ON CONFLICT (id) DO NOTHING;
