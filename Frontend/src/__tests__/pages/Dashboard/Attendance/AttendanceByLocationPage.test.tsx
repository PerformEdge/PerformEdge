import * as Module from '@/pages/Dashboard/Attendance/AttendanceByLocationPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('AttendanceByLocationPage', Module, {
  exportName: 'AttendanceByLocationPage',
  route: '/dashboard',
  expectsFetch: true,
  expectsAxios: false,
});
