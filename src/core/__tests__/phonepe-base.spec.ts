import { EOL } from "os";
import { PhonePeTest } from "../__fixtures__/phonepe-test";
import { PaymentIntentDataByStatus } from "../../__fixtures__/data";
import { PaymentSessionStatus } from "@medusajs/medusa";
import MockAdapter from "axios-mock-adapter";
import {
  authorizePaymentSuccessData,
  cancelPaymentFailData,
  cancelPaymentPartiallyFailData,
  cancelPaymentSuccessData,
  capturePaymentContextFailData,
  capturePaymentContextPartiallyFailData,
  capturePaymentContextSuccessData,
  deletePaymentFailData,
  deletePaymentPartiallyFailData,
  deletePaymentSuccessData,
  initiatePaymentContextWithExistingCustomer,
  initiatePaymentContextWithExistingCustomerPhonePeId,
  initiatePaymentContextWithFailIntentCreation,
  initiatePaymentContextWithWrongEmail,
  refundPaymentFailData,
  refundPaymentSuccessData,
  retrievePaymentFailData,
  retrievePaymentSuccessData,
  updatePaymentContextFailWithDifferentAmount,
  updatePaymentContextWithDifferentAmount,
  updatePaymentContextWithExistingCustomer,
  updatePaymentContextWithExistingCustomerPhonePeId,
  updatePaymentContextWithWrongEmail,
  updatePaymentDataWithAmountData,
  updatePaymentDataWithoutAmountData,
} from "../__fixtures__/data";
import {
  PARTIALLY_FAIL_INTENT_ID,
  PHONEPE_ID,
  PhonePeMock,
} from "../../__mocks__/phonepe";
import { ErrorIntentStatus } from "../../types";

const container = {};

function enableMockFunctions(axios): void {
  const mock = new MockAdapter(axios);
}

import {
  describe,
  beforeEach,
  afterEach,
  beforeAll,
  expect,
  jest,
  it,
} from "@jest/globals";
describe("PhonePeTest", () => {
  describe("getPaymentStatus", function () {
    let phonepeTest;

    beforeAll(async () => {
      const scopedContainer = { ...container };
      phonepeTest = new PhonePeTest(scopedContainer, { api_key: "test" });
      await phonepeTest.init();
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should return the correct status", async () => {
      let status: PaymentSessionStatus;

      status = await phonepeTest.getPaymentStatus({
        id: PaymentIntentDataByStatus.REQUIRES_PAYMENT_METHOD.id,
      });
      expect(status).toBe(PaymentSessionStatus.PENDING);

      status = await phonepeTest.getPaymentStatus({
        id: PaymentIntentDataByStatus.REQUIRES_CONFIRMATION.id,
      });
      expect(status).toBe(PaymentSessionStatus.PENDING);

      status = await phonepeTest.getPaymentStatus({
        id: PaymentIntentDataByStatus.PROCESSING.id,
      });
      expect(status).toBe(PaymentSessionStatus.PENDING);

      status = await phonepeTest.getPaymentStatus({
        id: PaymentIntentDataByStatus.REQUIRES_ACTION.id,
      });
      expect(status).toBe(PaymentSessionStatus.REQUIRES_MORE);

      status = await phonepeTest.getPaymentStatus({
        id: PaymentIntentDataByStatus.CANCELED.id,
      });
      expect(status).toBe(PaymentSessionStatus.CANCELED);

      status = await phonepeTest.getPaymentStatus({
        id: PaymentIntentDataByStatus.REQUIRES_CAPTURE.id,
      });
      expect(status).toBe(PaymentSessionStatus.AUTHORIZED);

      status = await phonepeTest.getPaymentStatus({
        id: PaymentIntentDataByStatus.SUCCEEDED.id,
      });
      expect(status).toBe(PaymentSessionStatus.AUTHORIZED);

      status = await phonepeTest.getPaymentStatus({
        id: "unknown-id",
      });
      expect(status).toBe(PaymentSessionStatus.PENDING);
    });
  });

  describe("initiatePayment", function () {
    let phonepeTest;

    beforeAll(async () => {
      const scopedContainer = { ...container };
      phonepeTest = new PhonePeTest(scopedContainer, { api_key: "test" });
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should succeed with an existing customer but no phonepe id", async () => {
      const result = await phonepeTest.initiatePayment(
        initiatePaymentContextWithExistingCustomer
      );

      expect(PhonePeMock.customers.create).toHaveBeenCalled();
      expect(PhonePeMock.customers.create).toHaveBeenCalledWith({
        email: initiatePaymentContextWithExistingCustomer.email,
      });

      expect(PhonePeMock.paymentIntents.create).toHaveBeenCalled();
      expect(PhonePeMock.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: undefined,
          amount: initiatePaymentContextWithExistingCustomer.amount,
          currency: initiatePaymentContextWithExistingCustomer.currency_code,
          metadata: {
            resource_id: initiatePaymentContextWithExistingCustomer.resource_id,
          },
          capture_method: "manual",
        })
      );

      expect(result).toEqual(
        expect.objectContaining({
          session_data: expect.any(Object),
          update_requests: {
            customer_metadata: {
              phonepe_id: PHONEPE_ID,
            },
          },
        })
      );
    });

    it("should succeed with an existing customer with an existing phonepe id", async () => {
      const result = await phonepeTest.initiatePayment(
        initiatePaymentContextWithExistingCustomerPhonePeId
      );

      expect(PhonePeMock.customers.create).not.toHaveBeenCalled();

      expect(PhonePeMock.paymentIntents.create).toHaveBeenCalled();
      expect(PhonePeMock.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: undefined,
          amount: initiatePaymentContextWithExistingCustomer.amount,
          currency: initiatePaymentContextWithExistingCustomer.currency_code,
          metadata: {
            resource_id: initiatePaymentContextWithExistingCustomer.resource_id,
          },
          capture_method: "manual",
        })
      );

      expect(result).toEqual(
        expect.objectContaining({
          session_data: expect.any(Object),
          update_requests: undefined,
        })
      );
    });

    it("should fail on customer creation", async () => {
      const result = await phonepeTest.initiatePayment(
        initiatePaymentContextWithWrongEmail
      );

      expect(PhonePeMock.customers.create).toHaveBeenCalled();
      expect(PhonePeMock.customers.create).toHaveBeenCalledWith({
        email: initiatePaymentContextWithWrongEmail.email,
      });

      expect(PhonePeMock.paymentIntents.create).not.toHaveBeenCalled();

      expect(result).toEqual({
        error:
          "An error occurred in initiatePayment when creating a PhonePe customer",
        code: "",
        detail: "Error",
      });
    });

    it("should fail on payment intents creation", async () => {
      const result = await phonepeTest.initiatePayment(
        initiatePaymentContextWithFailIntentCreation
      );

      expect(PhonePeMock.customers.create).toHaveBeenCalled();
      expect(PhonePeMock.customers.create).toHaveBeenCalledWith({
        email: initiatePaymentContextWithFailIntentCreation.email,
      });

      expect(PhonePeMock.paymentIntents.create).toHaveBeenCalled();
      expect(PhonePeMock.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description:
            initiatePaymentContextWithFailIntentCreation.context
              .payment_description,
          amount: initiatePaymentContextWithFailIntentCreation.amount,
          currency: initiatePaymentContextWithFailIntentCreation.currency_code,
          metadata: {
            resource_id:
              initiatePaymentContextWithFailIntentCreation.resource_id,
          },
          capture_method: "manual",
        })
      );

      expect(result).toEqual({
        error:
          "An error occurred in InitiatePayment during the creation of the phonepe payment intent",
        code: "",
        detail: "Error",
      });
    });
  });

  describe("authorizePayment", function () {
    let phonepeTest;

    beforeAll(async () => {
      const scopedContainer = { ...container };
      phonepeTest = new PhonePeTest(scopedContainer, { api_key: "test" });
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should succeed", async () => {
      const result = await phonepeTest.authorizePayment(
        authorizePaymentSuccessData
      );

      expect(result).toEqual({
        data: authorizePaymentSuccessData,
        status: PaymentSessionStatus.AUTHORIZED,
      });
    });
  });

  describe("cancelPayment", function () {
    let phonepeTest;

    beforeAll(async () => {
      const scopedContainer = { ...container };
      phonepeTest = new PhonePeTest(scopedContainer, { api_key: "test" });
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should succeed", async () => {
      const result = await phonepeTest.cancelPayment(cancelPaymentSuccessData);

      expect(result).toEqual({
        id: PaymentIntentDataByStatus.SUCCEEDED.id,
      });
    });

    it("should fail on intent cancellation but still return the intent", async () => {
      const result = await phonepeTest.cancelPayment(
        cancelPaymentPartiallyFailData
      );

      expect(result).toEqual({
        id: PARTIALLY_FAIL_INTENT_ID,
        status: ErrorIntentStatus.CANCELED,
      });
    });

    it("should fail on intent cancellation", async () => {
      const result = await phonepeTest.cancelPayment(cancelPaymentFailData);

      expect(result).toEqual({
        error: "An error occurred in cancelPayment",
        code: "",
        detail: "Error",
      });
    });
  });

  describe("capturePayment", function () {
    let phonepeTest;

    beforeAll(async () => {
      const scopedContainer = { ...container };
      phonepeTest = new PhonePeTest(scopedContainer, { api_key: "test" });
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should succeed", async () => {
      const result = await phonepeTest.capturePayment(
        capturePaymentContextSuccessData.paymentSessionData
      );

      expect(result).toEqual({
        id: PaymentIntentDataByStatus.SUCCEEDED.id,
      });
    });

    it("should fail on intent capture but still return the intent", async () => {
      const result = await phonepeTest.capturePayment(
        capturePaymentContextPartiallyFailData.paymentSessionData
      );

      expect(result).toEqual({
        id: PARTIALLY_FAIL_INTENT_ID,
        status: ErrorIntentStatus.SUCCEEDED,
      });
    });

    it("should fail on intent capture", async () => {
      const result = await phonepeTest.capturePayment(
        capturePaymentContextFailData.paymentSessionData
      );

      expect(result).toEqual({
        error: "An error occurred in capturePayment",
        code: "",
        detail: "Error",
      });
    });
  });

  describe("deletePayment", function () {
    let phonepeTest;

    beforeAll(async () => {
      const scopedContainer = { ...container };
      phonepeTest = new PhonePeTest(scopedContainer, { api_key: "test" });
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should succeed", async () => {
      const result = await phonepeTest.cancelPayment(deletePaymentSuccessData);

      expect(result).toEqual({
        id: PaymentIntentDataByStatus.SUCCEEDED.id,
      });
    });

    it("should fail on intent cancellation but still return the intent", async () => {
      const result = await phonepeTest.cancelPayment(
        deletePaymentPartiallyFailData
      );

      expect(result).toEqual({
        id: PARTIALLY_FAIL_INTENT_ID,
        status: ErrorIntentStatus.CANCELED,
      });
    });

    it("should fail on intent cancellation", async () => {
      const result = await phonepeTest.cancelPayment(deletePaymentFailData);

      expect(result).toEqual({
        error: "An error occurred in cancelPayment",
        code: "",
        detail: "Error",
      });
    });
  });

  describe("refundPayment", function () {
    let phonepeTest;
    const refundAmount = 500;

    beforeAll(async () => {
      const scopedContainer = { ...container };
      phonepeTest = new PhonePeTest(scopedContainer, { api_key: "test" });
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should succeed", async () => {
      const result = await phonepeTest.refundPayment(
        refundPaymentSuccessData,
        refundAmount
      );

      expect(result).toEqual({
        id: PaymentIntentDataByStatus.SUCCEEDED.id,
      });
    });

    it("should fail on refund creation", async () => {
      const result = await phonepeTest.refundPayment(
        refundPaymentFailData,
        refundAmount
      );

      expect(result).toEqual({
        error: "An error occurred in refundPayment",
        code: "",
        detail: "Error",
      });
    });
  });

  describe("retrievePayment", function () {
    let phonepeTest;

    beforeAll(async () => {
      const scopedContainer = { ...container };
      phonepeTest = new PhonePeTest(scopedContainer, { api_key: "test" });
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should succeed", async () => {
      const result = await phonepeTest.retrievePayment(
        retrievePaymentSuccessData
      );

      expect(result).toEqual({
        id: PaymentIntentDataByStatus.SUCCEEDED.id,
        status: PaymentIntentDataByStatus.SUCCEEDED.status,
      });
    });

    it("should fail on refund creation", async () => {
      const result = await phonepeTest.retrievePayment(retrievePaymentFailData);

      expect(result).toEqual({
        error: "An error occurred in retrievePayment",
        code: "",
        detail: "Error",
      });
    });
  });

  describe("updatePayment", function () {
    let phonepeTest;

    beforeAll(async () => {
      const scopedContainer = { ...container };
      phonepeTest = new PhonePeTest(scopedContainer, { api_key: "test" });
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should succeed to initiate a payment with an existing customer but no phonepe id", async () => {
      const result = await phonepeTest.updatePayment(
        updatePaymentContextWithExistingCustomer
      );

      expect(PhonePeMock.customers.create).toHaveBeenCalled();
      expect(PhonePeMock.customers.create).toHaveBeenCalledWith({
        email: updatePaymentContextWithExistingCustomer.email,
      });

      expect(PhonePeMock.paymentIntents.create).toHaveBeenCalled();
      expect(PhonePeMock.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          description: undefined,
          amount: updatePaymentContextWithExistingCustomer.amount,
          currency: updatePaymentContextWithExistingCustomer.currency_code,
          metadata: {
            resource_id: updatePaymentContextWithExistingCustomer.resource_id,
          },
          capture_method: "manual",
        })
      );

      expect(result).toEqual(
        expect.objectContaining({
          session_data: expect.any(Object),
          update_requests: {
            customer_metadata: {
              phonepe_id: PHONEPE_ID,
            },
          },
        })
      );
    });

    it("should fail to initiate a payment with an existing customer but no phonepe id", async () => {
      const result = await phonepeTest.updatePayment(
        updatePaymentContextWithWrongEmail
      );

      expect(PhonePeMock.customers.create).toHaveBeenCalled();
      expect(PhonePeMock.customers.create).toHaveBeenCalledWith({
        email: updatePaymentContextWithWrongEmail.email,
      });

      expect(PhonePeMock.paymentIntents.create).not.toHaveBeenCalled();

      expect(result).toEqual({
        error:
          "An error occurred in updatePayment during the initiate of the new payment for the new customer",
        code: "",
        detail:
          "An error occurred in initiatePayment when creating a PhonePe customer" +
          EOL +
          "Error",
      });
    });

    it("should succeed but no update occurs when the amount did not changed", async () => {
      const result = await phonepeTest.updatePayment(
        updatePaymentContextWithExistingCustomerPhonePeId
      );

      expect(PhonePeMock.paymentIntents.update).not.toHaveBeenCalled();

      expect(result).not.toBeDefined();
    });

    it("should succeed to update the intent with the new amount", async () => {
      const result = await phonepeTest.updatePayment(
        updatePaymentContextWithDifferentAmount
      );

      expect(PhonePeMock.paymentIntents.update).toHaveBeenCalled();
      expect(PhonePeMock.paymentIntents.update).toHaveBeenCalledWith(
        updatePaymentContextWithDifferentAmount.paymentSessionData.id,
        {
          amount: updatePaymentContextWithDifferentAmount.amount,
        }
      );

      expect(result).toEqual({
        session_data: expect.objectContaining({
          amount: updatePaymentContextWithDifferentAmount.amount,
        }),
      });
    });

    it("should fail to update the intent with the new amount", async () => {
      const result = await phonepeTest.updatePayment(
        updatePaymentContextFailWithDifferentAmount
      );

      expect(PhonePeMock.paymentIntents.update).toHaveBeenCalled();
      expect(PhonePeMock.paymentIntents.update).toHaveBeenCalledWith(
        updatePaymentContextFailWithDifferentAmount.paymentSessionData.id,
        {
          amount: updatePaymentContextFailWithDifferentAmount.amount,
        }
      );

      expect(result).toEqual({
        error: "An error occurred in updatePayment",
        code: "",
        detail: "Error",
      });
    });
  });

  describe("updatePaymentData", function () {
    let phonepeTest;

    beforeAll(async () => {
      const scopedContainer = { ...container };
      phonepeTest = new PhonePeTest(scopedContainer, { api_key: "test" });
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should succeed to update the payment data", async () => {
      const result = await phonepeTest.updatePaymentData(
        updatePaymentDataWithoutAmountData.sessionId,
        { ...updatePaymentDataWithoutAmountData, sessionId: undefined }
      );

      expect(PhonePeMock.paymentIntents.update).toHaveBeenCalled();
      expect(PhonePeMock.paymentIntents.update).toHaveBeenCalledWith(
        updatePaymentDataWithoutAmountData.sessionId,
        {
          customProp: updatePaymentDataWithoutAmountData.customProp,
        }
      );

      expect(result).toEqual(
        expect.objectContaining({
          customProp: updatePaymentDataWithoutAmountData.customProp,
        })
      );
    });

    it("should fail to update the payment data if the amount is present", async () => {
      const result = await phonepeTest.updatePaymentData(
        updatePaymentDataWithAmountData.sessionId,
        { ...updatePaymentDataWithAmountData, sessionId: undefined }
      );

      expect(PhonePeMock.paymentIntents.update).not.toHaveBeenCalled();

      expect(result).toEqual({
        error: "An error occurred in updatePaymentData",
        code: undefined,
        detail: "Cannot update amount, use updatePayment instead",
      });
    });
  });
});
