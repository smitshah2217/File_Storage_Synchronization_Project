-- Apply to databases created before file-version MIME metadata was added.
-- Historical rows inherit the file's current MIME type because older versions
-- did not persist this value; future uploads record their exact type.
ALTER TABLE file_versions
    ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);

UPDATE file_versions fv
SET mime_type = COALESCE(f.mime_type, 'application/octet-stream')
FROM files f
WHERE fv.file_id = f.id
  AND fv.mime_type IS NULL;

ALTER TABLE file_versions
    ALTER COLUMN mime_type SET DEFAULT 'application/octet-stream';

ALTER TABLE file_versions
    ALTER COLUMN mime_type SET NOT NULL;
