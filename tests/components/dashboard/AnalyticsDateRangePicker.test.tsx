import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('@/components/ui/button', () => ({
    Button: ({
        children,
        variant: _variant,
        size: _size,
        ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; size?: string }) => (
        <button {...props}>{children}</button>
    ),
}));

import { AnalyticsDateRangePicker } from '@/components/dashboard/AnalyticsDateRangePicker';

describe('AnalyticsDateRangePicker', () => {
    it('applies presets immediately and keeps custom ranges as a draft', () => {
        const setDate = jest.fn();
        const onApply = jest.fn();

        render(
            <AnalyticsDateRangePicker
                date={{ from: new Date(2024, 0, 10), to: new Date(2024, 0, 10) }}
                setDate={setDate}
                onApply={onApply}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /2024\/01\/10/ }));
        fireEvent.click(screen.getByRole('button', { name: '近7日' }));
        expect(setDate).toHaveBeenCalledTimes(1);
        expect(onApply).toHaveBeenCalledTimes(1);

        setDate.mockClear();
        onApply.mockClear();
        fireEvent.click(screen.getByRole('button', { name: /2024\/01\/10/ }));
        fireEvent.click(screen.getByRole('button', { name: '自定义' }));
        fireEvent.change(screen.getByLabelText('开始日期'), { target: { value: '2023-10-01' } });
        fireEvent.change(screen.getByLabelText('结束日期'), { target: { value: '2024-01-10' } });
        expect(setDate).not.toHaveBeenCalled();
        expect(onApply).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: '取消' }));
        expect(setDate).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole('button', { name: /2024\/01\/10/ }));
        fireEvent.click(screen.getByRole('button', { name: '自定义' }));
        fireEvent.change(screen.getByLabelText('开始日期'), { target: { value: '2023-10-01' } });
        fireEvent.change(screen.getByLabelText('结束日期'), { target: { value: '2024-01-10' } });
        fireEvent.click(screen.getByRole('button', { name: '应用' }));

        expect(setDate).toHaveBeenCalledTimes(1);
        expect(onApply).toHaveBeenCalledTimes(1);
        expect(onApply.mock.calls[0][0]).toEqual({
            from: new Date(2023, 9, 1),
            to: new Date(2024, 0, 10),
        });
    });
});
