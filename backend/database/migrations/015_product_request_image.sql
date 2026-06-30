-- Product image suggestion on requests
ALTER TABLE product_requests ADD COLUMN image_url VARCHAR(500) DEFAULT NULL;
