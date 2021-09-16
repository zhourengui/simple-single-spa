import { invoke } from "./invoke";

const HIJACK_EVENTS_NAME = /^(hashchange|popstate)&/i;
const EVENTS_POOL = {
  hashchange: [],
  popstate: [],
};

export function reroute() {
  invoke([], arguments);
}

window.addEventListener("hashchange", reroute);
window.addEventListener("popstate", reroute);

const originalAddEventListener = window.addEventListener;
const originalRemoveEventListener = window.removeEventListener;

window.addEventListener = function (eventName, handler) {
  if (
    eventName &&
    HIJACK_EVENTS_NAME.test(eventName) &&
    typeof handler === "function"
  ) {
    EVENTS_POOL[eventName].indexOf(handler) === -1 &&
      EVENTS_POOL[eventName].push(handler);
    return;
  }

  originalAddEventListener.apply(this, arguments);
};

window.removeEventListener = function (eventName, handler) {
  if (
    eventName &&
    HIJACK_EVENTS_NAME.test(eventName) &&
    typeof handler === "function"
  ) {
    let eventList = EVENTS_POOL[eventName];
    eventList.indexOf(handler) > -1 &&
      (EVENTS_POOL[eventName] = eventList.filter((fn) => fn !== handler));
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

export function callCapturedEvents(eventsArgs) {
  if (!eventsArgs) {
    return;
  }

  eventsArgs = [].concat(eventsArgs);

  if (!EVENTS_POOL[eventsArgs[0].type]) {
    return;
  }

  EVENTS_POOL[eventsArgs[0].type].forEach((handler) => {
    handler.apply(null, eventsArgs);
  });
}
