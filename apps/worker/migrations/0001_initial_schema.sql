CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT,
    email_verified INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT,
    title TEXT,
    location TEXT,
    about TEXT,
    photo_url TEXT,
    ai_personality TEXT DEFAULT 'professional',
    ai_enabled INTEGER DEFAULT 1,
    theme_id TEXT,
    slug TEXT NOT NULL UNIQUE,
    published INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
