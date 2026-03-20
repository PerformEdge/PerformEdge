import config from '../postcss.config.js';

describe('postcss.config.js', () => {
  it('declares tailwind and autoprefixer plugins', () => {
    expect(config.plugins).toHaveProperty('tailwindcss');
    expect(config.plugins).toHaveProperty('autoprefixer');
  });
});
