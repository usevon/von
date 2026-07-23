-- The worker wrote 'success' but analytics and the SDK type only know 'delivered'.
UPDATE delivery SET status = 'delivered' WHERE status = 'success';
