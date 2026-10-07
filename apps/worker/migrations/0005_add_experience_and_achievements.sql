CREATE TABLE experience (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    company TEXT NOT NULL,
    role TEXT,
    start_date TEXT,
    end_date TEXT,
    current_role INTEGER DEFAULT 0,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES profiles(id)
);

CREATE TABLE achievements (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT,
    date TEXT,
    description TEXT,
    verification_url TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES profiles(id)
);