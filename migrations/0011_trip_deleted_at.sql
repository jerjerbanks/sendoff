-- Soft delete for trips (Phase 0: "delete a trip when a tester asks").
-- Nothing is removed: a trip with deleted_at set stops loading anywhere in the app,
-- drops off Your trips, and its invite link stops working. Additive only.
ALTER TABLE trips ADD COLUMN deleted_at TEXT;
