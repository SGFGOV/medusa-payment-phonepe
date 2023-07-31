export const existingCartId = "existingCartId";
export const existingCartIdWithCapturedStatus =
  "existingCartIdWithCapturedStatus";
export const nonExistingCartId = "nonExistingCartId";
export const throwingCartId = "throwingCartId";

export const existingResourceId = "paycol_existing";
export const existingResourceNotCapturedId = "paycol_existing_not_aptured";

export const orderIdForExistingCartId = "order-1";

export const paymentIntentId = "paymentIntentId";

export const paymentId = "paymentId";

export const sampleMerchantData = {
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

export const testEncodedString = {
  request:
    "ewogICJtZXJjaGFudElkIjogIk1FUkNIQU5UVUFUIiwKICAibWVyY2hhbnRUcmFuc2FjdGlvbklkIjogIk1UNzg1MDU5MDA2ODE4ODEwNCIsCiAgIm1lcmNoYW50VXNlcklkIjogIk1VSUQxMjMiLAogICJhbW91bnQiOiAxMDAwMCwKICAicmVkaXJlY3RVcmwiOiAiaHR0cHM6Ly93ZWJob29rLnNpdGUvcmVkaXJlY3QtdXJsIiwKICAicmVkaXJlY3RNb2RlIjogIlBPU1QiLAogICJjYWxsYmFja1VybCI6ICJodHRwczovL3dlYmhvb2suc2l0ZS9jYWxsYmFjay11cmwiLAogICJtb2JpbGVOdW1iZXIiOiAiOTk5OTk5OTk5OSIsCiAgInBheW1lbnRJbnN0cnVtZW50IjogewogICAgInR5cGUiOiAiUEFZX1BBR0UiCiAgfQp9",
};

export const testCheckSumValue =
  "2cd3a2cd04ff5b453df11e91f97b29fae10fe22522a29c1ae6b7fad41478d8b5###1";

export const sampleUpiResponsePass = {
  success: true,
  code: "PAYMENT_SUCCESS",
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

export const sampleUpiResponseFail = {
  success: true,
  code: "PAYMENT_ERROR",
  message: "Payment Failed",
  data: {
    merchantId: "FKRT",
    merchantTransactionId: "MT7850590068188104",
    transactionId: "T2111221437456190170379",
    amount: 100,
    state: "FAILED",
    responseCode: "ZU",
    paymentInstrument: null,
  },
};
