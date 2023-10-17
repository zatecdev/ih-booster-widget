<script>
    import { processingPayment, userForm, formErrors } from './store/store';
    import { t, locale, locales } from './store/i18n';
    import ProgressBar from './components/ui/ProgressBar.svelte';
    import CheckoutForm from './components/CheckoutForm.svelte';
    import Tailwind from './Tailwind.svelte';
    import { onMount } from 'svelte';
    
    const bgImageUrl = new URL('./images/background.jpg', import.meta.url).href
    const logo = new URL('./images/logo.png', import.meta.url).href

    let steps = ['Your Info', 'Payment', 'Certificate'], currentActive = 1, progressBar;

    const handleProgress = (stepIncrement) => {
        
        //Form validationn (basic)
        //let emailValidationRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
        let emailValidationRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

        if ( $userForm.firstName == "" || $userForm.lastName == "" || $userForm.email == "" || !$userForm.email.match(emailValidationRegex) ) {
            if ($userForm.firstName == "") {
                $formErrors.firstName = $t("form.firstNameValidation")
            } else {
                $formErrors.firstName = ""
            }

            if ($userForm.lastName == "") {
                $formErrors.lastName = $t("form.lastNameValidation")
            } else {
                $formErrors.lastName = ""
            }

            if ( $userForm.email == "" || !$userForm.email.match(emailValidationRegex)) {
                $formErrors.email = $t("form.emailValidation")
            } else {
                $formErrors.email = ""
            }

            return false;
        }

        progressBar.handleProgress(stepIncrement)
    }
        
</script>

<svelte:head>
	<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</svelte:head>

<!-- Don't remove, add tailwind base config -->
<Tailwind />

<div class="h-screen flex items-center justify-center">
    <div class="h-auto place-items-center">
        <p>
            <select bind:value={$locale}>
              {#each locales as l}
                <option value={l}>{l}</option>
              {/each}
            </select>
        </p>

        <div class="antialiased max-w-6xl mx-auto px-8">
            <div class="relative block md:flex items-center p-8">
                <div class="hidden md:block md:w-1/2 relative z-1 bg-white pt-8 rounded-l-2xl overflow-hidden md:h-[550px]" style="background-image: url('{bgImageUrl}') ;">
                    <div class="text-gray-900 text-left px-8 w-5/6">
                        <h1 class="text-4xl font-medium mb-4">{ $t("homepage.header") }</h1>
                        <p class="text-base font-semibold">
                            { $t("homepage.message") }
                        </p>
                    </div>
                </div>

                <!-- mobile header -->
                <div class="block md:hidden bg-white pt-8 rounded-t-2xl mb-4">
                    <div class="text-gray-900 text-left px-8 w-5/6">
                        <h1 class="text-2xl font-medium mb-4">{ $t("homepage.header") }</h1>
                        <p class="text-sm font-semibold">
                            { $t("homepage.message") }
                        </p>
                    </div>
                </div>
        
                <!-- container 2 -->
                <div class="w-full md:w-1/2 relative z-0 bg-white rounded-b-2xl md:rounded-r-2xl overflow-hidden py-8 h-full md:h-[550px] overflow-auto">
                    <div class="block mb-2">
                        {#key $locale}
                            <ProgressBar {steps} bind:currentActive bind:this={progressBar} />
                        {/key}
                    </div>
                
                    <!-- payment form here -->
                    <div class="block">
                        <CheckoutForm 
                            handleStepProgress={handleProgress} 
                            activeStep={steps[currentActive-1]}
                        />
                    </div>
                
                    {#if $processingPayment == false }
                        <div class="block text-right px-8 pt-2 pb-2">
                            <div class="step-button">
                                <!-- {#if steps[currentActive-1] != "Your Info"}
                                    <button class="bg-[#DEE37D] hover:bg-[#a7ac4a] text-gray-900 font-bold py-20 px-4 border rounded-full" on:click={() => handleProgress(-1)} disabled={currentActive == 1}>Prev</button>
                                {/if} -->

                                {#if steps[currentActive-1] == "Your Info"}
                                    <button class="bg-[#DEE37D] hover:bg-[#a7ac4a] text-gray-900 font-bold py-2 px-20 border rounded-full" on:click={() => handleProgress(+1)} disabled={currentActive == steps.length}>{ $t("homepage.next") }</button>
                                {/if}
                            </div>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
</div>