import {
  BOOTSTRAPPED,
  NOT_BOOTSTRAPPED,
  NOT_MOUNTED,
  SKIP_BECAUSE_BROKEN,
} from "../application/apps.helper";
import { reasonableTime } from "../application/timeout";
import { getProps } from "./helper";

export function toBootstrapPromise(app) {
  if (app.status !== NOT_BOOTSTRAPPED) {
    return Promise.resolve(app);
  }

  app.status = BOOTSTRAPPED;

  return reasonableTime(
    app.bootstrap(getProps(app)),
    `app: ${app.name} bootstraping`,
    app.timeouts.bootstrap
  )
    .then(() => {
      app.status = NOT_MOUNTED;
      return app;
    })
    .catch((e) => {
      app.status = SKIP_BECAUSE_BROKEN;
      throw e;
    });
}
