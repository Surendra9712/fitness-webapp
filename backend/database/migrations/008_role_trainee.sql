-- Rename role 'user' to 'trainee' to better reflect the domain.
-- Step 1: Add 'trainee' to ENUM alongside 'user' so existing data is valid during migration.
ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'dietitian', 'user', 'trainee') NOT NULL DEFAULT 'trainee';

-- Step 2: Rename existing rows.
UPDATE users SET role = 'trainee' WHERE role = 'user';

-- Step 3: Remove 'user' from ENUM now that no rows use it.
ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'dietitian', 'trainee') NOT NULL DEFAULT 'trainee';
