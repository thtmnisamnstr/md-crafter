import { Request, Response, NextFunction } from 'express';
import { logger } from '@md-crafter/shared';
import { dbHelpers } from '../db/setup.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    apiToken: string;
  };
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({ error: 'Authorization header required' });
      return;
    }
    
    // Support both "Bearer <token>" and just "<token>"
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;
    
    if (!token) {
      res.status(401).json({ error: 'API token required' });
      return;
    }
    
    const user = await dbHelpers.findUserByToken(token);
    
    if (!user) {
      res.status(401).json({ error: 'Invalid API token' });
      return;
    }
    
    req.user = {
      id: user.id,
      email: user.email || undefined,
      apiToken: user.api_token,
    };
    
    next();
  } catch (error) {
    logger.error('Auth middleware error', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    next();
    return;
  }
  
  authMiddleware(req, res, next);
}
