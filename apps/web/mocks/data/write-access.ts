/**
 * Who may call each write endpoint that has no hand-written mock, from
 * docs/04-security/access-control-matrix.md. The generated handlers refuse everyone else, and
 * a write missing from this table is refused for everyone: deny by default. Record scope (only
 * your own timesheet, only your team) is the real API's job; the samples check the role only.
 */
import type { SampleRole } from './sample-company.ts';

const EVERYONE: readonly SampleRole[] = ['partner', 'finance', 'pm', 'employee'];
const PARTNER: readonly SampleRole[] = ['partner'];
const BOOKS: readonly SampleRole[] = ['partner', 'finance'];
const MANAGERS: readonly SampleRole[] = ['partner', 'pm'];

export const WRITE_ACCESS: ReadonlyMap<string, readonly SampleRole[]> = new Map([
  /* Your own account, notifications, files and exports. */
  ['core.changePassword', EVERYONE],
  ['core.revokeMySession', EVERYONE],
  ['core.markAllNotificationsRead', EVERYONE],
  ['core.updateNotificationPreferences', EVERYONE],
  ['core.createUpload', EVERYONE],
  ['core.completeUpload', EVERYONE],
  ['core.createDownload', EVERYONE],
  ['core.startExport', EVERYONE],
  ['core.renderDocument', EVERYONE],

  /* Settings and people: Partners. Contacts and imports: the books. */
  ['core.updateCompany', PARTNER],
  ['core.createOrgUnit', PARTNER],
  ['core.updateOrgUnit', PARTNER],
  ['core.createHoliday', PARTNER],
  ['core.deleteHoliday', PARTNER],
  ['core.inviteUser', PARTNER],
  ['core.assignUserRoles', PARTNER],
  ['core.deactivateUser', PARTNER],
  ['core.forceSignOut', PARTNER],
  ['core.createRole', PARTNER],
  ['core.updateRole', PARTNER],
  ['core.cloneRole', PARTNER],
  ['core.createApprovalRule', PARTNER],
  ['core.updateApprovalRule', PARTNER],
  ['core.updateReminderRule', PARTNER],
  ['core.createContact', BOOKS],
  ['core.updateContact', BOOKS],
  ['core.startImport', BOOKS],
  ['core.commitImport', BOOKS],

  /* Accounting: Partners and finance. Anyone claims expenses and asks for an advance. */
  ['accounting.createAccount', BOOKS],
  ['accounting.updateAccount', BOOKS],
  ['accounting.updateCloseChecklist', BOOKS],
  ['accounting.closeFiscalYear', PARTNER],
  ['accounting.updateManualJournal', BOOKS],
  ['accounting.createPostingRuleVersion', PARTNER],
  ['accounting.updateVendorBill', BOOKS],
  ['accounting.updatePaymentRun', BOOKS],
  ['accounting.createExpenseClaim', EVERYONE],
  ['accounting.submitExpenseClaim', EVERYONE],
  ['accounting.payExpenseClaim', BOOKS],
  ['accounting.createEmployeeAdvance', EVERYONE],
  ['accounting.payEmployeeAdvance', BOOKS],
  ['accounting.settleEmployeeAdvance', BOOKS],
  ['accounting.createBankAccount', BOOKS],
  ['accounting.updateBankAccount', BOOKS],
  ['accounting.createTransfer', BOOKS],
  ['accounting.importBankStatement', BOOKS],
  ['accounting.createCheque', BOOKS],
  ['accounting.setChequeStatus', BOOKS],
  ['accounting.createExchangeRate', BOOKS],
  ['accounting.createTaxCode', PARTNER],
  ['accounting.createWithholdingRule', PARTNER],
  ['accounting.createWithholdingCertificate', BOOKS],
  ['accounting.createChallan', BOOKS],

  /* Partner capital: Partners and finance record; only Partners change the register. */
  ['partners.createPartner', PARTNER],
  ['partners.updatePartner', PARTNER],
  ['partners.createEquityVersion', PARTNER],
  ['partners.createPartnerTransaction', BOOKS],
  ['partners.updatePartnerTransaction', BOOKS],
  ['partners.reverseDistributionRun', PARTNER],

  /* Sales: Partners (the sample company has no sales role). */
  ['crm.createLead', PARTNER],
  ['crm.updateLead', PARTNER],
  ['crm.createClient', PARTNER],
  ['crm.updateClient', PARTNER],
  ['crm.addClientContact', PARTNER],
  ['crm.createActivity', PARTNER],
  ['crm.replacePipelineStages', PARTNER],
  ['crm.createOpportunity', PARTNER],
  ['crm.updateOpportunity', PARTNER],
  ['crm.createQuotation', PARTNER],
  ['crm.updateQuotation', PARTNER],
  ['crm.createContract', PARTNER],
  ['crm.updateContract', PARTNER],
  ['crm.createTender', PARTNER],
  ['crm.updateTender', PARTNER],
  ['crm.replaceTenderChecklist', PARTNER],
  ['crm.createStandardDocument', PARTNER],
  ['crm.createGuarantee', PARTNER],

  /* Billing: Partners and finance. */
  ['billing.createInvoice', BOOKS],
  ['billing.updateInvoice', BOOKS],
  ['billing.createCreditNote', BOOKS],

  /* Projects: Partners run them, managers their own; everyone keeps a timesheet. */
  ['projects.createProject', PARTNER],
  ['projects.updateProject', MANAGERS],
  ['projects.setProjectStatus', MANAGERS],
  ['projects.replaceProjectTeam', MANAGERS],
  ['projects.createBudgetVersion', MANAGERS],
  ['projects.createMilestone', MANAGERS],
  ['projects.createTimesheet', EVERYONE],
  ['projects.updateTimesheet', EVERYONE],
  ['projects.createFeeAgreement', BOOKS],

  /* HR rules: Partners act as HR in the samples. */
  ['hr.createShift', PARTNER],
  ['hr.updateShift', PARTNER],
  ['hr.createLeaveTypeVersion', PARTNER],
]);
