ALTER TABLE `users` ADD `created_at` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `updated_at` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `deleted_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `version` integer DEFAULT 0 NOT NULL;