import { procurementEndpoints as prc } from '@pitchforge/contracts';

import { bdt, rid } from '../data/core-records.ts';
import { STAFF, employeesFor } from '../data/hr-records.ts';
import {
  DEPOSITS_GIVEN,
  DEPRECIATION_RUNS,
  GOODS_RECEIPTS,
  LICENCES,
  LOCKED_MONTHS,
  NOVEMBER_DEPRECIATION,
  assetsFor,
  buys,
  purchaseOrdersFor,
  readsPurchasing,
  requisitionsFor,
  vendorsFor,
} from '../data/procurement-records.ts';
import type { MockHandler, MockReply } from '../define.ts';
import { actOn, bodyOf, idOf, serveList, serveOne, withViewerAsync } from '../serve.ts';
import type { Viewer } from '../serve.ts';

const vendors = (viewer: Viewer) => vendorsFor(viewer.role);
const requisitions = (viewer: Viewer) => requisitionsFor(viewer.role, viewer.userId);
const orders = (viewer: Viewer) => purchaseOrdersFor(viewer.role);
const assets = (viewer: Viewer) => assetsFor(viewer.role, viewer.userId);
const depreciation = (viewer: Viewer) =>
  readsPurchasing(viewer.role) && viewer.role !== 'pm' ? DEPRECIATION_RUNS : [];
const financeView =
  <T>(rows: readonly T[]) =>
  (viewer: Viewer) =>
    viewer.role === 'partner' || viewer.role === 'finance' ? rows : [];

const CREATED = {
  createdAt: '2026-11-20T05:00:00Z',
  createdBy: STAFF.farhana.id,
  updatedAt: '2026-11-20T05:00:00Z',
  updatedBy: STAFF.farhana.id,
  version: 1,
};

/** Partner-only writes: anyone else is refused. */
const buyerOnly = (viewer: Viewer, reply: () => MockReply | Promise<MockReply>) =>
  buys(viewer.role) ? reply() : ({ problem: 'FORBIDDEN' } as const);

export const procurementRecordHandlers: readonly MockHandler[] = [
  /* Vendors */
  serveList(prc.listVendors, vendors, {
    filters: { q: (row, value) => String(row['name']).toLowerCase().includes(value.toLowerCase()) },
  }),
  serveOne(prc.getVendor, vendors),
  withViewerAsync(prc.createVendor, (viewer, request) =>
    buyerOnly(viewer, async () => {
      const { bankAccountNumber, ...body } = await bodyOf(request);
      const account = typeof bankAccountNumber === 'string' ? bankAccountNumber : null;
      return {
        json: {
          ...body,
          id: rid(3711),
          bankAccount: account === null ? null : `••••••••${account.slice(-4)}`,
          active: true,
          allowedActions: ['update', 'update_bank_details'],
          meta: CREATED,
        },
      };
    }),
  ),
  actOn(prc.updateVendor, vendors, 'update', (row) => ({ json: row }), { stepUp: true }),

  /* Requisitions */
  serveList(prc.listRequisitions, requisitions),
  serveOne(prc.getRequisition, requisitions),
  withViewerAsync(prc.createRequisition, async (viewer, request) => ({
    json: {
      ...(await bodyOf(request)),
      id: rid(9109),
      number: null,
      requestedBy: { id: viewer.userId, name: viewer.name },
      // The server adds the lines up; the sample answers with a fixed estimate.
      estimatedTotal: bdt('24000.00'),
      status: 'draft',
      approvalId: null,
      allowedActions: ['update', 'submit'],
      meta: CREATED,
    },
  })),
  actOn(prc.submitRequisition, requisitions, 'submit', (row) => ({
    json: {
      ...row,
      number: 'REQ-2627-00035',
      status: 'pending_approval',
      approvalId: rid(9193),
      allowedActions: [],
    },
  })),

  /* Purchase orders and receipts */
  serveList(prc.listPurchaseOrders, orders),
  serveOne(prc.getPurchaseOrder, orders),
  withViewerAsync(prc.createPurchaseOrder, (viewer, request) =>
    buyerOnly(viewer, async () => {
      const body = await bodyOf(request);
      const vendor = vendorsFor('partner').find((row) => row.id === body['vendorId']);
      if (vendor === undefined) return { problem: 'VALIDATION' };
      return {
        json: {
          ...body,
          id: rid(9209),
          number: null,
          amendment: 0,
          vendorName: vendor.name,
          total: bdt('18500.00'),
          status: 'draft',
          approvalId: null,
          allowedActions: ['update', 'submit'],
          meta: CREATED,
        },
      };
    }),
  ),
  actOn(prc.updatePurchaseOrder, orders, 'update', (row) => ({ json: row })),
  actOn(prc.submitPurchaseOrder, orders, 'submit', (row) => ({
    json: {
      ...row,
      number: 'PO-2627-00063',
      status: 'pending_approval',
      approvalId: rid(9299),
      allowedActions: [],
    },
  })),
  actOn(prc.amendPurchaseOrder, orders, 'amend', (row) => ({
    json: {
      ...row,
      id: rid(9219),
      amendment: row.amendment + 1,
      status: 'draft',
      approvalId: null,
      allowedActions: ['update', 'submit'],
    },
  })),
  serveList(prc.listGoodsReceipts, financeView(GOODS_RECEIPTS)),
  withViewerAsync(prc.createGoodsReceipt, (viewer, request) =>
    buyerOnly(viewer, async () => {
      const body = await bodyOf(request);
      const order = orders(viewer).find((row) => row.id === body['purchaseOrderId']);
      if (order === undefined) return { problem: 'VALIDATION' };
      // Only an approved order can be received against.
      if (!order.allowedActions.includes('receive')) return { problem: 'INVALID_STATE' };
      return {
        json: {
          id: rid(9309),
          number: 'GRN-2627-00042',
          purchaseOrderId: order.id,
          receivedOn: body['receivedOn'],
          receivedBy: STAFF.farhana,
          lines: body['lines'],
          meta: CREATED,
        },
      };
    }),
  ),

  /* Assets */
  serveList(prc.listAssets, assets),
  serveOne(prc.getAsset, assets),
  withViewerAsync(prc.createAsset, (viewer, request) =>
    buyerOnly(viewer, async () => {
      const body = await bodyOf(request);
      return {
        json: {
          ...body,
          id: rid(9409),
          bookValue: body['cost'],
          assignedTo: null,
          status: 'in_store',
          allowedActions: ['update', 'assign'],
          meta: CREATED,
        },
      };
    }),
  ),
  actOn(prc.updateAsset, assets, 'update', (row) => ({ json: row })),
  actOn(prc.assignAsset, assets, 'assign', (row, body) => {
    const person = employeesFor('partner').find((item) => item.id === body['employeeId']);
    return person === undefined
      ? { problem: 'VALIDATION' }
      : {
          json: {
            ...row,
            assignedTo: { id: person.id, name: person.name },
            status: 'assigned',
            allowedActions: ['update', 'return'],
          },
        };
  }),
  actOn(prc.returnAsset, assets, 'return', (row) => ({
    json: { ...row, assignedTo: null, status: 'in_store', allowedActions: ['update', 'assign'] },
  })),

  /* Depreciation */
  serveList(prc.listDepreciationRuns, depreciation),
  withViewerAsync(prc.previewDepreciationRun, (viewer, request) =>
    buyerOnly(viewer, async () => {
      const month = String((await bodyOf(request))['month']);
      if (LOCKED_MONTHS.has(month)) return { problem: 'PERIOD_LOCKED' };
      if (DEPRECIATION_RUNS.some((row) => row.month === month)) return { problem: 'INVALID_STATE' };
      return { json: { ...NOVEMBER_DEPRECIATION, month } };
    }),
  ),
  withViewerAsync(prc.postDepreciationRun, (viewer, request) =>
    buyerOnly(viewer, () => {
      if (idOf(request) !== NOVEMBER_DEPRECIATION.id) return { problem: 'NOT_FOUND' };
      return {
        json: {
          ...NOVEMBER_DEPRECIATION,
          status: 'posted',
          journalEntryNo: 'JE-2627-00464',
          allowedActions: [],
        },
      };
    }),
  ),

  /* Renewals and deposits */
  serveList(prc.listLicences, financeView(LICENCES)),
  withViewerAsync(prc.createLicence, (viewer, request) =>
    buyerOnly(viewer, async () => ({
      json: { ...(await bodyOf(request)), id: rid(9609), meta: CREATED },
    })),
  ),
  withViewerAsync(prc.updateLicence, (viewer, request) =>
    buyerOnly(viewer, async () => {
      const row = LICENCES.find((item) => item.id === idOf(request));
      return row === undefined
        ? { problem: 'NOT_FOUND' }
        : { json: { ...row, ...(await bodyOf(request)) } };
    }),
  ),
  serveList(prc.listDepositsGiven, financeView(DEPOSITS_GIVEN)),
  withViewerAsync(prc.createDepositGiven, (viewer, request) =>
    buyerOnly(viewer, async () => ({
      json: { ...(await bodyOf(request)), id: rid(9659), status: 'active', meta: CREATED },
    })),
  ),
];
