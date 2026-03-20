import * as Module from '@/pages/EmployeeDashboard/MyLeaveStatusPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('MyLeaveStatusPage', Module, {
  exportName: 'MyLeaveStatusPage',
  route: '/dashboard',
  expectsFetch: true,
  expectsAxios: false,
});
