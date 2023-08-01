# MEDUSA-PAYMENT-PHONEPE

# Support the Medusa-Payment-PhonePe Plugin - Elevate Our Medusa Community!

Dear Developers and E-commerce Enthusiasts,

Are you ready to revolutionize the world of online stores with MedusaJS? We have an exciting opportunity that will make payment processing a breeze for our beloved Medusa platform! Introducing the Medusa-Payment-PhonePe plugin, a community-driven project that brings the immensely popular [PHONEPE](https://phonepe.com) payment gateway to our MedusaJS commerce stack.

**What's in it for You:**

🚀 Streamline Payment Processing: With Medusa-Payment-PhonePe, you can unleash the full potential of PhonePe's features, ensuring seamless and secure payments for your customers.

🌐 Global Reach: Engage with customers worldwide, as PhonePe supports various currencies and payment methods, catering to a diverse audience.

🎉 Elevate Your Medusa Store: By sponsoring this plugin, you empower the entire Medusa community, driving innovation and success across the platform.

## Installation Made Simple

No hassle, no fuss! Install Medusa-Payment-PhonePe effortlessly with npm:

```bash
npm install medusa-payment-phonepe



[PHONEPE](https://phonepe.com) an immensely popular payment gateway with a host of features. 
This plugin enables the phonepe payment interface on [medusa](https://medusajs.com) commerce stack

## Installation

Use the package manager npm to install medusa-payment-phonepe.

```bash
npm install medusa-payment-phonepe
```

## Usage


Register for a phonepe account and generate the api keys
In your environment file (.env) you need to define 
```
PHONEPE_ID=<your api key>
PHONEPE_SECRET=<your api key secret>
PHONEPE_ACCOUNT=<your phonepe account number/merchant id>
```
You need to add the plugin into your medusa-config.js as shown below

```
const plugins = [
  ...,
  {
    resolve:`medusa-payment-phonepe`,
    options:{

  salt: process.env.PHONEPE_SALT!,
  webhook_secret: process.env.PHONEPE_WEBHOOK_SECRET!,
  merchant_id: process.env.PHONEPE_MERCHANT_ACCOUNT!,
  paymentCallbackUrl: "https://localhost:9000",
  callbackUrl: "https://localhost:8000",
    }
  },
  ...]
```
## Client side configuration


For the nextjs start you need to  make the following changes 

1. Install package to your next starter. This just makes it easier, importing all the scripts implicitly
```
yarn add react-phonepe

```
2. Create a button for PhonePe <next-starter>/src/modules/checkout/components/payment-button/phonepe-payment-button.tsx

like below



````
import { useCheckout } from "@lib/context/checkout-context"
import { PaymentSession } from "@medusajs/medusa"
import Button from "@modules/common/components/button"
import Spinner from "@modules/common/icons/spinner"
import { useCart, useUpdatePaymentSession } from "medusa-react"
import { useCallback, useEffect, useState } from "react"
import usePhonePe, { PhonePeOptions } from "react-phonepe"

export const PhonePePaymentButton = ({
    session,
    notReady,
  }: {
    session: PaymentSession
    notReady: boolean
  }) => {
    const [disabled, setDisabled] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | undefined>(
      undefined
    )
  
    const { cart } = useCart()
    const { onPaymentCompleted } = useCheckout()
    
  
    const [PhonePe, isLoaded] = usePhonePe();
    
    
    useEffect(() => {
      if (!PhonePe) {
        setDisabled(true)
      } else {
        setDisabled(false)
      }
    }, [PhonePe])
  
    
        
    
        
  const handlePayment = useCallback(() => {
  
  
    if (!PhonePe || !cart) {
      return
      }
  
    if(cart) {
        const amountToBePaid  = cart.total!
          let options:PhonePeOptions = {
              "key": process.env.NEXT_PUBLIC_PHONEPE_KEY!,
              "amount": amountToBePaid.toString(), // 2000 paise = INR 20, amount in paisa
              "name": process.env.NEXT_PUBLIC_SHOP_NAME!,
              "description": process.env.NEXT_PUBLIC_SHOP_DESCRIPTION,
              "order_id":session.data.id as string,
              "currency":(session.data.currency as string).toUpperCase(),
              modal: {
                backdropclose:true,
                escape: true,
                handleback: true,
                confirm_close: true,
                ondismiss: () => {
                    setSubmitting(false)
                },
                animation: true,
            },
              handler:(args)=>{
            
                onPaymentCompleted()
              },
              "prefill":{
                  "name":cart.billing_address.first_name + " "+ cart.billing_address.last_name,
                  "email":cart.email,
                  "contact":cart.billing_address.phone!
              },
              "notes": {
                "address": cart.billing_address,
                "order_notes":session.data.notes
              },
              callback_url:`${process.env.MEDUSA_BACKEND_URL}/hook/phonepe`,
              "theme": {
                "color":  process.env.NEXT_PUBLIC_SHOP_COLOUR ?? "00000"
              }
             }; 
            let rzp = new PhonePe(options);
            rzp.on("payment.failed", function (response:any) {
                setErrorMessage(JSON.stringify(response.error))
            })
            rzp.on("payment.authorized", function (response:any) {
               
            })
            rzp.on("payment.captured", function (response:any) {
                
             }
            )
            rzp.open();
    }
    },[PhonePe, cart, onPaymentCompleted, session.data.currency, session.data.id, session.data.notes]);

    useEffect(() => {
        if (isLoaded) {
        //  handlePayment();
        }
      }, [isLoaded, handlePayment])
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
    )
  }
  
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

and add into the payment element

case "phonepe":
        return <></>


Step 4. Add enviroment variables in the client

  NEXT_PUBLIC_PHONEPE_KEY:<your phonepe key>
  NEXT_PUBLIC_SHOP_NAME:<your phonepe shop name>
  NEXT_PUBLIC_SHOP_DESCRIPTION: <your phonepeshop description>

## Contributing


Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License
[MIT](https://choosealicense.com/licenses/mit/)

## Untested features

These features exists, but without implementing the client it isn't possible to tests these outright

1. Capture Payment
2. Refund


## Disclaimer
The code was tested on limited number of usage scenarios. There maybe unforseen bugs, please raise the issues as they come, or create pull requests if you'd like to submit fixes.


## Support the Medusa-Payment-PhonePe Plugin - Strengthen Our Medusa Community!

Dear Medusa Enthusiasts,

I hope this message finds you all in high spirits and enthusiasm for the world of e-commerce! Today, I reach out to our vibrant Medusa community with a heartfelt appeal that will strengthen our collective journey and elevate our online stores to new heights. I am thrilled to present the Medusa-Payment-PhonePe plugin, a community-driven project designed to streamline payment processing for our beloved Medusa platform.

As a dedicated member of this community, I, SGFGOV, have invested my time and passion into crafting this valuable plugin that bridges the gap between online retailers and their customers. It is with great humility that I invite you to participate in this open-source initiative by [sponsoring the Medusa-Payment-PhonePe plugin through GitHub](https://github.com/sponsors/SGFGOV).

Your sponsorship, no matter the size, will make a world of difference in advancing the Medusa ecosystem. It will empower me to focus on the continuous improvement and maintenance of the Medusa-Payment-PhonePe plugin, ensuring it remains reliable, secure, and seamlessly integrated with Medusa.

Being a community plugin, perks are not the focus of this appeal. Instead, I promise to give back to the community by providing fast and efficient support via Discord or any other means. Your sponsorship will help sustain and enhance the plugin's development, allowing me to be responsive to your needs and address any concerns promptly.

Let's come together and demonstrate the power of community collaboration. By [sponsoring the Medusa-Payment-PhonePe plugin on GitHub](https://github.com/sponsors/SGFGOV), you directly contribute to the success of not only this project but also the broader Medusa ecosystem. Your support enables us to empower developers, merchants, and entrepreneurs, facilitating growth and success in the world of e-commerce.

To show your commitment and be part of this exciting journey, kindly consider [sponsoring the Medusa-Payment-PhonePe plugin on GitHub](https://github.com/sponsors/SGFGOV). Your contribution will amplify the impact of our community and foster a supportive environment for all.

Thank you for your time, and thank you for being an integral part of our Medusa community. Together, we will elevate our online stores and create extraordinary experiences for customers worldwide.

With warm regards,

SGFGOV
Lead Developer, Medusa-Payment-PhonePe Plugin for Medusa
