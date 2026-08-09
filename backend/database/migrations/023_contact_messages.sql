USE smartdiet_fitness;

-- Contact-us submissions from the public site. user_id is filled in when the
-- sender happened to be logged in, NULL for anonymous visitors.
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
