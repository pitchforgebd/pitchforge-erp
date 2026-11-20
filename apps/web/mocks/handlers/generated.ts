import { ALL_ENDPOINTS } from '@pitchforge/contracts';
import { sampleFor } from '@pitchforge/contracts/fixtures';

import { mock } from '../define.ts';
import type { MockHandler } from '../define.ts';

import { accountingRecordHandlers } from './accounting-records.ts';
import { billingRecordHandlers } from './billing-records.ts';
import { coreRecordHandlers } from './core-records.ts';
import { SESSION_COOKIE, coreHandlers } from './core.ts';
import { crmRecordHandlers } from './crm-records.ts';
import { hrRecordHandlers } from './hr-records.ts';
import { payrollRecordHandlers } from './payroll-records.ts';
import { procurementRecordHandlers } from './procurement-records.ts';
import { projectRecordHandlers } from './project-records.ts';

const handled = new Set(
  [
    ...coreHandlers,
    ...coreRecordHandlers,
    ...accountingRecordHandlers,
    ...billingRecordHandlers,
    ...projectRecordHandlers,
    ...crmRecordHandlers,
    ...hrRecordHandlers,
    ...payrollRecordHandlers,
    ...procurementRecordHandlers,
  ].map(({ endpointId }) => endpointId),
);

/**
 * A fixed sample response for every endpoint with no hand-written handler. It needs a session
 * and returns the same data every time: no calculation and no state, so a mock can never
 * become a second implementation of a business rule.
 */
export const generatedHandlers: readonly MockHandler[] = ALL_ENDPOINTS.filter(
  (endpoint) => !handled.has(endpoint.id),
).map((endpoint) =>
  mock(endpoint, (request) => {
    if (endpoint.public !== true && request.cookie(SESSION_COOKIE) === undefined) {
      return { problem: 'UNAUTHENTICATED' };
    }
    if (endpoint.response === null) return { empty: true };
    return { json: sampleFor(endpoint.response) };
  }),
);
