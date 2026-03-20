import * as Module from '@/pages/Dashboard/MessagesPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('MessagesPage', Module, {
  exportName: 'MessagesPage',
  route: '/dashboard',
  expectsFetch: true,
  expectsAxios: false,
});
