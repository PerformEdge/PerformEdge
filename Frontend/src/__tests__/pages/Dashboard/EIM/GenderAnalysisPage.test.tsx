import * as Module from '@/pages/Dashboard/EIM/GenderAnalysisPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('GenderAnalysisPage', Module, {
  exportName: 'ServiceYearAnalysis',
  route: '/dashboard/eim/gender-analysis',
  expectsFetch: true,
  expectsAxios: false,
});
