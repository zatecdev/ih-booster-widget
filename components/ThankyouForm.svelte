<script>
    import axios from 'axios';
    import { onMount } from 'svelte';
    import { userForm, contributionValue, processingPayment, successPayment, stripeClientSecret, stripePaymentIntentId, price, totalPrice, receiptUrl, zohoConfig} from '../store/store.js';

    import { t, locale, locales } from '../store/i18n';

    let EU_COUNTRIES_CODES = ['AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR', 'HU', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'];

    let certificateUrl;

    const { API_END_POINT } = __myapp;

    onMount(() => {
        getCertificate();
    });

    const getCertificate = () => {

        console.log($stripePaymentIntentId )

        let numberOfTrees           = $contributionValue;
        let paymentFrequency        = $userForm.contributionFrequency; //once or monthly
        let userDetails             = $userForm;
        let userLocale              = $userForm.country == "DE" ? "de" : "en";
        let paymentIntentId         = $stripePaymentIntentId;
        let vat_amount              = EU_COUNTRIES_CODES.includes( $userForm.country ) ? $totalPrice * 0.19 : 0.00;
        let receipt_url             = "";

        let productsMapping = {
            1: "Tree Friend",
            4: "Tree Lover",
            11: "Climate Supporters",
            22: "Climate Hero"
        }

        //
        const axiosConfig = { 
            headers: {
                'Content-Type': 'application/json',
            } 
        }

        //get receipt url from php
        axios.post( API_END_POINT + '/api/get-payment-intent', {
                paymentIntentId: paymentIntentId,
            }, axiosConfig)
            .then(function (response) {
                receipt_url = response.data.latest_charge.receipt_url;

                //generate certificate
                const certificateRequest = {
                    customer_email: 'marcel.spitzner@growmytree.com', //testing
                    customer_alias: "IH-Booster Customer",
                    product_units: $contributionValue,
                    first_name: $userForm.firstName,
                    last_name: $userForm.lastName,
                    recipient_email: $userForm.email,
                    template: "tree-gmt-v2",
                    order_number: "2024-02-14", //TO CHANGE
                    lang: userLocale,
                    number_trees: numberOfTrees,
                    product_name: productsMapping[$contributionValue],
                    price: Number($price).toFixed(2),
                    total_price: Number($totalPrice).toFixed(2),
                    discount_amount: Number( Number($price) - Number($totalPrice)).toFixed(2),
                    vat_amount: Number(vat_amount).toFixed(2),
                    sub_total: Number( Number($totalPrice) - Number(vat_amount) ).toFixed(2),
                    receipt_url: receipt_url,
                    zoho_acc_id: $zohoConfig.zohoAccountId,
                    zoho_deal_id: $zohoConfig.zohoDealId,
                }

                let request = new XMLHttpRequest();
                request.open("POST", 'https://automate.impacthero.com/webhook/impact/booster/certificate/generation', true);

                // Create a state change callback
                request.onreadystatechange = function () {
                    if (request.readyState === 4 && request.status === 200) {
                        
                        const data = JSON.parse(this.responseText);

                        if ( userLocale.toLocaleLowerCase() === 'de' ) {
                            certificateUrl = data.response.de_certificate;
                        } else {
                            certificateUrl = data.response.en_certificate;
                        }
                    }
                };

                // Sending data with the request
                request.send( JSON.stringify(certificateRequest) );

            })
            .catch(function (error) {
                console.log('Error occurred')
                return false;
            });
    }

</script>


<div class="bg-white px-8 pt-6 pb-8 mb-4 text-center">
    <h1 class="mt-4 text-teal-900 font-semibold"><span id="thank-you-span">Thank you</span> {$userForm.firstName} {$userForm.lastName}!</h1>
    <p class="text-sm text-bold mt-4 mb-8" id="check-email-msg">
        Check your email soon for your personalized certificate. Can't wait? Download instantly.
    </p>
    <!-- <button class="bg-teal-800 hover:bg-teal-900 text-white font-bold py-2 px-4 border border-green-800 rounded">/button> -->

    <a class="mt-4 mt-4 bg-[#DEE37D] hover:bg-[#a7ac4a] text-gray-900 font-bold py-2 px-20 border rounded-full" 
        href={certificateUrl}
        target="_blank"
    >
        <span id="download-certificate">Download Certificate</span>
    </a>
</div>