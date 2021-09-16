export const DEFAULT_TIMEOUTS = {
  bootstrap: {
    milliseconds: 3000,
    rejectWhenTimeout: false,
  },
  mount: {
    milliseconds: 3000,
    rejectWhenTimeout: false,
  },
  unmount: {
    milliseconds: 3000,
    rejectWhenTimeout: false,
  },
};

export function reasonableTime(lifecycle, description, timeout) {
  return new Promise((resolve, reject) => {
    let finished = false;
    lifecycle
      .then(resolve)
      .catch(reject)
      .finally(() => (finished = true));

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

export function ensureTimeout(timeouts = {}) {
  return {
    ...DEFAULT_TIMEOUTS,
    ...timeouts,
  };
}
