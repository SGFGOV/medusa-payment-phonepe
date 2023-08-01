import PhonePeBase from "../phonepe-base";
import { PaymentIntentOptions, PhonePeOptions } from "../../types";

export class PhonePeTest extends PhonePeBase {
  constructor(_, options: PhonePeOptions) {
    super(_, options);
  }

  get paymentIntentOptions(): PaymentIntentOptions {
    return {};
  }
}
