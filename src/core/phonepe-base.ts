/**
 * 
Step 1. Initiating Payment request

Step 2. Redirecting user to PhonePe Standard Checkout page

Step 3. Redirecting user to Merchant web page

Step 4. Status verification post redirection to merchant website

Step 5. Handling Payment Success, Pending and Failure

Step 6. Refund
 */

import { EOL } from "os";
import {
  AbstractPaymentProcessor,
  Customer,
  isPaymentProcessorError,
  PaymentProcessorContext,
  PaymentProcessorError,
  PaymentProcessorSessionResponse,
  PaymentSessionStatus,
  Logger,
} from "@medusajs/medusa";
import {
  ErrorCodes,
  ErrorIntentStatus,
  PaymentCheckStatusResponse,
  PaymentCheckStatusResponseUPIData,
  PaymentIntentOptions,
  PaymentRequest,
  PaymentResponse,
  PaymentResponseData,
  PaymentStatusCodeValues,
  PhonePeEvent,
  PhonePeOptions,
  PhonePeS2SResponse,
  RefundRequest,
} from "../types";
import { MedusaError } from "@medusajs/utils";
import { PhonePeWrapper } from "./phonepe-wrapper";
import { buildError } from "../api/utils/utils";

abstract class PhonePeBase extends AbstractPaymentProcessor {
  static identifier = "";

  protected readonly options_: PhonePeOptions;
  protected phonepe_: PhonePeWrapper;
  protected logger: Logger;
  static sequenceCount = 0;
  protected constructor(container: { logger: Logger }, options) {
    super(container as any, options);
    this.logger = container.logger;
    this.options_ = options;

    this.init();
  }

  protected init(): void {
    this.phonepe_ =
      this.phonepe_ ||
      new PhonePeWrapper(
        {
          salt: this.options_.salt,
          merchantId: this.options_.merchantId,
          callbackUrl: this.options_.callbackUrl ?? "http://localhost:9000",
          redirectMode: this.options_.redirectMode,
          redirectUrl: this.options_.redirectUrl,
          mode: this.options_.mode,
        },
        this.logger
      );
  }

  abstract get paymentIntentOptions(): PaymentIntentOptions;

  getPaymentIntentOptions(): PaymentIntentOptions {
    const options: PaymentIntentOptions = {};

    if (this?.paymentIntentOptions?.capture_method) {
      options.capture_method = this.paymentIntentOptions.capture_method;
    }

    if (this?.paymentIntentOptions?.setup_future_usage) {
      options.setup_future_usage = this.paymentIntentOptions.setup_future_usage;
    }

    if (this?.paymentIntentOptions?.payment_method_types) {
      options.payment_method_types =
        this.paymentIntentOptions.payment_method_types;
    }

    return options;
  }

  async getPaymentStatus({
    merchantId,
    merchantTransactionId,
    data,
  }: {
    merchantId: string;
    merchantTransactionId: string;
    data?: any;
  }): Promise<PaymentSessionStatus> {
    try {
      const currentMerchantId = merchantId ?? data.merchantId;
      const currentMerchantTransactionId =
        merchantTransactionId ?? data.merchantTransactionId;
      const paymentStatusResponse =
        (await this.phonepe_.getPhonePeTransactionStatus(
          currentMerchantId,
          currentMerchantTransactionId
        )) as PaymentCheckStatusResponse;
      // const data = paymentStatusResponse as PaymentCheckStatusResponse;
      this.logger.info(
        `response from phonepe: ${JSON.stringify(paymentStatusResponse)}`
      );
      switch (paymentStatusResponse.code) {
        case "PAYMENT_PENDING":
          return PaymentSessionStatus.PENDING;
        case "BAD_REQUEST":
        case "INTERNAL_SERVER_ERROR":
        case "AUTHORIZATION_FAILED":
          return PaymentSessionStatus.ERROR;
        case "TRANSACTION_NOT_FOUND":
          return PaymentSessionStatus.CANCELED;
        case "PAYMENT_SUCCESS":
          return PaymentSessionStatus.AUTHORIZED;
        default:
          return PaymentSessionStatus.PENDING;
      }
    } catch (e) {
      this.logger.error(`error from phonepe: ${JSON.stringify(e)}`);
      const error: PaymentProcessorError = this.buildError("PHONPE_ERROR", e);
      return PaymentSessionStatus.ERROR;
    }
  }

  async initiatePayment(
    context: PaymentProcessorContext
  ): Promise<PaymentProcessorError | PaymentProcessorSessionResponse> {
    const intentRequestData = this.getPaymentIntentOptions();
    const {
      email,
      context: cart_context,
      currency_code,
      amount,
      resource_id,
      customer,
      paymentSessionData,
    } = context;
    PhonePeBase.sequenceCount++;
    const request = await this.phonepe_.createPhonePeStandardRequest(
      amount.toString(),
      (paymentSessionData.merchantTransactionId as string) ?? resource_id,
      customer?.id ?? email,
      customer?.phone,
      PhonePeBase.sequenceCount.toString()
    );
    this.logger.info(
      ` num requests = ${PhonePeBase.sequenceCount}, context: ${JSON.stringify(
        context
      )}`
    );
    try {
      const response = await this.phonepe_.postPaymentRequestToPhonePe(
        request as PaymentRequest
      );
      this.logger.info(`response from phonepe: ${JSON.stringify(response)}`);
      const result: PaymentProcessorSessionResponse = {
        session_data: {
          ...response,
          customer,
        },
        update_requests: {
          customer_metadata: {
            phonepe_id: customer?.id,
          },
        },
      };

      return result;
    } catch (error) {
      this.logger.error(`error from phonepe: ${JSON.stringify(error)}`);
      const e = error as Error;
      return this.buildError("initialization error", e);
    }
  }

  async authorizePayment(
    paymentSessionData: Record<string, unknown>,
    context: Record<string, unknown>
  ): Promise<
    | PaymentProcessorError
    | {
        status: PaymentSessionStatus;
        data: PaymentProcessorSessionResponse["session_data"];
      }
  > {
    try {
      const { merchantId, merchantTransactionId } = paymentSessionData.data as {
        merchantId;
        merchantTransactionId;
      };
      const status = await this.getPaymentStatus({
        merchantId,
        merchantTransactionId,
      });
      return { data: paymentSessionData, status };
    } catch (e) {
      const error: PaymentProcessorError = {
        error: e.message,
      };
      return error;
    }
  }

  async cancelPayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<
    PaymentProcessorError | PaymentProcessorSessionResponse["session_data"]
  > {
    try {
      const id = paymentSessionData.id as string;
      return (await this.phonepe_.cancel(
        paymentSessionData
      )) as unknown as PaymentProcessorSessionResponse["session_data"];
    } catch (e) {
      if (e.payment_intent?.status === ErrorIntentStatus.CANCELED) {
        return e.payment_intent;
      }

      return this.buildError("An error occurred in cancelPayment", e);
    }
  }

  async capturePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<
    PaymentProcessorError | PaymentProcessorSessionResponse["session_data"]
  > {
    try {
      const intent = await this.phonepe_.capture(
        paymentSessionData.data as PaymentResponseData
      );
      return intent as unknown as PaymentProcessorSessionResponse["session_data"];
    } catch (error) {
      if (error.code === ErrorCodes.PAYMENT_INTENT_UNEXPECTED_STATE) {
        if (error.payment_intent?.status === ErrorIntentStatus.SUCCEEDED) {
          return error.payment_intent;
        }
      }

      return this.buildError("An error occurred in capturePayment", error);
    }
  }

  async deletePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<
    PaymentProcessorError | PaymentProcessorSessionResponse["session_data"]
  > {
    return await this.cancelPayment(paymentSessionData);
  }

  async refundPayment(
    paymentSessionData: Record<string, unknown>,
    refundAmount: number
  ): Promise<
    PaymentProcessorError | PaymentProcessorSessionResponse["session_data"]
  > {
    const pastSession =
      paymentSessionData.data as unknown as PaymentResponseData;
    const refundRequest: RefundRequest = {
      merchantId: pastSession.merchantId,

      originalTransactionId: pastSession.merchantTransactionId,

      amount: refundAmount,

      merchantTransactionId:
        (paymentSessionData.data as any).merchantTransactionId + "1",
      callbackUrl: `${this.options_.callbackUrl}/hooks/refund`,
      merchantUserId: (paymentSessionData as any).customer.id,
    };

    try {
      const response = await this.phonepe_.postRefundRequestToPhonePe(
        refundRequest
      );
      this.logger.info(`response from phonepe: ${JSON.stringify(response)}`);
      return response;
    } catch (e) {
      this.logger.error(`response from phonepe: ${JSON.stringify(e)}`);
      return this.buildError("An error occurred in refundPayment", e);
    }

    return paymentSessionData;
  }

  async retrievePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<
    PaymentProcessorError | PaymentProcessorSessionResponse["session_data"]
  > {
    try {
      const request = paymentSessionData.data as PaymentResponseData;
      const intent = await this.phonepe_.getPhonePeTransactionStatus(
        request.merchantId,
        request.merchantTransactionId
      );
      this.logger.info(`response from phonepe: ${JSON.stringify(intent)}`);
      return intent as unknown as PaymentProcessorSessionResponse["session_data"];
    } catch (e) {
      this.logger.error(`response from phonepe: ${JSON.stringify(e)}`);
      return this.buildError("An error occurred in retrievePayment", e);
    }
  }

  async updatePayment(
    context: PaymentProcessorContext
  ): Promise<PaymentProcessorError | PaymentProcessorSessionResponse | void> {
    /** phonepe doesn't allow you to update an ongoing payment, you need to initiate new one */
    /* if (phonepeId !== (paymentSessionData.customer as Customer).id) {*/
    this.logger.info(
      `update request context from medusa: ${JSON.stringify(context)}`
    );
    const result = await this.initiatePayment(context);
    return result;
  }

  async updatePaymentData(
    sessionId: string,
    data: Record<string, unknown>
  ): Promise<any> {
    if (data.amount) {
      return await this.initiatePayment(
        data as unknown as PaymentProcessorContext
      );
    } else {
      return data as any;
      /* return this.buildError(
        "unsupported by PhonePe",
        new Error("unable to update payment data")
      );*/
    }

    // Prevent from updating the amount from here as it should go through
    // the updatePayment method to perform the correct logic
    /* if (data.amount) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cannot update amount, use updatePayment instead"
      );

      return this.buildError("An error occurred in updatePaymentData", e);
    }*/
  }

  /**
   * Constructs PhonePe Webhook event
   * @param {object} data - the data of the webhook request: req.body
   * @param {object} signature - the PhonePe signature on the event, that
   *    ensures integrity of the webhook event
   * @return {Object} PhonePe Webhook event
   */
  constructWebhookEvent(
    data: PhonePeS2SResponse,
    signature: string
  ): PhonePeEvent {
    if (this.phonepe_.validateWebhook(data, signature, this.options_.salt)) {
      return {
        type: data.code,
        id: data.data.transactionId,
        data: {
          object: data,
        },
      };
    } else {
      return {
        type: PaymentStatusCodeValues.PAYMENT_ERROR,
        id: data.data.transactionId,
        data: {
          object: this.buildError(
            "PhonePeError",
            new Error("error validating data")
          ) as any,
        },
      };
    }
  }

  protected buildError(message: string, e: Error): PaymentProcessorError {
    return {
      error: message,
      code: isPaymentProcessorError(e) ? e.code : e.name,
      detail: isPaymentProcessorError(e)
        ? `${e.error}${EOL}${e.detail ?? ""}`
        : "detail" in e
        ? e.detail
        : e.message ?? "",
    };
  }
}

export default PhonePeBase;
