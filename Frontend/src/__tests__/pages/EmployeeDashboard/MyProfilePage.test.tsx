import * as Module from '@/pages/EmployeeDashboard/MyProfilePage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('MyProfilePage', Module, {
  exportName: 'MyProfilePage',
  route: '/dashboard',
  expectsFetch: true,
  expectsAxios: false,
});
