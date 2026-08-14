ALTER TABLE `daily_entries` MODIFY COLUMN `mood` enum('very_low','low','neutral','good','great','irritable','anxious') NOT NULL;--> statement-breakpoint
ALTER TABLE `daily_entries` ADD `pain_level` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `typical_bleeding_days` int DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `relationship_status` enum('single','married') DEFAULT 'single' NOT NULL;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD `pregnancy_status` enum('not_pregnant','pregnant','not_sure') DEFAULT 'not_pregnant' NOT NULL;