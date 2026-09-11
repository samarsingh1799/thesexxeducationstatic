CREATE TABLE `followed_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`category_slug` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `followed_categories_user_category_idx` ON `followed_categories` (`user_id`,`category_slug`);--> statement-breakpoint
CREATE TABLE `reading_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`post_id` integer NOT NULL,
	`slug` text NOT NULL,
	`locale` text DEFAULT 'en' NOT NULL,
	`viewed_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `reading_history_user_id_idx` ON `reading_history` (`user_id`);--> statement-breakpoint
CREATE INDEX `reading_history_user_viewed_at_idx` ON `reading_history` (`user_id`,`viewed_at`);--> statement-breakpoint
CREATE TABLE `saved_articles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`post_id` integer NOT NULL,
	`slug` text NOT NULL,
	`category_slug` text,
	`locale` text DEFAULT 'en' NOT NULL,
	`title` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `saved_articles_user_id_idx` ON `saved_articles` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `saved_articles_user_post_locale_idx` ON `saved_articles` (`user_id`,`post_id`,`locale`);--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`preferred_locale` text,
	`newsletter_opt_in` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `accounts_userId_idx` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `sessions_userId_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verifications_identifier_idx` ON `verifications` (`identifier`);