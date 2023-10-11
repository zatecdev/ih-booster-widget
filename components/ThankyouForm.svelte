<script>
    import axios from 'axios';
    import { onMount } from 'svelte';
    import { userForm, contributionValue, processingPayment, successPayment } from '../store/store.js';
    import { t, locale, locales } from '../store/i18n';

    let certificateUrl;

    const { API_END_POINT } = __myapp;

    onMount(() => {
        getCertificate();
    });

    const getCertificate = () => {

        const certificateRequest = {
            customer_email: 'marcel.spitzner@growmytree.com', //testing
            customer_alias: "IH-Booster Customer",
            product_units: $contributionValue,
            first_name: $userForm.firstName,
            last_name: $userForm.lastName,
            recipient_email: $userForm.email,
            template: "tree-gmt-v2",
            order_number: "2023-09-23",
            email_language: "de"
        }

        const axiosConfig = { 
            headers: {
                'Content-Type': 'application/json',
            } 
        }

        axios.post( API_END_POINT + '/api/redeem-certificate', certificateRequest, axiosConfig)
            .then(function (response) {
                console.log(response);
                certificateUrl = response.data.de_certificate;
            })
            .catch(function (error) {
                console.log(error);
            });
    }

</script>


<div class="bg-white px-8 pt-6 pb-8 mb-4 text-center">
    <h1 class="mt-4 text-teal-900 font-semibold">{ $t("certificate.thankyou") } {$userForm.firstName} {$userForm.lastName}!</h1>
    <p class="text-sm text-bold mt-4 mb-8">{ $t("certificate.message") }</p>
    <!-- <button class="bg-teal-800 hover:bg-teal-900 text-white font-bold py-2 px-4 border border-green-800 rounded">/button> -->

    <a class="mt-4 mt-4 bg-[#DEE37D] hover:bg-[#a7ac4a] text-gray-900 font-bold py-2 px-20 border rounded-full" 
        href={certificateUrl}
        target="_blank"
    >
        { $t("certificate.download") }
    </a>
</div>