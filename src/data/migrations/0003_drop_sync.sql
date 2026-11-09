DROP TABLE `outbox`;--> statement-breakpoint
ALTER TABLE `sightings` DROP COLUMN `verified`;--> statement-breakpoint
ALTER TABLE `sightings` DROP COLUMN `updated_at`;--> statement-breakpoint
ALTER TABLE `sightings` DROP COLUMN `sync_status`;