import {
  EXISTING_CUSTOMER_EMAIL,
  FAIL_INTENT_ID,
  PARTIALLY_FAIL_INTENT_ID,
  PHONEPE_ID,
  WRONG_CUSTOMER_EMAIL,
} from "../../__mocks__/phonepe";
import { PaymentIntentDataByStatus } from "../../__fixtures__/data";
import { Customer, PaymentProcessorContext } from "@medusajs/medusa";
import { PaymentStatusCodeValues, PhonePeS2SResponse } from "../../types";

// INITIATE PAYMENT DATA

export const initiatePaymentContextWithExistingCustomer: PaymentProcessorContext =
  {
    email: EXISTING_CUSTOMER_EMAIL,
    currency_code: "inr",
    amount: 1000,
    resource_id: "test",
    customer: { phone: "9999999999", id: "thisIsATestUser" } as any,
    context: {},
    paymentSessionData: {
      readyToPay: true,
      merchantTransactionId: "test" + Math.round(Math.random() * 1e10),
      redirectUrl: `https://localhost:8000/order/${
        "test" + Math.round(Math.random() * 1e10)
      }`,
    },
  };

export const initiatePaymentContextWithExistingCustomerPhonePeId = {
  email: EXISTING_CUSTOMER_EMAIL,
  currency_code: "usd",
  amount: 1000,
  resource_id: "test",
  customer: {
    metadata: {
      phonepe_id: "test",
    },
  },
  context: {},
  paymentSessionData: {},
};

export const initiatePaymentContextWithWrongEmail = {
  email: WRONG_CUSTOMER_EMAIL,
  currency_code: "usd",
  amount: 1000,
  resource_id: "test",
  customer: {},
  context: {},
  paymentSessionData: {},
};

export const initiatePaymentContextWithFailIntentCreation = {
  email: EXISTING_CUSTOMER_EMAIL,
  currency_code: "usd",
  amount: 1000,
  resource_id: "test",
  customer: {},
  context: {
    payment_description: "fail",
  },
  paymentSessionData: {},
};

// AUTHORIZE PAYMENT DATA

export const authorizePaymentSuccessData = {
  id: PaymentIntentDataByStatus.PAYMENT_SUCCESS.id,
};

// CANCEL PAYMENT DATA

export const cancelPaymentSuccessData = {
  id: PaymentIntentDataByStatus.PAYMENT_SUCCESS.id,
};

export const cancelPaymentFailData = {
  id: FAIL_INTENT_ID,
};

export const cancelPaymentPartiallyFailData = {
  id: PARTIALLY_FAIL_INTENT_ID,
};

// CAPTURE PAYMENT DATA

export const capturePaymentContextSuccessData = {
  paymentSessionData: {
    id: PaymentIntentDataByStatus.PAYMENT_SUCCESS.id,
  },
};

export const capturePaymentContextFailData = {
  paymentSessionData: {
    id: FAIL_INTENT_ID,
  },
};

export const capturePaymentContextPartiallyFailData = {
  paymentSessionData: {
    id: PARTIALLY_FAIL_INTENT_ID,
  },
};

// DELETE PAYMENT DATA

export const deletePaymentSuccessData = {
  id: PaymentIntentDataByStatus.PAYMENT_SUCCESS.id,
};

export const deletePaymentFailData = {
  id: FAIL_INTENT_ID,
};

export const deletePaymentPartiallyFailData = {
  id: PARTIALLY_FAIL_INTENT_ID,
};

// REFUND PAYMENT DATA

export const refundPaymentSuccessData = {
  id: PaymentIntentDataByStatus.PAYMENT_SUCCESS.id,
};

export const refundPaymentFailData = {
  id: FAIL_INTENT_ID,
};

// RETRIEVE PAYMENT DATA

export const retrievePaymentSuccessData = {
  id: PaymentIntentDataByStatus.PAYMENT_SUCCESS.id,
};

export const retrievePaymentFailData = {
  id: FAIL_INTENT_ID,
};

// UPDATE PAYMENT DATA

export const updatePaymentContextWithExistingCustomer = {
  email: EXISTING_CUSTOMER_EMAIL,
  currency_code: "usd",
  amount: 1000,
  resource_id: "test",
  customer: {},
  context: {},
  paymentSessionData: {
    readyToPay: true,
    customer: "test",
    amount: 1000,
  },
};

export const updatePaymentContextWithExistingCustomerPhonePeId = {
  email: EXISTING_CUSTOMER_EMAIL,
  currency_code: "usd",
  amount: 1000,
  resource_id: "test",
  customer: {
    metadata: {
      phonepe_id: "test",
    },
  },
  context: {},
  paymentSessionData: {
    readyToPay: true,
    customer: "test",
    amount: 1000,
  },
};

export const updatePaymentContextWithWrongEmail = {
  email: WRONG_CUSTOMER_EMAIL,
  currency_code: "usd",
  amount: 1000,
  resource_id: "test",
  customer: {},
  context: {},
  paymentSessionData: {
    readyToPay: true,
    customer: "test",
    amount: 1000,
  },
};

export const updatePaymentContextWithDifferentAmount = {
  email: EXISTING_CUSTOMER_EMAIL,
  currency_code: "usd",
  amount: 300,
  resource_id: "test",
  customer: { phone: "9999999999", id: "thisIsATestUser" } as any,
  context: {},
  paymentSessionData: {
    readyToPay: true,
    merchantTransactionId: "test" + Math.round(Math.random() * 1e10),
    redirectUrl: `https://localhost:8000/order/${
      "test" + Math.round(Math.random() * 1e10)
    }`,
  },
};

export const updatePaymentContextFailWithDifferentAmount = {
  email: WRONG_CUSTOMER_EMAIL,
  currency_code: "usd",
  amount: 500,
  resource_id: "test",
  customer: {
    metadata: {
      phonepe_id: "test",
    },
  },
  context: {
    metadata: {
      phonepe_id: "test",
    },
  },
  paymentSessionData: {
    id: FAIL_INTENT_ID,
    customer: "test",
    amount: 1000,
  },
};

export const updatePaymentDataWithAmountData = {
  sessionId: PHONEPE_ID,
  amount: 500,
};

export const updatePaymentDataWithoutAmountData = {
  sessionId: PHONEPE_ID,
  customProp: "test",
};

export const UPIPaymentRequest = {
  merchantId: "MERCHANTUAT",
  merchantTransactionId: "MT7850590068188104",
  merchantUserId: "MU933037302229373",
  amount: 10000,
  callbackUrl: "https://webhook.site/callback-url",
  mobileNumber: "9999999999",
  deviceContext: {
    deviceOS: "IOS",
    merchantCallBackScheme: "iOSIntentIntegration",
  },
  paymentInstrument: {
    type: "UPI_INTENT",
    targetApp: "PHONEPE",
    accountConstraints: [
      {
        // Optional. Required only for TPV Flow.
        accountNumber: "420200001892",
        ifsc: "ICIC0000041",
      },
    ],
  },
};

export const SamplePayloadBase64StdCheckout = {
  merchantId: "MERCHANTUAT",
  merchantTransactionId: "MT7850590068188104",
  merchantUserId: "MUID123",
  amount: 10000,
  redirectUrl: "https://webhook.site/redirect-url",
  redirectMode: "POST",
  callbackUrl: "https://webhook.site/callback-url",
  mobileNumber: "9999999999",
  paymentInstrument: {
    type: "PAY_PAGE",
  },
};
export const responseHookData: PhonePeS2SResponse = {
  success: true,
  code: PaymentStatusCodeValues.PAYMENT_SUCCESS,
  message: "Your request has been successfully completed.",
  data: {
    merchantId: "FKRT",
    merchantTransactionId: "MT7850590068188104",
    transactionId: "T2111221437456190170379",
    amount: 100,
    state: "COMPLETED",
    responseCode: "SUCCESS",
    paymentInstrument: {
      type: "UPI",
      utr: "206378866112",
    },
  },
};
