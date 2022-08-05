import 'dotenv/config';
import Koa from 'koa';
import Router from 'koa-router';
import * as Sentry from '@sentry/node';

const app = new Koa();
const router = new Router();

// It is important that all preceding middleware are async and await
// their next() call. Otherwise, Vercel will kill the builder process before
// the Sentry event gets sent.
async function sentryMiddleware(ctx, next) { 
  try {
    await next();
  } catch (err) {
    // We will only initialize Sentry if an error occurs. 
    // Make sure to add a SENTRY_DSN environment variable.
    Sentry.init({ dsn: process.env.SENTRY_DSN });
    Sentry.withScope(scope => {
      scope.addEventProcessor((event) => {
        return Sentry.addRequestDataToEvent(event, ctx.request);
      });
      Sentry.captureException(err);
    });
    // Close the Sentry instance to force any queued events to be sent.
    // This is required because Vercel will kill the builder process before
    // these get sent otherwise. 2000 is a timeout value in milliseconds.
    await Sentry.close(2000);
  };
};

router.get('/error', async ctx => {
  ctx.status = 500;
  throw new Error('This is a test error');
});

router.get('/', ctx => {
  ctx.body = "Howdy";
});

app.use(sentryMiddleware);
app.use(router.routes());
app.listen(3001);
