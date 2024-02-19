<script>
    import axios from 'axios';
    import { onMount } from 'svelte';
    import { userForm, contributionValue, processingPayment, successPayment, stripeClientSecret, stripePaymentIntentId, price, totalPrice} from '../store/store.js';

    import { t, locale, locales } from '../store/i18n';

    let certificateUrl;

    const { API_END_POINT } = __myapp;

    onMount(() => {
        getCertificate();
    });

    const getCertificate = () => {

        let numberOfTrees           = $contributionValue;
        let paymentFrequency        = $userForm.contributionFrequency; //once or monthly
        let userDetails             = $userForm;
        let userLocale              = "de"; //testing
        let paymentIntentId         = $stripePaymentIntentId;
        let vat_amount              = userLocale == "de" ? $totalPrice * 0.19 : 0.00;

        let productsMapping = {
            1: "Tree Friend",
            4: "Tree Lover",
            11: "Climate Supporters",
            22: "Climate Hero"
        }

        const certificateRequest = {
            customer_email: 'marcel.spitzner@growmytree.com', //testing
            customer_alias: "IH-Booster Customer",
            product_units: $contributionValue,
            first_name: $userForm.firstName,
            last_name: $userForm.lastName,
            recipient_email: $userForm.email,
            template: "tree-ih-v1",
            order_number: "2024-02-14", //TO CHANGE
            lang: userLocale,
            number_trees: numberOfTrees,
            product_name: productsMapping[$contributionValue],
            price: Number($price).toFixed(2),
            total_price: Number($totalPrice).toFixed(2),
            discount_amount: Number( Number($price) - Number($totalPrice)).toFixed(2),
            vat_amount: Number(vat_amount).toFixed(2),
            sub_total: Number( Number($totalPrice) - Number(vat_amount) ).toFixed(2)
        }

        // const axiosConfig = { 
        //     headers: {
        //         'Content-Type': 'application/json',
        //     } 
        // }

        // axios.post( API_END_POINT + '/api/redeem-certificate', certificateRequest, axiosConfig)
        //     .then(function (response) {
        //         console.log(response);
        //         certificateUrl = response.data.de_certificate;
        //     })
        //     .catch(function (error) {
        //         console.log(error);
        //     });

        /*
        axios.post('https://automate.impacthero.com/webhook/impact/booster/certificate/generation', certificateRequest)
            .then(function (response) {
                console.log(response);
                certificateUrl = response.de_certificate;
            })
            .catch(function (error) {
                console.log(error);
            });
        */

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