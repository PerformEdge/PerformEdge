import * as Module from '@/pages/Dashboard/EIM/AgeAnalysisPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('AgeAnalysisPage', Module, {
  exportName: 'AgeAnalysisDashboard',
  route: '/dashboard/eim/age-analysis',
  expectsFetch: true,
  expectsAxios: false,
});
