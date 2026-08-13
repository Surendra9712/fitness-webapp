USE smartdiet_fitness;

-- Retires users.is_verified. trainer_request_status = 'approved' is now the
-- single marketplace gate, checked by the trainee listing, trainer detail and
-- booking queries plus the public top-trainers list. Taking an approved trainer
-- out of circulation is done by disabling the account (users.status), which
-- also blocks their login — there is no longer a "logged in but unlisted" state.
--
-- Run 025_trainer_request_status.sql first: this migration assumes
-- trainer_request_status is already populated. The safety net below re-derives
-- it from is_verified for any row the earlier backfill missed.
UPDATE users
   SET trainer_request_status = 'approved'
 WHERE role = 'dietitian' AND is_verified = 1 AND trainer_request_status = 'none';

UPDATE users
   SET trainer_request_status = 'pending'
 WHERE role = 'dietitian' AND is_verified = 0 AND trainer_request_status = 'none'
   AND deleted_at IS NULL;

ALTER TABLE users DROP COLUMN is_verified;
