import * as Module from '@/pages/Dashboard/Performance/PerformancePage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('PerformancePage', Module, {
  exportName: 'PerformancePage',
  route: '/dashboard',
  expectsFetch: true,
  expectsAxios: false,
});
