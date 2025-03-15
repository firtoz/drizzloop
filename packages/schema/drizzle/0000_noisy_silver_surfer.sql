CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`age` integer,
	`is_active` integer DEFAULT true,
	`profile_picture` blob,
	`rating` numeric,
	`balance` real DEFAULT 0,
	`last_login_timestamp` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);