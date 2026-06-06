const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Simulates real API latency with slight variance
const jitter = (base: number) => base + Math.random() * 200;

// --- Dashboard APIs (Tab 1: @eventiq/react) ---

export async function fetchCurrentUser() {
  await delay(jitter(300));
  return { id: 'usr_1', name: 'Sarah Chen', role: 'admin', storeId: 'store_42' };
}

export async function fetchStoreConfig(storeId: string) {
  await delay(jitter(200));
  return { id: storeId, currency: 'USD', timezone: 'America/New_York', features: ['analytics', 'inventory'] };
}

export async function fetchTodayOrders(storeId: string) {
  await delay(jitter(400));
  return {
    total: 47,
    revenue: 3842.5,
    pending: 5,
    items: [
      { id: 'ord_1', customer: 'Alex M.', total: 89.99, status: 'shipped' },
      { id: 'ord_2', customer: 'Jordan K.', total: 124.0, status: 'processing' },
      { id: 'ord_3', customer: 'Taylor R.', total: 45.5, status: 'pending' },
    ],
  };
}

export async function fetchInventoryAlerts(storeId: string) {
  await delay(jitter(350));
  return [
    { sku: 'SKU-001', name: 'Wireless Headphones', stock: 3, threshold: 10 },
    { sku: 'SKU-044', name: 'USB-C Cable 2m', stock: 7, threshold: 25 },
  ];
}

export async function fetchNotifications(userId: string) {
  await delay(jitter(250));
  return [
    { id: 'n1', message: 'New return request #4421', time: '5m ago' },
    { id: 'n2', message: 'Inventory alert: 2 items low stock', time: '12m ago' },
  ];
}

// --- Checkout APIs (Tab 2: @eventiq/redux) ---

export async function validateInventory(items: { sku: string; qty: number }[]) {
  await delay(jitter(500));
  return { valid: true, reserved: items.map((i) => i.sku) };
}

export async function calculateShipping(address: string) {
  await delay(jitter(400));
  return { method: 'Standard', cost: 5.99, eta: '3-5 business days' };
}

export async function applyDiscount(code: string) {
  await delay(jitter(300));
  if (code === 'SAVE20') return { valid: true, percent: 20 };
  return { valid: false, percent: 0 };
}

export async function processPayment(amount: number) {
  await delay(jitter(800));
  return { transactionId: 'txn_' + Math.random().toString(36).slice(2, 10), status: 'captured' };
}

export async function createOrder(transactionId: string) {
  await delay(jitter(400));
  return { orderId: 'ORD-' + Math.random().toString(36).slice(2, 8).toUpperCase(), confirmedAt: Date.now() };
}

export async function sendConfirmationEmail(orderId: string) {
  await delay(jitter(300));
  return { sent: true };
}

// --- Analytics APIs (Tab 3: @eventiq/react-query) ---

export async function fetchRevenueTimeseries(storeId: string) {
  await delay(jitter(600));
  return Array.from({ length: 7 }, (_, i) => ({
    date: new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10),
    revenue: Math.round(2000 + Math.random() * 3000),
  }));
}

export async function fetchTopProducts(storeId: string) {
  await delay(jitter(500));
  return [
    { name: 'Wireless Headphones', units: 124, revenue: 11159.76 },
    { name: 'Phone Case Pro', units: 98, revenue: 2940.0 },
    { name: 'USB-C Hub', units: 67, revenue: 4690.0 },
    { name: 'Laptop Stand', units: 45, revenue: 3150.0 },
  ];
}

export async function fetchCustomerSegments(storeId: string) {
  await delay(jitter(450));
  return [
    { segment: 'Returning', count: 342, avgOrderValue: 78.5 },
    { segment: 'New', count: 156, avgOrderValue: 52.3 },
    { segment: 'VIP', count: 28, avgOrderValue: 245.0 },
  ];
}

export async function fetchConversionFunnel(storeId: string) {
  await delay(jitter(550));
  return { visitors: 12400, addedToCart: 3100, checkout: 1240, purchased: 890 };
}
