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
