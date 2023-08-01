/* case "PAYMENT_PENDING":
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
*/

export const PaymentIntentDataByStatus = {
  PAYMENT_PENDING: {
    id: "PAYMENT_PENDING",
    status: "PAYMENT_PENDING",
  },
  BAD_REQUEST: {
    id: "BAD_REQUEST",
    status: "ERROR",
  },
  INTERNAL_SERVER_ERROR: {
    id: "INTERNAL_SERVER_ERROR",
    status: "ERROR",
  },
  AUTHORIZATION_FAILED: {
    id: "AUTHORIZATION_FAILED",
    status: "ERROR",
  },
  TRANSACTION_NOT_FOUND: {
    id: "TRANSACTION_NOT_FOUND",
    status: "CANCELLED",
  },
  PAYMENT_SUCCESS: {
    id: "PAYMENT_SUCCESS",
    status: "AUTHORIZED",
  },
};
