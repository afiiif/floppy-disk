/* eslint-disable @next/next/no-img-element */

import Code from "./Code";

export function BadgeFD() {
  return (
    <>
      <a href="https://pkg-size.dev/floppy-disk" target="_blank" rel="noreferrer">
        <img src="https://pkg-size.dev/badge/bundle/12192" alt="Bundle size for floppy-disk" />
        <span className="nx-sr-only nx-select-none"> (opens in a new tab)</span>
      </a>
      <div className="whitespace-nowrap pt-1 text-xs">(4.4 kB gzip)</div>
    </>
  );
}
export function BadgeZustand() {
  return (
    <>
      <a href="https://pkg-size.dev/zustand?no-peers" target="_blank" rel="noreferrer">
        <img src="https://pkg-size.dev/badge/bundle/4894" alt="Bundle size for zustand" />
        <span className="nx-sr-only nx-select-none"> (opens in a new tab)</span>
      </a>
      <div className="whitespace-nowrap pt-1 text-xs">(2 kB gzip)</div>
    </>
  );
}
export function BadgeRQ() {
  return (
    <>
      <a
        href="https://pkg-size.dev/@tanstack/react-query?no-peers"
        target="_blank"
        rel="noreferrer"
      >
        <img
          src="https://pkg-size.dev/badge/bundle/38004"
          alt="Bundle size for @tanstack/react-query"
        />
        <span className="nx-sr-only nx-select-none"> (opens in a new tab)</span>
      </a>
      <div className="whitespace-nowrap pt-1 text-xs">(11 kB gzip)</div>
    </>
  );
}
export function BadgeSWR() {
  return (
    <>
      <a href="https://pkg-size.dev/swr?no-peers" target="_blank" rel="noreferrer">
        <img src="https://pkg-size.dev/badge/bundle/11227" alt="Bundle size for swr" />
        <span className="nx-sr-only nx-select-none"> (opens in a new tab)</span>
      </a>
      <div className="whitespace-nowrap pt-1 text-xs">(5.3 kB gzip)</div>
    </>
  );
}

export function StoreEvent() {
  return (
    <>
      Store event handler
      <br /> &nbsp; (<Code content="onSubscribe" />, <Code content="onUnsubscribe" />, etc.)
    </>
  );
}
