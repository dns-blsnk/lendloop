import { APP_NAME, APP_TAGLINE } from '@lendloop/contracts';

import type { Metadata } from 'next';

export const rootMetadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: APP_TAGLINE,
};
