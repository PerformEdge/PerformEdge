import * as Module from '@/pages/Dashboard/DashboardLayout';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('DashboardLayout', Module, {
  exportName: 'DashboardLayout',
  route: '/dashboard',
  expectsFetch: true,
  expectsAxios: false,
});
