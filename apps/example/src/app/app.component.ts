import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit
} from '@angular/core';
import { Observable, of, Subject } from 'rxjs';
import {
  debounceTime,
  delay,
  distinctUntilChanged,
  map,
  scan,
  takeUntil,
  tap
} from 'rxjs/operators';

// Fake async request for given IDs
function fakeFetch(ids: string[]) {
  return of(ids).pipe(
    delay(Math.random() * 900 + 100), // Artificial delay
    tap({
      complete: () => console.log('complete', ids)
    })
  );
}

interface VisibilityChangeEvent {
  id: string;
  visible: boolean;
}

function withLatestVisible() {
  return (source: Observable<VisibilityChangeEvent>): Observable<string[]> =>
    source.pipe(
      // This `scan` keeps track of intermediate visible/hidden state for a box ID
      scan(
        (s, b: VisibilityChangeEvent) => {
          if (b.visible && !s[b.id]) {
            // hidden -> visible
            return {
              ...s,
              [b.id]: true
            };
          } else if (!b.visible && s[b.id]) {
            // visible -> hidden
            return Object.keys(s).reduce((acc, id) => {
              if (id !== b.id) {
                acc[id] = true;
              }
              return acc;
            }, {});
          } else {
            // no changes (keep reference)
            return s;
          }
        },
        {} as {
          [k: string]: true;
        } // Keep track of which ID to fetch
      ),
      distinctUntilChanged(), // only emit on object reference changes
      map(s => Object.keys(s)), // extract IDs
      debounceTime(100) // skip intermediate updates
    );
}

@Component({
  selector: 'intersection-observer-example-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy, AfterViewInit {
  // Controls whether IntersectionObserver is observing or not.
  observing = true;

  // UI state
  state = {
    boxes: Array.from({ length: 100 }).map((_, i) => ({
      id: String(i),
      loaded: false
    }))
  };

  observer: IntersectionObserver;

  destroyed$ = new Subject<boolean>();

  visibilityChange$ = new Subject<VisibilityChangeEvent>();

  boxesToFetch$ = this.visibilityChange$.pipe(withLatestVisible());

  constructor(private readonly elementRef: ElementRef) {}

  /*
   * Lifecycle methods
   */
  ngOnInit() {
    this.observer = new IntersectionObserver(
      entries => this.onIntersectionUpdate(entries),
      {
        root: null,
        rootMargin: '0px',
        threshold: 0
      }
    );

    // When new IDs are ready to fetch, call the fake fetch function and
    // set loaded to true for the matching ID.
    this.boxesToFetch$.pipe(takeUntil(this.destroyed$)).subscribe(ids => {
      fakeFetch(ids).subscribe(response => {
        this.state.boxes.forEach(box => {
          if (response.some(id => id === box.id)) {
            box.loaded = true;
          }
        });
      });
    });
  }

  ngAfterViewInit() {
    this.startObservation();
  }

  ngOnDestroy() {
    this.stopObservation();
    this.destroyed$.next(true);
  }

  /*
   * Methods for starting and stopping observer
   */
  startObservation() {
    this.elementRef.nativeElement.querySelectorAll('.box').forEach(element => {
      this.observer.observe(element);
    });
  }

  stopObservation() {
    this.observer.disconnect();
  }

  /*
   * Event handlers
   */
  onIntersectionUpdate(entries) {
    entries.forEach(entry => {
      this.onVisibilityChange(entry, entry.isIntersecting);
    });
  }

  onVisibilityChange(entry, visible) {
    const element = entry.target;
    const id = element.getAttribute('data-id');
    this.visibilityChange$.next({ id, visible });
  }

  /*
   * Toolbar handlers
   */
  onReset() {
    this.state.boxes.forEach(b => {
      b.loaded = false;
    });
  }

  onToggleObservation() {
    this.observing = !this.observing;
    if (this.observing) {
      this.startObservation();
    } else {
      this.stopObservation();
    }
  }

  /*
   * Misc
   */
  trackById(x) {
    return x.id;
  }
}
