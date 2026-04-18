import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import { loadConfig } from './config';
import { UserStore } from './services/UserStore';
import { BookStore } from './services/BookStore';
import { createApp } from './app';
import { logger } from './logger';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require('../package.json') as { version: string };

const log = logger('Server');
const config = loadConfig();

fs.mkdirSync(config.booksDir, { recursive: true });
fs.mkdirSync(config.dataDir, { recursive: true });

const db = new Database(path.join(config.dataDir, 'db.sqlite'));
const userStore = new UserStore(db);
const bookStore = new BookStore(config.booksDir, db);

const app = createApp(config, userStore, bookStore);

// Startup scan: import untracked EPUBs, clean up stale DB entries
try {
  const scanResult = bookStore.scan();
  log.info(`Startup scan: ${scanResult.imported.length} imported, ${scanResult.removed.length} removed`);
} catch (err: any) {
  log.error(`Startup scan failed: ${String(err.message)}`);
}

const shutdown = (): void => {
  log.info('Server shutting down');
  db.close();
  process.exit(0);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

app.listen(config.port, () => {
  log.info(`HASS-ODPS v${version} starting — port: ${config.port}, booksDir: ${config.booksDir}, dataDir: ${config.dataDir}`);
  log.info(`Web UI:  http://localhost:${config.port}/`);
  log.info(`OPDS:    http://localhost:${config.port}/opds/`);
  log.info(`KOSync:  http://localhost:${config.port}/kosync/`);
});
