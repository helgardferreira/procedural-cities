import { BehaviorSubject, merge, Observable, Subject } from "rxjs";
import { filter, map, mergeAll, scan } from "rxjs/operators";
import { EventLike } from "./utils/types";

type Predicate = (item: EventBusState) => boolean;

interface EventBusState<T extends EventLike<K> = EventLike, K = any> {
  [type: string]: Observable<T>;
}

export class EventBus {
  private _eventStore$: BehaviorSubject<EventBusState>;
  private _eventSubject$: Subject<EventBusState>;

  constructor() {
    this._eventStore$ = new BehaviorSubject({});
    this._eventSubject$ = new Subject();

    this._eventSubject$
      .pipe(
        scan<EventBusState, EventBusState>((acc, item) => {
          Object.keys(item).forEach((key) => {
            acc[key] = merge(item[key]);
          });
          return acc;
        }, {})
      )
      .subscribe(this._eventStore$);
  }

  // public listen<T extends EventLike<K>, K = any>(
  //   matcher?: Predicate
  // ): Observable<T> {
  //   if (matcher) {
  //     return this._eventStore$.pipe(
  //       filter((eventItem) => matcher(eventItem))
  //     );
  //   } else {
  //     return this._eventStore$;
  //   }
  // }

  public ofType<T extends EventLike<K>, K = any>(key: string): Observable<T> {
    return this._eventStore$.pipe(
      filter((eventItem) => !!eventItem[key]),
      map((eventItem) => eventItem[key] as Observable<T>),
      mergeAll()
    );
  }

  public trigger<T extends EventLike<K>, K = any>(item: EventBusState<T>) {
    this._eventSubject$.next(item);
  }
}

const eventBus = new EventBus();

export default eventBus;
