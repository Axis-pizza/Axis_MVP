PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_token_prices` (
	`token_name` text NOT NULL,
	`recorded_at` text NOT NULL,
	`price_usd` real,
	PRIMARY KEY(`token_name`, `recorded_at`)
);
--> statement-breakpoint
INSERT INTO `__new_token_prices`("token_name", "recorded_at", "price_usd") SELECT "token_name", "recorded_at", "price_usd" FROM `token_prices`;--> statement-breakpoint
DROP TABLE `token_prices`;--> statement-breakpoint
ALTER TABLE `__new_token_prices` RENAME TO `token_prices`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `strategies` ADD `composition` text;--> statement-breakpoint
ALTER TABLE `strategies` ADD `tvl` real;--> statement-breakpoint
ALTER TABLE `strategies` ADD `roi` real;--> statement-breakpoint
ALTER TABLE `strategies` ADD `mint_address` text;--> statement-breakpoint
ALTER TABLE `strategies` ADD `vault_address` text;--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text;--> statement-breakpoint
ALTER TABLE `users` ADD `badges` text;--> statement-breakpoint
ALTER TABLE `users` ADD `total_xp` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `rank_tier` text DEFAULT 'Novice';--> statement-breakpoint
ALTER TABLE `users` ADD `pnl_percent` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `last_checkin` integer DEFAULT 0;