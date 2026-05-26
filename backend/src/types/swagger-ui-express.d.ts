declare module "swagger-ui-express" {
  import { RequestHandler } from "express";

  const serve: RequestHandler;
  const setup: (swaggerDoc: any, options?: any) => RequestHandler;

  export { serve, setup };
  export default { serve, setup };
}