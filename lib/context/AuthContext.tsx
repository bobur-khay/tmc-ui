import { useClientCredentialsToken } from '../hooks/useClientCredentialsToken';
import { AuthContext, type AuthProviderProps } from './index';

export const AuthProvider = ({
  children,
  tokenUrl,
  clientId,
  clientSecret,
  seedToken = null,
}: AuthProviderProps) => {
  const tokenState = useClientCredentialsToken({
    tokenUrl: tokenUrl ?? '',
    clientId: clientId ?? '',
    clientSecret: clientSecret ?? '',
    seedToken,
  });

  return (
    <AuthContext.Provider
      value={{
        accessToken: tokenState.accessToken,
        authorizationHeader: tokenState.authorizationHeader,
        expiresAt: tokenState.expiresAt,
        isAuthenticated: Boolean(tokenState.accessToken) && !tokenState.isExpired,
        isExpired: tokenState.isExpired,
        isLoading: tokenState.isLoading,
        error: tokenState.error,
        requestToken: tokenState.requestToken,
        clearToken: tokenState.clearToken,
        serverUrl: process.env.API_BASE,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
