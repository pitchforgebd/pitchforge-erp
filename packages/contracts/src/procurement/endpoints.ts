import { z } from 'zod';

import { command, createOne, getOne, listOf, updateOne } from '../endpoint-helpers.ts';
import { defineEndpoints } from '../endpoint.ts';
import { Uuid } from '../shared/primitives.ts';

import {
  Asset,
  AssignAsset,
  CreateAsset,
  CreateDepositGiven,
  CreateDepreciationRun,
  CreateGoodsReceipt,
  CreateLicence,
  CreatePurchaseOrder,
  CreateRequisition,
  CreateVendor,
  DepositGiven,
  DepreciationRun,
  GoodsReceipt,
  Licence,
  PurchaseOrder,
  PurchaseOrderStatus,
  Requisition,
  RequisitionStatus,
  UpdateAsset,
  UpdateLicence,
  UpdatePurchaseOrder,
  UpdateVendor,
  Vendor,
} from './schemas.ts';

const PRC = '/api/v1/procurement';

export const procurementEndpoints = defineEndpoints('procurement', {
  listVendors: listOf(`${PRC}/vendors`, 'Vendor master', ['PRC-01'], Vendor, {
    q: z.string().max(100).optional(),
  }),
  getVendor: getOne(`${PRC}/vendors/{id}`, 'One vendor', ['PRC-01'], Vendor),
  createVendor: createOne(`${PRC}/vendors`, 'Add a vendor', ['PRC-01'], CreateVendor, Vendor),
  updateVendor: {
    ...updateOne(
      `${PRC}/vendors/{id}`,
      'Update a vendor; a bank detail change needs step-up',
      ['PRC-01'],
      UpdateVendor,
      Vendor,
    ),
    stepUp: true,
  },

  listRequisitions: listOf(
    `${PRC}/requisitions`,
    'Purchase requisitions',
    ['PRC-02'],
    Requisition,
    { status: RequisitionStatus.optional() },
  ),
  getRequisition: getOne(`${PRC}/requisitions/{id}`, 'One requisition', ['PRC-02'], Requisition),
  createRequisition: createOne(
    `${PRC}/requisitions`,
    'Draft a requisition',
    ['PRC-02'],
    CreateRequisition,
    Requisition,
  ),
  submitRequisition: command(
    `${PRC}/requisitions/{id}:submit`,
    'Send for approval by amount through core approvals',
    ['PRC-02'],
    Requisition,
  ),

  listPurchaseOrders: listOf(
    `${PRC}/purchase-orders`,
    'Purchase orders',
    ['PRC-04'],
    PurchaseOrder,
    { status: PurchaseOrderStatus.optional(), vendorId: Uuid.optional() },
  ),
  getPurchaseOrder: getOne(`${PRC}/purchase-orders/{id}`, 'One order', ['PRC-04'], PurchaseOrder),
  createPurchaseOrder: createOne(
    `${PRC}/purchase-orders`,
    'Draft a purchase order',
    ['PRC-04'],
    CreatePurchaseOrder,
    PurchaseOrder,
  ),
  updatePurchaseOrder: {
    ...updateOne(
      `${PRC}/purchase-orders/{id}`,
      'Change a draft order',
      ['PRC-04'],
      UpdatePurchaseOrder,
      PurchaseOrder,
    ),
    errors: ['INVALID_STATE'],
  },
  submitPurchaseOrder: command(
    `${PRC}/purchase-orders/{id}:submit`,
    'Send for approval through core approvals',
    ['PRC-04'],
    PurchaseOrder,
  ),
  amendPurchaseOrder: {
    ...command(
      `${PRC}/purchase-orders/{id}:amend`,
      'Reopen an approved order as a new amendment',
      ['PRC-04'],
      PurchaseOrder,
    ),
    status: 201,
  },

  listGoodsReceipts: listOf(
    `${PRC}/goods-receipts`,
    'Goods received notes',
    ['PRC-05'],
    GoodsReceipt,
    { purchaseOrderId: Uuid.optional() },
  ),
  createGoodsReceipt: {
    ...createOne(
      `${PRC}/goods-receipts`,
      'Record goods received',
      ['PRC-05'],
      CreateGoodsReceipt,
      GoodsReceipt,
    ),
    errors: ['INVALID_STATE'],
  },

  listAssets: listOf(`${PRC}/assets`, 'Asset register', ['PRC-11'], Asset, {
    assignedToId: Uuid.optional(),
  }),
  getAsset: getOne(`${PRC}/assets/{id}`, 'One asset', ['PRC-11'], Asset),
  createAsset: createOne(`${PRC}/assets`, 'Add an asset', ['PRC-11'], CreateAsset, Asset),
  updateAsset: updateOne(`${PRC}/assets/{id}`, 'Update an asset', ['PRC-11'], UpdateAsset, Asset),
  assignAsset: {
    ...command(`${PRC}/assets/{id}:assign`, 'Assign an asset to someone', ['PRC-13'], Asset),
    body: AssignAsset,
  },
  returnAsset: command(
    `${PRC}/assets/{id}:mark-returned`,
    'Record an asset’s return',
    ['PRC-13'],
    Asset,
  ),

  listDepreciationRuns: listOf(
    `${PRC}/depreciation-runs`,
    'Monthly depreciation runs',
    ['PRC-12'],
    DepreciationRun,
  ),
  previewDepreciationRun: {
    ...createOne(
      `${PRC}/depreciation-runs`,
      'Calculate a month’s depreciation',
      ['PRC-12'],
      CreateDepreciationRun,
      DepreciationRun,
    ),
    errors: ['PERIOD_LOCKED', 'INVALID_STATE'],
  },
  postDepreciationRun: {
    ...command(
      `${PRC}/depreciation-runs/{id}:post`,
      'Post depreciation to the ledger',
      ['PRC-12'],
      DepreciationRun,
    ),
    movesMoney: true,
    errors: ['PERIOD_LOCKED', 'NOT_BALANCED', 'INVALID_STATE'],
  },

  listLicences: listOf(
    `${PRC}/licences`,
    'Licences, subscriptions and domains with renewals',
    ['PRC-16'],
    Licence,
  ),
  createLicence: createOne(`${PRC}/licences`, 'Add a licence', ['PRC-16'], CreateLicence, Licence),
  updateLicence: updateOne(
    `${PRC}/licences/{id}`,
    'Update a licence or its renewal date',
    ['PRC-16'],
    UpdateLicence,
    Licence,
  ),

  listDepositsGiven: listOf(
    `${PRC}/deposits`,
    'Guarantees and deposits given',
    ['PRC-17'],
    DepositGiven,
  ),
  createDepositGiven: createOne(
    `${PRC}/deposits`,
    'Record a guarantee or deposit given',
    ['PRC-17'],
    CreateDepositGiven,
    DepositGiven,
  ),
});
