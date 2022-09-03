import { EventObject, Interpreter } from "xstate";

export type SimpleInterpreter<
  TContext,
  TEvent extends EventObject
> = Interpreter<TContext, any, TEvent, any, any>;
