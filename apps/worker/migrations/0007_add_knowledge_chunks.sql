CREATE TABLE knowledge_chunks (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_id TEXT,
    chunk_index INTEGER DEFAULT 0,
    content TEXT NOT NULL,
    vector_id TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES profiles(id)
);