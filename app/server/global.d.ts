import 'express-session';

declare module 'express-session' {
  interface SessionData {
    authenticated?: boolean;
    username?: string;
    userId?: string;
    isAdmin?: boolean;
    mustChangePassword?: boolean;
  }
}

declare global {
  namespace Express {
    interface Request {
      kosyncUser?: string;
      kosyncUserId?: string;
      user?: import('./services/jwt').AuthUser;
    }
  }
}

export {};
