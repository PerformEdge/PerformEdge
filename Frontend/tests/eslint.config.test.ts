import config from '../eslint.config.js';

describe('eslint.config.js', () => {
  it('exports a flat config array', () => {
    expect(Array.isArray(config)).toBe(true);
    expect(config.length).toBeGreaterThan(0);
  });
});
