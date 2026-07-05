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

ALTER TABLE chat_messages ADD INDEX idx_chat_messages_assignment (assignment_id, created_at);
