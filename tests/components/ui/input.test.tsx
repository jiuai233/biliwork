import { render, screen } from '@testing-library/react';
import { Input } from '@/components/ui/input';
import React from 'react';

describe('Input', () => {
    it('renders correctly', () => {
        render(<Input placeholder="Enter text" />);
        const input = screen.getByPlaceholderText('Enter text');
        expect(input).toBeInTheDocument();
    });

    it('applies custom classes', () => {
        render(<Input className="custom-class" data-testid="input" />);
        const input = screen.getByTestId('input');
        expect(input).toHaveClass('custom-class');
    });

    it('forwards refs', () => {
        const ref = React.createRef<HTMLInputElement>();
        render(<Input ref={ref} />);
        expect(ref.current).toBeInstanceOf(HTMLInputElement);
    });

    it('handles disabled state', () => {
        render(<Input disabled />);
        const input = screen.getByRole('textbox');
        expect(input).toBeDisabled();
    });

    it('handles different types', () => {
        render(<Input type="password" placeholder="Password" />);
        const input = screen.getByPlaceholderText('Password');
        expect(input).toHaveAttribute('type', 'password');
    });
});
