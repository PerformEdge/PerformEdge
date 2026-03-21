import * as Module from '@/pages/EmployeeDashboard/EmployeeMessagesPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('EmployeeMessagesPage', Module, {

  route: '/dashboard',
  expectsFetch: false,
  expectsAxios: false,
});
