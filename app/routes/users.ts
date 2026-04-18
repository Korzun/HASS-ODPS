// app/routes/users.ts
import { Router, Request, Response } from 'express';
import { UserStore } from '../services/user-store';
import { sessionAuth } from '../middleware/auth';
import { logger } from '../logger';

const log = logger('Users');

export function createUsersRouter(userStore: UserStore): Router {
  const router = Router();
  router.use(sessionAuth);

  router.get('/', (_req: Request, res: Response) => {
    const users = userStore.listUsers();
    log.debug(`Users list fetched (${users.length} users)`);
    res.json(users);
  });

  router.get('/:username/progress', (req: Request, res: Response) => {
    const { username } = req.params;
    if (!userStore.userExists(username)) {
      log.warn(`Progress fetch for unknown user "${username}"`);
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const progress = userStore.getUserProgress(username);
    log.debug(`Progress fetched for "${username}" (${progress.length} records)`);
    res.json(progress);
  });

  router.delete('/:username', (req: Request, res: Response) => {
    const { username } = req.params;
    const deleted = userStore.deleteUser(username);
    if (!deleted) {
      log.warn(`Delete attempted for unknown user "${username}"`);
      res.status(404).json({ error: 'User not found' });
      return;
    }
    log.info(`User "${username}" deleted`);
    res.status(204).send();
  });

  return router;
}
