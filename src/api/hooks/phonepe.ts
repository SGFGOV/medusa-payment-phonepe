import { Request, Response } from "express";
import { constructWebhook, handlePaymentHook } from "../utils/utils";
import { PaymentResponse, PhonePeEvent, PhonePeS2SResponse } from "../../types";
import { Logger } from "@medusajs/medusa";

export default async (req: Request, res: Response) => {
  let event: PhonePeEvent;
  try {
    event = constructWebhook({
      signature: req.headers["x-verify"] as string,
      encodedBody: req.body,
      container: req.scope,
    });
  } catch (err) {
    const logger = req.scope.resolve("logger") as Logger;
    logger.info(
      `${JSON.stringify(req.body)} ${err.message} header:${JSON.stringify(
        req.headers
      )}`
    );
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  const paymentIntent = event.data.object as unknown as PhonePeS2SResponse;

  const { statusCode } = await handlePaymentHook({
    event,
    container: req.scope,
    paymentIntent,
  });
  res.sendStatus(statusCode);
};
