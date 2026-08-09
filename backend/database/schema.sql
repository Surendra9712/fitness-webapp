CREATE DATABASE IF NOT EXISTS smartdiet_fitness
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE smartdiet_fitness;

CREATE TABLE IF NOT EXISTS users (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    name              VARCHAR(100)  NOT NULL,
    email             VARCHAR(150)  NOT NULL UNIQUE,
    password_hash     VARCHAR(255)  NOT NULL,
    role              ENUM('admin','dietitian','trainee') NOT NULL DEFAULT 'trainee',
    status            ENUM('inactive','active','pending') NOT NULL DEFAULT 'active',
    is_verified         TINYINT(1) NOT NULL DEFAULT 0,
    subscription_plan           ENUM('free','pro') NOT NULL DEFAULT 'free',
    subscription_status         ENUM('active','pending','rejected') NOT NULL DEFAULT 'active',
    subscription_payment_method ENUM('cash','esewa','stripe') DEFAULT NULL,
    reward_points       INT NOT NULL DEFAULT 0,
    profile_image_url   VARCHAR(500),
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at        TIMESTAMP NULL DEFAULT NULL
);

-- Run once on existing databases:
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500);

CREATE TABLE IF NOT EXISTS user_profiles (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    user_id              INT NOT NULL UNIQUE,

    full_name            VARCHAR(200),
    date_of_birth        DATE,
    gender               ENUM('male','female','other','prefer_not_to_say'),
    phone_number         VARCHAR(30),
    city                 VARCHAR(100),
    country              VARCHAR(100) DEFAULT 'Nepal',
    occupation           VARCHAR(100),
    height_cm            DECIMAL(5,2),
    current_weight_kg    DECIMAL(5,2),
    activity_level       ENUM('sedentary','light','moderate','active','very_active') DEFAULT 'moderate',

    primary_goal         ENUM('lose_weight','gain_muscle','maintain','improve_health','athletic_performance') DEFAULT 'maintain',
    fitness_level        ENUM('beginner','intermediate','advanced') DEFAULT 'beginner',
    target_water_ml      INT DEFAULT 2000,

    diet_type            ENUM('none','vegetarian','vegan','keto','paleo','diabetic','low_carb','intermittent_fasting') DEFAULT 'none',
    dietary_restrictions JSON,
    other_restrictions   TEXT,
    allergens            JSON,
    cuisine_preferences  JSON,

    meals_per_day        INT DEFAULT 3,

    health_conditions    JSON,
    notes                TEXT,

    -- Legacy fields (kept for backward compatibility)
    age                  INT,
    weight_kg            DECIMAL(5,2),
    goal                 ENUM('lose_weight','maintain','gain_muscle') DEFAULT 'maintain',

    -- Trainer / public profile fields
    profile_image_url    VARCHAR(500),
    bio                  TEXT,
    specialization       VARCHAR(200),
    available_time       JSON DEFAULT NULL,
    experience_years     TINYINT UNSIGNED DEFAULT NULL,

    updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Run once on existing databases:
-- ALTER TABLE user_profiles
--   ADD COLUMN IF NOT EXISTS profile_image_url  VARCHAR(500),
--   ADD COLUMN IF NOT EXISTS bio                TEXT,
--   ADD COLUMN IF NOT EXISTS specialization     VARCHAR(200),
--   ADD COLUMN IF NOT EXISTS available_time     JSON DEFAULT NULL,
--   ADD COLUMN IF NOT EXISTS experience_years   TINYINT UNSIGNED DEFAULT NULL;

CREATE TABLE IF NOT EXISTS trainer_certifications (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT NOT NULL,
    name         VARCHAR(200) NOT NULL,
    issued_by    VARCHAR(200),
    issued_date  DATE,
    file_url     VARCHAR(500),
    file_type    ENUM('image','pdf','url') NOT NULL DEFAULT 'url',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exercises (
    id                       INT AUTO_INCREMENT PRIMARY KEY,
    name                     VARCHAR(150) NOT NULL,
    category                 ENUM('cardio','strength','flexibility','sports','other') NOT NULL,
    calories_burned_per_hour INT NOT NULL DEFAULT 0,
    description              TEXT,
    created_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at               TIMESTAMP NULL DEFAULT NULL
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
    deleted_at       TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMP NULL DEFAULT NULL
);

INSERT IGNORE INTO categories (name, slug) VALUES
    ('Cardio',       'cardio'),
    ('Strength',     'strength'),
    ('Machines',     'machines'),
    ('Recovery',     'recovery'),
    ('Accessories',  'accessories');

CREATE TABLE IF NOT EXISTS products (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(200) NOT NULL,
    description    TEXT,
    price          DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock_quantity INT NOT NULL DEFAULT 0,
    category_id    INT NOT NULL,
    image_url      VARCHAR(500),
    status         ENUM('active','inactive') NOT NULL DEFAULT 'active',
    created_by     INT,
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at     TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (created_by)  REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS promo_codes (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    code             VARCHAR(50)  NOT NULL UNIQUE,
    description      VARCHAR(200),
    discount_type    ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage',
    discount_value   DECIMAL(10,2) NOT NULL,
    min_order_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_uses         INT DEFAULT NULL,
    current_uses     INT NOT NULL DEFAULT 0,
    valid_from       DATE DEFAULT NULL,
    valid_to         DATE DEFAULT NULL,
    is_active        TINYINT(1) NOT NULL DEFAULT 1,
    created_by       INT DEFAULT NULL,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS point_transactions (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    user_id        INT NOT NULL,
    points         INT NOT NULL,
    type           ENUM('earned','redeemed') NOT NULL,
    reference_id   INT DEFAULT NULL,
    description    VARCHAR(200),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT NOT NULL,
    status           ENUM('pending','confirmed','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
    total_amount     DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method   VARCHAR(20) NOT NULL DEFAULT 'cod',
    payment_status   VARCHAR(20) NOT NULL DEFAULT 'pending',
    payment_ref      VARCHAR(255) NULL,
    shipping_address TEXT,
    promo_code_id    INT DEFAULT NULL,
    discount_amount  DECIMAL(10,2) NOT NULL DEFAULT 0,
    points_redeemed  INT NOT NULL DEFAULT 0,
    points_discount  DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at       TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (promo_code_id) REFERENCES promo_codes(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_items (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    order_id          INT NOT NULL,
    product_id        INT NOT NULL,
    quantity          INT NOT NULL DEFAULT 1,
    price_at_purchase DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS trainer_assignments (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    customer_id         INT NOT NULL,
    trainer_id          INT NOT NULL,
    status              ENUM('pending_trainer','pending_admin','approved','rejected','ended') NOT NULL DEFAULT 'pending_trainer',
    customer_note       TEXT,
    trainer_note        TEXT,
    admin_note          TEXT,
    trainer_reviewed_at DATETIME,
    admin_reviewed_at   DATETIME,
    reviewed_by_admin   INT,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (customer_id)       REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (trainer_id)        REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by_admin) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS product_reviews (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    product_id  INT NOT NULL,
    rating      TINYINT NOT NULL,
    comment     TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY  uq_product_review (user_id, product_id),
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS trainer_reviews (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    trainer_id  INT NOT NULL,
    rating      TINYINT NOT NULL,
    comment     TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY  uq_trainer_review (user_id, trainer_id),
    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (trainer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS product_requests (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    description  TEXT,
    reason       TEXT,
    status       ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    admin_note   TEXT,
    reviewed_by  INT,
    reviewed_at  DATETIME,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at   TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);



-- Certifications for trainers: each row is one cert (file upload or URL)
CREATE TABLE IF NOT EXISTS trainer_certifications (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT NOT NULL,
    name         VARCHAR(200) NOT NULL,
    issued_by    VARCHAR(200),
    issued_date  DATE,
    file_url     VARCHAR(500),
    file_type    ENUM('image','pdf','url') NOT NULL DEFAULT 'url',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add is_verified flag to users (for dietitians/trainers)
-- Unverified trainers won't appear in trainee search
ALTER TABLE users ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 0;

-- Existing active dietitians are considered already verified
UPDATE users SET is_verified = 1 WHERE role = 'dietitian' AND status = 'active';

ALTER TABLE users ADD COLUMN subscription_plan   ENUM('free','pro') NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN subscription_status ENUM('active','pending','rejected') NOT NULL DEFAULT 'active';

-- Promo codes
CREATE TABLE IF NOT EXISTS promo_codes (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    code             VARCHAR(50)  NOT NULL UNIQUE,
    description      VARCHAR(200),
    discount_type    ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage',
    discount_value   DECIMAL(10,2) NOT NULL,
    min_order_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    max_uses         INT DEFAULT NULL,
    current_uses     INT NOT NULL DEFAULT 0,
    valid_from       DATE DEFAULT NULL,
    valid_to         DATE DEFAULT NULL,
    is_active        TINYINT(1) NOT NULL DEFAULT 1,
    created_by       INT DEFAULT NULL,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Reward points balance on user
ALTER TABLE users ADD COLUMN reward_points INT NOT NULL DEFAULT 0;

-- Reward point transaction history
CREATE TABLE IF NOT EXISTS point_transactions (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    user_id        INT NOT NULL,
    points         INT NOT NULL,
    type           ENUM('earned','redeemed') NOT NULL,
    reference_id   INT DEFAULT NULL,
    description    VARCHAR(200),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add discount columns to orders
ALTER TABLE orders ADD COLUMN promo_code_id    INT DEFAULT NULL;
ALTER TABLE orders ADD COLUMN discount_amount  DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN points_redeemed  INT NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN points_discount  DECIMAL(10,2) NOT NULL DEFAULT 0;

USE smartdiet_fitness;

CREATE TABLE IF NOT EXISTS notifications (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT NOT NULL,
    type         VARCHAR(60)  NOT NULL,
    title        VARCHAR(200) NOT NULL,
    message      TEXT,
    reference_id INT DEFAULT NULL,
    is_read      TINYINT(1) NOT NULL DEFAULT 0,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE notifications ADD INDEX idx_notifications_user_read (user_id, is_read);

-- Per-product discount columns
ALTER TABLE products ADD COLUMN discount_type  ENUM('percentage','fixed') DEFAULT NULL;
ALTER TABLE products ADD COLUMN discount_value DECIMAL(10,2) DEFAULT NULL;

-- Key-value settings store (holds global discount config)
CREATE TABLE IF NOT EXISTS site_settings (
    `key`      VARCHAR(100) NOT NULL PRIMARY KEY,
    value      TEXT,
    updated_by INT DEFAULT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Seed default global discount settings (inactive, 0%)
INSERT INTO site_settings (`key`, value) VALUES
    ('global_discount_type',   'percentage'),
    ('global_discount_value',  '0'),
    ('global_discount_active', '0')
ON DUPLICATE KEY UPDATE value = VALUES(value);

-- Track global-level discount per order
ALTER TABLE orders ADD COLUMN global_discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Date range for per-product discounts
ALTER TABLE products ADD COLUMN discount_valid_from DATE DEFAULT NULL;
ALTER TABLE products ADD COLUMN discount_valid_to   DATE DEFAULT NULL;
-- Product image suggestion on requests
ALTER TABLE product_requests ADD COLUMN image_url VARCHAR(500) DEFAULT NULL;


CREATE TABLE IF NOT EXISTS meal_logs (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    logged_date     DATE NOT NULL,
    meal_type       ENUM('breakfast','lunch','snack','dinner') NOT NULL,
    food_name       VARCHAR(255) NOT NULL,
    food_source     ENUM('nepali_kb','usda','nutritionix','manual','ai') DEFAULT 'manual',
    quantity        DECIMAL(8,2) DEFAULT 1,
    unit            VARCHAR(50) DEFAULT 'serving',
    portion_g       DECIMAL(8,2),
    calories        DECIMAL(8,2) DEFAULT 0,
    protein_g       DECIMAL(7,2) DEFAULT 0,
    carbs_g         DECIMAL(7,2) DEFAULT 0,
    fat_g           DECIMAL(7,2) DEFAULT 0,
    fiber_g         DECIMAL(7,2) DEFAULT 0,
    sugar_g         DECIMAL(7,2) DEFAULT 0,
    sodium_mg       DECIMAL(8,2) DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, logged_date),
    INDEX idx_meal_type (meal_type)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ai_recommendations (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    rec_date        DATE NOT NULL,
    rec_type        ENUM('meal','exercise') NOT NULL,
    meal_type       ENUM('breakfast','lunch','snack','dinner') NULL,
    content         JSON NOT NULL,
    model_version   VARCHAR(50) DEFAULT 'v2.0-large',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, rec_date),
    UNIQUE KEY uniq_user_date_type (user_id, rec_date, rec_type)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS weekly_reports (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    week_start      DATE NOT NULL,
    week_end        DATE NOT NULL,
    avg_calories    DECIMAL(8,2),
    avg_protein_g   DECIMAL(7,2),
    avg_carbs_g     DECIMAL(7,2),
    avg_fat_g       DECIMAL(7,2),
    total_meals     INT DEFAULT 0,
    target_calories DECIMAL(8,2),
    adherence_pct   DECIMAL(5,2),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_user_week (user_id, week_start),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

USE smartdiet_fitness;

CREATE TABLE IF NOT EXISTS chat_messages (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    sender_id     INT NOT NULL,
    content       TEXT NOT NULL,
    is_read       TINYINT(1) NOT NULL DEFAULT 0,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at    TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (assignment_id) REFERENCES trainer_assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id)     REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE chat_messages
    ADD COLUMN attachment_url  VARCHAR(500) NULL,
    ADD COLUMN attachment_type VARCHAR(20)  NULL,
    ADD COLUMN attachment_name VARCHAR(255) NULL;
    
    ALTER TABLE meal_logs
    MODIFY COLUMN food_source ENUM('nepali_kb','usda','nutritionix','manual','ai') DEFAULT 'manual';
ALTER TABLE chat_messages
    ADD COLUMN call_type             VARCHAR(10) NULL,
    ADD COLUMN call_outcome          VARCHAR(20) NULL,
    ADD COLUMN call_duration_seconds INT         NULL;
ALTER TABLE users MODIFY COLUMN subscription_payment_method ENUM('cash','esewa','stripe') DEFAULT NULL;

ALTER TABLE chat_messages ADD INDEX idx_chat_messages_assignment (assignment_id, created_at);


USE smartdiet_fitness;

--  Add meal completion tracking to meal_logs
ALTER TABLE meal_logs
  ADD COLUMN  is_consumed   TINYINT(1) DEFAULT 1,
  ADD COLUMN  is_recommended TINYINT(1) DEFAULT 0,
  ADD COLUMN  ai_explanation TEXT NULL,
  ADD COLUMN  cuisine       VARCHAR(50) NULL;

-- Add daily meal summary table (End Meal Today tracking)
CREATE TABLE IF NOT EXISTS daily_meal_summaries (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    user_id             INT NOT NULL,
    summary_date        DATE NOT NULL,
    total_calories      DECIMAL(8,2) DEFAULT 0,
    total_protein_g     DECIMAL(7,2) DEFAULT 0,
    total_carbs_g       DECIMAL(7,2) DEFAULT 0,
    total_fat_g         DECIMAL(7,2) DEFAULT 0,
    target_calories     DECIMAL(8,2) DEFAULT 0,
    target_protein_g    DECIMAL(7,2) DEFAULT 0,
    target_carbs_g      DECIMAL(7,2) DEFAULT 0,
    target_fat_g        DECIMAL(7,2) DEFAULT 0,
    meal_count          INT DEFAULT 0,
    is_completed        TINYINT(1) DEFAULT 0,
    completed_at        TIMESTAMP NULL,
    adherence_pct       DECIMAL(5,2) DEFAULT 0,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_user_date (user_id, summary_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

--  Expand weekly_reports with exercise summary
ALTER TABLE weekly_reports
  ADD COLUMN  total_calories      DECIMAL(8,2) DEFAULT 0,
  ADD COLUMN  total_protein_g     DECIMAL(7,2) DEFAULT 0,
  ADD COLUMN  total_carbs_g       DECIMAL(7,2) DEFAULT 0,
  ADD COLUMN  total_fat_g         DECIMAL(7,2) DEFAULT 0,
  ADD COLUMN  total_exercise_mins  INT DEFAULT 0,
  ADD COLUMN  total_calories_burned DECIMAL(8,2) DEFAULT 0,
  ADD COLUMN  workout_count        INT DEFAULT 0,
  ADD COLUMN  most_done_exercise   VARCHAR(255) NULL,
  ADD COLUMN is_finalized         TINYINT(1) DEFAULT 0,
  ADD COLUMN  finalized_at         TIMESTAMP NULL;

--  Water intake tracking
CREATE TABLE IF NOT EXISTS water_logs (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT NOT NULL,
    logged_date  DATE NOT NULL,
    amount_ml    INT NOT NULL DEFAULT 250,
    logged_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, logged_date)
) ENGINE=InnoDB;

--  Add daily water target to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN daily_water_target_ml INT DEFAULT 2500;

--  Contact-us submissions from the public site. user_id is filled in when the
--  sender happened to be logged in, NULL for anonymous visitors.
CREATE TABLE IF NOT EXISTS contact_messages (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NULL,
    name        VARCHAR(120) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    phone       VARCHAR(30)  NULL,
    subject     VARCHAR(200) NOT NULL,
    message     TEXT NOT NULL,
    status      ENUM('new','read','resolved') NOT NULL DEFAULT 'new',
    admin_note  TEXT NULL,
    handled_by  INT NULL,
    handled_at  TIMESTAMP NULL DEFAULT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (handled_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_contact_status (status, created_at)
) ENGINE=InnoDB;
  
 










