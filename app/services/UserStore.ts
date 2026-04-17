import Database, { Database as DB } from 'better-sqlite3';
import * as crypto from 'crypto';
import { Progress } from '../types';

export class UserStore {
  private db: DB;

  constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        key TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS progress (
        username  TEXT    NOT NULL,
        document  TEXT    NOT NULL,
        progress  TEXT    NOT NULL,
        percentage REAL   NOT NULL,
        device    TEXT    NOT NULL,
        device_id TEXT    NOT NULL,
        timestamp INTEGER NOT NULL,
        PRIMARY KEY (username, document)
      );
    `);
  }

  static hashPassword(password: string): string {
    return crypto.createHash('md5').update(password).digest('hex');
  }

  createUser(username: string, password: string): boolean {
    const key = UserStore.hashPassword(password);
    try {
      this.db.prepare('INSERT INTO users (username, key) VALUES (?, ?)').run(username, key);
      return true;
    } catch {
      return false; // UNIQUE constraint — duplicate username
    }
  }

  authenticate(username: string, key: string): boolean {
    const row = this.db
      .prepare('SELECT key FROM users WHERE username = ?')
      .get(username) as { key: string } | undefined;
    return row?.key === key;
  }

  getProgress(username: string, document: string): Progress | null {
    const row = this.db
      .prepare(
        'SELECT document, progress, percentage, device, device_id, timestamp FROM progress WHERE username = ? AND document = ?'
      )
      .get(username, document) as Progress | undefined;
    return row ?? null;
  }

  saveProgress(
    username: string,
    p: Omit<Progress, 'timestamp'> & { timestamp?: number }
  ): Progress {
    const timestamp = p.timestamp ?? Math.floor(Date.now() / 1000);
    this.db
      .prepare(`
        INSERT INTO progress (username, document, progress, percentage, device, device_id, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (username, document) DO UPDATE SET
          progress   = excluded.progress,
          percentage = excluded.percentage,
          device     = excluded.device,
          device_id  = excluded.device_id,
          timestamp  = excluded.timestamp
      `)
      .run(username, p.document, p.progress, p.percentage, p.device, p.device_id, timestamp);
    return { ...p, timestamp };
  }

  close(): void {
    this.db.close();
  }
}
