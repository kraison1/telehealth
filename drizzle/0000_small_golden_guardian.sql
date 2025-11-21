CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`sender` text NOT NULL,
	`content` text NOT NULL,
	`room_id` text NOT NULL,
	`timestamp` integer NOT NULL
);
