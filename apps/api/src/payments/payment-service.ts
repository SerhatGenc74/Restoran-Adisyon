/** Compatibility facade for the pre-architecture payment service imports. */
import { application } from "../composition.js";

export { PaymentBusinessError } from "../application/payments/payment-use-cases.js";

export const completePayment = application.payments.completePayment.bind(application.payments);
export const listOrderPayments = application.payments.listOrderPayments.bind(application.payments);
