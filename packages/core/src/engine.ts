import type {
  ExecutionPlan,
  ExecutablePlan,
  ExecutableStep,
  ExecutionOutcome,
  EventiqState,
  Step,
} from './types';

let idCounter = 0;

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${++idCounter}`;
}

export class EventiqEngine<TPlanName extends string, TStepName extends string> {
  private state: EventiqState<TPlanName, TStepName> = { queue: [] };
  private disposed = false;
  private stateListeners = new Set<() => void>();
  private readyListeners = new Set<(names: TStepName[]) => void>();
  private startedListeners = new Map<TStepName, Set<() => void>>();
  private completedListeners = new Map<TStepName, Set<(outcome: ExecutionOutcome) => void>>();

  getState(): EventiqState<TPlanName, TStepName> {
    return this.state;
  }

  getReadySteps(): ExecutableStep<TStepName>[] {
    return this.state.queue.flatMap((plan) => plan.steps.filter((s) => s.status === 'READY'));
  }

  submit(plan: ExecutionPlan<TPlanName, TStepName>): void {
    this.assertNotDisposed();
    const executablePlan = this.buildExecutablePlan(plan);
    this.state = { queue: [...this.state.queue, executablePlan] };
    this.notifyStateListeners();
    this.emitReady();
  }

  start(name: TStepName, planName?: TPlanName): void {
    this.assertNotDisposed();
    this.updateStep(name, planName, (step) => {
      if (step.status !== 'READY') {
        throw new Error(`Cannot start "${name}": status is "${step.status}"`);
      }
      return { ...step, status: 'RUNNING', startTime: Date.now() };
    });
    this.notifyStateListeners();
    this.emitSafe(this.startedListeners.get(name));
  }

  complete(name: TStepName, outcome: ExecutionOutcome, planName?: TPlanName): void {
    this.assertNotDisposed();
    this.updateStep(name, planName, (step) => {
      if (step.status !== 'RUNNING') {
        throw new Error(`Cannot complete "${name}": status is "${step.status}"`);
      }
      return { ...step, status: 'COMPLETE', outcome, endTime: Date.now() };
    });

    if (outcome === 'SUCCESS' || outcome === 'SKIPPED') {
      this.unblockDependants(name, planName);
    }

    this.notifyStateListeners();
    const listeners = this.completedListeners.get(name);
    if (listeners) {
      for (const cb of [...listeners]) {
        try { cb(outcome); } catch (e) { console.error('[eventiq] listener error:', e); }
      }
    }
    this.emitReady();
  }

  subscribe(listener: () => void): () => void {
    this.stateListeners.add(listener);
    return () => { this.stateListeners.delete(listener); };
  }

  onStepsReady(cb: (names: TStepName[]) => void): () => void {
    this.readyListeners.add(cb);
    return () => { this.readyListeners.delete(cb); };
  }

  onStepStarted(name: TStepName, cb: () => void): () => void {
    if (!this.startedListeners.has(name)) this.startedListeners.set(name, new Set());
    this.startedListeners.get(name)!.add(cb);
    return () => { this.startedListeners.get(name)?.delete(cb); };
  }

  onStepCompleted(name: TStepName, cb: (outcome: ExecutionOutcome) => void): () => void {
    if (!this.completedListeners.has(name)) this.completedListeners.set(name, new Set());
    this.completedListeners.get(name)!.add(cb);
    return () => { this.completedListeners.get(name)?.delete(cb); };
  }

  dispose(): void {
    this.disposed = true;
    this.stateListeners.clear();
    this.readyListeners.clear();
    this.startedListeners.clear();
    this.completedListeners.clear();
  }

  // --- Internals ---

  private assertNotDisposed(): void {
    if (this.disposed) throw new Error('Engine has been disposed');
  }

  private notifyStateListeners(): void {
    for (const cb of [...this.stateListeners]) {
      try { cb(); } catch (e) { console.error('[eventiq] listener error:', e); }
    }
  }

  private emitReady(): void {
    const ready = this.getReadySteps();
    if (ready.length > 0) {
      const names = ready.map((s) => s.name);
      for (const cb of [...this.readyListeners]) {
        try { cb(names); } catch (e) { console.error('[eventiq] listener error:', e); }
      }
    }
  }

  private emitSafe(listeners: Set<() => void> | undefined): void {
    if (!listeners) return;
    for (const cb of [...listeners]) {
      try { cb(); } catch (e) { console.error('[eventiq] listener error:', e); }
    }
  }

  private updateStep(
    name: TStepName,
    planName: TPlanName | undefined,
    updater: (s: ExecutableStep<TStepName>) => ExecutableStep<TStepName>,
  ): void {
    let found = false;
    this.state = {
      queue: this.state.queue.map((plan) => {
        if (planName && plan.name !== planName) return plan;
        return {
          ...plan,
          steps: plan.steps.map((step) => {
            if (step.name !== name) return step;
            if (found) return step; // only update first match
            found = true;
            return updater(step);
          }),
        };
      }),
    };
    if (!found) throw new Error(`Step "${name}" not found in queue`);
  }

  private unblockDependants(completedName: TStepName, planName?: TPlanName): void {
    this.state = {
      queue: this.state.queue.map((plan) => {
        if (planName && plan.name !== planName) return plan;
        return {
          ...plan,
          steps: plan.steps.map((step) => {
            if (step.status !== 'BLOCKED') return step;
            if (!step.needs.includes(completedName)) return step;
            const allMet = step.needs.every((need) => {
              const dep = plan.steps.find((s) => s.name === need);
              return dep?.status === 'COMPLETE' &&
                (dep.outcome === 'SUCCESS' || dep.outcome === 'SKIPPED');
            });
            return allMet ? { ...step, status: 'READY' as const } : step;
          }),
        };
      }),
    };
  }

  private buildExecutablePlan(plan: ExecutionPlan<TPlanName, TStepName>): ExecutablePlan<TPlanName, TStepName> {
    this.validate(plan);

    const steps: ExecutableStep<TStepName>[] = plan.steps.map((s) => ({
      id: generateId(),
      name: s.name,
      status: s.needs.length === 0 ? 'READY' : 'BLOCKED',
      outcome: null,
      needs: [...s.needs],
      dependants: [],
      startTime: null,
      endTime: null,
    }));

    for (const step of steps) {
      for (const need of step.needs) {
        steps.find((s) => s.name === need)!.dependants.push(step.name);
      }
    }

    return { name: plan.name, steps };
  }

  private validate(plan: ExecutionPlan<TPlanName, TStepName>): void {
    const names = new Set<TStepName>();

    for (const step of plan.steps) {
      if (names.has(step.name)) throw new Error(`Duplicate step name "${step.name}"`);
      names.add(step.name);
    }

    for (const step of plan.steps) {
      for (const need of step.needs) {
        if (!names.has(need)) {
          throw new Error(`Step "${step.name}" depends on "${need}" which doesn't exist in the plan`);
        }
      }
    }

    this.detectCycle(plan.steps);
  }

  private detectCycle(steps: Step<TStepName>[]): void {
    const inDegree = new Map<TStepName, number>();
    const adj = new Map<TStepName, TStepName[]>();

    for (const s of steps) {
      inDegree.set(s.name, s.needs.length);
      adj.set(s.name, []);
    }

    for (const s of steps) {
      for (const need of s.needs) {
        adj.get(need)!.push(s.name);
      }
    }

    const queue: TStepName[] = [];
    for (const [name, degree] of inDegree) {
      if (degree === 0) queue.push(name);
    }

    let processed = 0;
    while (queue.length > 0) {
      const current = queue.shift()!;
      processed++;
      for (const neighbor of adj.get(current)!) {
        const newDegree = inDegree.get(neighbor)! - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }

    if (processed !== steps.length) {
      const cyclic = steps.filter((s) => inDegree.get(s.name)! > 0).map((s) => s.name);
      throw new Error(`Circular dependency detected among steps: [${cyclic.join(', ')}]`);
    }
  }
}
