-- 022_drop_habit_fields.sql
-- Removes the onboarding "Habits" step fields that were never consumed by any
-- recommendation/scoring logic. meals_per_day is retained (moved to the Diet step).
ALTER TABLE user_profiles
    DROP COLUMN breakfast_time,
    DROP COLUMN lunch_time,
    DROP COLUMN dinner_time,
    DROP COLUMN snacks_between_meals,
    DROP COLUMN cooking_frequency,
    DROP COLUMN eating_out_frequency,
    DROP COLUMN track_hydration,
    DROP COLUMN avg_sleep_hours,
    DROP COLUMN emotional_eater,
    DROP COLUMN stress_level;
