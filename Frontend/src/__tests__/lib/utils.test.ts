import { cn } from '@/lib/utils';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('p-2', false && 'hidden', 'p-4')).toContain('p-4');
  });
});
