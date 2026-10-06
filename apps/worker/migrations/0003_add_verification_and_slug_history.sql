
CREATE TABLE email_verification_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE profile_slug_history (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    old_slug TEXT NOT NULL UNIQUE,
    changed_at TEXT NOT NULL,
    FOREIGN KEY (profile_id) REFERENCES profiles(id)
);