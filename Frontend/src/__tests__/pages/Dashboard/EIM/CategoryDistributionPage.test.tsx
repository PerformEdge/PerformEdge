import * as Module from '@/pages/Dashboard/EIM/CategoryDistributionPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('CategoryDistributionPage', Module, {
  exportName: 'CategoryDistribution',
  route: '/dashboard/eim/category-distribution',
  expectsFetch: true,
  expectsAxios: false,
});
