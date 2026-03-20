import * as Module from '@/pages/Login/LoginPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('LoginPage', Module, {
  exportName: 'LoginPage',
  route: '/login',
  expectsFetch: false,
  expectsAxios: false,
});
