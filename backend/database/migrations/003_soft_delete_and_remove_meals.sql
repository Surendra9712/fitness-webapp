-- Migration 003: soft delete columns + drop meals-related tables
-- Run once against the live database.

-- 1. Add deleted_at to all applicable tables
ALTER TABLE users              ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE exercises          ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE exercise_logs      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE categories         ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE products           ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE orders             ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE trainer_assignments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL;
ALTER TABLE product_requests   ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL;

-- 2. Drop meals-related tables (order matters: children before parents)
DROP TABLE IF EXISTS meal_logs;
DROP TABLE IF EXISTS user_diet_assignments;
DROP TABLE IF EXISTS diet_plan_meals;
DROP TABLE IF EXISTS diet_plans;
DROP TABLE IF EXISTS meals;
