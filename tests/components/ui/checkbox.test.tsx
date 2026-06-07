import { render, screen, fireEvent } from '@testing-library/react';
import { Checkbox } from '@/components/ui/checkbox';

describe('Checkbox', () => {
    it('renders correctly', () => {
        render(<Checkbox />);
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeInTheDocument();
    });

    it('handles checked state', () => {
        render(<Checkbox checked readOnly />);
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toBeChecked();
    });

    it('handles clicks', () => {
        const handleCheckedChange = jest.fn();
        render(<Checkbox onCheckedChange={handleCheckedChange} />);
        const checkbox = screen.getByRole('checkbox');

        fireEvent.click(checkbox);
        expect(handleCheckedChange).toHaveBeenCalledWith(true);
    });

    it('applies custom classes', () => {
        render(<Checkbox className="custom-checkbox" />);
        // The accessible role 'checkbox' is on the button (Radix UI)
        const checkbox = screen.getByRole('checkbox');
        expect(checkbox).toHaveClass('custom-checkbox');
    });
});
