import * as Module from '@/pages/EmployeeDashboard/EmployeeNotificationsPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('EmployeeNotificationsPage', Module, {

  route: '/dashboard',
  expectsFetch: false,
  expectsAxios: false,
});
