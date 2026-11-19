import { z } from 'zod';

/**
 * Probes for the load balancer. They sit outside the module API, at `/api/v1/health` and
 * `/api/v1/ready`, and tell a caller nothing about versions or hosts.
 */
export const Health = z.object({ status: z.literal('ok') }).meta({ id: 'Health' });
export type Health = z.infer<typeof Health>;

const CheckState = z.enum(['up', 'down']);

export const Readiness = z
  .object({
    status: z.enum(['ready', 'not_ready']),
    checks: z.object({ database: CheckState, cache: CheckState }),
  })
  .meta({ id: 'Readiness' });
export type Readiness = z.infer<typeof Readiness>;
