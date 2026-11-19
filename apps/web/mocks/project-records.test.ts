import { setupServer } from 'msw/node';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { Problem } from '@pitchforge/contracts';

import { PROJECT_IDS } from './data/accounting-records.ts';
import { CURRENT_TIMESHEET_ID, taskId } from './data/project-records.ts';
import type { SampleRole } from './data/sample-company.ts';
import { mockHandlers } from './server.ts';
import { SESSION_COOKIE } from './session.ts';

const server = setupServer(...mockHandlers([]));
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' });
});
afterAll(() => {
  server.close();
});

const API = 'http://localhost:4000/api/v1/projects';
const headers = (role: SampleRole) => ({
  cookie: `${SESSION_COOKIE}=${role}`,
  'content-type': 'application/json',
});
const get = (role: SampleRole, url: string) => fetch(`${API}${url}`, { headers: headers(role) });
const send = (role: SampleRole, method: string, url: string, body: unknown = {}) =>
  fetch(`${API}${url}`, { method, headers: headers(role), body: JSON.stringify(body) });
const codeOf = async (response: Response) => Problem.parse(await response.json()).code;
const codesOf = async (response: Response) =>
  ((await response.json()) as { items: { code: string }[] }).items.map((item) => item.code);

const LOANS = PROJECT_IDS['PF-2601'];
const AMC = PROJECT_IDS['PF-2603'];

describe('who sees which project', () => {
  it('a partner sees all five', async () => {
    expect(await codesOf(await get('partner', '/projects'))).toHaveLength(5);
  });

  it('a project manager sees the projects they manage', async () => {
    expect(await codesOf(await get('pm', '/projects'))).toEqual(['PF-2601', 'PF-2602', 'PF-2605']);
  });

  it('an employee sees the projects they are staffed on', async () => {
    expect(await codesOf(await get('employee', '/projects'))).toEqual(['PF-2601', 'PF-2604']);
  });
});

describe('project money', () => {
  it('reaches the project’s manager', async () => {
    expect((await get('pm', `/projects/${LOANS}/overview`)).status).toBe(200);
  });

  it('is refused to an employee on their own project', async () => {
    expect(await codeOf(await get('employee', `/projects/${LOANS}/overview`))).toBe('FORBIDDEN');
    expect(await codeOf(await get('employee', `/projects/${LOANS}/profit-and-loss`))).toBe(
      'FORBIDDEN',
    );
  });

  it('is not found for a project the viewer is not on', async () => {
    expect(await codeOf(await get('pm', `/projects/${AMC}/overview`))).toBe('NOT_FOUND');
  });

  it('billing rates reach finance, never a project manager', async () => {
    const finance = (await (await get('finance', `/projects/${LOANS}/team`)).json()) as {
      items: Record<string, unknown>[];
    };
    const pm = (await (await get('pm', `/projects/${LOANS}/team`)).json()) as {
      items: Record<string, unknown>[];
    };
    expect(finance.items[0]).toHaveProperty('billingRate');
    expect(pm.items[0]).not.toHaveProperty('billingRate');
  });
});

describe('milestones and tasks', () => {
  it('only the manager may sign off a delivered milestone', async () => {
    const list = (await (await get('pm', `/projects/${LOANS}/milestones`)).json()) as {
      items: { id: string; status: string; allowedActions: string[] }[];
    };
    const delivered = list.items.find((item) => item.status === 'delivered');
    expect(delivered?.allowedActions).toContain('sign_off');
    const signed = await send('pm', 'POST', `/milestones/${delivered?.id ?? ''}:sign-off`);
    expect(await signed.json()).toMatchObject({ status: 'signed_off' });
    expect(
      await codeOf(await send('employee', 'POST', `/milestones/${delivered?.id ?? ''}:sign-off`)),
    ).toBe('FORBIDDEN');
  });

  it('moving a task on the board returns it with the new status', async () => {
    const moved = await send('employee', 'PATCH', `/tasks/${taskId(41)}`, {
      status: 'in_progress',
    });
    expect(await moved.json()).toMatchObject({ status: 'in_progress' });
  });

  it('filters tasks by assignee', async () => {
    const arif = '0190f2a4-7c3b-7d2e-8f00-000000000004';
    const tasks = (await (
      await get('pm', `/projects/${LOANS}/tasks?assigneeId=${arif}`)
    ).json()) as {
      items: { title: string }[];
    };
    expect(tasks.items).toHaveLength(2);
  });
});

describe('timesheets', () => {
  it('an employee sees only their own', async () => {
    const sheets = (await (await get('employee', '/timesheets')).json()) as {
      items: { employee: { name: string } }[];
    };
    expect(sheets.items.every((sheet) => sheet.employee.name === 'Arif Hossain')).toBe(true);
  });

  it('only the owner submits a draft', async () => {
    expect(
      await codeOf(await send('pm', 'POST', `/timesheets/${CURRENT_TIMESHEET_ID}:submit`)),
    ).toBe('FORBIDDEN');
    const submitted = await send('employee', 'POST', `/timesheets/${CURRENT_TIMESHEET_ID}:submit`);
    expect(await submitted.json()).toMatchObject({ status: 'pending_approval' });
  });
});
