CREATE DATABASE IF NOT EXISTS smartdiet_fitness
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE smartdiet_fitness;

CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100)  NOT NULL,
    email         VARCHAR(150)  NOT NULL UNIQUE,
    password_hash VARCHAR(255)  NOT NULL,
    role          ENUM('admin','dietitian','user') NOT NULL DEFAULT 'user',
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_profiles (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    user_id        INT NOT NULL UNIQUE,
    age            INT,
    weight_kg      DECIMAL(5,2),
    height_cm      DECIMAL(5,2),
    gender         ENUM('male','female','other'),
    goal           ENUM('lose_weight','maintain','gain_muscle') DEFAULT 'maintain',
    activity_level ENUM('sedentary','light','moderate','active','very_active') DEFAULT 'moderate',
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meals (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(150) NOT NULL,
    description TEXT,
    calories    INT NOT NULL,
    protein_g   DECIMAL(6,2) DEFAULT 0,
    carbs_g     DECIMAL(6,2) DEFAULT 0,
    fat_g       DECIMAL(6,2) DEFAULT 0,
    category    ENUM('breakfast','lunch','dinner','snack') NOT NULL,
    created_by  INT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS exercises (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    name                    VARCHAR(150) NOT NULL,
    category                ENUM('cardio','strength','flexibility','sports','other') NOT NULL,
    calories_burned_per_hour INT NOT NULL DEFAULT 0,
    description             TEXT,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS diet_plans (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    title                VARCHAR(200) NOT NULL,
    description          TEXT,
    goal                 ENUM('lose_weight','maintain','gain_muscle') DEFAULT 'maintain',
    total_daily_calories INT,
    dietitian_id         INT,
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dietitian_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS diet_plan_meals (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    plan_id     INT NOT NULL,
    meal_id     INT NOT NULL,
    day_of_week ENUM('monday','tuesday','wednesday','thursday','friday','saturday','sunday') NOT NULL,
    meal_time   ENUM('breakfast','lunch','dinner','snack') NOT NULL,
    FOREIGN KEY (plan_id) REFERENCES diet_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (meal_id) REFERENCES meals(id)  ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_diet_assignments (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    plan_id     INT NOT NULL,
    assigned_by INT,
    start_date  DATE NOT NULL,
    end_date    DATE,
    is_active   BOOLEAN DEFAULT TRUE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
    FOREIGN KEY (plan_id)     REFERENCES diet_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id)      ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS meal_logs (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    meal_id     INT NOT NULL,
    logged_date DATE NOT NULL,
    meal_time   ENUM('breakfast','lunch','dinner','snack') NOT NULL,
    notes       VARCHAR(255),
    logged_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)  REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (meal_id)  REFERENCES meals(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exercise_logs (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT NOT NULL,
    exercise_id      INT NOT NULL,
    logged_date      DATE NOT NULL,
    duration_minutes INT NOT NULL,
    calories_burned  INT,
    notes            VARCHAR(255),
    logged_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id)  ON DELETE CASCADE
);

-- Sample exercises
INSERT IGNORE INTO exercises (name, category, calories_burned_per_hour, description) VALUES
('Running',        'cardio',      600, 'Outdoor or treadmill running'),
('Cycling',        'cardio',      500, 'Road or stationary cycling'),
('Swimming',       'cardio',      550, 'Pool swimming'),
('Weight Training','strength',    400, 'Resistance and weight lifting'),
('Yoga',           'flexibility', 200, 'Yoga and stretching exercises'),
('Walking',        'cardio',      300, 'Brisk walking'),
('HIIT',           'cardio',      700, 'High intensity interval training'),
('Push-ups',       'strength',    350, 'Bodyweight push-ups');

-- Sample meals
INSERT IGNORE INTO meals (name, description, calories, protein_g, carbs_g, fat_g, category) VALUES
('Oatmeal with Berries',  'Steel cut oats with mixed berries',         320, 12, 58,  6, 'breakfast'),
('Scrambled Eggs',        'Eggs with whole wheat toast',               340, 22, 30, 14, 'breakfast'),
('Grilled Chicken Salad', 'Chicken breast with mixed greens',          380, 42, 15, 12, 'lunch'),
('Quinoa Buddha Bowl',    'Quinoa with roasted vegetables and hummus', 420, 18, 62, 14, 'lunch'),
('Salmon with Veggies',   'Baked salmon with steamed vegetables',      450, 38, 20, 22, 'dinner'),
('Lentil Soup',           'Hearty red lentil soup with bread',         380, 22, 58,  6, 'dinner'),
('Greek Yogurt',          'Plain Greek yogurt with honey',             180, 15, 22,  3, 'snack'),
('Banana',                'Fresh banana',                              105,  1, 27,  0, 'snack');
