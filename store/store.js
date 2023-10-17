import { writable, derived } from "svelte/store";

export const contributionValue = writable(1); //Number of strees [default 1]
export const processingPayment = writable(false);
export const successPayment = writable(false);
export const stripeClientSecret = writable("");
export const stripePaymentIntentId = writable("");

export const formErrors = writable({ firstName: "", lastName: "", email: ""});

export const userForm = writable({
    contributionFrequency: 'Once', //Once or Monthly [default Once]

    //personal information
    firstName: '',
    lastName: '',
    email: '',

    //address information
    address: '',
    city: '',
    postalCode: '',
    country: '',
})

// export const totalPrice = derived(contributionValue, $contributionValue => ( Number($contributionValue ) * 4.80).toFixed(2) )

//Quick/dirty, to refactor
export const totalPrice = derived(contributionValue, $contributionValue => ( Number($contributionValue ) == 1 ? 4.80 : ( Number($contributionValue ) == 4 ? 18.80 : ( Number($contributionValue ) == 11 ? 49.80 : 85.00) ) ).toFixed(2) )