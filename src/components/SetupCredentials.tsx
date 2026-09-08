import CredentialsForm from './CredentialsForm';

interface CredentialsPromptProps {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly onClientIdChange: (value: string) => void;
  readonly onClientSecretChange: (value: string) => void;
  readonly onSubmit: () => void;
  readonly errorMessage?: string | null;
  readonly isSubmitting?: boolean;
}

const CredentialsPrompt: React.FC<CredentialsPromptProps> = ({
  clientId,
  clientSecret,
  onClientIdChange,
  onClientSecretChange,
  onSubmit,
  errorMessage = null,
  isSubmitting = false,
}: CredentialsPromptProps) => {
  const helperText = 'Credentials stay available for this browser tab until it is closed.';

  const setupCredentialsMessage =
    import.meta.env.VITE_SETUP_CREDENTIALS_MESSAGE ||
    'The credentials are used for authenticated catalog requests. If you do not have credentials, contact the administrator.';

  return (
    <main className="min-h-[calc(100dvh-4rem)] bg-surface-canvas px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100dvh-9rem)] max-w-6xl items-center justify-center">
        <div className="w-full max-w-xl">
          <CredentialsForm
            eyebrow="API authentication"
            title="Enter API credentials"
            description={`${setupCredentialsMessage} ${helperText}`}
            clientId={clientId}
            clientSecret={clientSecret}
            onClientIdChange={onClientIdChange}
            onClientSecretChange={onClientSecretChange}
            onSubmit={onSubmit}
            submitText="Continue"
            errorMessage={errorMessage}
            autoFocusClientId
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </main>
  );
};

export default CredentialsPrompt;
