import React from 'react';
import Button from './base/Button';

type AppErrorProps = {
  codeError?: number; // TODO: create a proper error code handling mechanism
  titleError?: string;
  descriptionError?: string;
};

const DEFAULT_DESCRIPTION_ERROR = 'Please try again later';

const AppError: React.FC<AppErrorProps> = ({ titleError, descriptionError }) => {
  const resolvedTitleError = titleError ?? 'An unknown error occurred';
  const resolvedDescriptionError = descriptionError ?? DEFAULT_DESCRIPTION_ERROR;

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <>
      <div className="grid min-h-dvh place-items-center bg-surface-canvas px-6 py-24 sm:py-32 lg:px-8">
        <div className="text-center">
          {/* Not fully functional yet */}
          {/* <p className="text-base font-semibold text-status-error">Error {codeError}</p> */}
          <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight text-text-primary sm:text-7xl">
            {resolvedTitleError}
          </h1>
          <p className="mt-6 text-pretty text-lg font-medium text-text-secondary sm:text-xl/8">
            {resolvedDescriptionError}
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button
              type="button"
              onClick={handleReload}
              text="Reload"
              className="border pl-4 pr-4"
              variant="default"
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default AppError;
