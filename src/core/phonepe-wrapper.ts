import axios, { Axios, AxiosResponse } from "axios";

import {
  buildError,
  createGetChecksumHeader,
  createGetChecksumTransactionHeader,
  createPostCheckSumHeader,
  createPostPaymentChecksumHeader,
  createPostRefundChecksumHeader,
  createPostValidateVpaChecksumHeader,
  verifyPostCheckSumHeader,
} from "../api/utils/utils";
import {
  PaymentCheckStatusResponse,
  PaymentRequest,
  PaymentRequestUPI,
  PaymentRequestUPICollect,
  PaymentRequestUPIQr,
  PaymentResponse,
  PaymentResponseData,
  PaymentResponseUPI,
  PaymentStatusCodeValues,
  PhonePeOptions,
  PhonePeS2SResponse,
  RefundRequest,
} from "../types";
import {
  GetPaymentsParams,
  Logger,
  PaymentProcessorError,
  PaymentSessionData,
} from "@medusajs/medusa";
import { QueryResult } from "typeorm";

export class PhonePeWrapper {
  options: PhonePeOptions;
  url: string;
  logger: Logger | Console;

  constructor(options: PhonePeOptions, logger?: Logger) {
    this.logger = logger ?? console;
    this.options = options;
    switch (this.options.mode) {
      case "production":
        this.url = "https://api.phonepe.com/apis/hermes";
        break;
      case "uat":
        this.url = "https://api-preprod.phonepe.com/apis/hermes";
        break;
      case "test":
      default:
        this.url = "https://api-preprod.phonepe.com/apis/pg-sandbox";
        break;
    }
  }

  async postPaymentRequestToPhonePe(
    payload: PaymentRequestUPI | PaymentRequestUPICollect | PaymentRequestUPIQr,

    apiNewEndpoint?: string
  ): Promise<PaymentResponse | PaymentProcessorError> {
    const apiEndpoint = apiNewEndpoint ?? "/pg/v1/pay";
    const url =
      /* this.options.mode == "uat"
        ? "https://api-preprod.phonepe.com/apis/pg-sandbox"
        :*/ this.url;

    const encodedMessage = createPostPaymentChecksumHeader(payload);
    const headers = {
      "Content-Type": "application/json",
      /* accept: "application/json",*/
      "X-VERIFY": encodedMessage.checksum,
    };
    const reqUrl = `${url}${apiEndpoint}`;
    const result = await axios.post(
      reqUrl,
      { request: encodedMessage.encodedBody },
      {
        headers,
      }
    );
    return result.data;
  }

  validatePaymentRequest(paymentRequest: PaymentRequest): boolean {
    if (
      paymentRequest.merchantId.length > 0 &&
      paymentRequest.merchantId.length < 38
    ) {
      if (
        paymentRequest.merchantTransactionId.length > 0 &&
        paymentRequest.merchantTransactionId.length < 38
      ) {
        if (
          typeof paymentRequest.amount == "number" &&
          Number(paymentRequest.amount) === paymentRequest.amount &&
          !isNaN(paymentRequest.amount)
        ) {
          if (
            paymentRequest.merchantUserId.length > 0 &&
            paymentRequest.merchantUserId.length < 36 &&
            paymentRequest.merchantUserId.match(/[^\w]|^_/) == null
          ) {
            if (paymentRequest.redirectUrl.includes("http")) {
              if (paymentRequest.redirectMode) {
                if (paymentRequest.callbackUrl) {
                  return true;
                }
              }
            }
          }
        }
      }
    }
    return false;
  }

  async createPhonePeStandardRequest(
    amount: string,
    merchantTransactionId: string,
    customer_id: string,
    mobileNumber?: string,
    attemptId?: string
  ): Promise<PaymentRequest | PaymentProcessorError> {
    const phonePeRequest: PaymentRequest = {
      merchantId: this.options.merchantId,
      redirectMode: this.options.redirectMode,
      redirectUrl:
        this.options.redirectUrl?.length == 0
          ? "https://localhost:8000"
          : this.options.redirectUrl,
      merchantTransactionId: `${merchantTransactionId}_${attemptId}`,
      merchantUserId: customer_id,
      amount: parseInt(amount),
      callbackUrl: this.options.callbackUrl,
      mobileNumber: mobileNumber,
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };
    const paymentError: PaymentProcessorError = {
      code: "VALIDATION_FAILED",
      error: `${JSON.stringify(phonePeRequest)} is invalid`,
    };
    return this.validatePaymentRequest(phonePeRequest)
      ? phonePeRequest
      : paymentError;
  }
  async getPhonePeTransactionStatus(
    merchantId: string,
    merchantTransactionId: string,
    apiNewEndpoint?: string
  ): Promise<PaymentCheckStatusResponse> {
    if (!merchantId || !merchantTransactionId) {
      return {
        data: {
          success: false,
          code: PaymentStatusCodeValues.PAYMENT_ERROR,
          message: "merchantId or merchantTransactionId is incomplete",
          data: undefined,
        },
      } as any;
    }

    const apiEndpoint = apiNewEndpoint ?? "/pg/v1/status";
    const url =
      this.options.mode == "uat"
        ? "https://api-preprod.phonepe.com/apis/pg-sandbox"
        : this.url;

    const encodedMessage = createGetChecksumHeader(
      merchantId,
      merchantTransactionId
    );
    const headers = {
      "Content-Type": "application/json",
      accept: "application/json",
      "X-VERIFY": encodedMessage.checksum,
      "X-MERCHANT-ID": merchantId,
    };

    const requestUrl = `${url}${apiEndpoint}/${merchantId}/${merchantTransactionId}`;
    const result = await axios.get(requestUrl, {
      headers,
    });
    return result.data;
  }

  async validateVpa(
    merchantId: string,
    vpa: string,

    apiNewEndpoint?: string
  ): Promise<any> {
    const apiEndpoint = apiNewEndpoint ?? "/pg/v1/vpa/validate";
    const url = this.url;
    const encodedMessage = await createPostValidateVpaChecksumHeader({
      merchantId,
      vpa,
    });
    const headers = {
      "Content-Type": "application/json",
      accept: "application/json",
      "X-VERIFY": encodedMessage.checksum,
      "X-MERCHANT-ID": merchantId,
    };
    const result = await axios.post(
      `${url}${apiEndpoint}`,
      { request: encodedMessage.encodedBody },
      {
        headers,
      }
    );
    return result.data;
  }
  async cancel(p: PaymentSessionData): Promise<PaymentSessionData> {
    p.code = undefined;
    return p;
  }
  async capture(p: PaymentResponseData): Promise<PaymentCheckStatusResponse> {
    let isCaptured = false;
    const { merchantId, merchantTransactionId } = p;

    const result = await this.getPhonePeTransactionStatus(
      merchantId,
      merchantTransactionId
    );

    isCaptured = result.code != PaymentStatusCodeValues.PAYMENT_PENDING;

    return result;
  }
  async postRefundRequestToPhonePe(
    payload: RefundRequest,

    apiNewEndpoint?: string
  ): Promise<any> {
    const apiEndpoint = apiNewEndpoint ?? "/pg/v1/refund";
    const url = this.url;
    const encodedMessage = await createPostRefundChecksumHeader(payload);
    const headers = {
      "Content-Type": "application/json",
      accept: "application/json",
      "X-VERIFY": encodedMessage.checksum,
    };

    const result = await axios.post(
      `${url}${apiEndpoint}`,
      { request: encodedMessage.encodedBody },
      {
        headers,
      }
    );
    return result.data;
  }
  validateWebhook(data: string, signature: string, salt: string): boolean {
    const { checksum } = verifyPostCheckSumHeader(data, salt, "");
    this.logger.info(
      `verifying checksum received: ${signature}, computed: ${checksum} `
    );
    if (checksum == signature) {
      this.logger.debug("checksum valid checksum");
      return true;
    }
    return false;
  }
}
