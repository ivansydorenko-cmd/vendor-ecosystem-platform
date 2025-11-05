import { Request, Response, NextFunction } from 'express';
import { auth } from 'express-oauth2-jwt-bearer';
import { query } from '../config/database';
import logger from '../utils/logger';

// Auth0 JWT validation
const jwtCheck = auth({
  audience: process.env.AUTH0_AUDIENCE || 'https://vendor-platform-api',
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL || 'https://your-tenant.auth0.com',
  tokenSigningAlg: 'RS256'
});

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        tenantId?: string;
        role?: string;
        auth0Sub?: string;
      };
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // First validate the JWT with Auth0
  jwtCheck(req, res, async (err) => {
    if (err) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Invalid or missing access token',
        },
      });
    }

    try {
// Get user info from Auth0 token
      const auth0Sub = (req as any).auth?.payload?.sub;
      const email = (req as any).auth?.payload?.email;

      if (!auth0Sub) {
        return res.status(401).json({
          error: {
            code: 'INVALID_TOKEN',
            message: 'Token missing required claims',
          },
        });
      }

      // For Machine-to-Machine tokens (no email), bypass user lookup
      if (!email || auth0Sub.endsWith('@clients')) {
        req.user = {
          id: auth0Sub,
          email: 'system@vendor-platform.com',
          auth0Sub: auth0Sub,
        };
        return next();
      }

      // Look up user in your database by email
      let result = await query(
        'SELECT id, email, status FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found in system',
          },
        });
      }

      const user = result.rows[0];

      if (user.status !== 'active') {
        return res.status(403).json({
          error: {
            code: 'ACCOUNT_INACTIVE',
            message: 'User account is not active',
          },
        });
      }

      req.user = {
        id: user.id,
        email: user.email,
        auth0Sub: auth0Sub,
      };

      next();
    } catch (error) {
      logger.error('Authentication error:', error);
      return res.status(500).json({
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Error during authentication',
        },
      });
    }
  });
};

// Keep your existing authorize function - it works perfectly!
export const authorize = (...allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'User must be authenticated',
          },
        });
      }

      // Allow Machine-to-Machine tokens to bypass role checks (full admin access)
      // M2M tokens have auth0Sub ending with @clients
      if (req.user.auth0Sub && req.user.auth0Sub.endsWith('@clients')) {
        logger.info('M2M token detected, granting admin access');
        req.user.role = 'admin';
        req.user.tenantId = '28dd9830-0346-4539-84cd-8a896c0b1648'; // Your admin tenant
        return next();
      }

      // For regular user tokens, check database permissions
      const result = await query(
        'SELECT ur.role, ur.tenant_id, t.name as tenant_name FROM user_roles ur LEFT JOIN tenants t ON ur.tenant_id = t.id WHERE ur.user_id = $1 AND ur.status = \'active\'',
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({
          error: {
            code: 'NO_ROLES_ASSIGNED',
            message: 'User has no active roles',
          },
        });
      }

      const userRoles = result.rows.map((row) => row.role);
      const hasPermission = allowedRoles.some((role) =>
        userRoles.includes(role)
      );

      if (!hasPermission) {
        return res.status(403).json({
          error: {
            code: 'ACCESS_DENIED',
            message: 'Insufficient permissions',
            required_roles: allowedRoles,
            user_roles: userRoles,
          },
        });
      }

      req.user.role = result.rows[0].role;
      req.user.tenantId = result.rows[0].tenant_id;

      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      return res.status(500).json({
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Error checking permissions',
        },
      });
    }
  };
};