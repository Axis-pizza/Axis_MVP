-- Add last_faucet_at column to users table for faucet cooldown tracking
ALTER TABLE users ADD COLUMN last_faucet_at INTEGER DEFAULT 0;
