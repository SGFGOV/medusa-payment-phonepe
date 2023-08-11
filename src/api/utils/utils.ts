import {
  AbstractCartCompletionStrategy,
  CartService,
  IdempotencyKeyService,
  Logger,
  PaymentProcessorError,
  PostgresError,
} from "@medusajs/medusa";
import { AwilixContainer } from "awilix";
import { MedusaError } from "medusa-core-utils";
import { EOL } from "os";
import SHA256 from "crypto-js/sha256";
import axios from "axios";
import api from "..";
import {
  PaymentRequestUPI,
  PaymentRequestUPICollect,
  PaymentRequestUPIQr,
  RefundRequest,
  PhonePeEvent,
  PaymentResponseData,
  PaymentResponse,
  PhonePeS2SResponse,
  PaymentStatusCodeValues,
  PhonePeS2SResponseData,
} from "../../types";
import PhonePeProviderService from "../../services/phonepe-provider";

const PAYMENT_PROVIDER_KEY = "pp_phonepe";

export function constructWebhook({
  signature,
  encodedBody,
  container,
}: {
  signature: string;
  encodedBody: { response: string };
  container: AwilixContainer;
}): PhonePeEvent {
  const logger = container.resolve("logger") as Logger;
  const phonepeProviderService = container.resolve(
    PAYMENT_PROVIDER_KEY
  ) as PhonePeProviderService;

  logger.info(
    `signature ${signature}\n encoded: ${JSON.stringify(encodedBody)}`
  );
  return phonepeProviderService.constructWebhookEvent(
    encodedBody.response,
    signature
  );
}

export function isPaymentCollection(id) {
  return id && id.startsWith("paycol");
}

export function buildError(
  event: string,
  err: PaymentProcessorError & Error
): string {
  console.log(JSON.stringify(err));
  let message = `PhonePe webhook ${event} handling failed${EOL}${
    err?.code ?? err?.message
  }`;
  if (err?.code === PostgresError.SERIALIZATION_FAILURE) {
    message = `PhonePe webhook ${event} handle failed. This can happen when this webhook is triggered during a cart completion and can be ignored. This event should be retried automatically.${EOL}${
      err?.detail ?? err?.message
    }`;
  }
  if (err?.code === "409") {
    message = `PhonePe webhook ${event} handle failed.${EOL}${
      err?.detail ?? err?.message
    }`;
  }

  return message;
}

export async function handlePaymentHook({
  event,
  container,
  paymentIntent,
}: {
  event: PhonePeEvent;
  container: AwilixContainer;
  paymentIntent: PhonePeS2SResponse;
}): Promise<{ statusCode: number }> {
  const logger = container.resolve("logger") as Logger;
  logger.info("Data received: " + JSON.stringify(paymentIntent));

  let cartId = paymentIntent.data.merchantTransactionId; // Backward compatibility

  const cartIdParts = cartId.split("_");
  cartId = `${cartIdParts[0]}_${cartIdParts[1]}`;

  const resourceId = paymentIntent.data.merchantTransactionId;

  switch (event.type) {
    case PaymentStatusCodeValues.PAYMENT_SUCCESS:
      try {
        await onPaymentIntentSucceeded({
          eventId: event.id,
          paymentIntent,
          cartId,
          resourceId,
          isPaymentCollection: isPaymentCollection(resourceId),
          container,
        });
      } catch (err) {
        const message = buildError(event.type, err);
        logger.warn(message);
        return { statusCode: 409 };
      }

      break;

    case PaymentStatusCodeValues.PAYMENT_ERROR: {
      const message = paymentIntent.message;
      logger.error(
        "The payment of the payment intent " +
          `${paymentIntent.data.merchantTransactionId} has failed${EOL}${message}`
      );
      break;
    }
    default:
      return { statusCode: 204 };
  }

  return { statusCode: 200 };
}

async function onPaymentIntentSucceeded({
  eventId,
  paymentIntent,
  cartId,
  resourceId,
  isPaymentCollection,
  container,
}) {
  const manager = container.resolve("manager");

  await manager.transaction(async (transactionManager) => {
    if (isPaymentCollection) {
      await capturePaymenCollectiontIfNecessary({
        paymentIntent,
        resourceId,
        container,
      });
    } else {
      await completeCartIfNecessary({
        eventId,
        cartId,
        container,
        transactionManager,
      });

      await capturePaymentIfNecessary({
        cartId,
        transactionManager,
        container,
      });
    }
  });
}

async function onPaymentAmountCapturableUpdate({ eventId, cartId, container }) {
  const manager = container.resolve("manager");

  await manager.transaction(async (transactionManager) => {
    await completeCartIfNecessary({
      eventId,
      cartId,
      container,
      transactionManager,
    });
  });
}

async function capturePaymenCollectiontIfNecessary({
  paymentIntent,
  resourceId,
  container,
}) {
  const manager = container.resolve("manager");
  const paymentCollectionService = container.resolve(
    "paymentCollectionService"
  );

  const paycol = await paymentCollectionService
    .retrieve(resourceId, { relations: ["payments"] })
    .catch(() => undefined);

  if (paycol?.payments?.length) {
    const payment = paycol.payments.find(
      (pay) => pay.data.id === paymentIntent.id
    );

    if (payment && !payment.captured_at) {
      await manager.transaction(async (manager) => {
        await paymentCollectionService
          .withTransaction(manager)
          .capture(payment.id);
      });
    }
  }
}

async function capturePaymentIfNecessary({
  cartId,
  transactionManager,
  container,
}) {
  const orderService = container.resolve("orderService");
  const order = await orderService
    .withTransaction(transactionManager)
    .retrieveByCartId(cartId)
    .catch(() => undefined);

  if (order?.payment_status !== "captured") {
    await orderService
      .withTransaction(transactionManager)
      .capturePayment(order.id);
  }
}

async function completeCartIfNecessary({
  eventId,
  cartId,
  container,
  transactionManager,
}) {
  const orderService = container.resolve("orderService");
  const order = await orderService
    .retrieveByCartId(cartId)
    .catch(() => undefined);

  if (!order) {
    const completionStrat: AbstractCartCompletionStrategy = container.resolve(
      "cartCompletionStrategy"
    );
    const cartService: CartService = container.resolve("cartService");
    const idempotencyKeyService: IdempotencyKeyService = container.resolve(
      "idempotencyKeyService"
    );

    const idempotencyKeyServiceTx =
      idempotencyKeyService.withTransaction(transactionManager);
    let idempotencyKey = await idempotencyKeyServiceTx
      .retrieve({
        request_path: "/phonepe/hooks",
        idempotency_key: eventId,
      })
      .catch(() => undefined);

    if (!idempotencyKey) {
      idempotencyKey = await idempotencyKeyService
        .withTransaction(transactionManager)
        .create({
          request_path: "/phonepe/hooks",
          idempotency_key: eventId,
        });
    }

    const cart = await cartService
      .withTransaction(transactionManager)
      .retrieve(cartId, { select: ["context"] });

    const { response_code, response_body } = await completionStrat
      .withTransaction(transactionManager)
      .complete(cartId, idempotencyKey, { ip: cart.context?.ip as string });

    if (response_code !== 200) {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        response_body["message"] as string,
        response_body["code"] as string
      );
    }
  }
}

export function createPostCheckSumHeader(
  payload: any,
  salt?: string,
  apiString?: string,
  space = 2
) {
  const SALT_KEY = salt ?? process.env.PHONEPE_SALT ?? "test-salt";
  const encodedBody = btoa(JSON.stringify(payload, null, space));
  const base64string = encodedBody + `${apiString}${SALT_KEY}`;
  const encodedPayload = SHA256(base64string).toString();
  const checksum = `${encodedPayload}###1`;
  return { checksum, encodedBody };
}

export function verifyPostCheckSumHeader(
  payload: string,
  salt?: string,
  apiString?: string
) {
  const SALT_KEY = salt ?? process.env.PHONEPE_SALT ?? "test-salt";
  const base64string = payload + `${apiString}${SALT_KEY}`;
  const encodedPayload = SHA256(base64string).toString();
  const checksum = `${encodedPayload}###1`;
  return { checksum, payload };
}

export function createPostPaymentChecksumHeader(
  payload: PaymentRequestUPI | PaymentRequestUPICollect | PaymentRequestUPIQr,
  salt?: string
) {
  return createPostCheckSumHeader(payload, salt, "/pg/v1/pay");
}

export function createPostRefundChecksumHeader(
  payload: RefundRequest,
  salt?: string
) {
  return createPostCheckSumHeader(payload, salt, "/pg/v1/refund");
}

export function createPostValidateVpaChecksumHeader(
  payload: {
    merchantId: string;
    vpa: string;
  },
  salt?: string
) {
  return createPostCheckSumHeader(payload, salt, "/pg/v1/vpa/validate");
}

export function createGetChecksumHeader(
  merchantId: string,
  merchantTransactionId: string,
  salt?: string
) {
  const SALT_KEY = salt ?? process.env.PHONEPE_SALT ?? "test-salt";
  const asciiString = `/pg/v1/status/${merchantId}/${merchantTransactionId}${SALT_KEY}`;
  const encodedPayload = SHA256(asciiString);
  const checksum = `${encodedPayload}###1`;
  return { checksum };
}

export function createGetChecksumTransactionHeader(
  merchantId: string,
  merchantTransactionId: string,
  salt?: string
) {
  const SALT_KEY = salt ?? process.env.PHONEPE_SALT ?? "test-salt";
  const asciiString = `/pg/v3/transaction/${merchantId}/${merchantTransactionId}/status${SALT_KEY}`;
  const encodedPayload = SHA256(asciiString);
  const checksum = `${encodedPayload}###1`;
  return { checksum };
}
