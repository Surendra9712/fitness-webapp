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
    subscription_payment_method ENUM('cash','esewa') DEFAULT NULL,
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

    breakfast_time       TIME DEFAULT '07:30:00',
    lunch_time           TIME DEFAULT '12:30:00',
    dinner_time          TIME DEFAULT '19:00:00',
    meals_per_day        INT DEFAULT 3,
    snacks_between_meals BOOLEAN DEFAULT FALSE,
    cooking_frequency    VARCHAR(30) DEFAULT 'daily',
    eating_out_frequency INT DEFAULT 2,
    track_hydration      BOOLEAN DEFAULT TRUE,
    avg_sleep_hours      DECIMAL(3,1) DEFAULT 7.0,
    emotional_eater      BOOLEAN DEFAULT FALSE,
    stress_level         ENUM('low','moderate','high','very_high') DEFAULT 'moderate',

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

CREATE TABLE IF NOT EXISTS orders (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    user_id          INT NOT NULL,
    status           ENUM('pending','confirmed','shipped','delivered','cancelled') NOT NULL DEFAULT 'pending',
    total_amount     DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method   VARCHAR(20) NOT NULL DEFAULT 'cod',
    payment_status   VARCHAR(20) NOT NULL DEFAULT 'pending',
    payment_ref      VARCHAR(255) NULL,
    shipping_address TEXT,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at       TIMESTAMP NULL DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
    status              ENUM('pending_trainer','pending_admin','approved','rejected') NOT NULL DEFAULT 'pending_trainer',
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
