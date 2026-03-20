import * as Module from '@/pages/Dashboard/EIM/EIMPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('EIMPage', Module, {
  exportName: 'EIMDashboard',
  route: '/dashboard',
  expectsFetch: true,
  expectsAxios: false,
});
