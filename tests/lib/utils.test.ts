import { cn } from '@/lib/utils';

describe('utils', () => {
    describe('cn', () => {
        it('should merge class names correctly', () => {
            expect(cn('class1', 'class2')).toBe('class1 class2');
        });

        it('should handle conditional classes', () => {
            expect(cn('class1', true && 'class2', false && 'class3')).toBe('class1 class2');
        });

        it('should handle arrays', () => {
            expect(cn(['class1', 'class2'])).toBe('class1 class2');
        });

        it('should handle undefined and null', () => {
            expect(cn('class1', undefined, null, 'class2')).toBe('class1 class2');
        });

        it('should handle tailwind conflicts', () => {
            expect(cn('p-4', 'p-2')).toBe('p-2');
            expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
        });
    });
});
