import * as Module from '@/pages/Dashboard/Performance/AppraisalCompletionStatusPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('AppraisalCompletionStatusPage', Module, {
  exportName: 'PerformanceAppraisals',
  route: '/dashboard',
  expectsFetch: true,
  expectsAxios: false,
});
