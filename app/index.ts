import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from './config';
import { UserStore } from './services/UserStore';
import { BookStore } from './services/BookStore';
import { createApp } from './app';
import { logger } from './logger';

const log = logger('Server');
const config = loadConfig();

fs.mkdirSync(config.booksDir, { recursive: true });
fs.mkdirSync(config.dataDir, { recursive: true });

const userStore = new UserStore(path.join(config.dataDir, 'db.sqlite'));
const bookStore = new BookStore(config.booksDir);

const app = createApp(config, userStore, bookStore);

app.listen(config.port, () => {
  log.info(`HASS-ODPS starting — port: ${config.port}, booksDir: ${config.booksDir}, dataDir: ${config.dataDir}`);
  log.info(`Web UI:  http://localhost:${config.port}/`);
  log.info(`OPDS:    http://localhost:${config.port}/opds/`);
  log.info(`KOSync:  http://localhost:${config.port}/kosync/`);
});
