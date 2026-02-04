import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
    it('renders correctly', () => {
        render(<Button>Click me</Button>);
        const button = screen.getByRole('button', { name: /click me/i });
        expect(button).toBeInTheDocument();
    });

    it('handles click events', () => {
        const handleClick = jest.fn();
        render(<Button onClick={handleClick}>Click me</Button>);
        const button = screen.getByRole('button', { name: /click me/i });
        fireEvent.click(button);
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('applies variants correctly', () => {
        render(<Button variant="destructive">Destructive</Button>);
        const button = screen.getByRole('button', { name: /destructive/i });
        expect(button).toHaveClass('bg-destructive');
    });

    it('renders as a child when asChild is true', () => {
        render(
            <Button asChild>
                <a href="/link">Link Button</a>
            </Button>
        );
        const link = screen.getByRole('link', { name: /link button/i });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute('href', '/link');
    });
});
