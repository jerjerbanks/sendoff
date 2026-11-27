-- Which bed each traveler sleeps in, chosen by their own party on the Beds page.
-- Nullable and additive: a null means "not chosen yet", and the page then fills
-- the party's beds in traveler order. Only read when the party still holds that bed.
ALTER TABLE travelers ADD COLUMN bed_spot_id TEXT;
