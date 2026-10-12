import { useRef } from 'react';

function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useClientRequestId() {
  const idRef = useRef(newId());

  function regenerate() {
    idRef.current = newId();
    return idRef.current;
  }

  return {
    id: idRef.current,
    regenerate,
  };
}
