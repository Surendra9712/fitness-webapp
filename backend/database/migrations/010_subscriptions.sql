ALTER TABLE users ADD COLUMN subscription_plan   ENUM('free','pro') NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN subscription_status ENUM('active','pending','rejected') NOT NULL DEFAULT 'active';
