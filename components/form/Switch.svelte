<script>
    // based on suggestions from:
    // Inclusive Components by Heydon Pickering https://inclusive-components.design/toggle-button/
    // On Designing and Building Toggle Switches by Sara Soueidan https://www.sarasoueidan.com/blog/toggle-switch-design/
    // and this example by Scott O'hara https://codepen.io/scottohara/pen/zLZwNv 
    import { t } from "../../store/i18n";

    export let label;
    export let design = 'inner label'
    export let options = [];
	export let fontSize = 16;
	export let value = 'Once';
    export let labelOnce;
    export let labelMonthly;
    export let saveLabel;

    let checked = false; //false = monthly is checked [true means once off checked]

	const uniqueID = Math.floor(Math.random() * 100)

    function handleClick(event){
        const target = event.target

        const state = target.getAttribute('aria-checked')


        checked = state === 'true' ? false : true

        value = checked === true ? 'Once' : 'Monthly'
    }
	
	const slugify = (str = "") => str.toLowerCase().replace(/ /g, "-").replace(/\./g, "");

</script>

{#if design == 'inner'}
<div class="s s--inner">
    <span id={`switch-${uniqueID}`}>{label}</span>
    <button
        role="switch"
        aria-checked={checked}
        aria-labelledby={`switch-${uniqueID}`}
        id="switch-btn"
        on:click|preventDefault={handleClick}>
            <span>{ labelOnce }</span>
            <span 
                style="position: relative;"
                title="This is my tooltip"
                id="switch-btn-span"
                role="tooltip"
            >{ labelMonthly } &#x1F6C8;<span class="tool_tip">&#x2022; Ongoing contribution to sustainability projects
                <br />&#x2022; Cancel subscription anytime, no fees<br />&#x2022; Enjoy 15% off regular rates</span><span class="discount_percent">{ saveLabel }</span></span>
    </button>
</div>
{:else if design == 'slider'}
<div class="s s--slider" style="font-size:{fontSize}px">
    <span id={`switch-${uniqueID}`}>{label}</span>
    <button
        role="switch"
        aria-checked={checked}
        aria-labelledby={`switch-${uniqueID}`}
        on:click|preventDefault={handleClick}>
    </button>
</div>
{:else}
<div class="s s--multi">
    <div role='radiogroup'
				 class="group-container"
				 aria-labelledby={`label-${uniqueID}`}
				 style="font-size:{fontSize}px" 
				 id={`group-${uniqueID}`}>
    <div class='legend' id={`label-${uniqueID}`}>{label}</div>
        {#each options as option}
            <input type="radio" id={`${option}-${uniqueID}`} value={option} bind:group={value}>
            <label for={`${option}-${uniqueID}`}>
                {option}
            </label> 
        {/each}
    </div>
</div>

{/if}

<style>
	:root {
		--accent-color: #5F753D;
		--gray: #ccc;
        --cream: #F5F2F0;

        /* --gray: #ccc; */
	}

    /* Inner Design Option */
    .s--inner button {
        font-weight: 500;
        padding: 0.3em;
        background: var(--cream);
        border-radius: 50px;
        /* background-color: #fff; */
        /* border: 1px solid var(--gray); */
    }
    [role='switch'][aria-checked='true'] :first-child,
    [role='switch'][aria-checked='false'] :last-child {
        display: none;
        color: #fff;
    }

    .s--inner button span {
        user-select: none;
        pointer-events: none;
        padding: 0.45em;
        border-radius: 50px;
        padding-left: 55px;
        padding-right: 55px;
        background: var(--cream);
        color: var(--accent-color);

        /* added */
        /* border: 1px solid var(--accent-color) */
    }

    /* .s--inner button:focus {
        outline: var(--accent-color) solid 1px;
    } */

    /* Slider Design Option */

    .s--slider {
        display: flex;
        align-items: center;
    }

    .s--slider button {
        width: 3em;
        height: 1.6em;
        position: relative;
        margin: 0 0 0 0.5em;
        background: var(--gray);
        border: none;
    }

    .s--slider button::before {
        content: '';
        position: absolute;
        width: 1.3em;
        height: 1.3em;
        background: #fff;
        top: 0.13em;
        right: 1.5em;
        transition: transform 0.3s;
    }


    .s--slider button[aria-checked='true']{
        background-color: var(--accent-color);
    }

    .s--slider button[aria-checked='true']::before{
        transform: translateX(1.3em);
        transition: transform 0.3s;
    }

    .s--slider button:focus {
        box-shadow: 0 0px 0px 1px var(--accent-color);
    }

    /* Multi Design Option */

    /* Based on suggestions from Sara Soueidan https://www.sarasoueidan.com/blog/toggle-switch-design/
    and this example from Scott O'hara https://codepen.io/scottohara/pen/zLZwNv */

    .s--multi .group-container {
        border: none;
        padding: 0;
        white-space: nowrap;
    }

    /* .s--multi legend {
    font-size: 2px;
    opacity: 0;
    position: absolute;
    } */

    .s--multi label {
        display: inline-block;
        line-height: 1.6;
        position: relative;
        z-index: 2;
    }

    .s--multi input {
        opacity: 0;
        position: absolute;
    }

    .s--multi label:first-of-type {
        padding-right: 5em;
    }

    .s--multi label:last-child {
        margin-left: -5em;
        padding-left: 5em;
    }

    .s--multi:focus-within label:first-of-type:after {
        box-shadow: 0 0px 8px var(--accent-color);
        border-radius: 1.5em;
    }



    /* making the switch UI.  */
    .s--multi label:first-of-type:before,
    .s--multi label:first-of-type:after {
        content: "";
        height: 1.25em;
        overflow: hidden;
        pointer-events: none;
        position: absolute;
        vertical-align: middle;
    }

    .s--multi label:first-of-type:before {
        border-radius: 100%;
        z-index: 2;
        position: absolute;
        width: 1.2em;
        height: 1.2em;
        background: #fff;
        top: 0.2em;
        right: 1.2em;
        transition: transform 0.3s;
    }

    .s--multi label:first-of-type:after {
        background: var(--accent-color);
        border-radius: 1em;
        margin: 0 1em;
        transition: background .2s ease-in-out;
        width: 3em;
        height: 1.6em;
    }

    .s--multi input:first-of-type:checked ~ label:first-of-type:after {
        background: var(--gray);
    }

    .s--multi input:first-of-type:checked ~ label:first-of-type:before {
        transform: translateX(-1.4em);
    }

    .s--multi input:last-of-type:checked ~ label:last-of-type {
        z-index: 1;
    }

    .s--multi input:focus {
        box-shadow: 0 0px 8px var(--accent-color);
        border-radius: 1.5em;
    }

    /* gravy */ 

    /* Inner Design Option */
    [role='switch'][aria-checked='true'] :first-child,
    [role='switch'][aria-checked='false'] :last-child {
        border-radius: 50px;
        background: var(--accent-color);
        display: inline-block;
    }

    /* .s--inner button:focus {
        box-shadow: 0 0px 8px var(--accent-color);
        border-radius: 0.1em;
    } */

    /* Slider Design Option */
    .s--slider button {
        border-radius: 1.5em;
    } 
    
    .s--slider button::before {
        border-radius: 100%;
    }
    .s--slider button:focus {
        box-shadow: 0 0px 8px var(--accent-color);
        border-radius: 1.5em;
    }
    .discount_percent {
        position: absolute; 
        top: 30px; 
        /* right: 33%; */
        right: 0 !important;
        left: 0 !important;
        width: 50% !important;
        margin: 0 auto !important;
        font-size: 11px !important;
        color: #000 !important;
        background: #DEE37D !important;
        padding: 1px !important;
        padding-left: 5px !important;
        padding-right: 5px !important;
        border-radius: 15px !important;
    }
    #switch-btn:hover > span:nth-child(1n+2) .tool_tip {
        opacity: 1 !important;
    }
    .tool_tip {
        opacity: 1 !important;
        position: absolute;
        top: -60px;
        right: -15px;
        font-size: 11px !important;
        width: 260px;
        color: #5F753D !important;
        border: 1px solid #5F753D;
        background: #fff !important;
        border-radius: 5px !important;
        padding: 1px !important;
        padding-left: 5px !important;
        padding-right: 5px !important;
        text-align: left !important;
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

    /* Extra small devices (phones, 478px and down) */
    @media only screen and (max-width: 1051px) {
        .s--inner button span {
            border-radius: 50px;
            padding-left: 55px;
            padding-right: 55px;
        }
    }

    /* Extra small devices (phones, 767 and down) */
    @media screen and (min-width:768px) and (max-width:1050px) {
        .s--inner button span {
            border-radius: 50px;
            padding-left: 20px;
            padding-right: 20px;
        }

        .tool_tip {
            top: -55px;
            right: -65px;
            font-size: 10px !important;
            width: 260px;
        }
    }

    /* Extra small devices (phones, 767 and down) */
    @media screen and (min-width:479px) and (max-width:767px) {
        .s--inner button span {
            border-radius: 50px;
            padding-left: 20px;
            padding-right: 20px;
        }

        .discount_percent {
            font-size: 10px !important;
            width: 75% !important;
        }

        .tool_tip {
            top: -55px;
            right: -45px;
            font-size: 10px !important;
            width: 260px;
        }
    }

    /* Extra small devices (phones, 478px and down) */
    @media screen and (min-width:401px) and (max-width:478px) {
        .s--inner button span {
            border-radius: 50px;
            padding-left: 25px;
            padding-right: 25px;
        }

        .discount_percent {
            font-size: 10px !important;
            width: 75% !important;
        }

        .tool_tip {
            top: -55px;
            right: -45px;
            font-size: 10px !important;
            width: 260px;
        }
    }

    @media only screen and (max-width: 400px) {
        .s--inner button span {
            border-radius: 50px;
            padding-left: 10px;
            padding-right: 10px;
        }

        .discount_percent {
            font-size: 10px !important;
            width: 80% !important;
        }

        .tool_tip {
            top: -55px;
            right: -55px;
            font-size: 10px !important;
            width: 260px;
        }
    }

</style>