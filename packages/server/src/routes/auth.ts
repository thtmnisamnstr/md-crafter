import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbHelpers, User } from '../db/setup.js';
import { generateApiToken, DEFAULT_USER_SETTINGS, logger } from '@md-crafter/shared';

export const authRouter = Router();

// Generate a new API token (create user)
authRouter.post('/token', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    // Check if user with email already exists
    if (email) {
      const existingUser = await dbHelpers.findUserByEmail(email);
      if (existingUser) {
        res.status(400).json({ error: 'Email already registered' });
        return;
      }
    }
    
    const userId = uuidv4();
    const apiToken = generateApiToken();
    const now = new Date().toISOString();
    
    const user: User = {
      id: userId,
      email: email || null,
      api_token: apiToken,
      settings_json: JSON.stringify(DEFAULT_USER_SETTINGS),
      token_expires_at: null, // Tokens don't expire by default
      created_at: now,
      updated_at: now,
    };
    
    await dbHelpers.createUser(user);
    
    res.json({
      success: true,
      userId,
      apiToken,
      message: 'Save this API token securely. It cannot be recovered.',
    });
  } catch (error) {
    logger.error('Token generation error:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// Validate an existing token
authRouter.post('/validate', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      res.status(400).json({ error: 'Token required' });
      return;
    }
    
    const user = await dbHelpers.findUserByToken(token);
    
    if (!user) {
      res.status(401).json({ valid: false, error: 'Invalid token' });
      return;
    }
    
    res.json({
      valid: true,
      userId: user.id,
      email: user.email,
    });
  } catch (error) {
    logger.error('Token validation error:', error);
    res.status(500).json({ error: 'Failed to validate token' });
  }
});

// Get current user info (requires auth header)
authRouter.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({ error: 'Authorization required' });
      return;
    }
    
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;
    
    const user = await dbHelpers.findUserByToken(token);
    
    if (!user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    
    res.json({
      id: user.id,
      email: user.email,
      createdAt: user.created_at,
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});
