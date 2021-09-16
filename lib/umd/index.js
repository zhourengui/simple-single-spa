(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.SingleSpa = {}));
}(this, (function (exports) { 'use strict';

  const APPS = [];
  const NOT_LOADED = "NOT_LOADED";
  const NOT_MOUNTED = "NOT_MOUNTED";
  const SKIP_BECAUSE_BROKEN = "SKIP_BECAUSE_BROKEN";
  const LOAD_ERROR = "LOAD_ERROR";
  const LOAD_SOURCE_CODE = "LOAD_SOURCE_CODE";
  const NOT_BOOTSTRAPPED = "NOT_BOOTSTRAPPED";
  const BOOTSTRAPPED = "BOOTSTRAPPED";
  const MOUNTED = "MOUNTED";
  function noSkip(app) {
    return app.status !== SKIP_BECAUSE_BROKEN;
  }
  function noLoadError(app) {
    return app.status !== LOAD_ERROR;
  }
  function isntLoaded(app) {
    return app.status === NOT_LOADED;
  }
  function isLoaded(app) {
    return app.status !== NOT_LOADED && app.status !== SKIP_BECAUSE_BROKEN && app.status !== LOAD_ERROR;
  }
  function isActivity(app) {
    return app.status === MOUNTED;
  }
  function isntActivity(app) {
    return !isActivity(app);
  }
  function shouldBeActivity(app) {
    try {
      return app.activityWhen(window.location);
    } catch (error) {
      app.status = SKIP_BECAUSE_BROKEN;
    }
  }
  function shouldntBeActivity(app) {
    try {
      return !app.activityWhen(window.location);
    } catch (error) {
      app.status = SKIP_BECAUSE_BROKEN;
    }
  }

  let started = false;
  function start() {
    if (started) return;
    started = true;
    invoke();
  }
  function isStart() {
    return started;
  }

  const DEFAULT_TIMEOUTS = {
    bootstrap: {
      milliseconds: 3000,
      rejectWhenTimeout: false
    },
    mount: {
      milliseconds: 3000,
      rejectWhenTimeout: false
    },
    unmount: {
      milliseconds: 3000,
      rejectWhenTimeout: false
    }
  };
  function reasonableTime(lifecycle, description, timeout) {
    return new Promise((resolve, reject) => {
      let finished = false;
      lifecycle.then(resolve).catch(reject).finally(() => finished = true);
      setTimeout(() => {
        if (finished) return;

        if (timeout.rejectWhenTimeout) {
          reject(`${description}`);
        } else {
          console.log("timeout but waiting");
        }
      }, timeout.milliseconds);
    });
  }
  function ensureTimeout(timeouts = {}) {
    return { ...DEFAULT_TIMEOUTS,
      ...timeouts
    };
  }

  function smellLikePromise(promise) {
    if (promise instanceof Promise) {
      return true;
    }

    return promise && typeof promise === "object" && typeof promise.then === "function";
  }
  function flattenLifecyclesArray(lifecycles, description) {
    lifecycles = [].concat(lifecycles);
    return function (props) {
      return new Promise(async (resolve, reject) => {
        let index = 0;

        for await (const lifecycle of lifecycles) {
          const lifecyclePromise = lifecycle(props);

          if (!smellLikePromise(lifecyclePromise)) {
            reject(new Error(`${description} has error`));
            break;
          }

          try {
            await lifecyclePromise;
            index++;

            if (index === lifecycles.length) {
              resolve();
            }
          } catch (e) {
            reject(e);
            break;
          }
        }
      });
    };
  }
  function getProps(app) {
    return {
      name: app.name,
      status: app.status,
      ...app.customProps
    };
  }

  async function toLoadPromise(app) {
    if (app.status !== NOT_LOADED) {
      return Promise.resolve(app);
    }

    app.status = LOAD_SOURCE_CODE;
    const loadPromise = app.loadFunction(getProps(app));

    if (!smellLikePromise(loadPromise)) {
      app.status = SKIP_BECAUSE_BROKEN;
      return Promise.reject(new Error("loadPromise must return a promise or a thenable object"));
    }

    return loadPromise.then(appConfig => {
      if (typeof appConfig !== "object") {
        throw new Error("");
      }

      let errors = [];
      ["bootstrap", "mount", "unmount"].forEach(lifecycle => {
        if (!appConfig[lifecycle]) {
          errors.push("lifecycle: " + lifecycle + " must be exist");
        }
      });

      if (errors.length) {
        app.status = SKIP_BECAUSE_BROKEN;
        return app;
      }

      app.status = NOT_BOOTSTRAPPED;
      app.bootstrap = flattenLifecyclesArray(appConfig.bootstrap, "app: " + app.name + " bootstraping");
      app.mount = flattenLifecyclesArray(appConfig.mount, "app: " + app.name + " mounting");
      app.unmount = flattenLifecyclesArray(appConfig.unmount, "app: " + app.name + " unmounting");
      app.timeouts = ensureTimeout(appConfig.timeouts);
    }).catch(e => {
      console.error(e);
      app.status = LOAD_ERROR;
    }).finally(() => {
      return app;
    });
  }

  function toBootstrapPromise(app) {
    if (app.status !== NOT_BOOTSTRAPPED) {
      return Promise.resolve(app);
    }

    app.status = BOOTSTRAPPED;
    return reasonableTime(app.bootstrap(getProps(app)), `app: ${app.name} bootstraping`, app.timeouts.bootstrap).then(() => {
      app.status = NOT_MOUNTED;
      return app;
    }).catch(e => {
      app.status = SKIP_BECAUSE_BROKEN;
      throw e;
    });
  }

  function toUnMountPromise(app) {
    if (app.status !== MOUNTED) {
      return Promise.resolve(app);
    }

    app.status = NOT_MOUNTED;
    return reasonableTime(app.unmount(getProps(app)), `app: ${app.name} unmounting`, app.timeouts.unmount).then(() => {
      app.status = NOT_MOUNTED;
      return app;
    }).catch(e => {
      app.status = SKIP_BECAUSE_BROKEN;
      throw e;
    });
  }

  function toMountPromise(app) {
    if (app.status !== NOT_MOUNTED) {
      return Promise.resolve(app);
    }

    app.status = MOUNTED;
    return reasonableTime(app.mount(getProps(app)), `app: ${app.name} mounting`, app.timeouts.mount).then(() => {
      app.status = MOUNTED;
      return app;
    }).catch(e => {
      app.status = SKIP_BECAUSE_BROKEN;
      toUnMountPromise(app);
      console.log(e);
    });
  }

  const HIJACK_EVENTS_NAME = /^(hashchange|popstate)&/i;
  const EVENTS_POOL = {
    hashchange: [],
    popstate: []
  };
  function reroute() {
    invoke([], arguments);
  }
  window.addEventListener("hashchange", reroute);
  window.addEventListener("popstate", reroute);
  const originalAddEventListener = window.addEventListener;
  const originalRemoveEventListener = window.removeEventListener;

  window.addEventListener = function (eventName, handler) {
    if (eventName && HIJACK_EVENTS_NAME.test(eventName) && typeof handler === "function") {
      EVENTS_POOL[eventName].indexOf(handler) === -1 && EVENTS_POOL[eventName].push(handler);
      return;
    }

    originalAddEventListener.apply(this, arguments);
  };

  window.removeEventListener = function (eventName, handler) {
    if (eventName && HIJACK_EVENTS_NAME.test(eventName) && typeof handler === "function") {
      let eventList = EVENTS_POOL[eventName];
      eventList.indexOf(handler) > -1 && (EVENTS_POOL[eventName] = eventList.filter(fn => fn !== handler));
      return;
    }

    originalRemoveEventListener.apply(this, arguments);
  };

  function mockPopStateEvent(state) {
    return new PopStateEvent(state);
  }

  const originalPushState = window.history.pushState;
  const originalReplaceState = window.history.replaceState;

  window.history.pushState = function (state, title, url) {
    const res = originalPushState.apply(this, arguments);
    reroute(mockPopStateEvent(state));
    return res;
  };

  window.history.replaceState = function (state, title, url) {
    const res = originalReplaceState.apply(this, arguments);
    reroute(mockPopStateEvent(state));
    return res;
  };

  function callCapturedEvents(eventsArgs) {
    if (!eventsArgs) {
      return;
    }

    eventsArgs = [].concat(eventsArgs);

    if (!EVENTS_POOL[eventsArgs[0].type]) {
      return;
    }

    EVENTS_POOL[eventsArgs[0].type].forEach(handler => {
      handler.apply(null, eventsArgs);
    });
  }

  let loadAppsUnderway = false;
  let pendingPromises = [];
  function invoke(pendings = [], eventArgs) {
    if (loadAppsUnderway) {
      // 正在循环
      return new Promise((resolve, reject) => {
        pendingPromises.push({
          success: resolve,
          failure: reject
        });
      });
    }

    loadAppsUnderway = true;
    return isStart() ? performAppChanges() : loadApps();

    function loadApps() {
      // 预加载
      return Promise.all(getAppsToLoad().map(toLoadPromise)).then(() => {
        callAllLocationEvents();
        return finish();
      }).catch(e => {
        callAllLocationEvents();
        console.log(e);
      });
    }

    function performAppChanges() {
      const unMountApps = getAppsToUnMount();
      const unmountPromises = Promise.all(unMountApps.map(toUnMountPromise));
      const loadApps = getAppsToLoad();
      const loadPromises = loadApps.map(app => toLoadPromise(app).then(() => toBootstrapPromise(app)).then(() => unmountPromises).then(() => toMountPromise(app)));
      const mountApps = getAppsToMount().filter(app => loadApps.indexOf(app) === -1);
      const mountPromises = mountApps.map(app => {
        toBootstrapPromise(app).then(() => unmountPromises).then(() => toMountPromise(app));
      });
      return unmountPromises.then(() => {
        callAllLocationEvents();
        Promise.all(loadPromises.concat(mountPromises)).then(finish).catch(e => {
          pendings.forEach(item => item.reject(e));
          finish();
        });
      }).catch(e => {
        callAllLocationEvents();
        throw e;
      });
    }

    function finish() {
      const res = getMountedApps();
      pendings.forEach(item => item.success(res));
      loadAppsUnderway = false;

      if (pendingPromises.length) {
        let backup = pendingPromises;
        pendingPromises = [];
        return invoke(backup);
      }

      return res;
    }

    function callAllLocationEvents() {
      pendings.filter(item => !!item.eventArgs).forEach(item => callCapturedEvents(item.eventArgs));
      eventArgs && callCapturedEvents(eventArgs);
    }
  }

  /**
   * 注册app
   * @param {string} appName 注册的app名称
   * @param {Function<Promise>|Object} loadFunction app异步加载函数或app内容
   * @param {Function<Boolean>} activityWhen 判断app什么时候启动
   * @param {Object} customProps 自定义配置
   * @return {Promise}
   */

  function registerApplication(appName, loadFunction, activityWhen, customProps = {}) {
    if (!appName && typeof appName !== "string") {
      throw new TypeError("appName must be a non-empty string");
    }

    if (!loadFunction) {
      throw new TypeError("loadFunction must be a function or object");
    }

    if (typeof loadFunction !== "function") {
      loadFunction = () => Promise.resolve(loadFunction);
    }

    if (typeof activityWhen !== "function") {
      throw new TypeError("activityWhen must be a function");
    }

    APPS.push({
      name: appName,
      loadFunction,
      activityWhen,
      customProps,
      status: NOT_LOADED
    });
    invoke();
  }
  function getAppsToLoad() {
    return APPS.filter(noSkip).filter(noLoadError).filter(isntLoaded).filter(shouldBeActivity);
  }
  function getAppsToUnMount() {
    return APPS.filter(noSkip).filter(isActivity).filter(shouldntBeActivity);
  }
  function getAppsToMount() {
    return APPS.filter(noSkip).filter(isLoaded).filter(isntActivity).filter(shouldBeActivity);
  }
  function getMountedApps() {
    return APPS.filter(isActivity);
  }

  exports.registerApplication = registerApplication;
  exports.start = start;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=index.js.map
