CREATE TABLE episodes (
  id          INTEGER PRIMARY KEY,         -- TVMaze episode id
  season      INTEGER NOT NULL,
  number      INTEGER NOT NULL,
  title       TEXT    NOT NULL,
  summary     TEXT,
  image       TEXT,
  airdate     TEXT,
  disc        INTEGER,
  watched_at  TEXT
);

CREATE INDEX idx_episodes_season ON episodes (season, number);
