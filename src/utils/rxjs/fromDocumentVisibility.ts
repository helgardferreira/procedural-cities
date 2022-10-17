import { EMPTY, from, fromEvent, map, Observable, startWith } from "rxjs";

export function fromDocumentVisibility(): Observable<boolean> {
  let hidden: string;
  let visibilityChange;

  if (typeof document.hidden !== "undefined") {
    // Opera 12.10 and Firefox 18 and later support
    hidden = "hidden";
    visibilityChange = "visibilitychange";
    // @ts-ignore
  } else if (typeof document.msHidden !== "undefined") {
    hidden = "msHidden";
    visibilityChange = "msvisibilitychange";
    // @ts-ignore
  } else if (typeof document.webkitHidden !== "undefined") {
    hidden = "webkitHidden";
    visibilityChange = "webkitvisibilitychange";
  } else {
    console.error("Browser does not support visibility change");
    // TODO: decide whether to return an observable that never emits
    // or an observable that emits true in the case of an unsupported browser
    // return from([true]);
    return EMPTY;
  }

  return fromEvent(document, visibilityChange).pipe(
    // @ts-ignore
    map(() => !document[hidden]),
    startWith(true)
  );
}
