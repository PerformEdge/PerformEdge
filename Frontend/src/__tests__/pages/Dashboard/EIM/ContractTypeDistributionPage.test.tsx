import * as Module from '@/pages/Dashboard/EIM/ContractTypeDistributionPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('ContractTypeDistributionPage', Module, {
  exportName: 'ContractTypeDistribution',
  route: '/dashboard',
  expectsFetch: true,
  expectsAxios: false,
});
