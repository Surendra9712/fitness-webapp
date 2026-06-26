-- Add approval_status to track self-registered users awaiting admin approval.
-- Existing users default to 'approved' so nothing breaks.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS approval_status ENUM('pending', 'approved') NOT NULL DEFAULT 'approved';
