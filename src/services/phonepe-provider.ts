import PhonePeBase from "../core/phonepe-base";
import { PaymentIntentOptions, PaymentProviderKeys } from "../types";

class PhonePeProviderService extends PhonePeBase {
  static identifier = PaymentProviderKeys.PHONEPE;

  constructor(_, options) {
    super(_, options);
  }

  get paymentIntentOptions(): PaymentIntentOptions {
    return {};
  }
}

export default PhonePeProviderService;
