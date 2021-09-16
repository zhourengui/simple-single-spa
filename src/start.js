import { invoke } from "./navigation/invoke";

let started = false;

export function start() {
  if (started) return;
  started = true;
  invoke();
}

export function isStart() {
  return started;
}
