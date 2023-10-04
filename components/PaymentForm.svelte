<script>
    import axios from 'axios'
    import { loadStripe } from '@stripe/stripe-js'
    import { Elements, PaymentElement } from 'svelte-stripe'
    import { onMount } from 'svelte'
    import { userForm, contributionValue, processingPayment, successPayment } from '../store/store.js';

    import Spinner from './ui/Spinner.svelte';

    export let handleStepProgress;

    const { STRIPE_PUBLIC_KEY, API_END_POINT } = __myapp;

    let stripe = null

    // Stripe Elements instance
    let elements
    let clientSecret = null;
    let isProcessing = false;

    onMount(async () => {
        stripe = await loadStripe(STRIPE_PUBLIC_KEY)
    })

    export const getPaymentIntent = async () => {

        //If once off, create customer and proceed as it is an pass some customer info if applicable 

        //If monthly processed like this:
        //1. Create customer
        //2. Create subscription [map subscription with numbers of trees] and return payment intent (from subscription)
        //3. processed with payment. If success continue, if status requires_payment_method, represent form, else error

        let numberOfTrees       = $contributionValue;
        let paymentFrequency    = $userForm.contributionFrequency; //once or monthly
        let userDetails         = $userForm;

        const axiosConfig = { 
            headers: {
                'Content-Type': 'application/json',
            } 
        }

        await axios.post( API_END_POINT + '/api/create-payment-intent', {
                quantity: numberOfTrees,
                frequency: paymentFrequency,
                customer: userDetails
            }, axiosConfig)
            .then(function (response) {
                clientSecret = response.data.client_secret;
                processingPayment.set( true ); //to disable next buttons or so
            })
            .catch(function (error) {
                console.log(error);
            });
    }

    export const processPayment = async () => {
        isProcessing = true; 
        const result = await stripe.confirmPayment({
            elements,
            // specify redirect: 'if_required' or a `return_url`
            redirect: 'if_required'
        })

        if ( result.paymentIntent.status == "succeeded") {
            //if okay then we redirect to page or update a variable [see clientSecret]
            //redirect to thank you page, update steps here
            //redirect to home page, load a thank you component witch will contains everything related to download certificate etc.
            //Update some stats
            //successfullPayment.set( true ); //use this to decide what to show and what to do

            successPayment.set( true ); //update payment success

            Swal.fire({
                title: 'Thank you for your impact purchase!',
                width: 600,
                padding: '3em',
                color: '#000',
                background: '#fff url(/images/trees.png)',
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

<div class="text-center mt-4">
    {#await getPaymentIntent() }
        <Spinner caption="Processing order, please wait..." />
    {:then data}
        {#if stripe && clientSecret}
            <Elements {stripe} {clientSecret} bind:elements>
                <PaymentElement />
            </Elements>
        
            <button 
                class="bg-[#DEE37D] hover:bg-[#a7ac4a] text-gray-900 font-bold py-2 px-20 border rounded-fulld mt-4" 
                disabled={isProcessing == true}
                on:click={processPayment}
            >PAY</button>
        {:else}
            <Spinner caption="Processing your payment, please wait..." />
        {/if}
    {:catch error}
        <p>Error: {error.message}</p>
    {/await}
</div>