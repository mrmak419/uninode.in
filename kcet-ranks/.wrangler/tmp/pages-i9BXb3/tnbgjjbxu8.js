// <define:__ROUTES__>
var define_ROUTES_default = {
  version: 1,
  include: [
    "/*"
  ],
  exclude: [
    "/article*",
    "/assets/*",
    "/favicon.ico"
  ]
};

// ../../../../../AppData/Local/npm-cache/_npx/32026684e21afda6/node_modules/wrangler/templates/pages-dev-pipeline.ts
import worker from "C:\\Users\\mrmak\\OneDrive\\Desktop\\web-apps\\kcet-colleges\\kcet-ranks\\.wrangler\\tmp\\pages-i9BXb3\\functionsWorker-0.6736496807561038.mjs";
import { isRoutingRuleMatch } from "C:\\Users\\mrmak\\AppData\\Local\\npm-cache\\_npx\\32026684e21afda6\\node_modules\\wrangler\\templates\\pages-dev-util.ts";
export * from "C:\\Users\\mrmak\\OneDrive\\Desktop\\web-apps\\kcet-colleges\\kcet-ranks\\.wrangler\\tmp\\pages-i9BXb3\\functionsWorker-0.6736496807561038.mjs";
var routes = define_ROUTES_default;
var pages_dev_pipeline_default = {
  fetch(request, env, context) {
    const { pathname } = new URL(request.url);
    for (const exclude of routes.exclude) {
      if (isRoutingRuleMatch(pathname, exclude)) {
        return env.ASSETS.fetch(request);
      }
    }
    for (const include of routes.include) {
      if (isRoutingRuleMatch(pathname, include)) {
        const workerAsHandler = worker;
        if (workerAsHandler.fetch === void 0) {
          throw new TypeError("Entry point missing `fetch` handler");
        }
        return workerAsHandler.fetch(request, env, context);
      }
    }
    return env.ASSETS.fetch(request);
  }
};
export {
  pages_dev_pipeline_default as default
};
//# sourceMappingURL=tnbgjjbxu8.js.map
