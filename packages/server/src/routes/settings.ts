import { Router, Response } from 'express';
import { dbHelpers } from '../db/setup.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { DEFAULT_USER_SETTINGS } from '@md-edit/shared';

export const settingsRouter = Router();

// Get user settings
settingsRouter.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await dbHelpers.findUserById(req.user!.id);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    let settings = DEFAULT_USER_SETTINGS;
    
    if (user.settings_json) {
      try {
        settings = { ...DEFAULT_USER_SETTINGS, ...JSON.parse(user.settings_json) };
      } catch (e) {
        console.warn('Failed to parse user settings:', e);
      }
    }
    
    res.json({ settings });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Update user settings
settingsRouter.put('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { settings } = req.body;
    
    if (!settings || typeof settings !== 'object') {
      res.status(400).json({ error: 'Settings object required' });
      return;
    }
    
    const user = await dbHelpers.findUserById(req.user!.id);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    let currentSettings = DEFAULT_USER_SETTINGS;
    if (user.settings_json) {
      try {
        currentSettings = { ...DEFAULT_USER_SETTINGS, ...JSON.parse(user.settings_json) };
      } catch (e) {
        // Use defaults
      }
    }
    
    // Merge with new settings
    const mergedSettings = { ...currentSettings, ...settings };
    
    await dbHelpers.updateUser(req.user!.id, {
      settings_json: JSON.stringify(mergedSettings),
      updated_at: new Date().toISOString(),
    });
    
    res.json({ settings: mergedSettings });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Reset settings to defaults
settingsRouter.post('/reset', async (req: AuthenticatedRequest, res: Response) => {
  try {
    await dbHelpers.updateUser(req.user!.id, {
      settings_json: JSON.stringify(DEFAULT_USER_SETTINGS),
      updated_at: new Date().toISOString(),
    });
    
    res.json({ settings: DEFAULT_USER_SETTINGS });
  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({ error: 'Failed to reset settings' });
  }
});
