import config from '../vite.config.js';

describe('vite.config.js', () => {
  it('configures the src alias', () => {
    expect(config.resolve.alias).toHaveProperty('@');
  });
});
