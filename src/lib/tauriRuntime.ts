export function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(
      (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ ||
        (window as unknown as { __TAURI__?: unknown }).__TAURI__
    )
  )
}
