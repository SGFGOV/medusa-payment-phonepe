import { PaymentIntentDataByStatus } from "../__fixtures__/data";
import { ErrorCodes, ErrorIntentStatus } from "../types";
import {
  describe,
  beforeEach,
  afterEach,
  beforeAll,
  expect,
  jest,
  it,
} from "@jest/globals";
export const WRONG_CUSTOMER_EMAIL = "wrong@test.fr";
export const EXISTING_CUSTOMER_EMAIL = "right@test.fr";
export const PHONEPE_ID = "test";
export const PARTIALLY_FAIL_INTENT_ID = "partially_unknown";
export const FAIL_INTENT_ID = "unknown";
import dotenv from "dotenv";

dotenv.config();

const mockEnabled = process.env.DISABLE_MOCKS == "true" ? false : true;

export function isMocksEnabled(): boolean {
  if (mockEnabled) {
    console.log("using mocks");
  }
  return mockEnabled;
}

export const PhonePeMock = {
  paymentIntents: {
    retrieve: jest.fn().mockImplementation(async (paymentId) => {
      if (paymentId === FAIL_INTENT_ID) {
        throw new Error("Error");
      }

      return (
        Object.values(PaymentIntentDataByStatus).find((value) => {
          return value.id === paymentId;
        }) ?? {}
      );
    }),
    update: jest.fn().mockImplementation(async (paymentId, updateData: any) => {
      if (paymentId === FAIL_INTENT_ID) {
        throw new Error("Error");
      }

      const data =
        Object.values(PaymentIntentDataByStatus).find((value) => {
          return value.id === paymentId;
        }) ?? {};

      return { ...data, ...updateData };
    }),
    create: jest.fn().mockImplementation(async (data: any) => {
      if (data.description === "fail") {
        throw new Error("Error");
      }

      return data;
    }),
    cancel: jest.fn().mockImplementation(async (paymentId) => {
      if (paymentId === FAIL_INTENT_ID) {
        throw new Error("Error");
      }

      if (paymentId === PARTIALLY_FAIL_INTENT_ID) {
        throw new Error(
          JSON.stringify({
            code: ErrorCodes.PAYMENT_INTENT_UNEXPECTED_STATE,
            payment_intent: {
              id: paymentId,
              status: ErrorIntentStatus.CANCELED,
            } as any,
            type: "invalid_request_error",
          })
        );
      }

      return { id: paymentId };
    }),
    capture: jest.fn().mockImplementation(async (paymentId) => {
      if (paymentId === FAIL_INTENT_ID) {
        throw new Error("Error");
      }

      if (paymentId === PARTIALLY_FAIL_INTENT_ID) {
        throw Error(
          JSON.stringify({
            code: ErrorCodes.PAYMENT_INTENT_UNEXPECTED_STATE,
            payment_intent: {
              id: paymentId,
              status: ErrorIntentStatus.SUCCEEDED,
            } as any,
            type: "invalid_request_error",
          })
        );
      }

      return { id: paymentId };
    }),
  },
  refunds: {
    create: jest
      .fn()
      .mockImplementation(async ({ payment_intent: paymentId }: any) => {
        if (paymentId === FAIL_INTENT_ID) {
          throw new Error("Error");
        }

        return { id: paymentId };
      }),
  },
  customers: {
    create: jest.fn().mockImplementation(async (data: any) => {
      if (data.email === EXISTING_CUSTOMER_EMAIL) {
        return { id: PHONEPE_ID, ...data };
      }

      throw new Error("Error");
    }),
  },
};

const phonepe = jest.fn(() => PhonePeMock);

export default phonepe;
