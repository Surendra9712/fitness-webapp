USE smartdiet_fitness;

ALTER TABLE chat_messages
    ADD COLUMN attachment_url  VARCHAR(500) NULL,
    ADD COLUMN attachment_type VARCHAR(20)  NULL,
    ADD COLUMN attachment_name VARCHAR(255) NULL;
