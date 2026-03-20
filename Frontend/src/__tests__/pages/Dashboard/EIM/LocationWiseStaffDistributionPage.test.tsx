import * as Module from '@/pages/Dashboard/EIM/LocationWiseStaffDistributionPage';
import { describeRenderableModule } from '@/test/moduleFactories';

describeRenderableModule('LocationWiseStaffDistributionPage', Module, {
  exportName: 'LocationWiseStaffDistribution',
  route: '/dashboard/eim/location-wise-staff-distribution',
  expectsFetch: true,
  expectsAxios: false,
});
