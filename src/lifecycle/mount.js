import {
  MOUNTED,
  NOT_MOUNTED,
  SKIP_BECAUSE_BROKEN,
} from "../application/apps.helper";
import { reasonableTime } from "../application/timeout";
import { getProps } from "./helper";
import { toUnMountPromise } from "./unmount";

export function toMountPromise(app) {
  if (app.status !== NOT_MOUNTED) {
    return Promise.resolve(app);
  }

  app.status = MOUNTED;
  return reasonableTime(
    app.mount(getProps(app)),
    `app: ${app.name} mounting`,
    app.timeouts.mount
  )
    .then(() => {
      app.status = MOUNTED;
      return app;
    })
    .catch((e) => {
      app.status = SKIP_BECAUSE_BROKEN;
      toUnMountPromise(app);
      console.log(e);
    });
}
