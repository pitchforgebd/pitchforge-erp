import { setupServer } from 'msw/node';
import type { SetupServer } from 'msw/node';

import { accountingRecordHandlers } from './handlers/accounting-records.ts';
import { billingRecordHandlers } from './handlers/billing-records.ts';
import { coreRecordHandlers } from './handlers/core-records.ts';
import { coreHandlers } from './handlers/core.ts';
import { crmRecordHandlers } from './handlers/crm-records.ts';
import { generatedHandlers } from './handlers/generated.ts';
import { hrRecordHandlers } from './handlers/hr-records.ts';
import { payrollRecordHandlers } from './handlers/payroll-records.ts';
import { platformRecordHandlers } from './handlers/platform-records.ts';
import { procurementRecordHandlers } from './handlers/procurement-records.ts';
import { projectRecordHandlers } from './handlers/project-records.ts';
import { reportingRecordHandlers } from './handlers/reporting-records.ts';

/** Mock handlers except for modules already switched to the real API. */
export function mockHandlers(realModules: readonly string[]) {
  return [
    ...coreHandlers,
    ...coreRecordHandlers,
    ...accountingRecordHandlers,
    ...billingRecordHandlers,
    ...projectRecordHandlers,
    ...crmRecordHandlers,
    ...hrRecordHandlers,
    ...payrollRecordHandlers,
    ...procurementRecordHandlers,
    ...platformRecordHandlers,
    ...reportingRecordHandlers,
    ...generatedHandlers,
  ]
    .filter(({ module }) => !realModules.includes(module))
    .map(({ handler }) => handler);
}

export function startMockServer(realModules: readonly string[]): SetupServer {
  const server = setupServer(...mockHandlers(realModules));
  // Unmocked requests fail loudly instead of reaching the network.
  server.listen({ onUnhandledFrame: realModules.length > 0 ? 'bypass' : 'error' });
  return server;
}
