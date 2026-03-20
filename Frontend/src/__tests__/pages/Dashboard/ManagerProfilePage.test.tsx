import * as Module from '@/pages/Dashboard/ManagerProfilePage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('ManagerProfilePage', Module, {
  exportName: 'ManagerProfilePage',
  route: '/dashboard',
  expectsFetch: true,
  expectsAxios: false,
});
