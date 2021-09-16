import {
  LOAD_RESOURCE_CODE,
  MOUNTED,
  NOT_BOOTSTRAPPED,
  SKIP_BECAUSE_BROKEN,
} from "../application/apps.helper";
import { ensureTimeout } from "../application/timeout";
import { toBootstrapPromise } from "../lifecycle/bootstrap";
import { flattenLifecyclesArray } from "../lifecycle/helper";
import { toMountPromise } from "../lifecycle/mount";
import { toUnmountPromise } from "../lifecycle/unmount";
import { toUpdatePromise } from "../lifecycle/update";

let serviceIndex = 0;

const systemService = { services: {} };

/**
 * 挂载系统服务
 * @return {{mount(): Promise, unmount(): Promise, update(Object): Promise, getStatus(): string}}
 */
export function mountSystemService() {
  return mountService.apply(systemService, arguments);
}

/**
 * 根据名称获取系统服务
 * @param {string} serviceName 系统服务名称
 * @return {*|null}
 */
export function getSystemService(serviceName) {
  return systemService[serviceName] || {};
}

/**
 * 挂载服务
 * @param {Object|Function<Promise>} config 服务配置或加载函数
 * @param {Object} props 传入服务的属性
 * @return {{mount(): Promise, unmount(): Promise, update(Object): Promise, getStatus(): string}}
 */
export function mountService(config, props = {}) {
  if (!config || !/^(object|function)$/.test(typeof config)) {
    throw new Error(
      "cannot mount services without config or config load function"
    );
  }

  const context = this;
  serviceIndex++;

  let loadServicePromise =
    typeof config === "function" ? config() : () => Promise.resolve(config);

  if (!smellLikeAPromise(loadServicePromise)) {
    throw new Error("config load function must be a promise or thenable");
  }

  const service = {
    id: serviceIndex,
    services: {},
    status: LOAD_RESOURCE_CODE,
    props,
    context,
  };

  loadServicePromise = loadServicePromise.then((serviceConfig) => {
    let errorMsg = [];
    const name = `service_${service.id}`;

    if (typeof serviceConfig !== "object") {
      errorMsg.push(`service load function dose not export anything`);
    }

    ["bootstrap", "mount", "unmount", "update"].forEach((lifecycle) => {
      // update是可选的
      if (lifecycle === "update" && !serviceConfig[lifecycle]) {
        return;
      }
      if (!validateLifeCyclesFn(serviceConfig[lifecycle])) {
        errorMsg.push(
          `service dost not export ${lifecycle} as a function or function array`
        );
      }
    });

    if (errorMsg.length) {
      service.status = SKIP_BECAUSE_BROKEN;
      throw new Error(errorMsg.toString());
    }

    service.name = name;
    service.status = NOT_BOOTSTRAPPED;
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

    if (serviceConfig.update) {
      service.update = flattenLifecyclesArray(
        serviceConfig.update,
        "service update functions"
      );
    }
  });

  loadServicePromise = loadServicePromise.then(() =>
    toBootstrapPromise(service)
  );

  let actions = {
    mount() {
      return loadServicePromise
        .then(() => {
          context.services[service.name] = service;
          return toMountPromise(service);
        })
        .then(() => {
          if (service.status !== MOUNTED) {
            delete context.services[service.name];
          }
        });
    },
    unmount() {
      return toUnmountPromise(service).then(() => {
        delete context.services[service.name];
      });
    },
    update(props = {}) {
      service.props = props;
      return toUpdatePromise(service);
    },
    getStatus() {
      return service.status;
    },
    getRawData() {
      return { ...service };
    },
  };

  service.unmountSelf = actions.unmount;
  service.mountSelf = actions.mount;
  service.updateSelf = actions.update;

  return actions;
}
