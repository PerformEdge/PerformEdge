import * as Module from '@/pages/EmployeeDashboard/EmployeeDashboardLayout';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('EmployeeDashboardLayout', Module, {
  exportName: 'EmployeeDashboardLayout',
  route: '/dashboard',
  expectsFetch: true,
  expectsAxios: false,
});
