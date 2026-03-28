type LogoutHandler = (reason?: string) => Promise<void> | void;

let logoutHandler: LogoutHandler | null = null;

export function registerLogoutHandler(handler: LogoutHandler) {
  logoutHandler = handler;
}

export function unregisterLogoutHandler() {
  logoutHandler = null;
}

export async function triggerLogout(reason?: string) {
  if (logoutHandler) {
    await logoutHandler(reason);
  }
}