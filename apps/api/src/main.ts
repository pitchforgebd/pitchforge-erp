import 'reflect-metadata';

import { createApp } from './bootstrap.ts';
import { loadConfig } from './platform/config/config.ts';

const config = loadConfig(process.env);
const app = await createApp({ config });
await app.listen(config.port);
