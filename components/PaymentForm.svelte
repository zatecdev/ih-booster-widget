<script>
    import axios from 'axios'
    import { loadStripe } from '@stripe/stripe-js'
    import { Elements, PaymentElement } from 'svelte-stripe'
    import { onMount } from 'svelte'
    import { userForm, contributionValue, processingPayment, successPayment, stripeClientSecret, stripePaymentIntentId, price, totalPrice, receiptUrl, zohoConfig, userLanguage } from '../store/store.js';
    import { t, locale, locales } from '../store/i18n';

    import Spinner from './ui/Spinner.svelte';

    export let handleStepProgress;

    const { STRIPE_PUBLIC_KEY, API_END_POINT } = __myapp;

    let stripe = null

    // Stripe Elements instance
    let elements
    let clientSecret = null;
    let isProcessing = false;
    let hasError = false;

    onMount(async () => {
        stripe = await loadStripe(STRIPE_PUBLIC_KEY);
    })

    export const getPaymentIntent = async () => {

        //If once off, create customer and proceed as it is an pass some customer info if applicable 
        //If monthly processed like this:
        //1. Create customer
        //2. Create subscription [map subscription with numbers of trees] and return payment intent (from subscription)
        //3. processed with payment. If success continue, if status requires_payment_method, represent form, else error

        let numberOfTrees           = $contributionValue;
        let paymentFrequency        = $userForm.contributionFrequency; //once or monthly
        let userDetails             = $userForm;
        // let userLocale              = $locale;
        // let userLocale              = $userForm.country == "DE" ? "de" : "en"; //default, testing
        let userLocale              = $userLanguage; // set in the app on mount based on weglot
        let paymentIntentId         = $stripePaymentIntentId

        //add zoho deal/cust id to userDetails
        userDetails.zoho_account_id = $zohoConfig.zohoAccountId;
        userDetails.zoho_deal_id = $zohoConfig.zohoDealId;
        userDetails.item_price  = $price;
        userDetails.total_price = $totalPrice;

        let productsMapping = {
            1: "Tree Friend",
            4: "Tree Lover",
            11: "Climate Supporters",
            22: "Climate Hero"
        }

        let paymentDescription = productsMapping[$contributionValue]

        const axiosConfig = { 
            headers: {
                'Content-Type': 'application/json',
            } 
        }

        await axios.post( API_END_POINT + '/api/create-payment-intent', {
                quantity: numberOfTrees,
                frequency: paymentFrequency,
                customer: userDetails,
                locale: userLocale,
                paymentIntentId: paymentIntentId,
                description: paymentDescription,
            }, axiosConfig)
            .then(function (response) {
                console.log( response )
                if ( response.data.client_secret ) {
                    clientSecret = response.data.client_secret; //set it to the store so that back navigation will work or so
                    stripeClientSecret.set( response.data.client_secret )
                    stripePaymentIntentId.set( response.data.id )
                    // processingPayment.set( true ); //to disable next buttons or so
                }
            })
            .catch(function (error) {
                hasError = true;
                console.log(error.response.data);
                Swal.fire({
                    icon: 'error',
                    title: 'Oops...',
                    text: error.response.data.message
                })

                return false;
            });
    }

    export const processPayment = async () => {
        isProcessing = true;
        const result = await stripe.confirmPayment({
            elements,
            // specify redirect: 'if_required' or a `return_url` //if redirect to home page, can some info be passed there
            redirect: 'if_required',
            confirmParams: {
                // Return URL where the customer should be redirected after the PaymentIntent is confirmed.
                return_url: `${window.location.href}`
            },
        })

        if (result.error) {
            isProcessing = false;
            Swal.fire({
                icon: 'error',
                title: 'Oh no, we have an error processing your payment',
                text: result.error.message
            })

            return false;
        }

        if ( result.paymentIntent.status == "succeeded") {
            //if okay then we redirect to page or update a variable [see clientSecret]
            //redirect to thank you page, update steps here
            //redirect to home page, load a thank you component witch will contains everything related to download certificate etc.
            //Update some stats
            //successfullPayment.set( true ); //use this to decide what to show and what to do

            successPayment.set( true ); //update payment success

            Swal.fire({
                title: "Thank you for your impact purchase!",
                width: 600,
                padding: '3em',
                color: '#000',
                backdrop: `
                    rgba(0,0,0,0.4)
                    left top
                    no-repeat
                `
                }).then(function() {
                    handleStepProgress(+1) //move to next step [thank you step]
                });
        }

    }
</script>

<div id="payment-element-container" class="text-center py-4 h-auto">
    {#await getPaymentIntent() }
        {#if hasError == false}
            <Spinner caption="Please wait..." />
        {/if}
    {:then data}
        {#if stripe && clientSecret}

            <div class="flex flex-col text-center justify-between mx-auto">

                <Elements 
                    {stripe} 
                    {clientSecret}
                    locale={$userLanguage}
                    bind:elements
                >

                    <PaymentElement />

                    <div class="flex justify-between pt-4 pb-4 mb-8">
                        <button class="text-sm bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-l" on:click={() => handleStepProgress(-1)}>
                            Back
                        </button>
                                
                        <div class="step-button">
                            <button class="bg-[#DEE37D] hover:bg-[#a7ac4a] text-gray-900 font-bold py-2 px-16 border rounded-full" 
                                disabled={isProcessing == true}
                                on:click={processPayment}>Pay
                            </button>
                        </div>
                    </div>

                </Elements>

            </div>
            
        {:else}
            <Spinner caption="Processing your payment, please wait..." />
        {/if}
    {:catch error}
        <p>Error: {error.message}</p>
    {/await}


</div>