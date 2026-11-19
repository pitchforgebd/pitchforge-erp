import { crmEndpoints as crm } from '@pitchforge/contracts';

import { rid } from '../data/core-records.ts';
import {
  ACTIVITIES,
  CHECKLISTS,
  CONTACTS,
  FORECAST,
  STAGES,
  STANDARD_DOCUMENTS,
  clientOverviewFor,
  clientsFor,
  contractsFor,
  guaranteesFor,
  leadsFor,
  opportunitiesFor,
  quotationsFor,
  readsSales,
  tendersFor,
} from '../data/crm-records.ts';
import { mock } from '../define.ts';
import type { MockHandler, MockReply, MockRequest } from '../define.ts';
import { idOf, parentIdOf, serveList, serveOne, viewerOf } from '../serve.ts';
import type { Viewer } from '../serve.ts';

const salesOnly =
  <T>(rows: readonly T[]) =>
  (viewer: Viewer) =>
    readsSales(viewer.role) ? rows : [];

async function withViewer(
  request: MockRequest,
  reply: (viewer: Viewer) => MockReply | Promise<MockReply>,
): Promise<MockReply> {
  const viewer = viewerOf(request);
  if (viewer === undefined) return { problem: 'UNAUTHENTICATED' };
  if (!readsSales(viewer.role)) return { problem: 'FORBIDDEN' };
  return reply(viewer);
}

/** A command on a record the viewer may act on; the outcome is fixed or the request echoed. */
function act<T extends { readonly id: string; readonly allowedActions: readonly string[] }>(
  request: MockRequest,
  rows: (viewer: Viewer) => readonly T[],
  action: string,
  outcome: (row: T, body: Record<string, unknown>) => MockReply,
) {
  return withViewer(request, async (viewer) => {
    const row = rows(viewer).find((candidate) => candidate.id === idOf(request));
    if (row === undefined) return { problem: 'NOT_FOUND' };
    if (!row.allowedActions.includes(action)) return { problem: 'FORBIDDEN' };
    const text = await request.request.text();
    return outcome(row, text === '' ? {} : (JSON.parse(text) as Record<string, unknown>));
  });
}

const quotations = (viewer: Viewer) => quotationsFor(viewer.role);
const deals = (viewer: Viewer) => opportunitiesFor(viewer.role);
const tenders = (viewer: Viewer) => tendersFor(viewer.role);

export const crmRecordHandlers: readonly MockHandler[] = [
  serveList(crm.listLeads, (viewer) => leadsFor(viewer.role)),
  serveOne(crm.getLead, (viewer) => leadsFor(viewer.role)),
  mock(crm.convertLead, (request) =>
    act(
      request,
      (viewer) => leadsFor(viewer.role),
      'convert',
      (lead) => ({
        json: {
          id: rid(2108),
          name: lead.name,
          tin: null,
          bin: null,
          paymentTermsDays: 30,
          creditLimit: null,
          active: true,
          allowedActions: ['update', 'deactivate'],
          meta: lead.meta,
        },
      }),
    ),
  ),

  serveList(crm.listClients, (viewer) => clientsFor(viewer.role)),
  serveOne(crm.getClient, (viewer) => clientsFor(viewer.role)),
  mock(crm.getClientOverview, (request) =>
    withViewer(request, (viewer) => {
      const overview = clientOverviewFor(viewer.role, parentIdOf(request));
      return overview === undefined ? { problem: 'NOT_FOUND' } : { json: overview };
    }),
  ),
  mock(crm.listClientContacts, (request) =>
    withViewer(request, () => ({
      json: { items: CONTACTS.filter((item) => item.clientId === parentIdOf(request)) },
    })),
  ),
  serveList(crm.listActivities, salesOnly(ACTIVITIES)),

  mock(crm.listPipelineStages, (request) =>
    withViewer(request, () => ({ json: { items: STAGES } })),
  ),
  serveList(crm.listOpportunities, (viewer) => opportunitiesFor(viewer.role)),
  serveOne(crm.getOpportunity, (viewer) => opportunitiesFor(viewer.role)),
  mock(crm.moveOpportunity, (request) =>
    act(request, deals, 'move', (deal, body) => {
      const stage = STAGES.find((item) => item.id === body['stageId']);
      if (stage === undefined) return { problem: 'VALIDATION' };
      // The stage's probability comes with the stage, as the server would set it.
      return { json: { ...deal, stageId: stage.id, probabilityPercent: stage.probabilityPercent } };
    }),
  ),
  mock(crm.winOpportunity, (request) =>
    act(request, deals, 'win', (deal) => ({
      json: {
        ...deal,
        status: 'won',
        stageId: STAGES.at(-1)?.id ?? deal.stageId,
        probabilityPercent: '100',
        projectId: rid(2006),
        allowedActions: [],
      },
    })),
  ),
  mock(crm.loseOpportunity, (request) =>
    act(request, deals, 'lose', (deal, body) => ({
      json: {
        ...deal,
        status: 'lost',
        lostReason: typeof body['reason'] === 'string' ? body['reason'] : null,
        competitor: typeof body['competitor'] === 'string' ? body['competitor'] : null,
        allowedActions: [],
      },
    })),
  ),
  mock(crm.getSalesForecast, (request) => withViewer(request, () => ({ json: FORECAST }))),

  serveList(crm.listQuotations, (viewer) => quotationsFor(viewer.role)),
  serveOne(crm.getQuotation, (viewer) => quotationsFor(viewer.role)),
  mock(crm.submitQuotation, (request) =>
    act(request, quotations, 'submit', (quote) => ({
      json: { ...quote, number: 'QUO-2627-00033', status: 'approved', allowedActions: ['send'] },
    })),
  ),
  mock(crm.sendQuotation, (request) =>
    act(request, quotations, 'send', (quote) => ({
      json: { ...quote, status: 'sent', allowedActions: ['accept', 'new_version'] },
    })),
  ),
  mock(crm.acceptQuotation, (request) =>
    act(request, quotations, 'accept', (quote) => ({
      json: { ...quote, status: 'accepted', allowedActions: [] },
    })),
  ),
  mock(crm.newQuotationVersion, (request) =>
    act(request, quotations, 'new_version', (quote) => ({
      json: {
        ...quote,
        id: rid(7599),
        revision: quote.revision + 1,
        status: 'draft',
        allowedActions: ['update', 'submit'],
      },
    })),
  ),

  serveList(crm.listContracts, (viewer) => contractsFor(viewer.role)),
  serveOne(crm.getContract, (viewer) => contractsFor(viewer.role)),

  serveList(crm.listTenders, (viewer) => tendersFor(viewer.role)),
  serveOne(crm.getTender, (viewer) => tendersFor(viewer.role)),
  mock(crm.recordTenderOutcome, (request) =>
    act(request, tenders, 'record_outcome', (tender, body) => ({
      json: {
        ...tender,
        ...body,
        status: body['result'],
        allowedActions: body['result'] === 'won' ? ['award'] : [],
      },
    })),
  ),
  mock(crm.awardTender, (request) =>
    act(request, tenders, 'award', (tender) => ({
      json: { ...tender, contractId: rid(7606), allowedActions: [] },
    })),
  ),
  mock(crm.getTenderChecklist, (request) =>
    withViewer(request, () => ({ json: { items: CHECKLISTS.get(parentIdOf(request)) ?? [] } })),
  ),
  serveList(crm.listStandardDocuments, salesOnly(STANDARD_DOCUMENTS)),
  serveList(crm.listGuarantees, (viewer) => guaranteesFor(viewer.role)),
  serveOne(crm.getGuarantee, (viewer) => guaranteesFor(viewer.role)),
  mock(crm.releaseGuarantee, (request) =>
    act(
      request,
      (viewer) => guaranteesFor(viewer.role),
      'release',
      (guarantee) => ({ json: { ...guarantee, status: 'released', allowedActions: [] } }),
    ),
  ),
];
