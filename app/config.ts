import * as fs from 'fs';
import * as path from 'path';
import { AppConfig } from './types';

interface Options {
  username: string;
  password: string;
}

export function loadConfig(): AppConfig {
  const dataDir = process.env.DATA_DIR ?? '/data';
  const optionsPath = path.join(dataDir, 'options.json');

  let options: Options = { username: 'admin', password: 'changeme' };

  if (fs.existsSync(optionsPath)) {
    options = JSON.parse(fs.readFileSync(optionsPath, 'utf-8')) as Options;
  }

  return {
    username: process.env.ADMIN_USER ?? options.username,
    password: process.env.ADMIN_PASS ?? options.password,
    booksDir: process.env.BOOKS_DIR ?? '/media/books',
    dataDir,
    port: parseInt(process.env.PORT ?? '3000', 10),
  };
}
