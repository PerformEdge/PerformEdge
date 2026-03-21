import * as Module from '@/pages/EmployeeDashboard/EmployeeSearchPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('EmployeeSearchPage', Module, {
  exportName: 'EmployeeSearchPage',
  route: '/employee/search?q=john',
  expectsFetch: true,
  expectsAxios: false,
});
