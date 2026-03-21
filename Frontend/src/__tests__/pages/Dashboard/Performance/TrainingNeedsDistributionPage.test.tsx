import * as Module from '@/pages/Dashboard/Performance/TrainingNeedsDistributionPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('TrainingNeedsDistributionPage', Module, {
  exportName: 'PerformanceTraining',
  route: '/dashboard',
  expectsFetch: true,
  expectsAxios: false,
});
