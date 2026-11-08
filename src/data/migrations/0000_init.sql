CREATE TABLE `orbits` (
	`norad_id` integer PRIMARY KEY NOT NULL,
	`group` text NOT NULL,
	`omm` text NOT NULL,
	`epoch` integer NOT NULL,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `outbox` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text NOT NULL,
	`operation` text NOT NULL,
	`payload` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `passes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`norad_id` integer NOT NULL,
	`start_at` integer NOT NULL,
	`peak_at` integer NOT NULL,
	`end_at` integer NOT NULL,
	`max_elevation` real NOT NULL,
	`peak_magnitude` real,
	`track` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `passes_start_at_idx` ON `passes` (`start_at`);--> statement-breakpoint
CREATE INDEX `passes_norad_id_idx` ON `passes` (`norad_id`);--> statement-breakpoint
CREATE TABLE `satellites` (
	`norad_id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`object_type` text NOT NULL,
	`owner` text NOT NULL,
	`launch_date` text,
	`rarity` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sightings` (
	`id` text PRIMARY KEY NOT NULL,
	`norad_id` integer NOT NULL,
	`observed_at` integer NOT NULL,
	`verified` integer NOT NULL,
	`angle_error` real,
	`note` text,
	`updated_at` integer NOT NULL,
	`sync_status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sightings_norad_id_idx` ON `sightings` (`norad_id`);--> statement-breakpoint
CREATE TABLE `sync_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
