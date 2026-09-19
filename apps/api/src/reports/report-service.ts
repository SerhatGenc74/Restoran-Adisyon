/** Compatibility facade for the pre-architecture report service imports. */
import { application } from "../composition.js";

export { ReportBusinessError } from "../application/reports/report-use-cases.js";

export const aggregateDailyReport = application.reports.aggregateDailyReport.bind(application.reports);
