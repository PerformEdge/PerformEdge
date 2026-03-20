import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const config = require('../tailwind.config.cjs');

describe('tailwind.config.cjs', () => {
  it('enables class based dark mode', () => {
    expect(config.darkMode).toEqual(['class']);
    expect(config.theme.extend.colors).toHaveProperty('background');
  });
});
