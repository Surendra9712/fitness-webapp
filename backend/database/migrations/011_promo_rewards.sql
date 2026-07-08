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
