USE smartdiet_fitness;

ALTER TABLE meal_logs
    MODIFY COLUMN food_source ENUM('nepali_kb','usda','nutritionix','manual','ai') DEFAULT 'manual';
