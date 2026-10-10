CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    filename TEXT,
    r2_key TEXT NOT NULL,
    doc_type TEXT,
    processing_status TEXT DEFAULT 'pending',
    created_at TEXT NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES profiles(id)
);