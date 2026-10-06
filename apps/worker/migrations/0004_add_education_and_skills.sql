
CREATE TABLE education (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    institution TEXT NOT NULL,
    degree TEXT,
    branch TEXT,
    start_date TEXT,
    end_date TEXT,
    cgpa TEXT,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES profiles(id)
);

CREATE TABLE skills (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    proficiency INTEGER,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES profiles(id)
);