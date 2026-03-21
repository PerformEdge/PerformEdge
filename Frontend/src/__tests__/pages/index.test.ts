import * as Pages from '@/pages';

describe('pages barrel exports', () => {
  it('exports key page modules', () => {
    expect(Pages.ProductPage).toBeDefined();
    expect(Pages.DashboardLayout).toBeDefined();
    expect(Pages.LoginPage).toBeDefined();
  });
});
