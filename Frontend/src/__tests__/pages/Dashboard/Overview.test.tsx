import * as Module from '@/pages/Dashboard/Overview';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('Overview', Module, {
  exportName: 'Overview',
  route: '/dashboard',
  expectsFetch: false,
  expectsAxios: true,
});
