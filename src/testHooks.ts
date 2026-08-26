type OpenUrlHandler = (pathOrUrl: string, browser?: string) => void;

let openUrlHandlerOverride: OpenUrlHandler | null = null;

/** @internal Stub or restore browser launching during unit tests. */
export function setOpenUrlForTests(handler: OpenUrlHandler | null): void {
  openUrlHandlerOverride = handler;
}

/** @internal Returns the active test stub for openUrl, if any. */
export function getOpenUrlHandlerOverride(): OpenUrlHandler | null {
  return openUrlHandlerOverride;
}
