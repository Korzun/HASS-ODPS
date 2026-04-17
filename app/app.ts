import express from 'express';
import session from 'express-session';
import { AppConfig } from './types';
import { BookStore } from './services/BookStore';
import { UserStore } from './services/UserStore';
import { createOpdsRouter } from './routes/opds';
import { createKosyncRouter } from './routes/kosync';
import { createUsersRouter } from './routes/users';
import { createUiRouter } from './routes/ui';

export function createApp(
  config: AppConfig,
  userStore: UserStore,
  bookStore: BookStore
): express.Express {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(
    session({
      secret: config.password,
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true },
    })
  );

  app.use('/opds', createOpdsRouter(bookStore, config));
  app.use('/kosync', createKosyncRouter(userStore));
  app.use('/api/users', createUsersRouter(userStore));
  app.use('/', createUiRouter(bookStore, config));

  return app;
}
