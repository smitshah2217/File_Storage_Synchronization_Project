CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    storage_limit_bytes BIGINT NOT NULL DEFAULT 5368709120, -- 5 GB
    storage_used_bytes BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE folders (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_folder_id BIGINT REFERENCES folders(id) ON DELETE CASCADE,
    owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    row_version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_folders_owner ON folders(owner_id);
CREATE INDEX idx_folders_parent ON folders(parent_folder_id);
CREATE UNIQUE INDEX uq_folders_sibling_name 
    ON folders (owner_id, COALESCE(parent_folder_id, 0), lower(name)) 
    WHERE is_deleted = false;

CREATE TABLE files (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    folder_id BIGINT REFERENCES folders(id) ON DELETE CASCADE,
    owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    current_version_id BIGINT, -- FK added after file_versions exists
    mime_type VARCHAR(100),
    size_bytes BIGINT NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMP,
    row_version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_files_owner ON files(owner_id);
CREATE INDEX idx_files_folder ON files(folder_id);
CREATE INDEX idx_files_name ON files(lower(name)); -- supports ILIKE search
CREATE UNIQUE INDEX uq_files_sibling_name 
    ON files (owner_id, COALESCE(folder_id, 0), lower(name)) 
    WHERE is_deleted = false;

CREATE TABLE file_versions (
    id BIGSERIAL PRIMARY KEY,
    file_id BIGINT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    minio_object_key VARCHAR(500) NOT NULL UNIQUE,
    size_bytes BIGINT NOT NULL,
    uploaded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (file_id, version_number)
);

CREATE INDEX idx_file_versions_file ON file_versions(file_id);

ALTER TABLE files 
    ADD CONSTRAINT fk_files_current_version 
    FOREIGN KEY (current_version_id) REFERENCES file_versions(id) ON DELETE SET NULL;

CREATE TABLE shares (
    id BIGSERIAL PRIMARY KEY,
    file_id BIGINT NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    owner_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_with_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(10) NOT NULL DEFAULT 'VIEW' 
        CHECK (permission IN ('VIEW', 'EDIT')),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (file_id, shared_with_user_id),
    CHECK (owner_id <> shared_with_user_id)
);

CREATE INDEX idx_shares_file ON shares(file_id);
CREATE INDEX idx_shares_shared_with ON shares(shared_with_user_id);

CREATE TABLE download_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_id BIGINT REFERENCES files(id) ON DELETE SET NULL,
    file_name_snapshot VARCHAR(255) NOT NULL,
    downloaded_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_download_history_user ON download_history(user_id);
CREATE INDEX idx_download_history_file ON download_history(file_id);
