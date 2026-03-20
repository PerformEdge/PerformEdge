import * as Module from '@/pages/Signup/SignupPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('SignupPage', Module, {
  exportName: 'SignupPage',
  route: '/signup',
  expectsFetch: false,
  expectsAxios: false,
});
