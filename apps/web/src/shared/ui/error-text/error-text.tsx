/** A failure message announced to screen readers; renders nothing without a message. */
export function ErrorText({ message }: { message: string | null }) {
  if (message === null) {
    return null;
  }
  return (
    <p role="alert" className="text-sm text-red-700 dark:text-red-300">
      {message}
    </p>
  );
}
