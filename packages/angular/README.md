# @eventiq/angular

Angular adapter for `@eventiq/core`. Wraps the engine as an injectable service with RxJS observables.

## Install

```bash
npm install @eventiq/core @eventiq/angular
```

## Setup

```ts
import { Component, OnInit } from '@angular/core';
import { EventiqEngine } from '@eventiq/core';
import { EventiqService } from '@eventiq/angular';

@Component({
  selector: 'app-pipeline',
  providers: [EventiqService],
  template: `
    <ul>
      <li *ngFor="let step of (state$ | async)?.queue[0]?.steps">
        {{ step.name }}: {{ step.status }}
      </li>
    </ul>
  `,
})
export class PipelineComponent implements OnInit {
  state$ = this.eventiq.getState();

  constructor(private eventiq: EventiqService<string, string>) {}

  ngOnInit() {
    const engine = new EventiqEngine();
    this.eventiq.init(engine);

    this.eventiq.getStepsReady().subscribe((names) => {
      for (const name of names) this.eventiq.start(name);
    });

    this.eventiq.onStepStarted('fetch-user').subscribe(async () => {
      await this.api.getUser();
      this.eventiq.complete('fetch-user', 'SUCCESS');
    });

    this.eventiq.submit({
      name: 'load',
      steps: [
        { name: 'fetch-user', needs: [] },
        { name: 'fetch-posts', needs: ['fetch-user'] },
      ],
    });
  }
}
```

## API

| Method | Returns | Description |
|--------|---------|-------------|
| `init(engine)` | `void` | Binds the service to an engine instance |
| `getState()` | `Observable<EventiqState>` | Emits on every state change |
| `getStepsReady()` | `Observable<TStepName[]>` | Emits when new steps become ready |
| `onStepStarted(name)` | `Observable<void>` | Emits when a step starts |
| `onStepCompleted(name)` | `Observable<ExecutionOutcome>` | Emits when a step completes |
| `submit(plan)` | `void` | Submit a plan to the engine |
| `start(name)` | `void` | Start a ready step |
| `complete(name, outcome)` | `void` | Complete a running step |

The service implements `OnDestroy`. All subscriptions are cleaned up automatically when the provider is destroyed.

## License

MIT
