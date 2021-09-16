# 实现 single-spa

## 工程配置

### 依赖

| 模块名称                            | 说明                                                           |
| ----------------------------------- | -------------------------------------------------------------- |
| @babel/core                         | babel 编译器的核心库，负责所有 babel 预设和插件的加载及执行    |
| @babel/plugin-syntax-dynamic-import | 支持使用 import()进行动态导入，当前在 Stage 4: finished 的阶段 |
| @babel/preset-env                   | 预设：为方便开发提供的常用的插件集合                           |
| rollup                              | javascript 打包工具，在打包方面比 webpack 更加的纯粹           |
| rollup-plugin-babel                 | 让 rollup 支持 babel，开发者可以使用高级 js 语法               |
| rollup-plugin-commonjs              | 将 commonjs 模块转换为 ES6                                     |
| rollup-plugin-node-resolve          | 让 rollup 支持 nodejs 的模块解析机制                           |
| rollup-plugin-serve                 | 支持 dev serve，方便调试和开发                                 |

### rollup 打包配置

在项目根目录执行`touch rollup.config.js`

添加以下内容

```javascript
import resolve from "rollup-plugin-node-resolve";
import babel from "rollup-plugin-babel";
import commonjs from "rollup-plugin-commonjs";
import serve from "rollup-plugin-serve";

export default {
  input: "./src/single-spa.js",
  output: {
    file: "./lib/umd/single-spa.js",
    format: "umd",
    name: "singleSpa",
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
          openPage: "/toutrial/index.html",
          host: "localhost",
          port: "12345",
        })
      : null,
  ],
};
```

## 应用(app)或服务(service)

single-spa 没有 manifest，qiankun 有，manifest 的作用就是描述一个应用的信息

### 生命周期

每一个应用与服务都有生命周期，服务与应用的生命周期的区别就是服务的生命周期比应用的生命周期多一个 update
| 生命周期 | 说明 |
| -------- | ---- |
|bootstrap|app 或 service 启动的时候调用，只执行一次|
|mount|app 或 service 挂在的时候调用|
|unmount|app 或 service 卸载的时候调用|
|update|只有 service 才有 update 生命周期|

### 状态

<image type="content" src="./images/lifecycle.png" alt-text="lifecycle" />

| 状态                | 说明                                                                                                                            | 下一个状态                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| NOT_LOADED          | app 还未加载，默认状态                                                                                                          | LOAD_SOURCE_CODE                                  |
| LOAD_SOURCE_CODE    | 加载 app 模块中                                                                                                                 | NOT_BOOTSTRAPPED、SKIP_BECAUSE_BROKEN、LOAD_ERROR |
| NOT_BOOTSTRAPPED    | app 模块加载完成，但是还未启动（未执行 app 的 bootstrap 生命周期函数）                                                          | BOOTSTRAPPING                                     |
| BOOTSTRAPPING       | 执行 app 的 bootstrap 生命周期函数中（只执行一次）                                                                              | SKIP_BECAUSE_BROKEN                               |
| NOT_MOUNTED         | app 的 bootstrap 或 unmount 生命周期函数执行成功，等待执行 mount 生命周期函数（可多次执行）                                     | MOUNTING                                          |
| MOUNTING            | 执行 app 的 mount 生命周期函数中                                                                                                | SKIP_BECAUSE_BROKEN                               |
| MOUNTED             | app 的 mount 或 update(service 独有)生命周期函数执行成功，意味着此 app 已挂载成功，可执行 Vue 的$mount()或 ReactDOM 的 render() | UNMOUNTING、UPDATEING                             |
| UNMOUNTING          | app 的 unmount 生命周期函数执行中，意味着此 app 正在卸载中，可执行 Vue 的$destory()或 ReactDOM 的 unmountComponentAtNode()      | SKIP_BECAUSE_BROKEN、NOT_MOUNTED                  |
| UPDATEING           | service 更新中，只有 service 才会有此状态，app 则没有                                                                           | SKIP_BECAUSE_BROKEN、MOUNTED                      |
| SKIP_BECAUSE_BROKEN | app 变更状态时遇见错误，如果 app 的状态变为了 SKIP_BECAUSE_BROKEN，那么 app 就会 blocking，不会往下个状态变更                   | 无                                                |
| LOAD_ERROR          | 加载错误，意味着 app 将无法被使用                                                                                               | 无                                                |

### load、mount、unmount的条件

可以被load的条件：
<image type="content" src="./images/load-condition.png" alt-text="lifecycle" />

可以被mount的条件：
<image type="content" src="./images/mount-condition.png" alt-text="lifecycle" />

可以被unmont的条件：
<image type="content" src="./images/unmount-condition.png" alt-text="lifecycle" />


### 生命周期超时处理

<image type="content" src="./images/lifecycle-process.png" alt-text="lifecycle" />


### Vue 与 React 卸载组件

vue：

```javascript
vue.$destory();
```

react:

```javascript
const el = ReactDOM.findNode(react);
ReactDOM.unmountComponentAtNode(el);
```

## 路由拦截
微前端中的app分为两种：根据location变化的时候app，纯功能的是service，微前端框架在处理路由的时候，微前端框架是最先执行的，重写addEventListener、removeEveListener、pushState、replaceState

拦截history的方法，因为pushState和replaceState方法并不会触发popstate事件，所以我们即便在popstate时执行了reroute方法，也要在这里执行下reroute方法。

## 执行流程

<image type="content" src="./images/exec-process.png" alt-text="lifecycle" />