-- Date range for per-product discounts
ALTER TABLE products ADD COLUMN discount_valid_from DATE DEFAULT NULL;
ALTER TABLE products ADD COLUMN discount_valid_to   DATE DEFAULT NULL;
