import React from 'react';
import { vi } from 'vitest';

describe('main.tsx', () => {
  it('mounts the app into the root element', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const render = vi.fn();
    vi.doMock('react-dom/client', () => ({ createRoot: vi.fn(() => ({ render })) }));
    vi.doMock('@/App', () => ({ default: () => React.createElement('div', null, 'App') }));
    await import('@/main');
    expect(render).toHaveBeenCalled();
  });
});
