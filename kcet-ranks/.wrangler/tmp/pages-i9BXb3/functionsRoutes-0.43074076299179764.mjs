import { onRequest as __api_amazon_js_onRequest } from "C:\\Users\\mrmak\\OneDrive\\Desktop\\web-apps\\kcet-colleges\\kcet-ranks\\functions\\api\\amazon.js"
import { onRequest as ____path___js_onRequest } from "C:\\Users\\mrmak\\OneDrive\\Desktop\\web-apps\\kcet-colleges\\kcet-ranks\\functions\\[[path]].js"

export const routes = [
    {
      routePath: "/api/amazon",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_amazon_js_onRequest],
    },
  {
      routePath: "/:path*",
      mountPath: "/",
      method: "",
      middlewares: [],
      modules: [____path___js_onRequest],
    },
  ]