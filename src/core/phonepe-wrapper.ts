import axios, { Axios, AxiosResponse } from "axios";

import {
  createGetChecksumHeader,
  createGetChecksumTransactionHeader,
  createPostCheckSumHeader,
  createPostPaymentChecksumHeader,
  createPostRefundChecksumHeader,
  createPostValidateVpaChecksumHeader,
} from "../api/utils/utils";
import {
  PaymentCheckStatusResponse,
  PaymentRequest,
  PaymentRequestUPI,
  PaymentRequestUPICollect,
  PaymentRequestUPIQr,
  PaymentResponse,
  PaymentResponseUPI,
  PaymentStatusCodeValues,
  RefundRequest,
} from "../types";
import { GetPaymentsParams, PaymentSessionData } from "@medusajs/medusa";
import { QueryResult } from "typeorm";

export interface PhonePeOptions {
  callbackUrl: string;
  merchantId: string;
  salt: string;
}

export class PhonePeWrapper {
  options: PhonePeOptions;

  constructor(options: PhonePeOptions) {
    this.options = options;
  }

  async postPaymentRequestToPhonePe(
    payload: PaymentRequestUPI | PaymentRequestUPICollect | PaymentRequestUPIQr,
    mode?: "test" | "production",
    apiNewEndpoint?: string
  ): Promise<AxiosResponse> {
    const apiEndpoint = apiNewEndpoint ?? "/pg/v1/pay";
    let url: string;
    if (mode != "production") {
      url = "https://api-preprod.phonepe.com/apis/pg-sandbox";
    } else {
      url = "https://api.phonepe.com/apis/hermes";
    }
    const encodedMessage = await createPostPaymentChecksumHeader(payload);
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
    return result;
  }

  async createPhonePeRequest(
    amount: string,
    merchantTransactionId: string,
    customer_id,
    mobileNumber?: string
  ): Promise<PaymentRequest> {
    const phonePeRequest: PaymentRequest = {
      merchantId: this.options.merchantId,
      merchantTransactionId: merchantTransactionId,
      merchantUserId: customer_id,
      amount: parseInt(amount),
      callbackUrl: this.options.callbackUrl,
      mobileNumber: mobileNumber,
      paymentInstrument: {
        type: "PAY_PAGE",
      },
    };
    return phonePeRequest;
  }
  async getPhonePeStatus(
    merchantId: string,
    merchantTransactionId: string,
    mode?: "test" | "production",
    apiNewEndpoint?: string
  ): Promise<AxiosResponse<PaymentCheckStatusResponse>> {
    const apiEndpoint = apiNewEndpoint ?? "/pg/v1/status";
    let url: string;
    if (mode != "production") {
      url = "https://api-preprod.phonepe.com/apis/pg-sandbox";
    } else {
      url = "https://api.phonepe.com/apis/hermes";
    }
    const encodedMessage = await createGetChecksumHeader(
      merchantId,
      merchantTransactionId
    );
    const headers = {
      "Content-Type": "application/json",
      accept: "application/json",
      "X-VERIFY": encodedMessage.checksum,
      "X-MERCHANT-ID": merchantId,
    };
    const result = await axios.get(
      `${url}${apiEndpoint}/${merchantId}/${merchantTransactionId}`,
      {
        headers,
      }
    );
    return result;
  }

  async validateVpa(
    merchantId: string,
    vpa: string,
    mode?: "test" | "production",
    apiNewEndpoint?: string
  ): Promise<any> {
    const apiEndpoint = apiNewEndpoint ?? "/pg/v1/vpa/validate";
    let url: string;
    if (mode != "production") {
      url = "https://api-preprod.phonepe.com/apis/pg-sandbox";
    } else {
      url = "https://api.phonepe.com/apis/hermes";
    }
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
    return result;
  }
  async getPhonePePostTransactionStatus(
    merchantId: string,
    merchantTransactionId: string,
    mode?: "test" | "production",
    apiNewEndpoint?: string
  ): Promise<any> {
    const apiEndpoint = apiNewEndpoint ?? "/pg/v3/transaction";
    let url: string;
    if (mode != "production") {
      url = "https://api-preprod.phonepe.com/apis/pg-sandbox";
    } else {
      url = "https://api.phonepe.com/apis/hermes";
    }
    const encodedMessage = await createGetChecksumTransactionHeader(
      merchantId,
      merchantTransactionId
    );
    const headers = {
      "Content-Type": "application/json",
      accept: "application/json",
      "X-VERIFY": encodedMessage.checksum,
      "X-MERCHANT-ID": merchantId,
    };
    const result = await axios.get(
      `${url}${apiEndpoint}/${merchantId}/${merchantTransactionId}/status`,
      {
        headers,
      }
    );
    return result;
  }
  async cancel(p: PaymentSessionData): Promise<PaymentSessionData> {
    return p;
  }
  async capture(
    p: PaymentSessionData,
    mode: "production" | "test"
  ): Promise<any> {
    let isCaptured = false;
    const request = p.request as PaymentRequest;
    while (!isCaptured) {
      const result = await this.getPhonePeStatus(
        request.merchantId,
        request.merchantTransactionId,
        mode
      );
      const capturedData = result.data as PaymentCheckStatusResponse;
      isCaptured = capturedData.code != PaymentStatusCodeValues.PAYMENT_PENDING;
    }
  }
  async postRefundRequestToPhonePe(
    payload: RefundRequest,
    mode?: "test" | "production",
    apiNewEndpoint?: string
  ): Promise<any> {
    const apiEndpoint = apiNewEndpoint ?? "/v4/credit/backToSource";
    let url: string;
    if (mode != "production") {
      url = "https://api-preprod.phonepe.com/apis/pg-sandbox";
    } else {
      url = "https://api.phonepe.com/apis/hermes";
    }
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
    return result;
  }
  validateWebhook(data: any, signature: any, webhook_secret: string): boolean {
    const { checksum } = createPostCheckSumHeader(data, webhook_secret, "");

    if (checksum == signature) {
      return true;
    }
    return false;
  }
}
