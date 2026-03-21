import * as Module from '@/pages/Dashboard/EIM/StaffAnalysisPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('StaffAnalysisPage', Module, {
  exportName: 'StaffAnalysis',
  route: '/dashboard',
  expectsFetch: true,
  expectsAxios: false,
});
