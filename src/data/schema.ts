export const INITIAL_SCHEMA = `
  CREATE TABLE app_state (
    id INTEGER PRIMARY KEY CHECK(id=1),
    revision INTEGER NOT NULL,
    payload TEXT NOT NULL
  );
  CREATE TABLE scheduled_notifications (id TEXT PRIMARY KEY, event_key TEXT NOT NULL);
  PRAGMA user_version = 1;
`;
export const UPDATE_STATE = 'UPDATE app_state SET payload=?, revision=? WHERE id=1 AND revision=?';
