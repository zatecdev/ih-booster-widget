<script>
    import { userForm } from '../../store/store.js';

    export let labelOnce;
    export let labelMonthly;
    export let saveLabel;

</script>

<div class="md:px-8 w-2/4 md:w-full">
    <div class="flex align-items-center justify-between text-[#5F753D] bg-[#F5F2F0] gap-4 px-1 py-1 space-x4 rounded-[50px]">
        <button 
            class="px-2 sm:px-4 md:px-8 py-2 rounded-[50px] text-[#5F753D] text-xs md:text-lg font-medium"
            class:active={$userForm.contributionFrequency === "Once"}
            on:click={() => $userForm.contributionFrequency = "Once"}
        >{ labelOnce }</button>


        <div class="group relative w-max">
            <button 
                class="px-2 sm:px-4 md:px-8 py-2 rounded-[50px] text-xs md:text-lg font-medium"
                class:active={$userForm.contributionFrequency === "Monthly"}
                on:click={() => $userForm.contributionFrequency = "Monthly"}
                data-tooltip-target="tooltip-dark" 
            >{ labelMonthly }</button>
            <span class="absolute bg-[#DEE37D] text-black rounded-2xl text-xs px-1 md:px-4 py-1 top-[25px] md:top-10 right-4 md:right-10">{ saveLabel }</span>
            <!-- <span class="tool_tip text-left pointer-events-none absolute -top-[50px] md:-top-[60px] -left-[55px] md:-left-[5px] w-max rounded bg-white px-1 md:px-2 py-1 text-[8px] md:text-[9px] font-medium text-[#5F753D] opacity-0 shadow transition-opacity group-hover:opacity-100">
                &#x2022; Ongoing contribution to sustainability projects<br />
                &#x2022; Cancel subscription anytime, no fees<br />
                &#x2022; Enjoy 15% off regular rates
            </span> -->
        </div>

    </div>
</div>


<style>
    .active {
        background-color: #5F753D;
        color: #FFFFFF !important;
    }
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