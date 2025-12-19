import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { ConfirmationModal } from '../ConfirmationModal';

describe('ConfirmationModal', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should render modal with title and message', () => {
      const { getByText } = render(
        <ConfirmationModal
          title="Test Title"
          message="Test message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(getByText('Test Title')).toBeTruthy();
      expect(getByText('Test message')).toBeTruthy();
    });

    it('should render default confirm and cancel buttons', () => {
      const { getByText } = render(
        <ConfirmationModal
          title="Test"
          message="Test message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(getByText('Confirm')).toBeTruthy();
      expect(getByText('Cancel')).toBeTruthy();
    });

    it('should render custom confirm and cancel labels', () => {
      const { getByText } = render(
        <ConfirmationModal
          title="Test"
          message="Test message"
          confirmLabel="Yes, delete"
          cancelLabel="No, keep it"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(getByText('Yes, delete')).toBeTruthy();
      expect(getByText('No, keep it')).toBeTruthy();
    });

    it('should render close button', () => {
      const { container } = render(
        <ConfirmationModal
          title="Test"
          message="Test message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      const closeButton = container.querySelector('button[aria-label="Close"]');
      expect(closeButton).toBeTruthy();
    });
  });

  describe('Variants', () => {
    it('should render info variant with info icon', () => {
      const { container } = render(
        <ConfirmationModal
          title="Info"
          message="Info message"
          variant="info"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      // Info icon should be present (blue)
      const icon = container.querySelector('.text-blue-400');
      expect(icon).toBeTruthy();
      
      // Confirm button should have btn-primary class
      const confirmButton = container.querySelector('.btn-primary');
      expect(confirmButton).toBeTruthy();
    });

    it('should render warning variant with warning icon', () => {
      const { container } = render(
        <ConfirmationModal
          title="Warning"
          message="Warning message"
          variant="warning"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      // Warning icon should be present (yellow)
      const icon = container.querySelector('.text-yellow-400');
      expect(icon).toBeTruthy();
      
      // Confirm button should have btn-warning class
      const confirmButton = container.querySelector('.btn-warning');
      expect(confirmButton).toBeTruthy();
    });

    it('should render danger variant with danger icon', () => {
      const { container } = render(
        <ConfirmationModal
          title="Danger"
          message="Danger message"
          variant="danger"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      // Danger icon should be present (red)
      const icon = container.querySelector('.text-red-400');
      expect(icon).toBeTruthy();
      
      // Confirm button should have btn-danger class
      const confirmButton = container.querySelector('.btn-danger');
      expect(confirmButton).toBeTruthy();
    });

    it('should default to info variant', () => {
      const { container } = render(
        <ConfirmationModal
          title="Test"
          message="Test message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      // Should have info icon (default)
      const icon = container.querySelector('.text-blue-400');
      expect(icon).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    it('should call onConfirm when confirm button is clicked', () => {
      const { getByText } = render(
        <ConfirmationModal
          title="Test"
          message="Test message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      const confirmButton = getByText('Confirm');
      fireEvent.click(confirmButton);
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('should call onCancel when cancel button is clicked', () => {
      const { getByText } = render(
        <ConfirmationModal
          title="Test"
          message="Test message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      const cancelButton = getByText('Cancel');
      fireEvent.click(cancelButton);
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should call onCancel when close button is clicked', () => {
      const { container } = render(
        <ConfirmationModal
          title="Test"
          message="Test message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      const closeButton = container.querySelector('button[aria-label="Close"]');
      if (closeButton) {
        fireEvent.click(closeButton);
      }
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should call onCancel when overlay is clicked', () => {
      const { container } = render(
        <ConfirmationModal
          title="Test"
          message="Test message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      const overlay = container.querySelector('.modal-overlay');
      if (overlay) {
        fireEvent.click(overlay);
      }
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should call onCancel when Escape key is pressed', () => {
      render(
        <ConfirmationModal
          title="Test"
          message="Test message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should call onConfirm when Ctrl+Enter is pressed', () => {
      render(
        <ConfirmationModal
          title="Test"
          message="Test message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      fireEvent.keyDown(window, { key: 'Enter', ctrlKey: true });
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('should call onConfirm when Cmd+Enter is pressed (Mac)', () => {
      render(
        <ConfirmationModal
          title="Test"
          message="Test message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      fireEvent.keyDown(window, { key: 'Enter', metaKey: true });
      expect(mockOnConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('should not call onConfirm when Enter is pressed without modifier', () => {
      render(
        <ConfirmationModal
          title="Test"
          message="Test message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      fireEvent.keyDown(window, { key: 'Enter' });
      expect(mockOnConfirm).not.toHaveBeenCalled();
      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('should not close modal when clicking inside modal content', () => {
      const { container } = render(
        <ConfirmationModal
          title="Test"
          message="Test message"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      const modal = container.querySelector('.bg-sidebar-bg');
      if (modal) {
        fireEvent.click(modal);
      }
      expect(mockOnCancel).not.toHaveBeenCalled();
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });
  });

  describe('Custom Labels', () => {
    it('should use custom confirm label', () => {
      const { getByText } = render(
        <ConfirmationModal
          title="Delete"
          message="Are you sure?"
          confirmLabel="Yes, delete it"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(getByText('Yes, delete it')).toBeTruthy();
    });

    it('should use custom cancel label', () => {
      const { getByText } = render(
        <ConfirmationModal
          title="Delete"
          message="Are you sure?"
          cancelLabel="No, keep it"
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />
      );
      expect(getByText('No, keep it')).toBeTruthy();
    });
  });
});

