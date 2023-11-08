<script>
    import { t, locale, locales } from '../store/i18n';
    import MultiSelect from 'svelte-multiselect'

    import { userForm, contributionValue, totalPrice, formErrors } from '../store/store.js';

    import InputField from "./form/InputField.svelte";
    import Switch from "./form/Switch.svelte"
    import PricingTips from './PricingTips.svelte';

    import { countries } from '../data/countries.js';

    let values = [1,4,11,22];

    let group = 1;

    let selectedCountry;
    
    const handleChange = ( event, value ) => {
        contributionValue.set( Number( value ) )
        event.target.checked = true
    }

</script>

<div class="block mb-2 w-full">
    <div class="flex justify-center">
        <Switch bind:value={$userForm.contributionFrequency} label="" labelOnce="Plant Once" labelMonthly="Plant Monthly" saveLabel="Save 15%" design="inner" />
    </div>

    <div class="mt-4">
        <PricingTips />
    </div>
</div>

<div class="block mb-4 w-full px-1 py-2">
    <p class="text-center font-bold mb-2">How many trees would you like to plant?</p>
    <div class="flex items-start justify-end" id="items-price-container">
        <div class="w-5/6">
             <div class="flex items-center justify-between mr-6">
                <div class="">
                    <label>
                        <input type="radio" bind:group class="form-radio my-1 h-4 w-4 p-1 text-[#5F753D] checked:bg-[#5F753D]" value={1} on:change={ (event) => handleChange(event, 1) } checked={ $contributionValue === 1 } />
                        <div class="text-center text-xs">1</div>
                    </label>
                </div>
                
                <div class="">
                    <label>
                        <input type="radio" bind:group class="form-radio my-1 h-4 w-4 p-1 text-[#5F753D] checked:bg-[#5F753D]" value={4} on:change={ (event) => handleChange(event, 4) } checked={ $contributionValue === 4 } />
                        <div class="text-center text-xs">4</div>
                    </label>
                </div>
                
                <div class="">
                    <label>
                        <input type="radio" bind:group class="form-radio my-1 h-4 w-4 p-1 text-[#5F753D] checked:bg-[#5F753D]" value={11} on:change={ (event) => handleChange(event, 11) } checked={ $contributionValue === 11 } />
                        <div class="text-center text-xs">11</div>
                    </label>
                </div>
                
                <div class="">
                    <label>
                        <input type="radio" bind:group class="form-radio my-1 h-4 w-4 p-1 text-[#5F753D] checked:bg-[#5F753D]" value={22} on:change={ (event) => handleChange(event, 22) } checked={ $contributionValue === 22 } />
                        <div class="text-center text-xs">22</div>
                    </label>
                </div>
            </div>
        </div>
        <div class="W-1/6 flex items-center" style="min-width: 65px;">
            <span id="total-price" class="text-sm bg-[#5F753D] text-white rounded-md px-1 py-2">
                € {$totalPrice}
            </span>
        </div>
    </div>
</div>

<div class="flex flex-col md:flex-row justify-between">
    <div class="w-full md:w-1/2 md:mr-2">
        <InputField label="First Name" bind:value={$userForm.firstName} />
        {#if $formErrors.firstName != ""}
            <span id="firstNameError" class="text-red-500 text-[11px] text-left">{$formErrors.firstName}</span>
        {/if}
    </div>
    <div class="w-full md:w-1/2">
        <InputField label="Last Name" bind:value={$userForm.lastName} />
        {#if $formErrors.lastName != ""}
            <span id="lastNameError" class="text-red-500 text-[11px] text-left">{$formErrors.lastName}</span>
        {/if}
    </div>
</div>
<InputField label="Email"  bind:value={$userForm.email} />
{#if $formErrors.email != ""}
    <span id="emailError" class="text-red-500 text-[11px] text-left">{$formErrors.email}</span>
{/if}

<InputField label="Address"  bind:value={$userForm.address} />
<div class="flex flex-col md:flex-row justify-between">
    <div class="w-full md:w-1/2 md:mr-2">
        <InputField label="Postal Code"  bind:value={$userForm.postalCode} />
    </div>
    <div class="w-full md:w-1/2">
        <InputField label="City"  bind:value={$userForm.city} />
    </div>
</div>
<!-- <InputField label={'Country'} bind:value={$userForm.country} /> -->