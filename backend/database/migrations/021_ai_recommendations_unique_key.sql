USE smartdiet_fitness;

ALTER TABLE ai_recommendations
    ADD UNIQUE KEY uniq_user_date_type (user_id, rec_date, rec_type);
