import * as Module from '@/pages/Dashboard/NotificationsPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('NotificationsPage', Module, {
  exportName: 'NotificationsPage',
  route: '/dashboard',
  expectsFetch: true,
  expectsAxios: false,
});
