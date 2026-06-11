import jwt from 'jsonwebtoken';

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

/** Identity carried by a verified access token (attached to req.user). */
export type AuthUser = {
  /** Surrogate user ID. Absent for the config-based admin, who has no DB row. */
  userId?: string;
  username: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
};

export function signAccessToken(secret: Buffer, user: AuthUser): string {
  return jwt.sign(
    {
      username: user.username,
      isAdmin: user.isAdmin,
      mustChangePassword: user.mustChangePassword,
    },
    secret,
    {
      algorithm: 'HS256',
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
      ...(user.userId !== undefined ? { subject: user.userId } : {}),
    }
  );
}

export function verifyAccessToken(secret: Buffer, token: string): AuthUser | null {
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] }) as jwt.JwtPayload;
    if (typeof payload.username !== 'string') return null;
    return {
      ...(typeof payload.sub === 'string' ? { userId: payload.sub } : {}),
      username: payload.username,
      isAdmin: payload.isAdmin === true,
      mustChangePassword: payload.mustChangePassword === true,
    };
  } catch {
    return null;
  }
}
