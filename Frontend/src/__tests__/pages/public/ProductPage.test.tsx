import * as Module from '@/pages/public/ProductPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('ProductPage', Module, {
  exportName: 'ProductPage',
  route: '/',
  expectsFetch: false,
  expectsAxios: false,
});
