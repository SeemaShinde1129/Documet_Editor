export type Unsubscribe = () => void;

export function noopSubscribe(): Unsubscribe {
  return () => undefined;
}
