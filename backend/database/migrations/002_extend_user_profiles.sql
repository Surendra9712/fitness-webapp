-- Extend user_profiles with full onboarding fields
-- Run once against an existing database.
-- schema.sql already has the complete table definition.

ALTER TABLE user_profiles
  -- Step 1: Personal Info
  ADD COLUMN IF NOT EXISTS full_name            VARCHAR(200),
  ADD COLUMN IF NOT EXISTS date_of_birth        DATE,
  ADD COLUMN IF NOT EXISTS phone_number         VARCHAR(30),
  ADD COLUMN IF NOT EXISTS city                 VARCHAR(100),
  ADD COLUMN IF NOT EXISTS country              VARCHAR(100) DEFAULT 'Nepal',
  ADD COLUMN IF NOT EXISTS occupation           VARCHAR(100),
  ADD COLUMN IF NOT EXISTS current_weight_kg    DECIMAL(5,2),
  -- Step 2: Goals
  ADD COLUMN IF NOT EXISTS primary_goal         ENUM('lose_weight','gain_muscle','maintain','improve_health','athletic_performance') DEFAULT 'maintain',
  ADD COLUMN IF NOT EXISTS fitness_level        ENUM('beginner','intermediate','advanced') DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS target_water_ml      INT DEFAULT 2000,
  -- Step 3: Diet
  ADD COLUMN IF NOT EXISTS diet_type            VARCHAR(50) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS is_vegan             BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_vegetarian        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_gluten_free       BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_dairy_free        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_halal             BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_diabetic_friendly BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS other_restrictions   TEXT,
  ADD COLUMN IF NOT EXISTS allergens            JSON,
  ADD COLUMN IF NOT EXISTS cuisine_preferences  JSON,
  -- Step 4: Habits
  ADD COLUMN IF NOT EXISTS breakfast_time       TIME DEFAULT '07:30:00',
  ADD COLUMN IF NOT EXISTS lunch_time           TIME DEFAULT '12:30:00',
  ADD COLUMN IF NOT EXISTS dinner_time          TIME DEFAULT '19:00:00',
  ADD COLUMN IF NOT EXISTS meals_per_day        INT DEFAULT 3,
  ADD COLUMN IF NOT EXISTS snacks_between_meals BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cooking_frequency    VARCHAR(30) DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS eating_out_frequency INT DEFAULT 2,
  ADD COLUMN IF NOT EXISTS track_hydration      BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS avg_sleep_hours      DECIMAL(3,1) DEFAULT 7.0,
  ADD COLUMN IF NOT EXISTS emotional_eater      BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS stress_level         ENUM('low','moderate','high','very_high') DEFAULT 'moderate',
  -- Step 5: Health
  ADD COLUMN IF NOT EXISTS health_conditions    JSON,
  ADD COLUMN IF NOT EXISTS notes                TEXT,
  -- Meta
  ADD COLUMN IF NOT EXISTS onboarding_complete  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_step      INT DEFAULT 0;
