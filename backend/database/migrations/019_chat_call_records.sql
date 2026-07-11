USE smartdiet_fitness;

ALTER TABLE chat_messages
    ADD COLUMN call_type             VARCHAR(10) NULL,
    ADD COLUMN call_outcome          VARCHAR(20) NULL,
    ADD COLUMN call_duration_seconds INT         NULL;
