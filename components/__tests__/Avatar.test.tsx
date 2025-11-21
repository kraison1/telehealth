import { render, screen } from '@testing-library/react';
import Avatar from '../Avatar';

describe('Avatar', () => {
  it('renders the first letter of the name', () => {
    render(<Avatar name="Test User" />);
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('applies the correct size class', () => {
    const { container } = render(<Avatar name="Test User" size="sm" />);
    expect(container.firstChild).toHaveClass('w-7 h-7 text-xs');
  });

  it('applies the correct variant class', () => {
    const { container } = render(<Avatar name="Test User" variant="gray" />);
    expect(container.firstChild).toHaveClass('bg-gradient-to-br from-gray-400 to-gray-600');
  });

  it('uses md as default size', () => {
    const { container } = render(<Avatar name="Test User" />);
    expect(container.firstChild).toHaveClass('w-10 h-10 text-lg');
  });

  it('uses blue as default variant', () => {
    const { container } = render(<Avatar name="Test User" />);
    expect(container.firstChild).toHaveClass('bg-gradient-to-br from-blue-400 to-blue-600');
  });
});
