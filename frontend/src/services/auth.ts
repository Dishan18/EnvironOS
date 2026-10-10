import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { AuthUser, UserRole } from '../types';

export const COGNITO_USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID || '';
export const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID || import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID || '';

let userPoolInstance: CognitoUserPool | null = null;

export function getUserPool(): CognitoUserPool | null {
  if (userPoolInstance) return userPoolInstance;
  if (!COGNITO_USER_POOL_ID || !COGNITO_CLIENT_ID) {
    return null;
  }
  userPoolInstance = new CognitoUserPool({
    UserPoolId: COGNITO_USER_POOL_ID,
    ClientId: COGNITO_CLIENT_ID,
  });
  return userPoolInstance;
}

/**
 * Decode JWT token payload safely in the browser.
 */
function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return {};
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
}

/**
 * Extract role ('admin' | 'user') from Cognito ID token payload.
 */
export function extractRoleFromClaims(payload: Record<string, unknown>): UserRole {
  const rawGroups = payload['cognito:groups'] || payload['groups'];
  if (!rawGroups) return 'user';

  if (Array.isArray(rawGroups)) {
    return rawGroups.includes('admin') ? 'admin' : 'user';
  }
  if (typeof rawGroups === 'string') {
    return rawGroups.includes('admin') ? 'admin' : 'user';
  }
  return 'user';
}

function parseSessionToAuthUser(
  cognitoUser: CognitoUser,
  session: CognitoUserSession
): AuthUser {
  const idToken = session.getIdToken();
  const payload = decodeJwtPayload(idToken.getJwtToken());
  const role = extractRoleFromClaims(payload);

  return {
    username: cognitoUser.getUsername() || (payload['cognito:username'] as string) || (payload['email'] as string) || '',
    email: (payload['email'] as string) || cognitoUser.getUsername() || '',
    role,
    sub: (payload['sub'] as string) || '',
  };
}

/**
 * Sign in using Amazon Cognito User Pools USER_PASSWORD_AUTH.
 */
export async function signIn(username: string, password: string): Promise<AuthUser> {
  const pool = getUserPool();
  if (!pool) {
    throw new Error('Cognito configuration missing: VITE_COGNITO_USER_POOL_ID and VITE_COGNITO_CLIENT_ID are required.');
  }

  const authenticationDetails = new AuthenticationDetails({
    Username: username.trim(),
    Password: password,
  });

  const cognitoUser = new CognitoUser({
    Username: username.trim(),
    Pool: pool,
  });

  return new Promise((resolve, reject) => {
    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (session: CognitoUserSession) => {
        const user = parseSessionToAuthUser(cognitoUser, session);
        resolve(user);
      },
      onFailure: (err) => {
        reject(new Error(err.message || 'Authentication failed. Please verify credentials.'));
      },
      newPasswordRequired: () => {
        reject(new Error('Password reset is required for this demonstration account.'));
      },
    });
  });
}

/**
 * Sign out and clear stored session tokens from browser.
 */
export function signOut(): void {
  const pool = getUserPool();
  if (!pool) return;
  const cognitoUser = pool.getCurrentUser();
  if (cognitoUser) {
    cognitoUser.signOut();
  }
}

/**
 * Retrieve the current authenticated user from local storage session.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const pool = getUserPool();
  if (!pool) return null;

  const cognitoUser = pool.getCurrentUser();
  if (!cognitoUser) return null;

  return new Promise((resolve) => {
    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }
      resolve(parseSessionToAuthUser(cognitoUser, session));
    });
  });
}

/**
 * Get valid JWT ID token string for Authorization Bearer header.
 */
export async function getIdToken(): Promise<string | null> {
  const pool = getUserPool();
  if (!pool) return null;

  const cognitoUser = pool.getCurrentUser();
  if (!cognitoUser) return null;

  return new Promise((resolve) => {
    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }
      resolve(session.getIdToken().getJwtToken());
    });
  });
}
