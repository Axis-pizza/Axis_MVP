INSERT INTO vaults (id, name, symbol, description, creator, strategy_type, management_fee, min_liquidity, composition, image_url, tvl, apy, created_at) VALUES 
-- 1. Majors
('v-001', 'Solana Blue Chip', 'BLUE', 'Exposure to the top ecosystem heavyweights: SOL, BTC, and ETH.', 'Axis Team', 'yield_max', 0.95, 1000, '[{"token":{"symbol":"SOL","name":"Wrapped SOL","logoURI":"https://assets.coingecko.com/coins/images/4128/large/solana.png"},"weight":50},{"token":{"symbol":"WBTC","name":"Wrapped Bitcoin","logoURI":"https://assets.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png"},"weight":25},{"token":{"symbol":"WETH","name":"Wrapped Ethereum","logoURI":"https://assets.coingecko.com/coins/images/279/large/ethereum.png"},"weight":25}]', 'https://assets.coingecko.com/coins/images/4128/large/solana.png', 5420000, 8.5, strftime('%s', 'now') - 800000),

-- 2. Meme
('v-002', 'Meme Supercycle', 'MEME', 'High beta exposure to the leading memecoins on Solana.', 'degen_whale.sol', 'momentum', 1.5, 500, '[{"token":{"symbol":"WIF","name":"dogwifhat","logoURI":"https://assets.coingecko.com/coins/images/33566/large/dogwifhat.jpg"},"weight":40},{"token":{"symbol":"BONK","name":"Bonk","logoURI":"https://assets.coingecko.com/coins/images/28600/large/bonk.jpg"},"weight":40},{"token":{"symbol":"POPCAT","name":"Popcat","logoURI":"https://s2.coinmarketcap.com/static/img/coins/64x64/28782.png"},"weight":20}]', 'https://assets.coingecko.com/coins/images/33566/large/dogwifhat.jpg', 1250000, 420.69, strftime('%s', 'now') - 40000),

-- 3. LST
('v-003', 'Liquid Staking Max', 'LST', 'Optimized yield from leading liquid staking tokens.', 'Axis Team', 'yield_max', 0.5, 10000, '[{"token":{"symbol":"jitoSOL","name":"Jito Staked SOL","logoURI":"https://s2.coinmarketcap.com/static/img/coins/64x64/22533.png"},"weight":50},{"token":{"symbol":"mSOL","name":"Marinade Staked SOL","logoURI":"https://assets.coingecko.com/coins/images/17752/large/mSOL.png"},"weight":30},{"token":{"symbol":"bSOL","name":"BlazeStake","logoURI":"https://s2.coinmarketcap.com/static/img/coins/64x64/28862.png"},"weight":20}]', 'https://s2.coinmarketcap.com/static/img/coins/64x64/22533.png', 8900000, 7.8, strftime('%s', 'now') - 1200000),

-- 4. DeFi
('v-004', 'Solana DeFi Core', 'DEFI', 'Governance tokens of the premier decentralized exchanges.', 'ProtocolDAO', 'rebalance', 1.0, 100, '[{"token":{"symbol":"JUP","name":"Jupiter","logoURI":"https://static.jup.ag/jup/icon.png"},"weight":40},{"token":{"symbol":"RAY","name":"Raydium","logoURI":"https://assets.coingecko.com/coins/images/13928/large/PSigc4ie_400x400.jpg"},"weight":30},{"token":{"symbol":"ORCA","name":"Orca","logoURI":"https://assets.coingecko.com/coins/images/17547/large/Orca_Logo.png"},"weight":30}]', 'https://static.jup.ag/jup/icon.png', 320000, 14.2, strftime('%s', 'now') - 600000),

-- 5. DePIN
('v-005', 'DePIN Infrastructure', 'PIN', 'Physical infrastructure networks powered by Solana.', 'HNT_Maxi', 'yield_max', 1.2, 500, '[{"token":{"symbol":"RENDER","name":"Render","logoURI":"https://assets.coingecko.com/coins/images/11636/large/rndr.png"},"weight":60},{"token":{"symbol":"HNT","name":"Helium","logoURI":"https://assets.coingecko.com/coins/images/4284/large/Helium_HNT.png"},"weight":40}]', 'https://assets.coingecko.com/coins/images/11636/large/rndr.png', 450000, 9.1, strftime('%s', 'now') - 300000),

-- 6. Stable
('v-006', 'Stable Yield Agg', 'USD+', 'Low risk, stablecoin yield farming strategy.', 'Axis Team', 'yield_max', 0.1, 50000, '[{"token":{"symbol":"USDC","name":"USD Coin","logoURI":"https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png"},"weight":50},{"token":{"symbol":"USDT","name":"Tether","logoURI":"https://assets.coingecko.com/coins/images/325/large/Tether.png"},"weight":50}]', 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png', 12000000, 4.5, strftime('%s', 'now') - 2000000),

-- 7. Community
('v-007', 'Dog Coin Index', 'DOG', 'Woof woof.', 'shib_lover', 'momentum', 2.0, 100, '[{"token":{"symbol":"BONK","name":"Bonk","logoURI":"https://assets.coingecko.com/coins/images/28600/large/bonk.jpg"},"weight":50},{"token":{"symbol":"WIF","name":"dogwifhat","logoURI":"https://assets.coingecko.com/coins/images/33566/large/dogwifhat.jpg"},"weight":50}]', 'https://assets.coingecko.com/coins/images/28600/large/bonk.jpg', 54000, 88.8, strftime('%s', 'now') - 10000),

-- 8. Mixed
('v-008', 'Solana Ecosystem', 'ECO', 'Broad exposure to the entire Solana economy.', 'Axis Team', 'rebalance', 0.8, 1000, '[{"token":{"symbol":"SOL","name":"Wrapped SOL","logoURI":"https://assets.coingecko.com/coins/images/4128/large/solana.png"},"weight":40},{"token":{"symbol":"JUP","name":"Jupiter","logoURI":"https://static.jup.ag/jup/icon.png"},"weight":20},{"token":{"symbol":"PYTH","name":"Pyth","logoURI":"https://assets.coingecko.com/coins/images/31924/large/pyth.png"},"weight":20},{"token":{"symbol":"WIF","name":"WIF","logoURI":"https://assets.coingecko.com/coins/images/33566/large/dogwifhat.jpg"},"weight":20}]', 'https://assets.coingecko.com/coins/images/4128/large/solana.png', 2100000, 18.5, strftime('%s', 'now') - 900000),

-- 9. Oracle
('v-009', 'Oracle Plays', 'DATA', 'Betting on the data layer.', 'data_nerd', 'yield_max', 1.0, 500, '[{"token":{"symbol":"PYTH","name":"Pyth Network","logoURI":"https://assets.coingecko.com/coins/images/31924/large/pyth.png"},"weight":100}]', 'https://assets.coingecko.com/coins/images/31924/large/pyth.png', 120000, 11.2, strftime('%s', 'now') - 500000),

-- 10. BTC on Sol
('v-010', 'Bitcoin Maxi', 'WBTC', 'Just Bitcoin, but on Solana rails.', 'satoshi_fan', 'yield_max', 0.5, 1000, '[{"token":{"symbol":"WBTC","name":"Wrapped Bitcoin","logoURI":"https://assets.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png"},"weight":100}]', 'https://assets.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png', 3400000, 2.1, strftime('%s', 'now') - 1500000),

-- 11. ETH on Sol
('v-011', 'Ether Bridge', 'WETH', 'Ethereum liquidity on Solana.', 'vitalik_fan', 'yield_max', 0.5, 1000, '[{"token":{"symbol":"WETH","name":"Wrapped Ethereum","logoURI":"https://assets.coingecko.com/coins/images/279/large/ethereum.png"},"weight":100}]', 'https://assets.coingecko.com/coins/images/279/large/ethereum.png', 2800000, 3.4, strftime('%s', 'now') - 1400000),

-- 12. Degen
('v-012', '1000x or Bust', 'YOLO', 'Extremely high risk meme strategy.', 'gambler_pro', 'momentum', 5.0, 10, '[{"token":{"symbol":"POPCAT","name":"Popcat","logoURI":"https://s2.coinmarketcap.com/static/img/coins/64x64/28782.png"},"weight":80},{"token":{"symbol":"SOL","name":"SOL","logoURI":"https://assets.coingecko.com/coins/images/4128/large/solana.png"},"weight":20}]', 'https://s2.coinmarketcap.com/static/img/coins/64x64/28782.png', 8000, 999.0, strftime('%s', 'now') - 5000),

-- 13. Jupiter Eco
('v-013', 'Jupiter Ecosystem', 'JUP+', 'Everything related to the Jupiter exchange.', 'Jup_DAO', 'rebalance', 0.9, 500, '[{"token":{"symbol":"JUP","name":"Jupiter","logoURI":"https://static.jup.ag/jup/icon.png"},"weight":70},{"token":{"symbol":"SOL","name":"SOL","logoURI":"https://assets.coingecko.com/coins/images/4128/large/solana.png"},"weight":30}]', 'https://static.jup.ag/jup/icon.png', 750000, 15.6, strftime('%s', 'now') - 700000),

-- 14. Conservative
('v-014', 'Safe Harbor', 'SAFE', 'Heavy stablecoin allocation with minor crypto exposure.', 'Grandma_Invests', 'yield_max', 0.2, 5000, '[{"token":{"symbol":"USDC","name":"USD Coin","logoURI":"https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png"},"weight":80},{"token":{"symbol":"SOL","name":"SOL","logoURI":"https://assets.coingecko.com/coins/images/4128/large/solana.png"},"weight":20}]', 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png', 4500000, 6.2, strftime('%s', 'now') - 1800000),

-- 15. Aggressive Growth
('v-015', 'Aggressive Growth', 'GROW', 'Mid-cap tokens with high upside potential.', 'Axis Team', 'rebalance', 1.1, 1000, '[{"token":{"symbol":"RENDER","name":"Render","logoURI":"https://assets.coingecko.com/coins/images/11636/large/rndr.png"},"weight":33},{"token":{"symbol":"HNT","name":"Helium","logoURI":"https://assets.coingecko.com/coins/images/4284/large/Helium_HNT.png"},"weight":33},{"token":{"symbol":"PYTH","name":"Pyth","logoURI":"https://assets.coingecko.com/coins/images/31924/large/pyth.png"},"weight":34}]', 'https://assets.coingecko.com/coins/images/4284/large/Helium_HNT.png', 670000, 22.4, strftime('%s', 'now') - 450000),

-- 16. Cat Coins
('v-016', 'Cat Coins Only', 'MEOW', 'Cats rule the internet.', 'cat_lover', 'momentum', 2.0, 100, '[{"token":{"symbol":"POPCAT","name":"Popcat","logoURI":"https://s2.coinmarketcap.com/static/img/coins/64x64/28782.png"},"weight":100}]', 'https://s2.coinmarketcap.com/static/img/coins/64x64/28782.png', 42000, 150.5, strftime('%s', 'now') - 20000),

-- 17. Sol Sol Sol
('v-017', 'Pure Solana', 'SOL', '100% SOL, automated yield strategies.', 'Axis Team', 'yield_max', 0.5, 1000, '[{"token":{"symbol":"SOL","name":"Wrapped SOL","logoURI":"https://assets.coingecko.com/coins/images/4128/large/solana.png"},"weight":100}]', 'https://assets.coingecko.com/coins/images/4128/large/solana.png', 15000000, 7.2, strftime('%s', 'now') - 2500000),

-- 18. New Gen
('v-018', 'Next Gen', 'NEXT', 'New tokens listed in the last 3 months.', 'trend_spotter', 'rebalance', 1.5, 500, '[{"token":{"symbol":"WIF","name":"dogwifhat","logoURI":"https://assets.coingecko.com/coins/images/33566/large/dogwifhat.jpg"},"weight":50},{"token":{"symbol":"JUP","name":"Jupiter","logoURI":"https://static.jup.ag/jup/icon.png"},"weight":50}]', 'https://assets.coingecko.com/coins/images/33566/large/dogwifhat.jpg', 330000, 45.0, strftime('%s', 'now') - 100000),

-- 19. Whale Watch
('v-019', 'Whale Copycat', 'WHALE', 'Following the top wallets on-chain.', 'whale_alert', 'yield_max', 1.0, 5000, '[{"token":{"symbol":"SOL","name":"SOL","logoURI":"https://assets.coingecko.com/coins/images/4128/large/solana.png"},"weight":60},{"token":{"symbol":"USDC","name":"USDC","logoURI":"https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png"},"weight":40}]', 'https://assets.coingecko.com/coins/images/4128/large/solana.png', 2800000, 8.9, strftime('%s', 'now') - 850000),

-- 20. Momentum
('v-020', 'Momentum Alpha', 'ALPHA', 'Algorithmic momentum trading.', 'quant_fund', 'momentum', 2.0, 10000, '[{"token":{"symbol":"SOL","name":"SOL","logoURI":"https://assets.coingecko.com/coins/images/4128/large/solana.png"},"weight":50},{"token":{"symbol":"BONK","name":"Bonk","logoURI":"https://assets.coingecko.com/coins/images/28600/large/bonk.jpg"},"weight":50}]', 'https://assets.coingecko.com/coins/images/13928/large/PSigc4ie_400x400.jpg', 950000, 32.1, strftime('%s', 'now') - 30000);