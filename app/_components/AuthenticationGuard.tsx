'use client';

import { type JSX, useCallback, useEffect, useState, type ReactNode } from 'react';
import { AuthProvider } from '../../lib/context/AuthContext';
import {
  isAuthenticationEnabled,
  requestClientCredentialsToken,
  type RequestClientCredentialsTokenResult,
} from '../../lib/services/auth';
import { CLIENT_ID_SESSION_KEY, CLIENT_SECRET_SESSION_KEY } from '../../lib/utils/constants';
import { isNonEmptyString } from '../../lib/utils/strings';
import {
  clearStoredCredentialsSession,
  getStoredSessionValue,
  setStoredSessionValue,
} from '../../lib/utils/storage';
import { ValidationLoader } from './ValidationLoader';
import { AuthenticationForm } from './AuthenticationForm';
import Navbar from './Navbar';

interface AuthenticationGuardProps {
  readonly children: ReactNode;
  readonly serverUrl?: string;
  readonly tokenUrl?: string;
}

export default function AuthenticationGuard({
  children,
  serverUrl = '',
  tokenUrl = '',
}: AuthenticationGuardProps) {
  // Credentials
  const [clientIdInput, setClientIdInput] = useState('');
  const [clientSecretInput, setClientSecretInput] = useState('');
  const [validatedToken, setValidatedToken] = useState<RequestClientCredentialsTokenResult | null>(
    null,
  );

  //Authentication states
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [isValidatingCredentials, setIsValidatingCredentials] = useState(false);

  // Authentication status
  const isAuthEnabled = isAuthenticationEnabled(serverUrl, tokenUrl);
  console.log({ clientIdInput, clientSecretInput, validatedToken });

  // Authentication on load
  useEffect(() => {
    if (isAuthEnabled) {
      // Next.js requires getting store values on mount
      const storedClientId = getStoredSessionValue(CLIENT_ID_SESSION_KEY);
      const storedClientSecret = getStoredSessionValue(CLIENT_SECRET_SESSION_KEY);
      const isStoredClientIdNonEmpty = isNonEmptyString(storedClientId);
      const isStoredClientSecretNonEmpty = isNonEmptyString(storedClientSecret);

      isStoredClientIdNonEmpty && setClientIdInput(storedClientId);
      isStoredClientSecretNonEmpty && setClientSecretInput(storedClientSecret);

      const controller = new AbortController();
      (async () => {
        if (isStoredClientIdNonEmpty && isStoredClientSecretNonEmpty) {
          setIsValidatingCredentials(true);

          try {
            const validatedTokenResponse = await requestClientCredentialsToken({
              tokenUrl,
              clientId: storedClientId,
              clientSecret: storedClientSecret,
              signal: controller.signal,
            });

            setValidatedToken(validatedTokenResponse);
          } catch (caughtError: unknown) {
            if (caughtError instanceof DOMException && caughtError.name === 'AbortError') {
              return;
            }
            setAuthErrorMessage(
              caughtError instanceof Error
                ? caughtError.message
                : 'Failed to validate credentials.',
            );

            clearStoredCredentialsSession();
            setClientIdInput('');
            setClientSecretInput('');
          } finally {
            setIsValidatingCredentials(false);
          }
        }
      })();
      return () => {
        controller.abort();
      };
    }
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
        caughtError instanceof Error ? caughtError.message : 'Failed to validate credentials.',
      );
    } finally {
      setIsValidatingCredentials(false);
    }
  }, [clientIdInput, clientSecretInput, tokenUrl]);

  // Page content based on authentication state
  let content: JSX.Element | null = (
    <AuthProvider
      tokenUrl={tokenUrl}
      clientId={clientIdInput}
      clientSecret={clientSecretInput}
      enabled={isAuthEnabled}
      seedToken={validatedToken}
    >
      {children}
    </AuthProvider>
  );
  if (isValidatingCredentials) {
    content = <ValidationLoader />;
  } else if (isAuthEnabled && !validatedToken) {
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

  return (
    <>
      <Navbar isAuthenticationEnabled={!!validatedToken} />
      {content}
    </>
  );
}
