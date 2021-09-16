import {
  LOAD_SOURCE_CODE,
  NOT_LOADED,
  SKIP_BECAUSE_BROKEN,
  NOT_BOOTSTRAPPED,
  LOAD_ERROR,
} from "../application/apps.helper";
import { ensureTimeout } from "../application/timeout";
import { flattenLifecyclesArray, smellLikePromise, getProps } from "./helper";

export async function toLoadPromise(app) {
  if (app.status !== NOT_LOADED) {
    return Promise.resolve(app);
  }

  app.status = LOAD_SOURCE_CODE;

  const loadPromise = app.loadFunction(getProps(app));

  if (!smellLikePromise(loadPromise)) {
    app.status = SKIP_BECAUSE_BROKEN;
    return Promise.reject(
      new Error("loadPromise must return a promise or a thenable object")
    );
  }

  return loadPromise
    .then((appConfig) => {
      if (typeof appConfig !== "object") {
        throw new Error("");
      }

      let errors = [];
      ["bootstrap", "mount", "unmount"].forEach((lifecycle) => {
        if (!appConfig[lifecycle]) {
          errors.push("lifecycle: " + lifecycle + " must be exist");
        }
      });

      if (errors.length) {
        app.status = SKIP_BECAUSE_BROKEN;
        return app;
      }

      app.status = NOT_BOOTSTRAPPED;
      app.bootstrap = flattenLifecyclesArray(
        appConfig.bootstrap,
        "app: " + app.name + " bootstraping"
      );
      app.mount = flattenLifecyclesArray(
        appConfig.mount,
        "app: " + app.name + " mounting"
      );
      app.unmount = flattenLifecyclesArray(
        appConfig.unmount,
        "app: " + app.name + " unmounting"
      );
      app.timeouts = ensureTimeout(appConfig.timeouts);
    })
    .catch((e) => {
      console.error(e);
      app.status = LOAD_ERROR;
    })
    .finally(() => {
      return app;
    });
}
