import React from 'react';
import Button from './base/Button';

type AppErrorProps = {
  codeError?: number; // TODO: create a proper error code handling mechanism
  titleError?: string;
  descriptionError?: string;
};

const DEFAULT_DESCRIPTION_ERROR = 'Please try again later';

export function AppError({ titleError, descriptionError }: AppErrorProps) {
  const resolvedTitleError = titleError ?? 'An unknown error occurred';
  const resolvedDescriptionError = descriptionError ?? DEFAULT_DESCRIPTION_ERROR;

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <>
      <div className="bg-surface-canvas grid min-h-dvh place-items-center px-6 py-24 sm:py-32 lg:px-8">
        <div className="text-center">
          {/* Not fully functional yet */}
          {/* <p className="text-base font-semibold text-status-error">Error {codeError}</p> */}
          <h1 className="text-text-primary mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-7xl">
            {resolvedTitleError}
          </h1>
          <p className="text-text-secondary mt-6 text-lg font-medium text-pretty sm:text-xl/8">
            {resolvedDescriptionError}
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Button
              type="button"
              onClick={handleReload}
              text="Reload"
              className="border pr-4 pl-4"
              variant="default"
            />
          </div>
        </div>
      </div>
    </>
  );
}
