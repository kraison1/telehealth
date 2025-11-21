import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders the spinner', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders with text', () => {
    render(<LoadingSpinner text="Loading..." />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('applies the correct size class', () => {
    const { container } = render(<LoadingSpinner size="lg" />);
    expect(container.querySelector('.animate-spin')).toHaveClass('w-12 h-12 border-4');
  });

  it('renders as an overlay', () => {
    const { container } = render(<LoadingSpinner overlay />);
    expect(container.firstChild).toHaveClass('absolute inset-0');
  });

  it('does not render as an overlay by default', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.firstChild).not.toHaveClass('absolute inset-0');
  });
});
