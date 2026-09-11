'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AuthProvider } from '../../lib/context/AuthContext';
import {
  requestClientCredentialsToken,
  type RequestClientCredentialsTokenResult,
} from '../../lib/services/auth';
import { CLIENT_ID_SESSION_KEY, CLIENT_SECRET_SESSION_KEY } from '../../lib/utils/constants';
import {
  clearStoredCredentialsSession,
  getStoredCredentialsSubmitted,
  getStoredSessionValue,
  setStoredCredentialsSubmitted,
  setStoredSessionValue,
} from '../../lib/utils/storage';
import Loader from './base/Loader';
import SetupCredentials from './SetupCredentials';
import { isNonEmptyString } from '@/lib/utils/strings';

interface AuthenticationGuardProps {
  readonly children: ReactNode;
  readonly serverUrl?: string;
  readonly tokenUrl?: string;
}
interface AppError {
  message: string;
  description: string;
  code: number;
}

export default function AuthenticationGuard({
  children,
  serverUrl = '',
  tokenUrl = '',
}: AuthenticationGuardProps) {
  // Credentials
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [hasLoadedStoredCredentials, setHasLoadedStoredCredentials] = useState(false);
  const [seedToken, setSeedToken] = useState<RequestClientCredentialsTokenResult | null>(null);

  // App states
  const [error, setError] = useState<AppError | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Authentication status
  const isAuthEnabled = isNonEmptyString(serverUrl) && isNonEmptyString(tokenUrl);
  const shouldValidateStoredCredentials = isAuthEnabled && seedToken === null;

  useEffect(() => {
    setClientId(getStoredSessionValue(CLIENT_ID_SESSION_KEY));
    setClientSecret(getStoredSessionValue(CLIENT_SECRET_SESSION_KEY));
    setHasLoadedStoredCredentials(true);
  }, []);

  const commitCredentials = useCallback(
    (
      nextClientId: string,
      nextClientSecret: string,
      validatedToken: RequestClientCredentialsTokenResult,
    ) => {
      setStoredSessionValue(CLIENT_ID_SESSION_KEY, nextClientId);
      setStoredSessionValue(CLIENT_SECRET_SESSION_KEY, nextClientSecret);
      setStoredCredentialsSubmitted(true);
      setClientId(nextClientId);
      setClientSecret(nextClientSecret);
      setCredentialsSubmitted(true);
      setSeedToken(validatedToken);
      setError(null);
    },
    [],
  );

  const handleSubmit = useCallback(async () => {
    setIsValidating(true);
    setError(null);

    try {
      const validatedToken = await requestClientCredentialsToken({
        tokenUrl,
        clientId,
        clientSecret,
      });
      commitCredentials(clientId, clientSecret, validatedToken);
    } catch (caughtError: unknown) {
      if (!(caughtError instanceof DOMException && caughtError.name === 'AbortError')) {
        setError(
          caughtError instanceof Error ? caughtError.message : 'Failed to validate credentials.',
        );
      }
    } finally {
      setIsValidating(false);
    }
  }, [clientId, clientSecret, commitCredentials, tokenUrl]);

  useEffect(() => {
    if (!shouldValidateStoredCredentials) {
      return;
    }

    const controller = new AbortController();
    let isActive = true;

    setIsValidating(true);
    setError(null);

    void requestClientCredentialsToken({
      tokenUrl,
      clientId,
      clientSecret,
      signal: controller.signal,
    })
      .then((validatedToken) => {
        if (isActive) {
          setSeedToken(validatedToken);
        }
      })
      .catch((caughtError: unknown) => {
        if (
          !isActive ||
          (caughtError instanceof DOMException && caughtError.name === 'AbortError')
        ) {
          return;
        }

        clearStoredCredentialsSession();
        setClientId('');
        setClientSecret('');
        setCredentialsSubmitted(false);
        setError(
          caughtError instanceof Error ? caughtError.message : 'Failed to validate credentials.',
        );
      })
      .finally(() => {
        if (isActive) {
          setIsValidating(false);
        }
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [clientId, clientSecret, shouldValidateStoredCredentials, tokenUrl]);

  if (!isAuthEnabled) {
    return (
      <AuthProvider tokenUrl="" clientId="" enabled={false}>
        {children}
      </AuthProvider>
    );
  }

  if (!hasLoadedStoredCredentials) {
    return null;
  }

  if (!credentialsReady) {
    return (
      <SetupCredentials
        clientId={clientId}
        clientSecret={clientSecret}
        onClientIdChange={handleClientIdChange}
        onClientSecretChange={handleClientSecretChange}
        onSubmit={handleSubmit}
        errorMessage={error}
        isSubmitting={isValidating}
      />
    );
  }

  if (shouldValidateStoredCredentials) {
    return (
      <main className="bg-surface-canvas min-h-dvh px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100dvh-5rem)] max-w-6xl items-center justify-center">
          <Loader text="Validating saved credentials..." />
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
