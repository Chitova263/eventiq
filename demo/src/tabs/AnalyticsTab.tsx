import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useEventiqState, useAutoSchedule } from '@eventiq/react';
import { useEventiqQueries } from '@eventiq/react-query';
import { createAnalyticsEngine, analyticsPlan } from '../plans';
import type { AnalyticsStep } from '../plans';
import * as api from '../api';

const STORE_ID = 'store_42';

const STEP_LABELS: Record<AnalyticsStep, string> = {
  'fetch-revenue': 'Load revenue timeseries',
  'fetch-top-products': 'Load top products',
  'fetch-segments': 'Load customer segments',
  'fetch-funnel': 'Load conversion funnel',
};

export default function AnalyticsTab() {
  const [engine] = useState(createAnalyticsEngine);
  const [started, setStarted] = useState(false);
  const queryClient = useQueryClient();

  useAutoSchedule(engine);
  const state = useEventiqState(engine);

  useEventiqQueries(engine, [
    { name: 'fetch-revenue', queryKey: ['revenue', STORE_ID], queryFn: () => api.fetchRevenueTimeseries(STORE_ID) },
    { name: 'fetch-top-products', queryKey: ['top-products', STORE_ID], queryFn: () => api.fetchTopProducts(STORE_ID) },
    { name: 'fetch-segments', queryKey: ['segments', STORE_ID], queryFn: () => api.fetchCustomerSegments(STORE_ID) },
    { name: 'fetch-funnel', queryKey: ['funnel', STORE_ID], queryFn: () => api.fetchConversionFunnel(STORE_ID) },
  ]);

  const run = () => {
    setStarted(true);
    engine.submit(analyticsPlan);
  };

  const steps = state.queue[0]?.steps ?? [];
  const allDone = steps.length > 0 && steps.every((s) => s.status === 'COMPLETE');

  const revenue = queryClient.getQueryData<Awaited<ReturnType<typeof api.fetchRevenueTimeseries>>>(['revenue', STORE_ID]);
  const products = queryClient.getQueryData<Awaited<ReturnType<typeof api.fetchTopProducts>>>(['top-products', STORE_ID]);
  const segments = queryClient.getQueryData<Awaited<ReturnType<typeof api.fetchCustomerSegments>>>(['segments', STORE_ID]);
  const funnel = queryClient.getQueryData<Awaited<ReturnType<typeof api.fetchConversionFunnel>>>(['funnel', STORE_ID]);

  return (
    <div className="tab-content">
      <div className="tab-header">
        <h2>@eventiq/react-query</h2>
        <p className="tab-desc">
          Analytics dashboard. Revenue, products, and segments load in parallel.
          Conversion funnel depends on revenue data. All results are cached by React Query.
        </p>
        {!started && <button className="btn-run" onClick={run}>Load Analytics</button>}
        {allDone && (
          <button className="btn-run btn-secondary" onClick={run}>
            Reload (cached)
          </button>
        )}
      </div>

      {steps.length > 0 && (
        <div className="step-list">
          {steps.map((step) => (
            <div key={step.id} className={`step-row step-${step.status.toLowerCase()}`}>
              <span className="step-status">{statusIcon(step.status)}</span>
              <span className="step-name">{STEP_LABELS[step.name as AnalyticsStep]}</span>
              <span className="step-badge">{step.status}</span>
            </div>
          ))}
        </div>
      )}

      {allDone && (
        <div className="result-panel">
          <h3>Analytics</h3>
          <div className="result-grid">
            <div className="result-card">
              <div className="result-value">
                ${revenue ? revenue.reduce((s, d) => s + d.revenue, 0).toLocaleString() : '...'}
              </div>
              <div className="result-label">7-day revenue</div>
            </div>
            <div className="result-card">
              <div className="result-value">{products?.[0]?.name ?? '...'}</div>
              <div className="result-label">Top product</div>
            </div>
            <div className="result-card">
              <div className="result-value">{segments?.length ?? 0} segments</div>
              <div className="result-label">Customer groups</div>
            </div>
            <div className="result-card">
              <div className="result-value">
                {funnel ? Math.round((funnel.purchased / funnel.visitors) * 100) + '%' : '...'}
              </div>
              <div className="result-label">Conversion rate</div>
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
