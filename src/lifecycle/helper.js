export function smellLikePromise(promise) {
  if (promise instanceof Promise) {
    return true;
  }
  return (
    promise && typeof promise === "object" && typeof promise.then === "function"
  );
}

export function flattenLifecyclesArray(lifecycles, description) {
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

export function getProps(app) {
  return {
    name: app.name,
    status: app.status,
    ...app.customProps,
  };
}
