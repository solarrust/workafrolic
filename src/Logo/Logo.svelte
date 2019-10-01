<script>
	import { onMount } from 'svelte';

	onMount(async () => {
		let logoEl = document.querySelector('.logo');
		if (window.location.pathname == '/') {
		 	logoEl.classList.add('_disabled');
		}
	});
</script>

<a href="/" class="logo header__logo">Logo</a>