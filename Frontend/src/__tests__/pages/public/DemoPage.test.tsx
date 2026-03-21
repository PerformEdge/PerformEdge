import * as Module from '@/pages/public/DemoPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('DemoPage', Module, {
  exportName: 'DemoPage',
  route: '/dashboard',
  expectsFetch: false,
  expectsAxios: false,
});
