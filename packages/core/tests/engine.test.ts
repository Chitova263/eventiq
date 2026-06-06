import { describe, it, expect, vi } from 'vitest';
import { EventiqEngine } from '../src/engine';
import type { ExecutionPlan } from '../src/types';

type PlanName = 'deploy';
type StepName = 'checkout' | 'build' | 'test' | 'deploy' | 'lint';

const linearPlan: ExecutionPlan<PlanName, StepName> = {
  name: 'deploy',
  steps: [
    { name: 'checkout', needs: [] },
    { name: 'build', needs: ['checkout'] },
    { name: 'test', needs: ['build'] },
  ],
};

const parallelPlan: ExecutionPlan<PlanName, StepName> = {
  name: 'deploy',
  steps: [
    { name: 'checkout', needs: [] },
    { name: 'build', needs: ['checkout'] },
    { name: 'lint', needs: ['checkout'] },
    { name: 'test', needs: ['build', 'lint'] },
  ],
};

describe('EventiqEngine', () => {
  describe('submit', () => {
    it('marks steps with no dependencies as READY', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      engine.submit(linearPlan);

      const state = engine.getState();
      expect(state.queue).toHaveLength(1);
      expect(state.queue[0].steps[0].status).toBe('READY');
      expect(state.queue[0].steps[1].status).toBe('BLOCKED');
      expect(state.queue[0].steps[2].status).toBe('BLOCKED');
    });

    it('emits onStepsReady with initial ready steps', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      const cb = vi.fn();
      engine.onStepsReady(cb);
      engine.submit(linearPlan);
      expect(cb).toHaveBeenCalledWith(['checkout']);
    });

    it('notifies state subscribers', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      const cb = vi.fn();
      engine.subscribe(cb);
      engine.submit(linearPlan);
      expect(cb).toHaveBeenCalled();
    });

    it('builds dependants correctly', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      engine.submit(linearPlan);
      const steps = engine.getState().queue[0].steps;
      expect(steps[0].dependants).toEqual(['build']);
      expect(steps[1].dependants).toEqual(['test']);
      expect(steps[2].dependants).toEqual([]);
    });
  });

  describe('validation', () => {
    it('throws on duplicate step names', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      expect(() =>
        engine.submit({ name: 'deploy', steps: [{ name: 'checkout', needs: [] }, { name: 'checkout', needs: [] }] }),
      ).toThrow('Duplicate step name "checkout"');
    });

    it('throws on missing dependency reference', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      expect(() =>
        engine.submit({ name: 'deploy', steps: [{ name: 'build', needs: ['checkout'] }] }),
      ).toThrow('Step "build" depends on "checkout" which doesn\'t exist in the plan');
    });

    it('throws on circular dependencies', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      expect(() =>
        engine.submit({
          name: 'deploy',
          steps: [
            { name: 'build', needs: ['test'] },
            { name: 'test', needs: ['build'] },
          ],
        }),
      ).toThrow(/Circular dependency detected/);
    });
  });

  describe('start', () => {
    it('transitions READY → RUNNING', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      engine.submit(linearPlan);
      engine.start('checkout');
      const step = engine.getState().queue[0].steps[0];
      expect(step.status).toBe('RUNNING');
      expect(step.startTime).toBeTypeOf('number');
    });

    it('throws if step is not READY', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      engine.submit(linearPlan);
      expect(() => engine.start('build')).toThrow('Cannot start "build": status is "BLOCKED"');
    });

    it('emits onStepStarted', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      const cb = vi.fn();
      engine.onStepStarted('checkout', cb);
      engine.submit(linearPlan);
      engine.start('checkout');
      expect(cb).toHaveBeenCalledOnce();
    });

    it('throws if step does not exist', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      engine.submit(linearPlan);
      expect(() => engine.start('deploy' as StepName)).toThrow('Step "deploy" not found in queue');
    });
  });

  describe('complete', () => {
    it('transitions RUNNING → COMPLETE with outcome', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      engine.submit(linearPlan);
      engine.start('checkout');
      engine.complete('checkout', 'SUCCESS');
      const step = engine.getState().queue[0].steps[0];
      expect(step.status).toBe('COMPLETE');
      expect(step.outcome).toBe('SUCCESS');
      expect(step.endTime).toBeTypeOf('number');
    });

    it('throws if step is not RUNNING', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      engine.submit(linearPlan);
      expect(() => engine.complete('checkout', 'SUCCESS')).toThrow('Cannot complete "checkout": status is "READY"');
    });

    it('unblocks dependants on SUCCESS', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      engine.submit(linearPlan);
      engine.start('checkout');
      engine.complete('checkout', 'SUCCESS');
      expect(engine.getState().queue[0].steps[1].status).toBe('READY');
    });

    it('unblocks dependants on SKIPPED', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      engine.submit(linearPlan);
      engine.start('checkout');
      engine.complete('checkout', 'SKIPPED');
      expect(engine.getState().queue[0].steps[1].status).toBe('READY');
    });

    it('does NOT unblock dependants on FAILURE', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      engine.submit(linearPlan);
      engine.start('checkout');
      engine.complete('checkout', 'FAILURE');
      expect(engine.getState().queue[0].steps[1].status).toBe('BLOCKED');
    });

    it('emits onStepCompleted with outcome', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      const cb = vi.fn();
      engine.onStepCompleted('checkout', cb);
      engine.submit(linearPlan);
      engine.start('checkout');
      engine.complete('checkout', 'SUCCESS');
      expect(cb).toHaveBeenCalledWith('SUCCESS');
    });

    it('emits onStepsReady when dependants become ready', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      engine.submit(linearPlan);
      engine.start('checkout');
      const cb = vi.fn();
      engine.onStepsReady(cb);
      engine.complete('checkout', 'SUCCESS');
      expect(cb).toHaveBeenCalledWith(['build']);
    });
  });

  describe('parallel dependencies', () => {
    it('only unblocks when ALL needs are met', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      engine.submit(parallelPlan);

      engine.start('checkout');
      engine.complete('checkout', 'SUCCESS');

      const steps = engine.getState().queue[0].steps;
      expect(steps.find((s) => s.name === 'build')!.status).toBe('READY');
      expect(steps.find((s) => s.name === 'lint')!.status).toBe('READY');
      expect(steps.find((s) => s.name === 'test')!.status).toBe('BLOCKED');

      engine.start('build');
      engine.complete('build', 'SUCCESS');
      expect(engine.getState().queue[0].steps.find((s) => s.name === 'test')!.status).toBe('BLOCKED');

      engine.start('lint');
      engine.complete('lint', 'SUCCESS');
      expect(engine.getState().queue[0].steps.find((s) => s.name === 'test')!.status).toBe('READY');
    });
  });

  describe('subscriptions', () => {
    it('unsubscribe stops state notifications', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      const cb = vi.fn();
      const unsub = engine.subscribe(cb);
      unsub();
      engine.submit(linearPlan);
      expect(cb).not.toHaveBeenCalled();
    });

    it('unsubscribe stops onStepsReady notifications', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      const cb = vi.fn();
      const unsub = engine.onStepsReady(cb);
      unsub();
      engine.submit(linearPlan);
      expect(cb).not.toHaveBeenCalled();
    });

    it('unsubscribe stops onStepStarted notifications', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      const cb = vi.fn();
      const unsub = engine.onStepStarted('checkout', cb);
      unsub();
      engine.submit(linearPlan);
      engine.start('checkout');
      expect(cb).not.toHaveBeenCalled();
    });

    it('unsubscribe stops onStepCompleted notifications', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      const cb = vi.fn();
      const unsub = engine.onStepCompleted('checkout', cb);
      unsub();
      engine.submit(linearPlan);
      engine.start('checkout');
      engine.complete('checkout', 'SUCCESS');
      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('getReadySteps', () => {
    it('returns all currently READY steps', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      engine.submit(parallelPlan);
      engine.start('checkout');
      engine.complete('checkout', 'SUCCESS');
      const ready = engine.getReadySteps();
      expect(ready.map((s) => s.name).sort()).toEqual(['build', 'lint']);
    });

    it('returns empty when no steps are ready', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      engine.submit(linearPlan);
      engine.start('checkout');
      expect(engine.getReadySteps()).toEqual([]);
    });
  });

  describe('full pipeline execution', () => {
    it('runs a linear pipeline to completion', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      engine.submit(linearPlan);

      engine.start('checkout');
      engine.complete('checkout', 'SUCCESS');
      engine.start('build');
      engine.complete('build', 'SUCCESS');
      engine.start('test');
      engine.complete('test', 'SUCCESS');

      const steps = engine.getState().queue[0].steps;
      expect(steps.every((s) => s.status === 'COMPLETE')).toBe(true);
      expect(steps.every((s) => s.outcome === 'SUCCESS')).toBe(true);
    });
  });

  describe('plan-scoped operations', () => {
    it('start() targets correct plan when planName is provided', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      const plan1: ExecutionPlan<PlanName, StepName> = {
        name: 'deploy',
        steps: [{ name: 'build', needs: [] }],
      };
      const plan2: ExecutionPlan<PlanName, StepName> = {
        name: 'deploy',
        steps: [{ name: 'build', needs: [] }],
      };
      engine.submit(plan1);
      engine.submit(plan2);

      // Without planName, updates first match only
      engine.start('build');
      const q = engine.getState().queue;
      expect(q[0].steps[0].status).toBe('RUNNING');
      expect(q[1].steps[0].status).toBe('READY');
    });

    it('complete() only updates first matching step across plans', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      engine.submit({ name: 'deploy', steps: [{ name: 'build', needs: [] }] });
      engine.submit({ name: 'deploy', steps: [{ name: 'build', needs: [] }] });

      engine.start('build');
      engine.complete('build', 'SUCCESS');

      const q = engine.getState().queue;
      expect(q[0].steps[0].status).toBe('COMPLETE');
      expect(q[1].steps[0].status).toBe('READY');
    });
  });

  describe('error boundaries', () => {
    it('a throwing subscriber does not break other subscribers', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      const results: string[] = [];

      engine.subscribe(() => { throw new Error('boom'); });
      engine.subscribe(() => { results.push('ok'); });

      engine.submit(linearPlan);
      expect(results).toEqual(['ok']);
    });

    it('a throwing onStepsReady listener does not break others', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      const results: string[] = [];

      engine.onStepsReady(() => { throw new Error('boom'); });
      engine.onStepsReady(() => { results.push('ok'); });

      engine.submit(linearPlan);
      expect(results).toEqual(['ok']);
    });

    it('a throwing onStepStarted listener does not break state', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      engine.onStepStarted('checkout', () => { throw new Error('boom'); });
      engine.submit(linearPlan);

      // Should not throw
      engine.start('checkout');
      expect(engine.getState().queue[0].steps[0].status).toBe('RUNNING');
    });
  });

  describe('dispose', () => {
    it('clears all listeners', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      const cb = vi.fn();
      engine.subscribe(cb);
      engine.onStepsReady(cb);

      engine.dispose();
      expect(() => engine.submit(linearPlan)).toThrow('disposed');
    });

    it('throws on operations after dispose', () => {
      const engine = new EventiqEngine<PlanName, StepName>();
      engine.dispose();

      expect(() => engine.submit(linearPlan)).toThrow('disposed');
      expect(() => engine.start('checkout')).toThrow('disposed');
      expect(() => engine.complete('checkout', 'SUCCESS')).toThrow('disposed');
    });
  });
});
