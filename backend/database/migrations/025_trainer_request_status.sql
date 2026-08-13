USE smartdiet_fitness;

-- Tracks a "become a trainer" application without touching the applicant's role.
--
-- Before this column a trainee who applied was flipped to role='dietitian'
-- immediately, which kicked them out of every trainee-only page (the request
-- form itself included) while an admin had not even looked at the application.
-- Now the role only changes when an admin approves:
--
--   none      never applied
--   pending   applied, waiting on an admin
--   approved  admin approved — role flipped to dietitian, is_verified = 1
--   rejected  admin declined — role stays trainee, applicant may re-apply
ALTER TABLE users
  ADD COLUMN trainer_request_status
    ENUM('none','pending','approved','rejected') NOT NULL DEFAULT 'none'
    AFTER is_verified;

-- Backfill existing trainers so the admin queue keeps working:
-- verified trainers are settled, unverified ones are still awaiting review.
UPDATE users
   SET trainer_request_status = 'approved'
 WHERE role = 'dietitian' AND is_verified = 1;

UPDATE users
   SET trainer_request_status = 'pending'
 WHERE role = 'dietitian' AND is_verified = 0 AND deleted_at IS NULL;
