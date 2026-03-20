import * as Module from '@/pages/Login/ForgetPasswordPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('ForgetPasswordPage', Module, {
  exportName: 'ForgotPasswordPage',
  route: '/forget-password',
  expectsFetch: false,
  expectsAxios: false,
});
