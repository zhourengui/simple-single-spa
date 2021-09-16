import { isStart } from "../start";
import {
  getAppsToLoad,
  getAppsToMount,
  getAppsToUnMount,
  getMountedApps,
} from "../application/apps";
import { toLoadPromise } from "../lifecycle/load";
import { toBootstrapPromise } from "../lifecycle/bootstrap";
import { toUnMountPromise } from "../lifecycle/unmount";
import { toMountPromise } from "../lifecycle/mount";
import { callCapturedEvents } from "./hijackLocation";

let loadAppsUnderway = false;
let pendingPromises = [];

export function invoke(pendings = [], eventArgs) {
  if (loadAppsUnderway) {
    // 正在循环
    return new Promise((resolve, reject) => {
      pendingPromises.push({
        success: resolve,
        failure: reject,
      });
    });
  }

  loadAppsUnderway = true;

  return isStart() ? performAppChanges() : loadApps();

  function loadApps() {
    // 预加载
    return Promise.all(getAppsToLoad().map(toLoadPromise))
      .then(() => {
        callAllLocationEvents();
        return finish();
      })
      .catch((e) => {
        callAllLocationEvents();
        console.log(e);
      });
  }

  function performAppChanges() {
    const unMountApps = getAppsToUnMount();
    const unmountPromises = Promise.all(unMountApps.map(toUnMountPromise));

    const loadApps = getAppsToLoad();
    const loadPromises = loadApps.map((app) =>
      toLoadPromise(app)
        .then(() => toBootstrapPromise(app))
        .then(() => unmountPromises)
        .then(() => toMountPromise(app))
    );

    const mountApps = getAppsToMount().filter(
      (app) => loadApps.indexOf(app) === -1
    );

    const mountPromises = mountApps.map((app) => {
      toBootstrapPromise(app)
        .then(() => unmountPromises)
        .then(() => toMountPromise(app));
    });

    return unmountPromises
      .then(() => {
        callAllLocationEvents();
        Promise.all(loadPromises.concat(mountPromises))
          .then(finish)
          .catch((e) => {
            pendings.forEach((item) => item.reject(e));
            finish();
          });
      })
      .catch((e) => {
        callAllLocationEvents();
        throw e;
      });
  }

  function finish() {
    const res = getMountedApps();

    pendings.forEach((item) => item.success(res));

    loadAppsUnderway = false;
    if (pendingPromises.length) {
      let backup = pendingPromises;
      pendingPromises = [];
      return invoke(backup);
    }

    return res;
  }

  function callAllLocationEvents() {
    pendings
      .filter((item) => !!item.eventArgs)
      .forEach((item) => callCapturedEvents(item.eventArgs));

    eventArgs && callCapturedEvents(eventArgs);
  }
}
