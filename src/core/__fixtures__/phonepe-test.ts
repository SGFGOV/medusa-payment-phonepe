import PhonePeBase from "../phonepe-base"
import { PaymentIntentOptions } from "../../types"

export class PhonePeTest extends PhonePeBase {
  constructor(_, options) {
    super(_, options)
  }

  get paymentIntentOptions(): PaymentIntentOptions {
    return {}
  }
}
