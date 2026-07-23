-- Bulk replay marks the originals it copied so a second call cannot pick them again.
ALTER TABLE delivery ADD COLUMN replayed_at timestamptz;
