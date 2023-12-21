# MEDUSA-PAYMENT-PHONEPE

# Support the Medusa-Payment-PhonePe Plugin - Elevate Our Medusa Community!

Dear Developers and E-commerce Enthusiasts,

Are you a developer based in India ? Are you looking for a payment solutions that support UPI, and other india specific modes natively. If you are 

A🚀 Welcome to the future of web development and eCommerce! Are you ready to harness the power of seamless payments? Look no further than the Medusa Payment PhonPe plugin – your gateway to a world of convenience, efficiency, and innovation.

In today's fast-paced digital landscape, a smooth and secure payment experience is the cornerstone of success for any eCommerce platform. We understand the challenges you face as a web developer, striving to create exceptional user experiences while ensuring the highest level of trust and reliability. That's where Medusa Payment PhonPe comes in!

Imagine a plugin that effortlessly integrates PhonPe, one of the most trusted and widely-used payment gateways, into the MedusaJS ecosystem. Your users will enjoy a frictionless checkout process, while you benefit from the robustness and simplicity of our solution. No more struggling with complex payment integrations – we've got you covered!

By leveraging the Medusa Payment PhonPe plugin, you'll unlock a multitude of benefits:

✅ Simplicity: Seamlessly integrate PhonPe payments into your Medusa-powered eCommerce platform with just a few lines of code. Our user-friendly documentation ensures a hassle-free setup.

✅ Reliability: Trust is the currency of the digital age. With PhonPe's reputation for security and our commitment to excellence, you can rest assured that your users' transactions are in safe hands.

✅ Speed: Time is of the essence. Our plugin ensures swift and efficient payment processing, reducing checkout friction and boosting customer satisfaction.

✅ Flexibility: We understand that no two eCommerce platforms are alike. That's why our plugin is designed to be customizable, allowing you to tailor the payment experience to your unique requirements.

✅ Innovation: Stay ahead of the curve. By offering PhonPe as a payment option, you're tapping into the growing trend of digital payments, meeting your users where they are and setting your platform apart from the competition.

Join the ranks of successful web developers who have already revolutionized their eCommerce platforms with Medusa Payment PhonPe. Together, let's build a future where every transaction is smooth, every customer is satisfied, and every developer has the tools they need to create magic.

Don't miss out on this opportunity to elevate your eCommerce platform to new heights. Embrace the future of payments with Medusa Payment PhonPe – because when it comes to success, every detail matters, and every payment counts! 💡💰

## Installation Made Simple

No hassle, no fuss! Install Medusa-Payment-PhonePe effortlessly with npm:

```bash
yarn add medusa-payment-phonepe

```

[PHONEPE](https://phonepe.com) an immensely popular payment gateway with a host of features. 
This plugin enables the phonepe payment interface on [medusa](https://medusajs.com) commerce stack

## Installation

Use the package manager yarn to install medusa-payment-phonepe.

```bash
yarn install medusa-payment-phonepe
```

## Usage


Register for a phonepe account and generate the api keys
In your environment file (.env) you need to define 
```
PHONEPE_SALT=<your supplied SALT>
PHONEPE_MODE=<the mode to run your stack in production,uat,test>
PHONEPE_MERCHANT_ACCOUNT=<your phonepe account number/merchant id>

enabledDebugLogging?: boolean; - to enable debug logging. Enabling this might coz the vercel function to timeout

redirectUrl: string;  - the URL to redirect the client to
redirectMode: "REDIRECT" | "POST";
callbackUrl: string; - the server 2 server callback path
merchantId: string; - the phonepe merchant id
salt: string; - the phonpe supplied 
mode: "production" | "test" | "uat" - the mode to operate in. UAT is to test against the phone gateway, production when you want acutal money to be deducted, test.. well its just that  test mode, mocked to be fully implemented. test are currently run in UAT mode. 
```
You need to add the plugin into your medusa-config.js as shown below

```
const plugins = [
  ...,
  {
    resolve:`medusa-payment-phonepe`,
  

   options: {
                redirectUrl: "http://localhost:8000/api/payment-confirmed",
                callbackUrl: "http://localhost:9000/phonepe/hook",
                salt: process.env.PHONEPE_SALT,
                merchantId:
                    process.env.PHONEPE_MERCHANT_ACCOUNT,
                mode: process.env.PHONEPE_MODE,
                redirectMode: "POST"
            }
  
  },
  ...]
```
you can replace http://localhost:8000 with your http(s)://your-client-domain
you can replace http://localhost:9000 with your http(s)://your-server-hook
## Client side configuration


For the nextjs start you need to  make the following changes 

1. Create a route to handle post requests from phone pe by creating a route under
  /app/api/payment-confirmed/route.ts

in that add the following code 

```
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable require-jsdoc */
import { medusaClient } from "@lib/config";
import { createPostCheckSumHeader } from "@lib/util/phonepe-create-post-checksum-header";
import { sleep } from "@lib/util/sleep";

import { notFound } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";
import { PaymentStatusCodeValues } from "types/phonepe-types";

export async function POST(
    request: NextRequest,
    _response: NextResponse
): Promise<NextResponse<unknown>> {
    const urlSplit = request.url.split("//");
    const base = urlSplit[1].split("/")[0];

    const data = await request.formData();

    const receivedChecksum = data.get("checksum");
    const merchantTransactionId = data.get("transactionId");
    const code = data.get("code");
    const merchantId = data.get("merchantId");

    let verificationData = "";

    let cartId = merchantTransactionId?.valueOf() as string;
    const cartIdParts = cartId.split("_");
    cartId = `${cartIdParts[0]}_${cartIdParts[1]}`;
    console.log(`computed cart id: ${cartId} `);
    let redirectPath: string | undefined;
    const redirectErrorPath = `/cart`;

    if (
        code?.valueOf() == PaymentStatusCodeValues.PAYMENT_SUCCESS ||
        code?.valueOf() == PaymentStatusCodeValues.PAYMENT_INITIATED
    ) {
        if (!merchantTransactionId?.valueOf() || !merchantId?.valueOf()) {
            notFound();
        } else if (code?.valueOf() != PaymentStatusCodeValues.PAYMENT_SUCCESS) {
            console.log("invalid code", code?.valueOf());
        } else {
            data.forEach((value, key) => {
                if (key != "checksum") verificationData += value;
            });

            const { checksum } = createPostCheckSumHeader(
                verificationData,
                process.env.PHONEPE_SALT,
                ""
            );
            const checksumReceived = receivedChecksum?.valueOf();
            console.warn(
                `checksum computed = ${checksum} & checksum received = ${checksumReceived}`
            );
            if (checksum == checksumReceived || !process.env.TEST_DISABLED) {
                if (checksum != receivedChecksum?.valueOf()) {
                    console.warn("running in test mode.. This is dangerous!! ");
                }

                try {
                    try {
                        let orderId;
                        let count = 0;
                        while (!orderId) {
                            await sleep(1000);
                            count++;
                            try {
                                const orderCompleted =
                                    await medusaClient.orders.retrieveByCartId(
                                        cartId
                                    );

                                orderId = orderCompleted.order.id;
                            } catch (e) {
                                console.log("order not processed in s2s");
                                if (count > 10) {
                                    throw new Error(
                                        "Order not processed by s2s"
                                    );
                                }
                            }
                        }
                        redirectPath = `/order/confirmed/${orderId}`;
                    } catch (e) {
                        const cartResp = await medusaClient.carts.retrieve(
                            cartId
                        );
                        console.log("order incomplete");
                        try {
                            const authorizedCart =
                                await medusaClient.carts.complete(
                                    cartResp.cart.id
                                );
                            console.log("finalized cart");
                            if (authorizedCart.data.id == cartResp.cart.id) {
                                console.log("error: " + redirectErrorPath);
                            }
                            redirectPath = `/order/confirmed/${authorizedCart.data.id}`;
                            console.log("confirmed: ", redirectPath);
                        } catch (e) {
                            console.log(
                                "error: " +
                                    (e as Error).message +
                                    "\n" +
                                    JSON.stringify(e)
                            );
                            try {
                                await medusaClient.carts.refreshPaymentSession(
                                    cartId,
                                    cartResp.cart.payment_session!.provider_id
                                );
                            } catch (e) {
                                console.log("unable to remove payment session");
                                console.log((e as Error).message);
                            }
                        }
                    }
                } catch (e) {
                    console.log(
                        "cart error: " +
                            (e as Error).message +
                            "\n" +
                            JSON.stringify(e)
                    );
                }
            }
        }
    }
    const locale = request.nextUrl.locale ?? "en";
    const computedUrl = `${urlSplit[0]}//${base}${locale ? "/" + locale : ""}${
        redirectPath ?? redirectErrorPath
    }`;
    console.log(
        "computed URL:" + computedUrl + "\ncartId: " + cartId,
        "\nmerchant_transaction_id: " + merchantTransactionId
    );
    return NextResponse.redirect(new URL(computedUrl), 302);
}

export default POST;


```

##### 2. additional dependencies for browser


```

yarn add crypto-js

```

##### 3. lib functions
###### sleep
```
export const sleep = async (milliseconds: number): Promise<void> => {
    await new Promise((resolve) => {
        return setTimeout(resolve, milliseconds);
    });
};
```

###### phonepe-create-post-checksum-header
```

import sha256 from "crypto-js/sha256";
export function createPostCheckSumHeader(
    payload: any,
    salt?: string,
    apiString?: string
) {
    const SALT_KEY = salt ?? "test-salt";
    const payloadWithSalt = payload + `${apiString ?? ""}${SALT_KEY}`;
    const encodedPayload = sha256(payloadWithSalt).toString();
    const checksum = `${encodedPayload}###1`;
    return { checksum, encodedBody: payload };
}

```
###### phone-pe types

```
export interface PhonePeOptions {
    mode: "production" | "test" | "uat";
    redirectUrl: string;
    callbackUrl: string;
    merchant_id: string;
    salt: string;
  
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
  
  


```



```

```

2. Create a button for PhonePe <next-starter>/src/modules/checkout/components/payment-button/phonepe-payment-button.tsx

like below



````
/* eslint-disable @typescript-eslint/no-explicit-any */
import { medusaClient } from "@lib/config";
import { PaymentSession } from "@medusajs/medusa";
import Button from "@modules/common/components/button";
import Spinner from "@modules/common/icons/spinner";
import { useCart, useUpdatePaymentSession } from "medusa-react";
import { useEffect, useState } from "react";
import { PaymentResponse } from "types/phonepe-types";

export const PhonePePaymentButton = ({
    session,
    notReady
}: {
    session: PaymentSession;
    notReady: boolean;
}) => {
    const [disabled, setDisabled] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | undefined>(
        undefined
    );
    const { cart, setCart } = useCart();

    const updatePaymentSession = useUpdatePaymentSession(cart!.id);
    useEffect(() => {
        console.log(JSON.stringify(session));
        if (!session && cart?.payment.provider_id == "phonepe") {
            setDisabled(true);
        } else {
            setDisabled(false);
        }
    }, [session, cart]);

    const handlePayment = async (event: { preventDefault: () => void }) => {
        event.preventDefault();
        console.log("this is the current session" + session);
        setSubmitting(true);
        if (!cart) {
            setSubmitting(false);
            return;
        }
        console.log("updating the current session");
        await updatePaymentSession.mutateAsync({
            provider_id: session.provider_id,
            data: { readyToPay: true }
        });
        await updatePaymentSession.mutateAsync(
            {
                provider_id: session.provider_id,
                data: { readyToPay: true }
            },
            {
                onSuccess: async ({ cart }, variables, context) => {
                    console.log(
                        "checking update successful or not  the current session" +
                            JSON.stringify(cart) +
                            " variables: ",
                        JSON.stringify(variables) + " context :",
                        JSON.stringify(context)
                    );
                    setCart(cart);
                    const updatedCart = await medusaClient.carts.retrieve(
                        cart.id
                    );
                    console.log(
                        "updating the current session cart  : " +
                            JSON.stringify(updatedCart)
                    );
                    console.log(
                        "cart payment session updated:",
                        JSON.stringify(updatedCart.cart.payment_session)
                    );

                    console.log(
                        "refreshing payment session data" +
                            JSON.stringify(updatedCart.cart.payment_session)
                    );
                    const paymentSessionData = updatedCart.cart.payment_session
                        ?.data as unknown as PaymentResponse;
                    const redirectUrl =
                        paymentSessionData?.data?.instrumentResponse
                            ?.redirectInfo?.url;
                    console.log(`redirect url: ${redirectUrl}`);

                    if (
                        redirectUrl?.includes("https") &&
                        redirectUrl.includes("token=")
                    ) {
                        window.location.replace(redirectUrl);
                    } else {
                        throw new Error(
                            "mutation didn't signal, please click checkout again"
                        );
                    }
                },
                onError: (error, variables, context) => {
                    console.log("message : " + error.message);
                    console.log("variables: " + JSON.stringify(variables));
                    console.log("context: " + JSON.stringify(context));
                    setErrorMessage(
                        "error processing request: " + error.message
                    );
                    setSubmitting(false);
                }
            }
        );
    };
    return (
        <>
            <Button
                disabled={submitting || disabled || notReady}
                onClick={handlePayment}
            >
                {submitting ? <Spinner /> : "Checkout"}
            </Button>
            {errorMessage && (
                <div className="text-red-500 text-small-regular mt-2">
                    {errorMessage}
                </div>
            )}
        </>
    );
};

    
````

Step 3. 

nextjs-starter-medusa/src/modules/checkout/components/payment-container/index.tsx
add

```

phonepe: {
    title: "PhonePe",
    description: "PhonePe payment gateway",
  },
````

&&

```
case "phonepe":
        return (
          <PhonePePaymentButton notReady={notReady} session={paymentSession} />
        )
        


```


and add into the payment element
```
case "phonepe":
        return <></>
```
 
###UAT CREDENTIALS - ONLY FOR TESTING

PHONEPE_SALT=099eb0cd-02cf-4e2a-8aca-3e6c6aff0399
PHONEPE_MERCHANT_ACCOUNT=MERCHANTUAT #FOR UAT TESTING MERCHANTUAT
PHONEPE_MODE=uat #FOR testing

## Contributing


Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License
[MIT](https://choosealicense.com/licenses/mit/)

## Untested features

These features exists, but without implementing the client it isn't possible to tests these outright

1. Refund


## Disclaimer
The code was tested on limited number of usage scenarios. There maybe unforseen bugs, please raise the issues as they come, or create pull requests if you'd like to submit fixes.


## Support the Medusa-Payment-PhonePe Plugin - Strengthen Our Medusa Community!

Dear Medusa Enthusiasts,

I hope this message finds you all in high spirits and enthusiasm for the world of e-commerce! Today, I reach out to our vibrant Medusa community with a heartfelt appeal that will strengthen our collective journey and elevate our online stores to new heights. I am thrilled to present the Medusa-Payment-PhonePe plugin, a community-driven project designed to streamline payment processing for our beloved Medusa platform.

As a dedicated member of this community, I, have invested my time and passion into crafting this valuable plugin that bridges the gap between online retailers and their customers. It is with great humility that I invite you to participate in this open-source initiative by [sponsoring the Medusa-Payment-PhonePe plugin through GitHub](https://github.com/sponsors/SGFGOV).

Your sponsorship, no matter the size, will make a world of difference in advancing the Medusa ecosystem. It will empower me to focus on the continuous improvement and maintenance of the Medusa-Payment-PhonePe plugin, ensuring it remains reliable, secure, and seamlessly integrated with Medusa.

Being a community plugin, perks are not the focus of this appeal. Instead, I promise to give back to the community by providing fast and efficient support via Discord or any other means. Your sponsorship will help sustain and enhance the plugin's development, allowing me to be responsive to your needs and address any concerns promptly.

Let's come together and demonstrate the power of community collaboration. By [sponsoring the Medusa-Payment-PhonePe plugin on GitHub](https://github.com/sponsors/SGFGOV), you directly contribute to the success of not only this project but also the broader Medusa ecosystem. Your support enables us to empower developers, merchants, and entrepreneurs, facilitating growth and success in the world of e-commerce.

To show your commitment and be part of this exciting journey, kindly consider [sponsoring the Medusa-Payment-PhonePe plugin on GitHub](https://github.com/sponsors/SGFGOV). Your contribution will amplify the impact of our community and foster a supportive environment for all.

Thank you for your time, and thank you for being an integral part of our Medusa community. Together, we will elevate our online stores and create extraordinary experiences for customers worldwide.

With warm regards,

SGFGOV

