import { render, screen, fireEvent } from '@testing-library/react';
import Modal from '../Modal';

describe('Modal', () => {
  const onClose = jest.fn();

  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={onClose} title="Test Modal">
        <p>Modal Content</p>
      </Modal>
    );
    expect(screen.queryByText('Test Modal')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Modal Content</p>
      </Modal>
    );
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    render(
      <Modal isOpen={true} onClose={onClose} title="Test Modal">
        <p>Modal Content</p>
      </Modal>
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
