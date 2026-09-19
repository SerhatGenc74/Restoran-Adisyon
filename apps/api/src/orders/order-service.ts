/**
 * Compatibility facade for callers that used the old service module.
 * New code should receive OrderUseCases from the application composition.
 */
import { application } from "../composition.js";

export { OrderBusinessError } from "../application/orders/order-use-cases.js";

export const createOrder = application.orders.createOrder.bind(application.orders);
export const getOrder = application.orders.getOrder.bind(application.orders);
export const addOrderItem = application.orders.addOrderItem.bind(application.orders);
export const updateOrderItem = application.orders.updateOrderItem.bind(application.orders);
export const cancelOrderItem = application.orders.cancelOrderItem.bind(application.orders);
export const transitionOrderItem = application.orders.transitionOrderItem.bind(application.orders);
