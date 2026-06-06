import { useState, useCallback, useMemo } from 'react';
import { useEventiqState, useStepStarted, useAutoSchedule } from '@eventiq/react';
import { createDashboardEngine, dashboardPlan } from '../plans';
import type { DashboardStep } from '../plans';
import * as api from '../api';

type DashboardData = {
  user: Awaited<ReturnType<typeof api.fetchCurrentUser>> | null;
  config: Awaited<ReturnType<typeof api.fetchStoreConfig>> | null;
  orders: Awaited<ReturnType<typeof api.fetchTodayOrders>> | null;
  inventory: Awaited<ReturnType<typeof api.fetchInventoryAlerts>> | null;
  notifications: Awaited<ReturnType<typeof api.fetchNotifications>> | null;
};

const STEP_LABELS: Record<DashboardStep, string> = {
  'fetch-user': 'Load current user',
  'fetch-config': 'Load store config',
  'fetch-orders': "Load today's orders",
  'fetch-inventory': 'Load inventory alerts',
  'fetch-notifications': 'Load notifications',
};

export default function DashboardTab() {
  const [engine] = useState(createDashboardEngine);
  const [data, setData] = useState<DashboardData>({
    user: null, config: null, orders: null, inventory: null, notifications: null,
  });
  const [started, setStarted] = useState(false);

  useAutoSchedule(engine);
  const state = useEventiqState(engine);

  useStepStarted(engine, 'fetch-user', async () => {
    const user = await api.fetchCurrentUser();
    setData((d) => ({ ...d, user }));
    engine.complete('fetch-user', 'SUCCESS');
  });

  useStepStarted(engine, 'fetch-config', async () => {
    const config = await api.fetchStoreConfig(data.user!.storeId);
    setData((d) => ({ ...d, config }));
    engine.complete('fetch-config', 'SUCCESS');
  });

  useStepStarted(engine, 'fetch-orders', async () => {
    const orders = await api.fetchTodayOrders(data.user!.storeId);
    setData((d) => ({ ...d, orders }));
    engine.complete('fetch-orders', 'SUCCESS');
  });

  useStepStarted(engine, 'fetch-inventory', async () => {
    const inventory = await api.fetchInventoryAlerts(data.user!.storeId);
    setData((d) => ({ ...d, inventory }));
    engine.complete('fetch-inventory', 'SUCCESS');
  });

  useStepStarted(engine, 'fetch-notifications', async () => {
    const notifications = await api.fetchNotifications(data.user!.id);
    setData((d) => ({ ...d, notifications }));
    engine.complete('fetch-notifications', 'SUCCESS');
  });

  const run = useCallback(() => {
    setStarted(true);
    engine.submit(dashboardPlan);
  }, [engine]);

  const steps = state.queue[0]?.steps ?? [];
  const allDone = steps.length > 0 && steps.every((s) => s.status === 'COMPLETE');

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>@eventiq/react</h2>
        <p className="tab-desc">
          Dashboard page load. The engine orchestrates 5 API calls with dependencies:
          user → config → orders + inventory (parallel), user → notifications.
        </p>
        {!started && <button className="btn-run" onClick={run}>Load Dashboard</button>}
      </div>

      {steps.length > 0 && (
        <div className="step-list">
          {steps.map((step) => (
            <div key={step.id} className={`step-row step-${step.status.toLowerCase()}`}>
              <span className="step-status">{statusIcon(step.status)}</span>
              <span className="step-name">{STEP_LABELS[step.name as DashboardStep]}</span>
              <span className="step-badge">{step.status}</span>
            </div>
          ))}
        </div>
      )}

      {allDone && data.orders && (
        <div className="result-panel">
          <h3>Dashboard Loaded</h3>
          <div className="result-grid">
            <div className="result-card">
              <div className="result-value">{data.orders.total}</div>
              <div className="result-label">Orders today</div>
            </div>
            <div className="result-card">
              <div className="result-value">${data.orders.revenue.toLocaleString()}</div>
              <div className="result-label">Revenue</div>
            </div>
            <div className="result-card">
              <div className="result-value">{data.inventory?.length ?? 0}</div>
              <div className="result-label">Stock alerts</div>
            </div>
            <div className="result-card">
              <div className="result-value">{data.notifications?.length ?? 0}</div>
              <div className="result-label">Notifications</div>
            </div>
          </div>
        </div>
      )}
    </div>
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
