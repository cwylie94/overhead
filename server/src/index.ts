import { createApp } from './app';
import type { D1Like } from './d1';

const app = createApp();

export default {
  fetch: (request: Request, env: { DB: D1Database }, context: ExecutionContext) =>
    app.fetch(request, { DB: env.DB satisfies D1Like }, context),
};
