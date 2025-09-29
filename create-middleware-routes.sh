#!/bin/bash
echo "🛡️ Creating middleware and route files..."

# Auth middleware
cat > backend/src/middleware/auth.middleware.ts << 'AUTHMD'
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';
import logger from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        tenantId?: string;
        role?: string;
      };
    }
  }
}

interface JwtPayload {
  userId: string;
  email: string;
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Access token is required',
        },
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('JWT_SECRET not configured');
      return res.status(500).json({
        error: {
          code: 'SERVER_CONFIGURATION_ERROR',
          message: 'Authentication service is misconfigured',
        },
      });
    }

    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    const result = await query(
      \`SELECT id, email, status FROM users WHERE id = $1\`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'User not found',
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
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token',
        },
      });
    }

    logger.error('Authentication error:', error);
    return res.status(500).json({
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Error during authentication',
      },
    });
  }
};

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

      const result = await query(
        \`SELECT ur.role, ur.tenant_id, t.name as tenant_name
         FROM user_roles ur
         LEFT JOIN tenants t ON ur.tenant_id = t.id
         WHERE ur.user_id = $1 AND ur.status = 'active'\`,
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
AUTHMD

# Auth routes
cat > backend/src/routes/auth.routes.ts << 'AUTHROUTES'
import { Router } from 'express';
import { body } from 'express-validator';
const router = Router();

router.post('/login', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
], (req, res) => {
  res.json({ message: 'Auth login endpoint' });
});

export default router;
AUTHROUTES

# Tenant routes
cat > backend/src/routes/tenant.routes.ts << 'TENANTROUTES'
import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'Tenant list endpoint' });
});

export default router;
TENANTROUTES

# User routes
cat > backend/src/routes/user.routes.ts << 'USERROUTES'
import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => {
  res.json({ message: 'User list endpoint' });
});

export default router;
USERROUTES

echo "✅ Middleware and route files created!"
