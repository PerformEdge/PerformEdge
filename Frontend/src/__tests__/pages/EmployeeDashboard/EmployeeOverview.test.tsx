import * as Module from '@/pages/EmployeeDashboard/EmployeeOverview';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('EmployeeOverview', Module, {
  exportName: 'EmployeeOverview',
  route: '/dashboard',
  expectsFetch: true,
  expectsAxios: false,
});
