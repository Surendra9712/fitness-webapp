-- Merge is_active (BOOLEAN) + approval_status (ENUM) into a single status ENUM field.
-- Values: 'inactive' = disabled, 'active' = active, 'pending' = awaiting admin approval

ALTER TABLE users ADD COLUMN status ENUM('inactive', 'active', 'pending') NOT NULL DEFAULT 'active';

-- Migrate existing data before dropping old columns
UPDATE users SET status = 'pending'  WHERE is_active = FALSE AND approval_status = 'pending';
UPDATE users SET status = 'inactive' WHERE is_active = FALSE AND approval_status = 'approved';
-- Rows where is_active = TRUE already have status = 'active' from the DEFAULT above

ALTER TABLE users DROP COLUMN is_active;
ALTER TABLE users DROP COLUMN approval_status;
