import * as Module from '@/pages/Dashboard/Attendance/AttendancePage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('AttendancePage', Module, {
  exportName: 'AttendancePage',
  route: '/dashboard',
  expectsFetch: true,
  expectsAxios: false,
});
