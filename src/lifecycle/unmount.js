import {
  MOUNTED,
  NOT_MOUNTED,
  SKIP_BECAUSE_BROKEN,
} from "../application/apps.helper";
import { reasonableTime } from "../application/timeout";
import { getProps } from "./helper";

export function toUnMountPromise(app) {
  if (app.status !== MOUNTED) {
    return Promise.resolve(app);
  }

  app.status = NOT_MOUNTED;

  return reasonableTime(
    app.unmount(getProps(app)),
    `app: ${app.name} unmounting`,
    app.timeouts.unmount
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
