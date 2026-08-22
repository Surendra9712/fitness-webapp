USE smartdiet_fitness;

-- Single-use, time-limited tokens backing the "forgot password" flow.
--
-- Only the SHA-256 hash of the token is stored: the plaintext lives just long
-- enough to be emailed, so a leaked database row cannot be replayed as a reset
-- link. `used_at` makes a token single-use, and every outstanding token for a
-- user is marked used once one of them succeeds.
CREATE TABLE IF NOT EXISTS password_resets (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    token_hash  CHAR(64) NOT NULL,
    expires_at  TIMESTAMP NOT NULL,
    used_at     TIMESTAMP NULL DEFAULT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_password_resets_token (token_hash),
    INDEX idx_password_resets_user (user_id, used_at)
) ENGINE=InnoDB;
