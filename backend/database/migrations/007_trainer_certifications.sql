-- Add trainer-specific fields to user_profiles (run each ALTER separately; skip if column already exists)
ALTER TABLE user_profiles ADD COLUMN available_time   JSON DEFAULT NULL;
ALTER TABLE user_profiles ADD COLUMN experience_years TINYINT UNSIGNED DEFAULT NULL;

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
