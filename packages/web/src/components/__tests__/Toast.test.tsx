import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { Toast } from '../Toast';
import { useStore } from '../../store';

// Mock the store
const mockToasts = [
  {
    id: 'toast-1',
    message: 'Success message',
    type: 'success' as const,
  },
  {
    id: 'toast-2',
    message: 'Error message',
    type: 'error' as const,
  },
  {
    id: 'toast-3',
    message: 'Warning message',
    type: 'warning' as const,
  },
  {
    id: 'toast-4',
    message: 'Info message',
    type: 'info' as const,
  },
];

const mockRemoveToast = vi.fn();

vi.mock('../../store', () => ({
  useStore: vi.fn(),
}));

describe('Toast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useStore as any).mockReturnValue({
      toasts: [],
      removeToast: mockRemoveToast,
    });
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should return null when no toasts', () => {
      const { container } = render(<Toast />);
      expect(container.firstChild).toBeNull();
    });

    it('should render toast with message', () => {
      (useStore as any).mockReturnValue({
        toasts: [mockToasts[0]],
        removeToast: mockRemoveToast,
      });

      const { getByText } = render(<Toast />);
      expect(getByText('Success message')).toBeTruthy();
    });

    it('should render multiple toasts', () => {
      (useStore as any).mockReturnValue({
        toasts: mockToasts,
        removeToast: mockRemoveToast,
      });

      const { getByText } = render(<Toast />);
      expect(getByText('Success message')).toBeTruthy();
      expect(getByText('Error message')).toBeTruthy();
      expect(getByText('Warning message')).toBeTruthy();
      expect(getByText('Info message')).toBeTruthy();
    });
  });

  describe('Types', () => {
    it('should display success icon for success type', () => {
      (useStore as any).mockReturnValue({
        toasts: [mockToasts[0]],
        removeToast: mockRemoveToast,
      });

      const { container } = render(<Toast />);
      const icon = container.querySelector('.text-green-500');
      expect(icon).toBeTruthy();
    });

    it('should display error icon for error type', () => {
      (useStore as any).mockReturnValue({
        toasts: [mockToasts[1]],
        removeToast: mockRemoveToast,
      });

      const { container } = render(<Toast />);
      const icon = container.querySelector('.text-red-500');
      expect(icon).toBeTruthy();
    });

    it('should display warning icon for warning type', () => {
      (useStore as any).mockReturnValue({
        toasts: [mockToasts[2]],
        removeToast: mockRemoveToast,
      });

      const { container } = render(<Toast />);
      const icon = container.querySelector('.text-yellow-500');
      expect(icon).toBeTruthy();
    });

    it('should display info icon for info type', () => {
      (useStore as any).mockReturnValue({
        toasts: [mockToasts[3]],
        removeToast: mockRemoveToast,
      });

      const { container } = render(<Toast />);
      const icon = container.querySelector('.text-blue-500');
      expect(icon).toBeTruthy();
    });

    it('should apply correct CSS class for each type', () => {
      (useStore as any).mockReturnValue({
        toasts: mockToasts,
        removeToast: mockRemoveToast,
      });

      const { container } = render(<Toast />);
      const toasts = container.querySelectorAll('.toast');
      
      expect(toasts[0].classList.contains('success')).toBe(true);
      expect(toasts[1].classList.contains('error')).toBe(true);
      expect(toasts[2].classList.contains('warning')).toBe(true);
      expect(toasts[3].classList.contains('info')).toBe(true);
    });
  });

  describe('Manual Dismiss', () => {
    it('should call removeToast when close button is clicked', () => {
      (useStore as any).mockReturnValue({
        toasts: [mockToasts[0]],
        removeToast: mockRemoveToast,
      });

      const { container } = render(<Toast />);
      const closeButton = container.querySelector('button');
      expect(closeButton).toBeTruthy();
      
      if (closeButton) {
        fireEvent.click(closeButton);
        expect(mockRemoveToast).toHaveBeenCalledWith('toast-1');
      }
    });

    it('should call removeToast with correct toast id for each toast', () => {
      (useStore as any).mockReturnValue({
        toasts: mockToasts,
        removeToast: mockRemoveToast,
      });

      const { container } = render(<Toast />);
      const closeButtons = container.querySelectorAll('button');
      
      expect(closeButtons.length).toBe(mockToasts.length);
      
      fireEvent.click(closeButtons[0]);
      expect(mockRemoveToast).toHaveBeenCalledWith('toast-1');
      
      fireEvent.click(closeButtons[1]);
      expect(mockRemoveToast).toHaveBeenCalledWith('toast-2');
    });
  });

  describe('Icon Display', () => {
    it('should render CheckCircle icon for success type', () => {
      (useStore as any).mockReturnValue({
        toasts: [mockToasts[0]],
        removeToast: mockRemoveToast,
      });

      const { container } = render(<Toast />);
      // CheckCircle icon should be present (lucide-react renders as SVG)
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
    });

    it('should render XCircle icon for error type', () => {
      (useStore as any).mockReturnValue({
        toasts: [mockToasts[1]],
        removeToast: mockRemoveToast,
      });

      const { container } = render(<Toast />);
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
    });

    it('should render AlertTriangle icon for warning type', () => {
      (useStore as any).mockReturnValue({
        toasts: [mockToasts[2]],
        removeToast: mockRemoveToast,
      });

      const { container } = render(<Toast />);
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
    });

    it('should render Info icon for info type', () => {
      (useStore as any).mockReturnValue({
        toasts: [mockToasts[3]],
        removeToast: mockRemoveToast,
      });

      const { container } = render(<Toast />);
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
    });
  });

  describe('Structure', () => {
    it('should render toast container with correct class', () => {
      (useStore as any).mockReturnValue({
        toasts: [mockToasts[0]],
        removeToast: mockRemoveToast,
      });

      const { container } = render(<Toast />);
      const toastContainer = container.querySelector('.toast-container');
      expect(toastContainer).toBeTruthy();
    });

    it('should render message text', () => {
      (useStore as any).mockReturnValue({
        toasts: [mockToasts[0]],
        removeToast: mockRemoveToast,
      });

      const { getByText } = render(<Toast />);
      expect(getByText('Success message')).toBeTruthy();
    });
  });
});

