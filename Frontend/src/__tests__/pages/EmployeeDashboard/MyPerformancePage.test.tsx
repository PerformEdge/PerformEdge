import * as Module from '@/pages/EmployeeDashboard/MyPerformancePage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('MyPerformancePage', Module, {
  exportName: 'MyPerformancePage',
  route: '/dashboard',
  expectsFetch: true,
  expectsAxios: false,
});
