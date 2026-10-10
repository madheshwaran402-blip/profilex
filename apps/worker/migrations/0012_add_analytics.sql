
CREATE TABLE analytics_events (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES profiles(id)
);