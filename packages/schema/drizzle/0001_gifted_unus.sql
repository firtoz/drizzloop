DROP INDEX `users_email_unique`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `email`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `password`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `age`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `is_active`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `profile_picture`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `rating`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `balance`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `last_login_timestamp`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `created_at`;