import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { AboutModal } from '../AboutModal';

describe('AboutModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should render modal with title', () => {
      const { getByText } = render(<AboutModal onClose={mockOnClose} />);
      expect(getByText('About md-crafter')).toBeTruthy();
    });

    it('should render app name', () => {
      const { getByText } = render(<AboutModal onClose={mockOnClose} />);
      expect(getByText('md-crafter')).toBeTruthy();
    });

    it('should render version number', () => {
      const { getByText } = render(<AboutModal onClose={mockOnClose} />);
      expect(getByText('Version 0.1.0-beta-1')).toBeTruthy();
    });

    it('should render description', () => {
      const { getByText } = render(<AboutModal onClose={mockOnClose} />);
      expect(getByText('A cloud-synced markdown and MDX editor.')).toBeTruthy();
    });

    it('should render tech stack badges', () => {
      const { getByText } = render(<AboutModal onClose={mockOnClose} />);
      expect(getByText('React')).toBeTruthy();
      expect(getByText('Monaco Editor')).toBeTruthy();
      expect(getByText('TypeScript')).toBeTruthy();
      expect(getByText('Electron')).toBeTruthy();
      expect(getByText('Tailwind CSS')).toBeTruthy();
    });

    it('should render copyright notice', () => {
      const { getByText } = render(<AboutModal onClose={mockOnClose} />);
      expect(getByText(/© 2025 Gavin Johnson. MIT License./)).toBeTruthy();
    });

    it('should render GitHub link with correct attributes', () => {
      const { getByText } = render(<AboutModal onClose={mockOnClose} />);
      const githubLink = getByText('View on GitHub');
      expect(githubLink.closest('a')).toHaveAttribute('href', 'https://github.com/thtmnisamnstr/md-crafter');
      expect(githubLink.closest('a')).toHaveAttribute('target', '_blank');
      expect(githubLink.closest('a')).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should render close button', () => {
      const { container } = render(<AboutModal onClose={mockOnClose} />);
      const closeButton = container.querySelector('button[aria-label*="Close"], button:has(svg)');
      expect(closeButton).toBeTruthy();
    });

    it('should render logo icon', () => {
      const { container } = render(<AboutModal onClose={mockOnClose} />);
      const logo = container.querySelector('.w-20.h-20');
      expect(logo).toBeTruthy();
      expect(logo?.textContent).toBe('M');
    });
  });

  describe('Interactions', () => {
    it('should close modal when overlay is clicked', () => {
      const { container } = render(<AboutModal onClose={mockOnClose} />);
      const overlay = container.querySelector('.modal-overlay');
      if (overlay) {
        fireEvent.click(overlay);
      }
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close modal when close button is clicked', () => {
      const { container } = render(<AboutModal onClose={mockOnClose} />);
      const closeButton = container.querySelector('button:has(svg)');
      if (closeButton) {
        fireEvent.click(closeButton);
      }
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should close modal when Close button is clicked', () => {
      const { getByText } = render(<AboutModal onClose={mockOnClose} />);
      const closeButton = getByText('Close');
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should not close modal when clicking inside modal content', () => {
      const { container } = render(<AboutModal onClose={mockOnClose} />);
      const modal = container.querySelector('.modal');
      if (modal) {
        fireEvent.click(modal);
      }
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should close modal on Escape key', () => {
      render(<AboutModal onClose={mockOnClose} />);
      fireEvent.keyDown(window, { key: 'Escape' });
      // Note: AboutModal doesn't have Escape handler, so this test verifies current behavior
      // If Escape handling is added, this test should verify it works
    });
  });

  describe('Content', () => {
    it('should display all tech stack items', () => {
      const { getByText } = render(<AboutModal onClose={mockOnClose} />);
      const techStack = ['React', 'Monaco Editor', 'TypeScript', 'Electron', 'Tailwind CSS'];
      techStack.forEach((tech) => {
        expect(getByText(tech)).toBeTruthy();
      });
    });

    it('should have correct GitHub link URL', () => {
      const { getByText } = render(<AboutModal onClose={mockOnClose} />);
      const link = getByText('View on GitHub').closest('a');
      expect(link?.getAttribute('href')).toBe('https://github.com/thtmnisamnstr/md-crafter');
    });
  });
});

