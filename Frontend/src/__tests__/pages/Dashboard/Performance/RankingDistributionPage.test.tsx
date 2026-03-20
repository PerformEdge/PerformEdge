import * as Module from '@/pages/Dashboard/Performance/RankingDistributionPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('RankingDistributionPage', Module, {
  exportName: 'PerformanceRanking',
  route: '/dashboard',
  expectsFetch: true,
  expectsAxios: false,
});
