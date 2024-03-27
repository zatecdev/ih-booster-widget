import { writable, derived } from "svelte/store";

export const contributionValue = writable(1); //Number of strees [default 1]
export const processingPayment = writable(false);
export const successPayment = writable(false);
export const stripeClientSecret = writable("");
export const stripePaymentIntentId = writable("");
export const receiptUrl = writable("");
export const userLanguage = writable("de");

export const formErrors = writable({ firstName: "", lastName: "", email: ""});

export const userForm = writable({
    contributionFrequency: 'Monthly', //Once or Monthly [default Once]

    //personal information
    firstName: 'Maxime',
    lastName: 'Doe',
    email: 'vomapod693@tospage.com',

    //address information
    address: '3 Wilmsstraße',
    city: 'Berlin',
    postalCode: '10961',
    country: 'DE',
    locale: 'de',
})

// export const totalPrice = derived(contributionValue, $contributionValue => ( Number($contributionValue ) * 4.80).toFixed(2) )

//Quick/dirty, to refactor
//export const totalPrice = derived(contributionValue, $contributionValue => ( Number($contributionValue ) == 1 ? 4.80 : ( Number($contributionValue ) == 4 ? 18.80 : ( Number($contributionValue ) == 11 ? 49.80 : 85.00) ) ).toFixed(2) )

export const price = derived(contributionValue, $contributionValue => ( 
    Number($contributionValue ) == 1 ? 4.80 : ( Number($contributionValue ) == 4 ? 18.80 : ( Number($contributionValue ) == 11 ? 49.80 : 85.00) ) ).toFixed(2) 
)

export const totalPrice = derived([price, userForm], ([$price, $userForm]) => 
    $userForm.contributionFrequency == "Once" ? $price : ( $price - ( $price * 0.15) ).toFixed(2)
);

export const zohoConfig = writable({ zohoDealId: "", zohoAccountId: "" });