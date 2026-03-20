import * as Module from '@/pages/Dashboard/SearchPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('SearchPage', Module, {
  exportName: 'SearchPage',
  route: '/dashboard/search?q=john',
  expectsFetch: true,
  expectsAxios: false,
});
