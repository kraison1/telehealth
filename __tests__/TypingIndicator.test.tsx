import { render, screen } from '@testing-library/react';
import TypingIndicator from '../components/TypingIndicator';

describe('TypingIndicator', () => {
  it('renders three dots', () => {
    const { container } = render(<TypingIndicator />);
    const dots = container.querySelectorAll('.animate-bounce');
    expect(dots.length).toBe(3);
  });

  it('applies the correct size class', () => {
    const { container } = render(<TypingIndicator size="sm" />);
    const dots = container.querySelectorAll('.animate-bounce');
    dots.forEach(dot => {
      expect(dot).toHaveClass('w-1.5');
    });
  });

  it('uses md as default size', () => {
    const { container } = render(<TypingIndicator />);
    const dots = container.querySelectorAll('.w-2');
    expect(dots.length).toBe(3);
  });
});
