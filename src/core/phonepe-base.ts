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
  isPaymentProcessorError,
  PaymentProcessorContext,
  PaymentProcessorError,
  PaymentProcessorSessionResponse,
  PaymentSessionStatus,
} from "@medusajs/medusa";
import {
  ErrorCodes,
  ErrorIntentStatus,
  PaymentCheckStatusResponse,
  PaymentCheckStatusResponseUPIData,
  PaymentIntentOptions,
  PaymentRequest,
  PhonePeOptions,
  RefundRequest,
} from "../types";
import { MedusaError } from "@medusajs/utils";
import { PhonePeWrapper } from "./phonepe-wrapper";

abstract class PhonePeBase extends AbstractPaymentProcessor {
  static identifier = "";

  protected readonly options_: PhonePeOptions;
  protected phonepe_: PhonePeWrapper;

  protected constructor(_, options) {
    super(_, options);

    this.options_ = options;

    this.init();
  }

  protected init(): void {
    this.phonepe_ =
      this.phonepe_ ||
      new PhonePeWrapper({
        salt: this.options_.salt,
        merchantId: this.options_.merchant_id,
        callbackUrl: this.options_.callbackUrl ?? "http://localhost:9000",
      });
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

  async getPaymentStatus(
    paymentSessionData: Record<string, unknown>
  ): Promise<PaymentSessionStatus> {
    const id = paymentSessionData.id as string;
    const mode = process.env.NODE_ENV == "production" ? "production" : "test";
    try {
      const paymentStatusResponse = await this.phonepe_.getPhonePeStatus(
        paymentSessionData.merchantId as string,
        paymentSessionData.merchantTransactionId as string,
        mode
      );
      const data = paymentStatusResponse.data as PaymentCheckStatusResponse;
      switch (paymentStatusResponse.data.status) {
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
    } catch {
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

    const request = await this.phonepe_.createPhonePeRequest(
      amount.toString(),
      paymentSessionData.id as string,
      customer?.id ?? email,
      customer?.phone
    );

    const result: PaymentProcessorSessionResponse = {
      session_data: {
        request: request,
      },
    };

    return result;
    /* const description = (cart_context.payment_description ??
      this.options_?.payment_description) as string;

    const intentRequest: PhonePe = {
      description,
      amount: Math.round(amount),
      currency: currency_code,
      metadata: { resource_id },
      capture_method: this.options_.capture ? "automatic" : "manual",
      ...intentRequestData,
    };

    if (this.options_?.automatic_payment_methods) {
      intentRequest.automatic_payment_methods = { enabled: true };
    }

    if (customer?.metadata?.phonepe_id) {
      intentRequest.customer = customer.metadata.phonepe_id as string;
    } else {
      let phonepeCustomer;
      try {
        phonepeCustomer = await this.phonepe_.customers.create({
          email,
        });
      } catch (e) {
        return this.buildError(
          "An error occurred in initiatePayment when creating a PhonePe customer",
          e
        );
      }

      intentRequest.customer = phonepeCustomer.id;
    }

    let session_data;
    try {
      session_data = (await this.phonepe_.paymentIntents.create(
        intentRequest
      )) as unknown as Record<string, unknown>;
    } catch (e) {
      return this.buildError(
        "An error occurred in InitiatePayment during the creation of the phonepe payment intent",
        e
      );
    }

    return {
      session_data,
      update_requests: customer?.metadata?.phonepe_id
        ? undefined
        : {
            customer_metadata: {
              phonepe_id: intentRequest.customer,
            },
          },
    };*/
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
      const response = await this.phonepe_.postPaymentRequestToPhonePe(
        paymentSessionData.request as PaymentRequest,
        process.env.PHONE_PAY_MODE == "production" ? "production" : "test"
      );
      paymentSessionData.phonePeResponse = response.data;
      const status = await this.getPaymentStatus(paymentSessionData);
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
    } catch (error) {
      if (error.payment_intent?.status === ErrorIntentStatus.CANCELED) {
        return error.payment_intent;
      }

      return this.buildError("An error occurred in cancelPayment", error);
    }
  }

  async capturePayment(
    paymentSessionData: Record<string, unknown>
  ): Promise<
    PaymentProcessorError | PaymentProcessorSessionResponse["session_data"]
  > {
    const id = paymentSessionData.id as string;
    try {
      const mode = process.env.NODE_ENV == "production" ? "production" : "test";
      const intent = await this.phonepe_.capture(paymentSessionData, mode);
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
    const id = paymentSessionData.id as string;
    const pastSession = paymentSessionData.request as PaymentRequest;
    const refundRequest: RefundRequest = {
      merchantId: pastSession.merchantId,
      merchantUserId: pastSession.merchantUserId,
      originalTransactionId: pastSession.merchantTransactionId,
      merchantTransactionId: paymentSessionData.id as string,
      amount: refundAmount,
      callbackUrl: this.options_.paymentCallbackUrl ?? "http://localhost:9000",
    };

    try {
      await this.phonepe_.postRefundRequestToPhonePe(refundRequest);
    } catch (e) {
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
      const mode = process.env.NODE_ENV == "production" ? "production" : "test";
      const id = paymentSessionData.id as string;
      const request = paymentSessionData.request as PaymentRequest;
      const intent = await this.phonepe_.getPhonePeStatus(
        this.options_.merchant_id,
        request.merchantTransactionId,
        mode
      );
      return intent as unknown as PaymentProcessorSessionResponse["session_data"];
    } catch (e) {
      return this.buildError("An error occurred in retrievePayment", e);
    }
  }

  async updatePayment(
    context: PaymentProcessorContext
  ): Promise<PaymentProcessorError | PaymentProcessorSessionResponse | void> {
    const { amount, customer, paymentSessionData } = context;
    const phonepeId = customer?.metadata?.phonepe_id;

    if (phonepeId !== paymentSessionData.customer) {
      const result = await this.initiatePayment(context);
      if (isPaymentProcessorError(result)) {
        return this.buildError(
          "An error occurred in updatePayment during the initiate of the new payment for the new customer",
          result
        );
      }

      return result;
    } else {
      if (amount && paymentSessionData.amount === Math.round(amount)) {
        return;
      }

      try {
        const id = paymentSessionData.id as string;
        const updateRequest = await this.phonepe_.createPhonePeRequest(
          amount.toString(),
          paymentSessionData.id as string,
          customer?.id,
          customer?.phone
        );
        paymentSessionData.request = updateRequest;
        const sessionData = {
          request: updateRequest,
        } as unknown as PaymentProcessorSessionResponse["session_data"];

        return { session_data: sessionData };
      } catch (e) {
        return this.buildError("An error occurred in updatePayment", e);
      }
    }
  }

  async updatePaymentData(
    sessionId: string,
    data: Record<string, unknown>
  ): Promise<any> {
    try {
      // Prevent from updating the amount from here as it should go through
      // the updatePayment method to perform the correct logic
      if (data.amount) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Cannot update amount, use updatePayment instead"
        );
      }

      return data as unknown as PaymentProcessorSessionResponse["session_data"];
    } catch (e) {
      return this.buildError("An error occurred in updatePaymentData", e);
    }
  }

  /**
   * Constructs PhonePe Webhook event
   * @param {object} data - the data of the webhook request: req.body
   * @param {object} signature - the PhonePe signature on the event, that
   *    ensures integrity of the webhook event
   * @return {object} PhonePe Webhook event
   */
  constructWebhookEvent(data, signature): boolean {
    return this.phonepe_.validateWebhook(
      data,
      signature,
      this.options_.webhook_secret
    );
  }

  protected buildError(
    message: string,
    e: PaymentProcessorError | Error
  ): PaymentProcessorError {
    return {
      error: message,
      code: "code" in e ? e.code : "",
      detail: isPaymentProcessorError(e)
        ? `${e.error}${EOL}${e.detail ?? ""}`
        : "detail" in e
          ? e.detail
          : e.message ?? "",
    };
  }
}

export default PhonePeBase;
