import { Injectable, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import type { EventiqEngine, EventiqState, ExecutionOutcome } from '@eventiq/core';

@Injectable()
export class EventiqService<TPlanName extends string, TStepName extends string> implements OnDestroy {
  private engine!: EventiqEngine<TPlanName, TStepName>;
  private state$ = new BehaviorSubject<EventiqState<TPlanName, TStepName>>({ queue: [] });
  private stepsReady$ = new Subject<TStepName[]>();
  private stepStarted$ = new Subject<TStepName>();
  private stepCompleted$ = new Subject<{ name: TStepName; outcome: ExecutionOutcome }>();
  private unsubscribes: (() => void)[] = [];

  init(engine: EventiqEngine<TPlanName, TStepName>): void {
    this.engine = engine;
    this.state$.next(engine.getState());

    this.unsubscribes.push(
      engine.subscribe(() => this.state$.next(engine.getState())),
      engine.onStepsReady((names) => this.stepsReady$.next(names)),
    );
  }

  getState(): Observable<EventiqState<TPlanName, TStepName>> {
    return this.state$.asObservable();
  }

  getStepsReady(): Observable<TStepName[]> {
    return this.stepsReady$.asObservable();
  }

  onStepStarted(name: TStepName): Observable<void> {
    return this.stepStarted$.pipe(
      filter((n) => n === name),
      map(() => undefined),
    );
  }

  onStepCompleted(name: TStepName): Observable<ExecutionOutcome> {
    return this.stepCompleted$.pipe(
      filter((e) => e.name === name),
      map((e) => e.outcome),
    );
  }

  submit(plan: Parameters<EventiqEngine<TPlanName, TStepName>['submit']>[0]): void {
    this.engine.submit(plan);
  }

  start(name: TStepName): void {
    this.engine.start(name);
    this.stepStarted$.next(name);
  }

  complete(name: TStepName, outcome: ExecutionOutcome): void {
    this.engine.complete(name, outcome);
    this.stepCompleted$.next({ name, outcome });
  }

  ngOnDestroy(): void {
    for (const unsub of this.unsubscribes) unsub();
    this.state$.complete();
    this.stepsReady$.complete();
    this.stepStarted$.complete();
    this.stepCompleted$.complete();
  }
}
