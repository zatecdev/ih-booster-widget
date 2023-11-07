<script>
    import { userForm, contributionValue, processingPayment, successPayment } from '../store/store.js';
</script>

{#if $userForm.contributionFrequency == "Monthly"}
    <!-- <div class="flex items-center justify-center px-4 py-4">
        <span>&#x1F6C8;</span>
        <span class="tool_tip text-left pointer-events-none absolute w-max ">
            &#x2022; Ongoing contribution to sustainability projects<br />
            &#x2022; Cancel subscription anytime, no fees<br />
            &#x2022; Enjoy 15% off regular rates
        </span>
    </div> -->

    <div class="flex items-center justify-center px-4 py-4">
        <div class="tool_tip flex w-max rounded bg-[#5F753D] text-white px-1 md:px-2 py-1 text-[8px] md:text-[9px] font-medium shadow-2xl">
            <!-- <span class="text-lg mb-2 pl-1">&#x1F6C8;</span> -->
            <span class="svelte-14bbl8y pointer-events-none py-1 text-left text-[10px] font-medium text-white shadow-2xl md:px-2 md:text-[10px]">
                &#x2022; Ongoing contribution to sustainability projects<br />
                &#x2022; Cancel subscription anytime, no fees<br />
                &#x2022; Enjoy 15% off regular rates
            </span>
        </div>
    </div>
{:else}
    <div class="flex items-center justify-center px-4 py-4">
        <div class="tool_tip flex w-max rounded border border-[#5F753D] border-solid bg-white text-[#5F753D] px-1 md:px-2 py-1 font-medium shadow-2xl">
            <!-- <span class="text-lg mb-2 pl-1">&#x1F6C8;</span> -->
            <span class="svelte-14bbl8y pointer-events-none py-1 text-left text-[10px] font-medium md:px-2 md:text-[10px]">
                &#x2022; One-time contribution to sustainability projects<br />
                &#x2022; Receive your Impact Certificate via email<br />
            </span>
        </div>
    </div>
{/if}


<style>
    .tool_tip::after {
        content: " ";
        position: absolute;
        top: 100%; /* At the bottom of the tooltip */
        left: 50%;
        margin-left: -5px;
        border-width: 5px;
        border-style: solid;
        border-color: #5F753D transparent transparent transparent;
    }
</style>