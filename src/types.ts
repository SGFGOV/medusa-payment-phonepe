export interface PhonePeOptions {
  redirectUrl: string;
  redirectMode: "REDIRECT" | "POST";
  callbackUrl: string;
  merchantId: string;
  salt: string;
  mode: "production" | "test" | "uat";

  /**
   * Use this flag to capture payment immediately (default is false)
   */
  capture?: boolean;
  /**
   * set `automatic_payment_methods` to `{ enabled: true }`
   */
  automatic_payment_methods?: boolean;
  /**
   * Set a default description on the intent if the context does not provide one
   */
  payment_description?: string;
}

export interface PaymentIntentOptions {
  capture_method?: "automatic" | "manual";
  setup_future_usage?: "on_session" | "off_session";
  payment_method_types?: string[];
}

export const ErrorCodes = {
  PAYMENT_INTENT_UNEXPECTED_STATE: "payment_intent_unexpected_state",
  UNSUPPORTED_OPERATION: "unsupported_operation",
};

export const ErrorIntentStatus = {
  SUCCEEDED: "succeeded",
  CANCELED: "canceled",
};

export const PaymentProviderKeys = {
  PHONEPE: "phonepe",
};

export type PaymentRequest =
  | PaymentRequestUPI
  | PaymentRequestUPICollect
  | PaymentRequestUPIQr
  | PaymentRequestWebFlow;

export type PaymentResponse =
  | PaymentResponseUPI
  | PaymentResponseUPICollect
  | PaymentResponseUPIQr
  | PaymentResponseWebFlow;

export interface PaymentRequestUPI {
  merchantId: string;
  merchantTransactionId: string;
  merchantUserId: string;
  redirectUrl: string;
  redirectMode: string;
  amount: number;
  callbackUrl: string;
  mobileNumber?: string;
  deviceContext?: DeviceContext;
  paymentInstrument: PaymentInstrumentUPI;
}
export interface PaymentResponseUPI {
  success: boolean;
  code: PaymentStatusCodeValues;
  message: string;
  data: PaymentResponseData;
}

export interface PaymentResponseData {
  merchantId: string;
  merchantTransactionId: string;
  instrumentResponse: InstrumentResponse;
  customer: { id: string };
}

export interface DeviceContext {
  deviceOS: string;
}

export interface AccountConstraint {
  accountNumber: string;
  ifsc: string;
}

export interface PaymentRequestUPICollect {
  merchantId: string;
  merchantTransactionId: string;
  merchantUserId: string;
  redirectUrl: string;
  redirectMode: string;
  amount: number;
  callbackUrl: string;
  mobileNumber: string;
  paymentInstrument: PaymentInstrument;
}

export interface AccountConstraint {
  accountNumber: string;
  ifsc: string;
}

export interface PaymentResponseUPICollect {
  success: boolean;
  code: PaymentStatusCodeValues;
  message: string;
  data: PaymentResponseUPICollectData;
}

export interface PaymentResponseUPICollectData {
  merchantId: string;
  merchantTransactionId: string;
  instrumentResponse: InstrumentResponse;
}

export interface PaymentRequestUPIQr {
  merchantId: string;
  merchantTransactionId: string;
  merchantUserId: string;
  redirectUrl: string;
  redirectMode: string;
  amount: number;
  callbackUrl: string;
  mobileNumber: string;
  paymentInstrument: PaymentInstrument;
}

export interface AccountConstraint {
  accountNumber: string;
  ifsc: string;
}

export interface PaymentResponseUPIQr {
  success: boolean;
  code: PaymentStatusCodeValues;
  message: string;
  data: PaymentResponseUPIQrData;
}

export interface PaymentResponseUPIQrData {
  merchantId: string;
  merchantTransactionId: string;
  instrumentResponse: InstrumentResponse;
}

export interface InstrumentResponse {
  type: string;
  qrData?: string;
  intentUrl?: string;
  redirectInfo?: RedirectInfo;
}

export interface PaymentRequestWebFlow {
  merchantId: string;
  merchantTransactionId: string;
  merchantUserId: string;
  amount: number;
  redirectUrl: string;
  redirectMode: string;
  callbackUrl: string;
  mobileNumber: string;
  paymentInstrument: PaymentInstrument;
}

export interface PaymentResponseWebFlow {
  success: boolean;
  code: PaymentStatusCodeValues;
  message: string;
  data: PaymentResponseWebFlowData;
}

export interface PaymentResponseWebFlowData {
  merchantId: string;
  merchantTransactionId: string;
  instrumentResponse: InstrumentResponse;
}

export interface RedirectInfo {
  url: string;
  method: string;
}

export interface RefundRequest {
  merchantId: string;
  merchantUserId: string;
  originalTransactionId: string;
  merchantTransactionId: string;
  amount: number;
  callbackUrl: string;
}

export interface RefundResponse {
  success: boolean;
  code: PaymentStatusCodeValues;
  message: string;
  data: RefundResponseData;
}

export interface RefundResponseData {
  merchantId: string;
  merchantTransactionId: string;
  transactionId: string;
  amount: number;
  state: string;
  responseCode: string;
}

export type PaymentCheckStatusResponse =
  | PaymentCheckStatusResponseUPI
  | PaymentCheckStatusResponseCard
  | PaymentCheckStatusResponseNetBanking;

export interface PaymentCheckStatusResponseUPI {
  success: boolean;
  code: PaymentStatusCodeValues;
  message: string;
  data?: PaymentCheckStatusResponseUPIData;
}

export interface PaymentCheckStatusResponseUPIData {
  merchantId: string;
  merchantTransactionId: string;
  transactionId: string;
  amount: number;
  state: string;
  responseCode: string;
  paymentInstrument: PaymentInstrument;
}

export interface PaymentCheckStatusResponseCard {
  success: boolean;
  code: PaymentStatusCodeValues;
  message: string;
  data: PaymentCheckStatusResponseCardData;
}

export interface PaymentCheckStatusResponseCardData {
  merchantId: string;
  merchantTransactionId: string;
  transactionId: string;
  amount: number;
  state: string;
  responseCode: string;
  paymentInstrument: PaymentInstrument;
}

export type PaymentInstrument = PaymentInstrumentNetBanking &
  PaymentInstrumentCard &
  PaymentInstrumentUPI &
  PaymentInstrumentWeb;

export enum PaymentStatusCodeValues {
  "BAD_REQUEST" = "BAD_REQUEST",
  "AUTHORIZATION_FAILED" = "AUTHORIZATION_FAILED",
  "INTERNAL_SERVER_ERROR" = "INTERNAL_SERVER_ERROR",
  "TRANSACTION_NOT_FOUND" = "TRANSACTION_NOT_FOUND",
  "PAYMENT_ERROR" = "PAYMENT_ERROR",
  "PAYMENT_PENDING" = "PAYMENT_PENDING",
  "PAYMENT_DECLINED" = "PAYMENT_DECLINED",
  "TIMED_OUT" = "TIMED_OUT",
  "PAYMENT_SUCCESS" = "PAYMENT_SUCCESS",
  "PAYMENT_CANCELLED" = "PAYMENT_CANCELLED",
  "PAYMENT_INITIATED" = "PAYMENT_INITIATED",
}

export interface PaymentCheckStatusResponseNetBanking {
  success: boolean;
  code: PaymentStatusCodeValues;
  message: string;
  data: PaymentCheckStatusResponseNetBankingData;
}

export interface PaymentCheckStatusResponseNetBankingData {
  merchantId: string;
  merchantTransactionId: string;
  transactionId: string;
  amount: number;
  state: string;
  responseCode: string;
  paymentInstrument: PaymentInstrumentNetBanking;
}

export interface PaymentInstrumentNetBanking {
  type: string;
  pgTransactionId: string;
  pgServiceTransactionId: string;
  bankTransactionId: any;
  bankId: string;
}

export interface PaymentInstrumentCard {
  type: string;
  cardType: string;
  pgTransactionId: string;
  bankTransactionId: string;
  pgAuthorizationCode: string;
  arn: string;
  bankId: string;
  brn: string;
}

export interface PaymentInstrumentWeb {
  type: string;
}

export interface PaymentInstrumentUPI {
  type: string;
  utr?: string;
  targetApp?: string;
  accountConstraints?: AccountConstraint[];
}
