import * as Module from '@/pages/Dashboard/EIM/ServiceYearAnalysisPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('ServiceYearAnalysisPage', Module, {
  exportName: 'ServiceYearAnalysis',
  route: '/dashboard',
  expectsFetch: true,
  expectsAxios: false,
});
