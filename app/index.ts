import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from './config';
import { UserStore } from './services/UserStore';
import { BookStore } from './services/BookStore';
import { createApp } from './app';

const config = loadConfig();

fs.mkdirSync(config.booksDir, { recursive: true });
fs.mkdirSync(config.dataDir, { recursive: true });

const userStore = new UserStore(path.join(config.dataDir, 'db.sqlite'));
const bookStore = new BookStore(config.booksDir);

const app = createApp(config, userStore, bookStore);

app.listen(config.port, () => {
  console.log(`HASS-ODPS running on port ${config.port}`);
  console.log(`  Web UI:  http://localhost:${config.port}/`);
  console.log(`  OPDS:    http://localhost:${config.port}/opds/`);
  console.log(`  KOSync:  http://localhost:${config.port}/kosync/`);
});
