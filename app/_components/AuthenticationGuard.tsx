'use client';

import { type JSX, useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  isAuthenticationEnabled,
  requestClientCredentialsToken,
  type RequestClientCredentialsTokenResult,
} from '../../lib/services/auth';
import { CLIENT_ID_SESSION_KEY, CLIENT_SECRET_SESSION_KEY } from '../../lib/utils/constants';
import {
  clearStoredCredentialsSession,
  getProcessedSessionStoreValue,
  setStoredSessionValue,
} from '../../lib/utils/storage';
import { ValidationLoader } from './ValidationLoader';
import { AuthenticationForm } from './AuthenticationForm';
import { Navbar } from './Navbar';
import { useClientCredentialsToken } from '@/lib/hooks/useClientCredentialsToken';
import { AuthContext } from '@/lib/provider/context';

interface AuthenticationGuardProps {
  readonly children: ReactNode;
  readonly serverUrl?: string;
  readonly tokenUrl?: string;
}

/**
 * Authentication guard component that ensures the user is authenticated before rendering the children. Renders a form for entering credentials if needed.
 */
export default function AuthenticationGuard({
  children,
  serverUrl = '',
  tokenUrl = '',
}: AuthenticationGuardProps) {
  const isAuthEnabled = isAuthenticationEnabled(serverUrl, tokenUrl);

  // Credentials
  const [clientIdInput, setClientIdInput] = useState('');
  const [clientSecretInput, setClientSecretInput] = useState('');
  const [validatedToken, setValidatedToken] = useState<RequestClientCredentialsTokenResult | null>(
    null,
  );

  //Authentication states
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [isValidatingCredentials, setIsValidatingCredentials] = useState(isAuthEnabled);

  // Token validation state and management
  const tokenState = useClientCredentialsToken({
    tokenUrl,
    clientId: clientIdInput,
    clientSecret: clientSecretInput,
    seedToken: validatedToken,
  });

  // Authentication on load
  useEffect(() => {
    if (isAuthEnabled) {
      // Next.js requires getting store values on mount
      const storedClientId = getProcessedSessionStoreValue(CLIENT_ID_SESSION_KEY);
      const storedClientSecret = getProcessedSessionStoreValue(CLIENT_SECRET_SESSION_KEY);

      if (storedClientId && storedClientSecret) {
        const controller = new AbortController();
        void (async () => {
          try {
            const validatedTokenResponse = await requestClientCredentialsToken({
              tokenUrl,
              clientId: storedClientId,
              clientSecret: storedClientSecret,
              signal: controller.signal,
            });
            if (controller.signal.aborted) return;
            setValidatedToken(validatedTokenResponse);
          } catch (caughtError: unknown) {
            if (controller.signal.aborted) return;
            setAuthErrorMessage(
              caughtError instanceof Error ? caughtError.message : 'Failed to validate credentials',
            );

            clearStoredCredentialsSession();
          } finally {
            // Changing the validation state is faster than navigation, so we delay the update to avoid UI flicker.
            setTimeout(() => {
              setIsValidatingCredentials(false);
            }, 1000);
          }
        })();
        return () => {
          controller.abort();
        };
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAuthSubmit = useCallback(async () => {
    setIsValidatingCredentials(true);
    setAuthErrorMessage(null);

    try {
      const validatedTokenResponse = await requestClientCredentialsToken({
        tokenUrl,
        clientId: clientIdInput,
        clientSecret: clientSecretInput,
      });
      // If successfull, store the credentials in session storage
      setStoredSessionValue(CLIENT_ID_SESSION_KEY, clientIdInput);
      setStoredSessionValue(CLIENT_SECRET_SESSION_KEY, clientSecretInput);
      setValidatedToken(validatedTokenResponse);
    } catch (caughtError: unknown) {
      setAuthErrorMessage(
        caughtError instanceof Error ? caughtError.message : 'Failed to validate credentials',
      );
    } finally {
      setIsValidatingCredentials(false);
    }
  }, [clientIdInput, clientSecretInput, tokenUrl]);

  // Page content based on authentication state
  let content: JSX.Element | null = (
    <AuthContext.Provider
      value={{
        accessToken: tokenState.accessToken,
        authorizationHeader: tokenState.authorizationHeader,
        expiresAt: tokenState.expiresAt,
        isAuthenticated: Boolean(tokenState.accessToken) && !tokenState.isExpired,
        isExpired: tokenState.isExpired,
        requestToken: tokenState.requestToken,
        clearToken: tokenState.clearToken,
        serverUrl: process.env.API_BASE,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
  if (isAuthEnabled) {
    if (isValidatingCredentials || tokenState.isLoading) {
      content = <ValidationLoader />;
    } else if (!validatedToken) {
      const setupCredentialsMessage =
        process.env.CREDENTIALS_SETUP_MESSAGE ||
        'The credentials are used for authenticated catalog requests. If you do not have credentials, contact the administrator.';
      content = (
        <main className="grid flex-1 place-items-center p-4">
          <div className="w-full max-w-xl pb-[30vh]">
            <AuthenticationForm
              eyebrow="API authentication"
              title="Enter API credentials"
              description={`${setupCredentialsMessage} Credentials stay available for this browser tab until it is closed.`}
              clientId={clientIdInput}
              clientSecret={clientSecretInput}
              onClientIdChange={setClientIdInput}
              onClientSecretChange={setClientSecretInput}
              onSubmit={handleAuthSubmit}
              submitText="Continue"
              errorMessage={authErrorMessage}
              autoFocusClientId
              isSubmitting={isValidatingCredentials}
              size="lg"
            />
          </div>
        </main>
      );
    }
  }

  return (
    <>
      <Navbar isAuthenticationEnabled={!!validatedToken} />
      {content}
    </>
  );
}
