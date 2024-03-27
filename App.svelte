<script>
    import { processingPayment, userForm, contributionValue, stripePaymentIntentId, formErrors, zohoConfig, userLanguage } from './store/store.js';
    import { t, locale, locales } from './store/i18n';
    import ProgressBar from './components/ui/ProgressBar.svelte';
    import CheckoutForm from './components/CheckoutForm.svelte';
    import Tailwind from './Tailwind.svelte';
    import { onMount } from 'svelte';
    import axios from 'axios';
    import ThankyouForm from './components/ThankyouForm.svelte';
    
    const bgImageUrl = new URL('./images/background.jpg', import.meta.url).href
    const logo = new URL('./images/logo.png', import.meta.url).href

    let steps = ['Your Info', 'Payment', 'Certificate'], currentActive = 1, progressBar;

    //define paymentIntent and success
    let paymentIntent = null;
    let paymentStatus = null;
    let domLanguage = "";

    onMount(() => {

        const { API_END_POINT } = __myapp;

        const axiosConfig = { 
            headers: {
                'Content-Type': 'application/json',
            } 
        }
    
        const urlParams = new URLSearchParams(window.location.search);
        const zohoDealId = urlParams.get('z_xid') ?? 336589000010914621; //for testing
        const zohoAccountId = urlParams.get('z_aid') ?? 336589000010271178; //for testing

        //can be conflicting with payment form on paypal return url [to test]
        $zohoConfig.zohoDealId = zohoDealId;
        $zohoConfig.zohoAccountId = zohoAccountId;

        //console.log($zohoConfig.zohoDealId, $zohoConfig.zohoAccountId )

        //console.log ( urlParams );

        //get language based on text
        $userLanguage = document.documentElement.lang ?? "de"; //from lang attribute html

        console.log($userLanguage);

        //Paypal return url: check if payment intent ID is present in the url, then redirect User to step 3
        //fetch info about payment intent and try to build certificate configuration from there.
        //do I have access to store data??

        paymentIntent = urlParams.get('payment_intent');
        paymentStatus = urlParams.get('redirect_status');

        //TODO:
        //IF stripe was successfull, get payment intent, retrieve payment intent from stripe
        //Grab customer details such as name, email and co
        //Build request to build certificate
        //NB: When creating a payment intent, pass as meta data, an object containing data that you will need to build certificate so that when paying with paypal you already have it.
        //See thank you page.

        if ( paymentIntent != null && paymentStatus != null ) {
            //retrieve payment intent
            //get receipt url from php

            axios.post( API_END_POINT + '/api/get-payment-intent', {
                    paymentIntentId: paymentIntent,
                }, axiosConfig)
                .then(function (response) {
                    //update store here or go to step of thank you...
                    //price and total price are derived from contributionValue and frequency

                    const userDetails = response.data.metadata;

                    $stripePaymentIntentId = paymentIntent;

                    $contributionValue =  Number( userDetails.tree_bundle );

                    $userForm.contributionFrequency = userDetails.contributionFrequency;
                    $userForm.firstName = userDetails.firstName;
                    $userForm.lastName = userDetails.lastName;
                    $userForm.email = userDetails.email;
                    $userForm.address =  userDetails.address;
                    $userForm.city = userDetails.city;
                    $userForm.postalCode = userDetails.postalCode;
                    $userForm.country = userDetails.country;
                    $userForm.locale = userDetails.lang;

                    $zohoConfig.zohoDealId = userDetails.zoho_deal_id;
                    $zohoConfig.zohoAccountId = userDetails.zoho_acc_id;

                    //send to thank you page
                    //handleProgress(+2); //not working why? Simulate clicking on next button? then next next based on some flag like paypalPayment in store
                    //progressBar.handleProgress(+2);
                })
                .catch(function (error) {
                    console.log( error )
                    console.log('Error occurred')
                    return false;
                });
        }
    });

    const handleProgress = (stepIncrement) => {
        
        //Form validationn (basic)
        //let emailValidationRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
        let emailValidationRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

        if ( $userForm.firstName == "" || $userForm.lastName == "" || $userForm.email == "" || !$userForm.email.match(emailValidationRegex) ) {
            if ($userForm.firstName == "") {
                $formErrors.firstName = "First name field is required";
            } else {
                $formErrors.firstName = ""
            }

            if ($userForm.lastName == "") {
                $formErrors.lastName = "Last name field is required";
            } else {
                $formErrors.lastName = ""
            }

            if ( $userForm.email == "" || !$userForm.email.match(emailValidationRegex)) {
                $formErrors.email = "Please enter a valid email address";
            } else {
                $formErrors.email = ""
            }

            return false;
        }

        progressBar.handleProgress(stepIncrement)
    }

    // const getCurrentLanguage = () => {
    //     currentLanguage = Weglot.getCurrentLang();
    //     //update locale
    //     $locale = currentLanguage;
    // }

    // Weglot.on("languageChanged", getCurrentLanguage);

    //Testing, getting user's country
    
    /*
    axios.get('https://www.cloudflare.com/cdn-cgi/trace')
        .then(function (response) {
            response = response.data.trim().split('\n').reduce(function(obj, pair) {
                pair = pair.split('=');
                return obj[pair[0]] = pair[1], obj;
            }, {});

            $userForm.country = response.loc;
        })
        .catch(function (error) {
            // console.log(error);
        })
    */
</script>

<svelte:head>
	<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <!-- <script type="text/javascript" src="https://cdn.weglot.com/weglot.min.js"></script> -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/2.2.4/jquery.min.js"></script>
</svelte:head>

<!-- Don't remove, add tailwind base config -->
<Tailwind />

<div id="widget-container" class="h-full block md:flex items-center justify-center">
    <div class="h-auto place-items-center">
        <!-- <p>
            <select bind:value={$locale}>
              {#each locales as l}
                <option value={l}>{l}</option>
              {/each}
            </select>
        </p> -->

        <div class="antialiased max-w-full md:max-w-6xl mx-auto px-2 md:px-8">
            <div class="relative block md:flex items-center p-2 md:p-8">
                <div class="hidden md:block md:w-1/2 relative z-1 bg-white pt-8 rounded-l-2xl overflow-hidden md:h-[650px]" style="background-image: url('{bgImageUrl}') ;">
                    <div class="text-gray-900 text-left px-8 w-5/6">
                        <h1 class="text-4xl font-medium mb-4" id="headerText">Plant more trees</h1>
                        <p class="text-base font-semibold">
                            Now it's your turn! Planting trees is a direct path to environmental and social sustainability. They cleanse our air, store carbon, and foster biodiversity. Join us in this vital mission for a greener, harmonious future!
                        </p>
                    </div>
                </div>

                <!-- mobile header -->
                <div class="block md:hidden bg-white pt-8 py-4 rounded-t-2xl mb-4" 
                    style="background-image: linear-gradient(to bottom, transparent 0%, black 100%), url('{bgImageUrl}'); background-position: center;"
                >
                    <div class="text-gray-900 text-left px-8 w-full">
                        <h1 class="text-2xl font-medium mb-4 text-white">Plant more trees</h1>
                        <p class="text-sm font-semibold text-white">
                            Now it's your turn! Planting trees is a direct path to environmental and social sustainability. They cleanse our air, store carbon, and foster biodiversity. Join us in this vital mission for a greener, harmonious future!
                        </p>
                        <br />
                    </div>
                </div>
        
                <!-- container 2 -->
                <div class="w-full md:w-1/2 relative z-0 bg-white rounded-none md:rounded-r-2xl py-8 h-full md:h-[650px] overflow-hidden">
                    <div class="block mb-2">
                        <!-- {#key $locale} -->
                            <ProgressBar {steps} bind:currentActive bind:this={progressBar} />
                        <!-- {/key} -->
                    </div>
                
                    <!-- payment form here -->
                    <div class="block">

                        <!--
                        <CheckoutForm 
                                handleStepProgress={handleProgress} 
                                activeStep={steps[currentActive-1]}
                            />
                        -->
                  
                        {#if paymentIntent == null && paymentStatus == null}
                            <CheckoutForm 
                                handleStepProgress={handleProgress} 
                                activeStep={steps[currentActive-1]}
                            />
                        {:else}
                            <ThankyouForm
                                paypalPaymentIntentId={paymentIntent}
                                source="paypal"
                                activeStep={steps[2]}
                            />
                        {/if}
                    </div>
                
                    {#if $processingPayment == false && paymentIntent == null }
                        <div class="block text-right px-8 pt-2 pb-2">
                            <div class="step-button">
                                <!-- {#if steps[currentActive-1] != "Your Info"}
                                    <button class="bg-[#DEE37D] hover:bg-[#a7ac4a] text-gray-900 font-bold py-20 px-4 border rounded-full" on:click={() => handleProgress(-1)} disabled={currentActive == 1}>Prev</button>
                                {/if} -->

                                {#if steps[currentActive-1] == "Your Info"}
                                    <button class="bg-[#DEE37D] hover:bg-[#a7ac4a] text-gray-900 font-bold py-2 px-20 rounded-full" on:click={() => handleProgress(+1)} disabled={currentActive == steps.length}>Next</button>
                                {/if}
                            </div>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
</div>