USE smartdiet_fitness;

-- Lets an admin unassign a trainer from a trainee after the match was approved.
-- 'ended' is distinct from 'rejected': rejected means the request was never
-- accepted, ended means an active pairing was deliberately stopped. Because
-- every access check in the app keys off status = 'approved', flipping a row to
-- 'ended' automatically revokes chat, drops the trainee from the trainer's
-- client list, and frees the trainee to request a new trainer — while keeping
-- the history row intact.
ALTER TABLE trainer_assignments
  MODIFY COLUMN status
    ENUM('pending_trainer','pending_admin','approved','rejected','ended')
    NOT NULL DEFAULT 'pending_trainer';
