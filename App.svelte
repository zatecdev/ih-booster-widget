<script>
    import { processingPayment } from './store/store';
    import ProgressBar from './components/ui/ProgressBar.svelte';
    import CheckoutForm from './components/CheckoutForm.svelte';
    import Tailwind from './Tailwind.svelte';
    import { onMount } from 'svelte';
    
    const bgImageUrl = new URL('./images/background.jpg', import.meta.url).href
    const logo = new URL('./images/logo.png', import.meta.url).href

    let steps = ['Your Info', 'Payment', 'Certificate'], currentActive = 1, progressBar;

    const handleProgress = (stepIncrement) => {
        progressBar.handleProgress(stepIncrement)
    }
        
</script>

<!-- Don't remove, add tailwind base config -->
<Tailwind />

<div class="h-screen flex items-center justify-center">
    <div class="grid h-auto place-items-center">

        <!-- <div class="">
            <img class="w-96" src={logo} alt="ImpactHero Logo" />
        </div> -->

        <div class="antialiased max-w-6xl mx-auto bg-[#F5F2F0] px-8">
            <div class="relative block md:flex items-center p-8">
                <div class="w-full md:w-1/2 relative z-1 bg-white pt-16 rounded-l-2xl overflow-hidden h-[550px]" style="background-image: url('{bgImageUrl}') ;">
                    <div class="text-gray-900 text-left px-16">
                        <h1 class="text-4xl font-medium mb-4">Plant more trees</h1>
                        <p class="text-sm font-semibold">
                            Now it's your turn! Planing trees is a direct path to environmental and social sustainability. They cleanse our air, store carbon, and foster
                            biodiversity. Join us in this vital mission for a greener, harmonious future!
                        </p>
                    </div>
                </div>
        
                <!-- container 2 -->
                <div class="w-full md:w-1/2 relative z-0 bg-white rounded-r-2xl overflow-hidden py-8 h-[550px]">
                    <div class="block mb-2">
                        <ProgressBar {steps} bind:currentActive bind:this={progressBar} />
                    </div>
                
                    <!-- payment form here -->
                    <div class="block">
                        <CheckoutForm 
                            handleStepProgress={handleProgress} 
                            activeStep={steps[currentActive-1]}
                        />
                    </div>
                
                    {#if $processingPayment == false }
                        <div class="block text-center">
                            <div class="step-button">
                                <!-- {#if steps[currentActive-1] != "Your Info"}
                                    <button class="bg-[#DEE37D] hover:bg-[#a7ac4a] text-gray-900 font-bold py-20 px-4 border rounded-full" on:click={() => handleProgress(-1)} disabled={currentActive == 1}>Prev</button>
                                {/if} -->

                                {#if steps[currentActive-1] == "Your Info"}
                                    <button class="bg-[#DEE37D] hover:bg-[#a7ac4a] text-gray-900 font-bold py-2 px-20 border rounded-full" on:click={() => handleProgress(+1)} disabled={currentActive == steps.length}>Next</button>
                                {/if}
                            </div>
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
</div>