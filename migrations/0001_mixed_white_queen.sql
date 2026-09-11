CREATE TABLE `liked_articles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`post_id` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `liked_articles_user_id_idx` ON `liked_articles` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `liked_articles_user_post_idx` ON `liked_articles` (`user_id`,`post_id`);--> statement-breakpoint
CREATE TABLE `post_views` (
	`post_id` integer PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
