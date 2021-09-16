import resolve from "rollup-plugin-node-resolve";
import babel from "rollup-plugin-babel";
import commonjs from "rollup-plugin-commonjs";
import serve from "rollup-plugin-serve";

export default {
  input: "./src/index.js",
  output: {
    file: "./lib/umd/index.js",
    format: "umd",
    name: "SingleSpa",
    sourcemap: true,
  },
  sourcemap: true,
  plugins: [
    resolve(),
    commonjs(),
    babel({ exclude: "node_modules/**" }),
    process.env.SERVE
      ? serve({
          open: true,
          contentBase: "",
          openPage: "/example/index.html",
          host: "localhost",
          port: "12345",
        })
      : null,
  ],
};
