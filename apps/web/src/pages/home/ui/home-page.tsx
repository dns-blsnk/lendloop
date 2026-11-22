import { APP_NAME, APP_TAGLINE } from '@lendloop/contracts';

import { SignInCta } from '@/features/auth';

export function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-16">
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-tight">{APP_NAME}</h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400">{APP_TAGLINE}</p>
      </div>
      <div>
        <SignInCta />
      </div>
    </main>
  );
}
