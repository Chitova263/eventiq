import { useState, useEffect } from 'react';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { EventiqEngine } from '@eventiq/core';
import { createEventiqRedux } from '@eventiq/redux';
import { checkoutPlan } from '../plans';
import type { CheckoutStep } from '../plans';
import * as api from '../api';

// --- Store setup ---

type CheckoutState = {
  shipping: { method: string; cost: number; eta: string } | null;
  discount: { valid: boolean; percent: number } | null;
  transaction: { transactionId: string } | null;
  order: { orderId: string } | null;
  emailSent: boolean;
};

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState: {
    shipping: null, discount: null, transaction: null, order: null, emailSent: false,
  } as CheckoutState,
  reducers: {
    setShipping(state, a) { state.shipping = a.payload; },
    setDiscount(state, a) { state.discount = a.payload; },
    setTransaction(state, a) { state.transaction = a.payload; },
    setOrder(state, a) { state.order = a.payload; },
    setEmailSent(state) { state.emailSent = true; },
  },
});

function createCheckoutStore() {
  const engine = new EventiqEngine<'checkout', CheckoutStep>();
  const eventiq = createEventiqRedux(engine);

  const store = configureStore({
    reducer: { eventiq: eventiq.reducer, checkout: checkoutSlice.reducer },
    middleware: (gDM) => gDM({ serializableCheck: false }).prepend(eventiq.listener.middleware),
  });

  eventiq.syncToStore(store.dispatch);

  // Wire step side effects
  engine.onStepStarted('validate-inventory', async () => {
    await api.validateInventory([{ sku: 'SKU-001', qty: 1 }]);
    engine.complete('validate-inventory', 'SUCCESS');
  });
  engine.onStepStarted('calculate-shipping', async () => {
    const res = await api.calculateShipping('123 Main St');
    store.dispatch(checkoutSlice.actions.setShipping(res));
    engine.complete('calculate-shipping', 'SUCCESS');
  });
  engine.onStepStarted('apply-discount', async () => {
    const res = await api.applyDiscount('SAVE20');
    store.dispatch(checkoutSlice.actions.setDiscount(res));
    engine.complete('apply-discount', 'SUCCESS');
  });
  engine.onStepStarted('process-payment', async () => {
    const res = await api.processPayment(89.99);
    store.dispatch(checkoutSlice.actions.setTransaction(res));
    engine.complete('process-payment', 'SUCCESS');
  });
  engine.onStepStarted('create-order', async () => {
    const txn = store.getState().checkout.transaction!;
    const res = await api.createOrder(txn.transactionId);
    store.dispatch(checkoutSlice.actions.setOrder(res));
    engine.complete('create-order', 'SUCCESS');
  });
  engine.onStepStarted('send-confirmation', async () => {
    const ord = store.getState().checkout.order!;
    await api.sendConfirmationEmail(ord.orderId);
    store.dispatch(checkoutSlice.actions.setEmailSent());
    engine.complete('send-confirmation', 'SUCCESS');
  });

  return { store, engine, eventiq };
}

// --- Components ---

const STEP_LABELS: Record<CheckoutStep, string> = {
  'validate-inventory': 'Validate inventory',
  'calculate-shipping': 'Calculate shipping',
  'apply-discount': 'Apply discount code',
  'process-payment': 'Process payment',
  'create-order': 'Create order',
  'send-confirmation': 'Send confirmation email',
};

function CheckoutInner({ engine, eventiq }: { engine: ReturnType<typeof createCheckoutStore>['engine']; eventiq: ReturnType<typeof createCheckoutStore>['eventiq'] }) {
  const dispatch = useDispatch();
  const steps = useSelector((s: any) => s.eventiq.queue[0]?.steps ?? []);
  const checkout = useSelector((s: any) => s.checkout) as CheckoutState;
  const [started, setStarted] = useState(false);

  const run = () => {
    setStarted(true);
    dispatch(eventiq.actions.planSubmitted(checkoutPlan));
  };

  const allDone = steps.length > 0 && steps.every((s: any) => s.status === 'COMPLETE');

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>@eventiq/redux</h2>
        <p className="tab-desc">
          Checkout workflow. Shipping and discount calculate in parallel after inventory validation.
          Payment waits for both before charging.
        </p>
        {!started && <button className="btn-run" onClick={run}>Start Checkout</button>}
      </div>

      {steps.length > 0 && (
        <div className="step-list">
          {steps.map((step: any) => (
            <div key={step.id} className={`step-row step-${step.status.toLowerCase()}`}>
              <span className="step-status">{statusIcon(step.status)}</span>
              <span className="step-name">{STEP_LABELS[step.name as CheckoutStep]}</span>
              <span className="step-badge">{step.status}</span>
            </div>
          ))}
        </div>
      )}

      {allDone && checkout.order && (
        <div className="result-panel">
          <h3>Order Confirmed</h3>
          <div className="result-grid">
            <div className="result-card">
              <div className="result-value">{checkout.order.orderId}</div>
              <div className="result-label">Order ID</div>
            </div>
            <div className="result-card">
              <div className="result-value">{checkout.shipping?.method}</div>
              <div className="result-label">{checkout.shipping?.eta}</div>
            </div>
            <div className="result-card">
              <div className="result-value">{checkout.discount?.percent}% off</div>
              <div className="result-label">Discount applied</div>
            </div>
            <div className="result-card">
              <div className="result-value">{checkout.emailSent ? '✓' : '...'}</div>
              <div className="result-label">Email sent</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutTab() {
  const [ctx] = useState(createCheckoutStore);
  return (
    <Provider store={ctx.store}>
      <CheckoutInner engine={ctx.engine} eventiq={ctx.eventiq} />
    </Provider>
  );
}

function statusIcon(status: string) {
  switch (status) {
    case 'COMPLETE': return '✓';
    case 'RUNNING': return '⟳';
    case 'READY': return '○';
    default: return '·';
  }
}
