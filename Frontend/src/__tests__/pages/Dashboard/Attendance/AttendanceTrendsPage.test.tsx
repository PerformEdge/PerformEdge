import * as Module from '@/pages/Dashboard/Attendance/AttendanceTrendsPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('AttendanceTrendsPage', Module, {
  exportName: 'AttendanceTrendsPage',
  route: '/dashboard',
  expectsFetch: true,
  expectsAxios: false,
});
