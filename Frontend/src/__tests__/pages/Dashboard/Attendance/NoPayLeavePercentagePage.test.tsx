import * as Module from '@/pages/Dashboard/Attendance/NoPayLeavePercentagePage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('NoPayLeavePercentagePage', Module, {
  exportName: 'NoPayLeavePercentagePage',
  route: '/dashboard',
  expectsFetch: true,
  expectsAxios: false,
});
