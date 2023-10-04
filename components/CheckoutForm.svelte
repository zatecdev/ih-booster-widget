<script>
    import PaymentForm from "./PaymentForm.svelte";
    import ThankyouForm from "./ThankyouForm.svelte";
    import UserDetailsForm from "./UserDetailsForm.svelte";

    export let activeStep;
    export let handleStepProgress;

    const processPayment = () => {
    }

</script>

<form class="bg-white rounded px-8 pt-2 pb-2 mb-2" on:submit|preventDefault={processPayment}>
    {#if activeStep == "Your Info"}
        <UserDetailsForm />
    {:else if activeStep == "Payment"}
        <PaymentForm {handleStepProgress} />
    {:else}
        <ThankyouForm />
    {/if}
</form>
