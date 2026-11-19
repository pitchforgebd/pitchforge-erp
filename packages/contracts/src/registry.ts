import { accountingEndpoints } from './accounting/endpoints.ts';
import { billingEndpoints } from './billing/endpoints.ts';
import { coreEndpoints } from './core/endpoints.ts';
import { crmEndpoints } from './crm/endpoints.ts';
import type { Endpoint } from './endpoint.ts';
import { hrEndpoints } from './hr/endpoints.ts';
import { partnersEndpoints } from './partners/endpoints.ts';
import { payrollEndpoints } from './payroll/endpoints.ts';
import { procurementEndpoints } from './procurement/endpoints.ts';
import { projectsEndpoints } from './projects/endpoints.ts';
import { reportingEndpoints } from './reporting/endpoints.ts';

/** Every endpoint in the API. OpenAPI, the feature map and the table tests read this list. */
export const ALL_ENDPOINTS: readonly Endpoint[] = [
  ...Object.values(coreEndpoints),
  ...Object.values(accountingEndpoints),
  ...Object.values(partnersEndpoints),
  ...Object.values(crmEndpoints),
  ...Object.values(billingEndpoints),
  ...Object.values(projectsEndpoints),
  ...Object.values(hrEndpoints),
  ...Object.values(payrollEndpoints),
  ...Object.values(procurementEndpoints),
  ...Object.values(reportingEndpoints),
];

/** Feature ID → endpoint ids. */
export function featureMap(endpoints: readonly Endpoint[] = ALL_ENDPOINTS): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const endpoint of endpoints) {
    for (const feature of endpoint.featureIds) {
      map.set(feature, [...(map.get(feature) ?? []), endpoint.id]);
    }
  }
  return map;
}
