import * as Module from '@/pages/Dashboard/Attendance/LatecomersAnalysisPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('LatecomersAnalysisPage', Module, {
  exportName: 'LatecomersAnalysisPage',
  route: '/dashboard',
  expectsFetch: true,
  expectsAxios: false,
});
