import { Request, Response, NextFunction } from 'express';
import { AppConfig } from '../types';
import { UserStore } from '../services/UserStore';

/** HTTP Basic Auth — validates against admin config credentials. Used for OPDS. */
export function basicAuth(config: AppConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Basic ')) {
      res.set('WWW-Authenticate', 'Basic realm="HASS-ODPS"');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const decoded = Buffer.from(header.slice(6), 'base64').toString();
    const colonIndex = decoded.indexOf(':');
    const user = decoded.slice(0, colonIndex);
    const pass = decoded.slice(colonIndex + 1);
    if (user === config.username && pass === config.password) {
      next();
    } else {
      res.set('WWW-Authenticate', 'Basic realm="HASS-ODPS"');
      res.status(401).json({ error: 'Unauthorized' });
    }
  };
}

/** KOSync header auth — validates x-auth-user + x-auth-key against UserStore. */
export function kosyncAuth(userStore: UserStore) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const username = req.headers['x-auth-user'];
    const key = req.headers['x-auth-key'];
    if (typeof username !== 'string' || typeof key !== 'string') {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    if (!userStore.authenticate(username, key)) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    req.kosyncUser = username;
    next();
  };
}

/** Session auth — redirects unauthenticated requests to /login. Used for web UI. */
export function sessionAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session.authenticated) {
    next();
  } else {
    res.redirect('/login');
  }
}
