import App from './App.svelte';

var div = document.createElement('DIV');
var script = document.currentScript;
script.parentNode.insertBefore(div, script);

const app = new App({
	target: div,
	// props: { name: 'ImpactHero Shop' },
});