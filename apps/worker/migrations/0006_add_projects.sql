CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    name TEXT NOT NULL,
    short_description TEXT,
    description TEXT,
    problem TEXT,
    solution TEXT,
    tech_stack TEXT,
    role TEXT,
    github_url TEXT,
    demo_url TEXT,
    video_url TEXT,
    featured INTEGER DEFAULT 0,
    visibility TEXT DEFAULT 'public',
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES profiles(id)
);

CREATE TABLE project_media (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    r2_key TEXT NOT NULL,
    media_type TEXT,
    alt_text TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);