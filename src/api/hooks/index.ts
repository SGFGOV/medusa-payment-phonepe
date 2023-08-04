import phonepeHooks from "./phonepe";
import { Router } from "express";
import bodyParser from "body-parser";
import { wrapHandler } from "@medusajs/medusa";
import cors from "cors";

const route = Router();

export default (app) => {
  app.use("/phonepe", route);
  app.use(
    cors({
      origin: /.*.phonepe.com\/apis/gm,
      methods: "POST",
    })
  );
  route.post(
    "/hooks",
    // phonepe constructEvent fails without body-parser
    bodyParser.raw({ type: "application/json" }),
    wrapHandler(phonepeHooks)
  );
  return app;
};
