import {
  NOT_LOADED,
  APPS,
  noSkip,
  noLoadError,
  isntLoaded,
  shouldBeActivity,
  isActivity,
  shouldntBeActivity,
  isLoaded,
  isntActivity,
} from "./apps.helper";
import { invoke } from "../navigation/invoke";

/**
 * 注册app
 * @param {string} appName 注册的app名称
 * @param {Function<Promise>|Object} loadFunction app异步加载函数或app内容
 * @param {Function<Boolean>} activityWhen 判断app什么时候启动
 * @param {Object} customProps 自定义配置
 * @return {Promise}
 */
export function registerApplication(
  appName,
  loadFunction,
  activityWhen,
  customProps = {}
) {
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
    status: NOT_LOADED,
  });

  invoke();
}

export function getAppsToLoad() {
  return APPS.filter(noSkip)
    .filter(noLoadError)
    .filter(isntLoaded)
    .filter(shouldBeActivity);
}

export function getAppsToUnMount() {
  return APPS.filter(noSkip).filter(isActivity).filter(shouldntBeActivity);
}

export function getAppsToMount() {
  return APPS.filter(noSkip)
    .filter(isLoaded)
    .filter(isntActivity)
    .filter(shouldBeActivity);
}

export function getMountedApps() {
  return APPS.filter(isActivity);
}
