import { mock } from "./deps.ts";

// deno-lint-ignore no-explicit-any
type Fn = (...args: any[]) => any;
export interface BoundSpy<fn = Fn> {
  spy: mock.Spy;
  call: fn;
}
// deno-lint-ignore no-explicit-any
export function createBoundSpy<fn>(src: any, method: string): BoundSpy<fn> {
  const spy = mock.spy(Object.getPrototypeOf(src), method);
  const call: fn = spy.bind(src) as fn;

  return {
    spy,
    call,
  };
}
