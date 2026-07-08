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
