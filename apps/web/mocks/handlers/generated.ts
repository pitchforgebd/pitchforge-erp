import { ALL_ENDPOINTS } from '@pitchforge/contracts';
import { sampleFor } from '@pitchforge/contracts/fixtures';

import { WRITE_ACCESS } from '../data/write-access.ts';
import { mock } from '../define.ts';
import type { MockHandler } from '../define.ts';
import { bodyOf, steppedUp, viewerOf } from '../serve.ts';

import { accountingRecordHandlers } from './accounting-records.ts';
import { billingRecordHandlers } from './billing-records.ts';
import { coreRecordHandlers } from './core-records.ts';
import { SESSION_COOKIE, coreHandlers } from './core.ts';
import { crmRecordHandlers } from './crm-records.ts';
import { hrRecordHandlers } from './hr-records.ts';
import { payrollRecordHandlers } from './payroll-records.ts';
import { platformRecordHandlers } from './platform-records.ts';
import { procurementRecordHandlers } from './procurement-records.ts';
import { projectRecordHandlers } from './project-records.ts';
import { reportingRecordHandlers } from './reporting-records.ts';

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
    ...platformRecordHandlers,
    ...reportingRecordHandlers,
  ].map(({ endpointId }) => endpointId),
);

/**
 * A fixed sample response for every endpoint with no hand-written handler. It needs a session,
 * writes need a role from WRITE_ACCESS, and it returns the same data every time: no calculation and no state, so a mock can never
 * become a second implementation of a business rule.
 */
export const generatedHandlers: readonly MockHandler[] = ALL_ENDPOINTS.filter(
  (endpoint) => !handled.has(endpoint.id),
).map((endpoint) =>
  mock(endpoint, async (request) => {
    if (endpoint.public !== true && request.cookie(SESSION_COOKIE) === undefined) {
      return { problem: 'UNAUTHENTICATED' };
    }
    if (endpoint.method !== 'GET' && endpoint.public !== true) {
      // Writes are denied by default: only the roles in WRITE_ACCESS, after step-up if asked.
      const viewer = viewerOf(request);
      const roles = WRITE_ACCESS.get(endpoint.id) ?? [];
      if (viewer === undefined || !roles.includes(viewer.role)) return { problem: 'FORBIDDEN' };
      if (endpoint.stepUp === true && !steppedUp(request)) return { problem: 'STEP_UP_REQUIRED' };
      if (endpoint.body !== undefined && !endpoint.body.safeParse(await bodyOf(request)).success) {
        return { problem: 'VALIDATION' };
      }
    }
    if (endpoint.response === null) return { empty: true };
    return { json: sampleFor(endpoint.response) };
  }),
);
