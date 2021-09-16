export default function ModuleA() {
  function sleep(wait) {
    return new Promise((resolve) => setTimeout(resolve, wait));
  }

  const context = {
    root: null,
  };

  const app = {
    bootstrap: [
      async () => {
        return Promise.resolve().then(() => {
          context.root = document.querySelector("#app");
        });
      },
    ],
    mount: [
      async () => {
        await sleep(3000);
        return Promise.resolve().then(() => {
          context.root.innerHTML = "<h1> SingleSpa A Module</h1>";
        });
      },
    ],
    unmount: [
      () => {
        return Promise.resolve().then(() => {
          context.root.innerHTML = "";
        });
      },
    ],
  };

  return app;
}
