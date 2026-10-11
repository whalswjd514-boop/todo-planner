const LOGIN_PATH = "/login";

export function isLoginPath(pathname: string): boolean {
  return pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`);
}

/**
 * Where a page request must be redirected, or null to let it through.
 * Signed-out visitors may only see /login; signed-in visitors have no business on it.
 */
export function loginRedirectPath(pathname: string, signedIn: boolean): string | null {
  const onLogin = isLoginPath(pathname);
  if (!signedIn && !onLogin) return LOGIN_PATH;
  if (signedIn && onLogin) return "/";
  return null;
}
