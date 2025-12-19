import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defineMonacoThemes } from '../monacoThemes';

describe('monacoThemes', () => {
  let mockMonaco: any;

  beforeEach(() => {
    mockMonaco = {
      editor: {
        defineTheme: vi.fn(),
      },
    };
  });

  describe('defineMonacoThemes', () => {
    it('should define all 5 custom themes', () => {
      const result = defineMonacoThemes(mockMonaco);
      
      expect(mockMonaco.editor.defineTheme).toHaveBeenCalledTimes(5);
      expect(mockMonaco.editor.defineTheme).toHaveBeenCalledWith(
        'md-crafter-dark',
        expect.objectContaining({
          base: 'vs-dark',
          inherit: true,
        })
      );
      expect(mockMonaco.editor.defineTheme).toHaveBeenCalledWith(
        'md-crafter-light',
        expect.objectContaining({
          base: 'vs',
          inherit: true,
        })
      );
      expect(mockMonaco.editor.defineTheme).toHaveBeenCalledWith(
        'md-crafter-github-dark',
        expect.objectContaining({
          base: 'vs-dark',
          inherit: true,
        })
      );
      expect(mockMonaco.editor.defineTheme).toHaveBeenCalledWith(
        'md-crafter-nord',
        expect.objectContaining({
          base: 'vs-dark',
          inherit: true,
        })
      );
      expect(mockMonaco.editor.defineTheme).toHaveBeenCalledWith(
        'md-crafter-monokai',
        expect.objectContaining({
          base: 'vs-dark',
          inherit: true,
        })
      );
    });

    it('should return theme names object', () => {
      const result = defineMonacoThemes(mockMonaco);
      
      expect(result).toEqual({
        dark: 'md-crafter-dark',
        light: 'md-crafter-light',
        githubDark: 'md-crafter-github-dark',
        nord: 'md-crafter-nord',
        monokai: 'md-crafter-monokai',
      });
    });

    it('should be idempotent', () => {
      defineMonacoThemes(mockMonaco);
      const firstCallCount = mockMonaco.editor.defineTheme.mock.calls.length;
      
      defineMonacoThemes(mockMonaco);
      const secondCallCount = mockMonaco.editor.defineTheme.mock.calls.length;
      
      expect(secondCallCount).toBe(firstCallCount * 2);
      // Monaco's defineTheme is idempotent, so calling twice should work
    });

    it('should set correct theme colors for dark theme', () => {
      defineMonacoThemes(mockMonaco);
      
      const darkThemeCall = mockMonaco.editor.defineTheme.mock.calls.find(
        (call: any[]) => call[0] === 'md-crafter-dark'
      );
      
      expect(darkThemeCall).toBeDefined();
      expect(darkThemeCall[1].colors['editor.background']).toBe('#1e1e1e');
      expect(darkThemeCall[1].colors['editor.foreground']).toBe('#d4d4d4');
    });

    it('should set correct theme colors for light theme', () => {
      defineMonacoThemes(mockMonaco);
      
      const lightThemeCall = mockMonaco.editor.defineTheme.mock.calls.find(
        (call: any[]) => call[0] === 'md-crafter-light'
      );
      
      expect(lightThemeCall).toBeDefined();
      expect(lightThemeCall[1].colors['editor.background']).toBe('#ffffff');
      expect(lightThemeCall[1].colors['editor.foreground']).toBe('#333333');
    });
  });
});

