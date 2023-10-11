<script>
	import { t, locale, locales } from '../../store/i18n';

	export let steps = [], currentActive = 1;
	let circles, progress;

	let progressSteps = [{id: 1, caption: $t('form.step.info') }, {id: 2, caption: $t('form.step.payment') }, {id: 3, caption: $t('form.step.certificate') } ]

	export const handleProgress = (stepIncrement) => {
		circles = document.querySelectorAll('.step-tab');
		if(stepIncrement == 1){
			currentActive++

			if(currentActive > circles.length) {
					currentActive = circles.length
			}
		} else {
			currentActive--

			if(currentActive < 1) {
					currentActive = 1 
			}
		}
		

        update()
	}
	
	function update() {
        circles.forEach((circle, idx) => {
            if(idx < currentActive) {
                circle.classList.add('active')
            } else {
                circle.classList.remove('active')
            }
        })

        const actives = document.querySelectorAll('.active');

        progress.style.width = (actives.length - 1) / (circles.length - 1) * 100 + '%';
	}
	
</script>

<div class="progress-container" bind:this={circles}>
	<div class="progress" bind:this={progress} style="visibility: hidden;"></div>
	{#each steps as step, i}
	    <div class="step-tab {i == currentActive - 1 ? 'step-tab-active' : ''}" data-title={ progressSteps[i].caption } >{ progressSteps[i].caption }</div>
	{/each}
</div>

<!-- <div class="progress-container" bind:this={circles}>
	<div class="progress" bind:this={progress} style="display: none;"></div>
	{#each steps as step, i}
		<div class="step-tab {i == 0 ? 'step-tab-active' : ''}">
			{step}
		</div>
	{/each}
</div> -->



<style>
	.step-tab {
		color: #C5C2C0;
		border-bottom: 2px solid #F2EFED;
		width: 30%;
		font-size: 13px;
		font-weight: 600;
	}

	.step-tab-active {
		color: #5F753D !important;
		border-bottom: 2px solid #5F753D !important;
	}

	.progress-container {
		display: flex;
		justify-content: space-between;
		position: relative;
		margin-bottom: 30px;
		max-width: 100%;
		width: 75%;
		margin: 0 auto !important;
	}

	.progress-container::before {
		content: '';
		/* background-color: #e0e0e0; */
		position: absolute;
		top: 50%;
		left: 0;
		transform: translateY(-50%);
		height: 4px;
		width: 100%;
		z-index: -1;
	}

	.progress {
		background-color: #5F753D;
		position: absolute;
		top: 50%;
		left: 0;
		transform: translateY(-50%);
		height: 4px;
		width: 0%;
		/* z-index: -1; */
		transition: 0.4s ease;
	}

	.circle {
		background-color: #fff;
		color: #5F753D;
		border-radius: 50%;
		height: 20px;
		width: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 3px solid #e0e0e0;
		transition: 0.4s ease;
		cursor: pointer;
        z-index: 10;
	}
	
	.circle::after{
		content: attr(data-title) " ";
		position: absolute;
		bottom: 35px;
		color: #5F753D;
		transition: 0.4s ease;
	}
	
	.circle.active::after {
		color: #5F753D;
	}

	.circle.active {
        border-color: #5F753D;
        background: #5F753D;
        color: #5F753D;
	}
</style>