import * as Module from '@/pages/EmployeeDashboard/NewJoinersPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('NewJoinersPage', Module, {
  exportName: 'NewJoinersPage',
  route: '/dashboard',
  expectsFetch: true,
  expectsAxios: false,
});
