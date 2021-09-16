export const APPS = [];

export const NOT_LOADED = "NOT_LOADED";
export const NOT_MOUNTED = "NOT_MOUNTED";
export const SKIP_BECAUSE_BROKEN = "SKIP_BECAUSE_BROKEN";
export const LOAD_ERROR = "LOAD_ERROR";
export const LOAD_SOURCE_CODE = "LOAD_SOURCE_CODE";
export const NOT_BOOTSTRAPPED = "NOT_BOOTSTRAPPED";
export const BOOTSTRAPPED = "BOOTSTRAPPED";
export const MOUNTED = "MOUNTED";
export const LOAD_RESOURCE_CODE = "LOAD_RESOURCE_CODE";
export const UPDATING = "UPDATING";

export function noSkip(app) {
  return app.status !== SKIP_BECAUSE_BROKEN;
}

export function noLoadError(app) {
  return app.status !== LOAD_ERROR;
}

export function isntLoaded(app) {
  return app.status === NOT_LOADED;
}

export function isLoaded(app) {
  return (
    app.status !== NOT_LOADED &&
    app.status !== SKIP_BECAUSE_BROKEN &&
    app.status !== LOAD_ERROR
  );
}

export function isActivity(app) {
  return app.status === MOUNTED;
}

export function isntActivity(app) {
  return !isActivity(app);
}

export function shouldBeActivity(app) {
  try {
    return app.activityWhen(window.location);
  } catch (error) {
    app.status = SKIP_BECAUSE_BROKEN;
  }
}

export function shouldntBeActivity(app) {
  try {
    return !app.activityWhen(window.location);
  } catch (error) {
    app.status = SKIP_BECAUSE_BROKEN;
  }
}
