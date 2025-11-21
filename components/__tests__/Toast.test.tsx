import { render, screen, fireEvent } from '@testing-library/react';
import Toast from '../Toast';

describe('Toast', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders a success toast', () => {
    render(<Toast message="Success!" type="success" onClose={onClose} />);
    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText('Success!').parentElement).toHaveClass('bg-green-500');
  });

  it('renders an error toast', () => {
    render(<Toast message="Error!" type="error" onClose={onClose} />);
    expect(screen.getByText('Error!')).toBeInTheDocument();
    expect(screen.getByText('Error!').parentElement).toHaveClass('bg-red-500');
  });

  it('calls onClose after the duration', () => {
    render(<Toast message="Test" type="success" onClose={onClose} duration={5000} />);
    expect(onClose).not.toHaveBeenCalled();
    jest.advanceTimersByTime(5000);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close button is clicked', () => {
    render(<Toast message="Test" type="success" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
