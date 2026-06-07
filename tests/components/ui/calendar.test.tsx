import { render, screen } from '@testing-library/react';
import { Calendar } from '@/components/ui/calendar';

describe('Calendar', () => {
    it('renders correctly', () => {
        render(<Calendar mode="single" />);
        // react-day-picker usually renders a table
        const table = screen.getByRole('grid');
        expect(table).toBeInTheDocument();
    });

    it('applies custom class names', () => {
        const { container } = render(<Calendar mode="single" className="custom-calendar" />);
        // The root element of DayPicker should have the class
        expect(container.firstChild).toHaveClass('custom-calendar');
    });
});
