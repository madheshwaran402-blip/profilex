
CREATE TABLE auth_rate_limits (
    id TEXT PRIMARY KEY,
    ip_address TEXT NOT NULL,
    action TEXT NOT NULL,
    window_start TEXT NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 1,
    UNIQUE(ip_address, action, window_start)
);