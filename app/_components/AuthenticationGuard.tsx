'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AuthProvider } from '../../lib/context/AuthContext';
import {
  isAuthenticationEnabled,
  requestClientCredentialsToken,
  type RequestClientCredentialsTokenResult,
} from '../../lib/services/auth';
import { CLIENT_ID_SESSION_KEY, CLIENT_SECRET_SESSION_KEY } from '../../lib/utils/constants';
import {
  clearStoredCredentialsSession,
  getStoredSessionValue,
  setStoredSessionValue,
} from '../../lib/utils/storage';
import { ValidationLoader } from './ValidationLoader';
import { isNonEmptyString } from '@/lib/utils/strings';
import { AuthenticationForm } from './AuthenticationForm';

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
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [seedToken, setSeedToken] = useState<RequestClientCredentialsTokenResult | null>(null);
  console.log(clientId, clientSecret);
  console.log(seedToken);

  // App states
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [isValidatingCredentials, setIsValidatingCredentials] = useState(shouldValidateCredentials);
  const [isMounted, setIsMounted] = useState(false);
  const [areClientCredentialsProvided, setAreClientCredentialsProvided] = useState(false);

  // Authentication status
  const isAuthEnabled = isAuthenticationEnabled(serverUrl, tokenUrl);
  const shouldValidateCredentials =
    isAuthEnabled && isMounted && areClientCredentialsProvided && seedToken === null;

  const handleAuthSubmit = useCallback(async () => {
    setIsValidatingCredentials(true);
    setAuthErrorMessage(null);

    try {
      const validatedToken = await requestClientCredentialsToken({
        tokenUrl,
        clientId,
        clientSecret,
      });
      // If successfull, store the credentials in session storage
      setStoredSessionValue(CLIENT_ID_SESSION_KEY, clientId);
      setStoredSessionValue(CLIENT_SECRET_SESSION_KEY, clientSecret);

      setSeedToken(validatedToken);
    } catch (caughtError: unknown) {
      if (!(caughtError instanceof DOMException && caughtError.name === 'AbortError')) {
        setAuthErrorMessage(
          caughtError instanceof Error ? caughtError.message : 'Failed to validate credentials.',
        );
      }
    } finally {
      setIsValidatingCredentials(false);
    }
  }, [clientId, clientSecret, tokenUrl]);

  // Authentication on load
  useEffect(() => {
    // Load stored credentials from session storage on mount
    const storedClientId = getStoredSessionValue(CLIENT_ID_SESSION_KEY);
    const storedClientSecret = getStoredSessionValue(CLIENT_SECRET_SESSION_KEY);
    setClientId(storedClientId);
    setClientSecret(storedClientSecret);
    setAreClientCredentialsProvided(areClientCredentialsProvided);
    setIsMounted(true);
    if (isAuthEnabled) {
      const controller = new AbortController();
      (async () => {
        if (shouldValidateCredentials) {
          setIsValidatingCredentials(true);

          try {
            const validatedToken = await requestClientCredentialsToken({
              tokenUrl,
              clientId: storedClientId,
              clientSecret: storedClientSecret,
              signal: controller.signal,
            });

            setSeedToken(validatedToken);
          } catch (caughtError: unknown) {
            if (caughtError instanceof DOMException && caughtError.name === 'AbortError') {
              return;
            }
            if (caughtError instanceof Error) {
              setAuthErrorMessage(caughtError.message);
            }

            clearStoredCredentialsSession();
            setClientId('');
            setClientSecret('');
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

  if (!isAuthEnabled) {
    return (
      <AuthProvider tokenUrl="" clientId="" enabled={false}>
        {children}
      </AuthProvider>
    );
  }

  if (isValidatingCredentials) {
    return <ValidationLoader />;
  }

  if (!areClientCredentialsProvided) {
    const setupCredentialsMessage =
      process.env.CREDENTIALS_SETUP_MESSAGE ||
      'The credentials are used for authenticated catalog requests. If you do not have credentials, contact the administrator.';
    return (
      <main className="grid flex-1 place-items-center p-4">
        <div className="w-full max-w-xl pb-[30vh]">
          <AuthenticationForm
            eyebrow="API authentication"
            title="Enter API credentials"
            description={`${setupCredentialsMessage} Credentials stay available for this browser tab until it is closed.`}
            clientId={clientId}
            clientSecret={clientSecret}
            onClientIdChange={setClientId}
            onClientSecretChange={setClientSecret}
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
    <AuthProvider
      tokenUrl={tokenUrl}
      clientId={clientId}
      clientSecret={clientSecret}
      enabled
      seedToken={seedToken}
    >
      {children}
    </AuthProvider>
  );
}
