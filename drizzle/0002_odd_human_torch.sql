CREATE TABLE `daily_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`entry_date` varchar(10) NOT NULL,
	`mood` enum('very_low','low','neutral','good','great') NOT NULL,
	`symptoms_json` text NOT NULL,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `daily_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_entries_user_date_unique` UNIQUE(`user_id`,`entry_date`)
);
--> statement-breakpoint
ALTER TABLE `cycle_records` MODIFY COLUMN `symptoms_json` text NOT NULL;--> statement-breakpoint
ALTER TABLE `daily_entries` ADD CONSTRAINT `daily_entries_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;