import phonepeHooks from "./phonepe"
import { Router } from "express"
import bodyParser from "body-parser"
import { wrapHandler } from "@medusajs/medusa"

const route = Router()

export default (app) => {
  app.use("/phonepe", route)

  route.post(
    "/hooks",
    // phonepe constructEvent fails without body-parser
    bodyParser.raw({ type: "application/json" }),
    wrapHandler(phonepeHooks)
  )
  return app
}
