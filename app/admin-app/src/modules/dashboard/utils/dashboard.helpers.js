/**
 * Calculate total sales from orders list
 */
export const calculateTotalSales = (orders = []) => {
  return orders.reduce((acc, order) => {
    return acc + (order.total || 0);
  }, 0);
};

/**
 * Get pending orders only
 */
export const getPendingOrders = (orders = []) => {
  return orders.filter((order) => order.status === "Pending");
};

/**
 * Get cancelled orders only
 */
export const getCancelledOrders = (orders = []) => {
  return orders.filter((order) => order.status === "Cancelled");
};

/**
 * Get approved orders only
 */
export const getApprovedOrders = (orders = []) => {
  return orders.filter((order) => order.status === "Approved");
};

/**
 * Get orders waiting for payment
 */
export const getPendingPaymentOrders = (orders = []) => {
  return orders.filter(
    (order) => order.payment_status === "Pending"
  );
};

/**
 * Search order by serial
 */
export const searchOrdersBySerial = (
  orders = [],
  serial = ""
) => {
  if (!serial.trim()) return orders;

  return orders.filter((order) =>
    order.serial
      ?.toString()
      .toLowerCase()
      .includes(serial.toLowerCase())
  );
};

/**
 * Filter orders by order type
 */
export const filterOrdersByType = (
  orders = [],
  orderType = ""
) => {
  if (!orderType) return orders;

  return orders.filter(
    (order) => order.orderType === orderType
  );
};

/**
 * Paginate orders list
 */
export const paginateOrders = (
  orders = [],
  start = 0,
  limit = 10
) => {
  return orders.slice(start, start + limit);
};

/**
 * Calculate registers total balance
 */
export const calculateRegistersBalance = (
  registers = []
) => {
  return registers.reduce((acc, register) => {
    return acc + (register.balance || 0);
  }, 0);
};

/**
 * Format currency
 */
export const formatCurrency = (value = 0) => {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(value);
};