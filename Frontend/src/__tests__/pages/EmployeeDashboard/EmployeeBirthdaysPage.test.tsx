import * as Module from '@/pages/EmployeeDashboard/EmployeeBirthdaysPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('EmployeeBirthdaysPage', Module, {
  exportName: 'EmployeeBirthdaysPage',
  route: '/dashboard',
  expectsFetch: true,
  expectsAxios: false,
});
