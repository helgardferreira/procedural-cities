import { BehaviorSubject, Observable, Subject } from "rxjs";
import { filter, map, mergeAll, scan } from "rxjs/operators";
import { EventLike } from "./utils/types";

type Predicate = (item: EventBusState) => boolean;

interface EventBusState<T = any> {
  [type: string]: Observable<EventLike<T>>;
}

export class EventBus {
  private _eventStore$: BehaviorSubject<EventBusState>;
  private _eventSubject$: Subject<EventBusState>;

  constructor() {
    this._eventStore$ = new BehaviorSubject({});
    this._eventSubject$ = new Subject();

    this._eventSubject$
      .pipe(scan((acc, item) => ({ ...acc, ...item }), {}))
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
      filter<EventBusState<K>>((eventItem) => !!eventItem[key]),
      map((eventItem) => eventItem[key] as Observable<T>),
      mergeAll()
    );
  }

  public trigger(item: EventBusState) {
    this._eventSubject$.next(item);
  }
}

const eventBus = new EventBus();

export default eventBus;
