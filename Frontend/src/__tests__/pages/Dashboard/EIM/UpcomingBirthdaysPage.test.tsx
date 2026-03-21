import * as Module from '@/pages/Dashboard/EIM/UpcomingBirthdaysPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('UpcomingBirthdaysPage', Module, {
  exportName: 'UpcomingBirthdays',
  route: '/dashboard',
  expectsFetch: true,
  expectsAxios: false,
});
