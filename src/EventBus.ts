import { Observable, ReplaySubject } from "rxjs";
import { filter, mergeAll } from "rxjs/operators";
import { EventLike } from "./utils/types";

type Predicate = (item: EventLike) => boolean;

export class EventBus {
  private _eventSubject$: ReplaySubject<Observable<EventLike>>;
  private _events$: Observable<EventLike>;

  constructor() {
    this._eventSubject$ = new ReplaySubject();
    this._events$ = this._eventSubject$.asObservable().pipe(mergeAll());
  }

  public listen<T extends EventLike<K>, K = any>(
    matcher?: Predicate
  ): Observable<T> {
    if (matcher) {
      return (this._events$ as Observable<T>).pipe(
        filter((eventItem) => matcher(eventItem))
      );
    } else {
      return this._events$ as Observable<T>;
    }
  }

  public ofType<T extends EventLike<K>, K = any>(key: string): Observable<T> {
    return (this._events$ as Observable<T>).pipe(
      filter((event) => event.type === key)
    );
  }

  public trigger(item: Observable<EventLike>) {
    this._eventSubject$.next(item);
  }
}

const eventBus = new EventBus();

export default eventBus;
