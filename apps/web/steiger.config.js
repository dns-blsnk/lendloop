import fsd from '@feature-sliced/steiger-plugin';
import { defineConfig } from 'steiger';

/** Feature-Sliced Design rules for the web app's layers. */
export default defineConfig([...fsd.configs.recommended]);
