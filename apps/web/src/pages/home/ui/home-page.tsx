import { APP_NAME, APP_TAGLINE } from '@lendloop/contracts';

import { Header } from '@/widgets/header';

import { PublicToolList } from './public-tool-list';

export function HomePage() {
  return (
    <>
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-4 py-12">
        <section className="flex flex-col gap-4">
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{APP_NAME}</h1>
          <p className="max-w-xl text-lg text-muted">{APP_TAGLINE}</p>
          <p className="max-w-xl text-muted">
            Neighbours list the tools they rarely use. Ask for a drill or a tent for a few days, and
            give it back when you are done.
          </p>
        </section>
        <section className="flex flex-col gap-4" aria-labelledby="available-heading">
          <h2 id="available-heading" className="text-xl font-semibold">
            Available today
          </h2>
          <PublicToolList />
        </section>
      </main>
    </>
  );
}
