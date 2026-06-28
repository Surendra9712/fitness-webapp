-- Add is_verified flag to users (for dietitians/trainers)
-- Unverified trainers won't appear in trainee search
ALTER TABLE users ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 0;

-- Existing active dietitians are considered already verified
UPDATE users SET is_verified = 1 WHERE role = 'dietitian' AND status = 'active';
