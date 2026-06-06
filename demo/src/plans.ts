import { EventiqEngine } from '@eventiq/core';
import type { ExecutionPlan } from '@eventiq/core';

// --- Tab 1: Dashboard page load (5 steps, 3 levels deep) ---

export type DashboardStep =
  | 'fetch-user'
  | 'fetch-config'
  | 'fetch-orders'
  | 'fetch-inventory'
  | 'fetch-notifications';

export const dashboardPlan: ExecutionPlan<'dashboard', DashboardStep> = {
  name: 'dashboard',
  steps: [
    { name: 'fetch-user', needs: [] },
    { name: 'fetch-config', needs: ['fetch-user'] },
    { name: 'fetch-orders', needs: ['fetch-config'] },
    { name: 'fetch-inventory', needs: ['fetch-config'] },
    { name: 'fetch-notifications', needs: ['fetch-user'] },
  ],
};

// --- Tab 2: Checkout workflow (6 steps, payment depends on shipping + discount) ---

export type CheckoutStep =
  | 'validate-inventory'
  | 'calculate-shipping'
  | 'apply-discount'
  | 'process-payment'
  | 'create-order'
  | 'send-confirmation';

export const checkoutPlan: ExecutionPlan<'checkout', CheckoutStep> = {
  name: 'checkout',
  steps: [
    { name: 'validate-inventory', needs: [] },
    { name: 'calculate-shipping', needs: ['validate-inventory'] },
    { name: 'apply-discount', needs: ['validate-inventory'] },
    { name: 'process-payment', needs: ['calculate-shipping', 'apply-discount'] },
    { name: 'create-order', needs: ['process-payment'] },
    { name: 'send-confirmation', needs: ['create-order'] },
  ],
};

// --- Tab 3: Analytics load (4 steps, all depend on a session/store context) ---

export type AnalyticsStep =
  | 'fetch-revenue'
  | 'fetch-top-products'
  | 'fetch-segments'
  | 'fetch-funnel';

export const analyticsPlan: ExecutionPlan<'analytics', AnalyticsStep> = {
  name: 'analytics',
  steps: [
    { name: 'fetch-revenue', needs: [] },
    { name: 'fetch-top-products', needs: [] },
    { name: 'fetch-segments', needs: [] },
    { name: 'fetch-funnel', needs: ['fetch-revenue'] },
  ],
};

// Engine factories (fresh instance per run)
export function createDashboardEngine() {
  return new EventiqEngine<'dashboard', DashboardStep>();
}

export function createCheckoutEngine() {
  return new EventiqEngine<'checkout', CheckoutStep>();
}

export function createAnalyticsEngine() {
  return new EventiqEngine<'analytics', AnalyticsStep>();
}
