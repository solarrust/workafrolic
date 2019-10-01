<script>
	import { onMount } from 'svelte';
	import List from '../List/List.svelte';
	import Item from '../Item/Item.svelte';

	let item;
	let page;

	async function hashchange() {
		// the poor man's router!
		const path = window.location.hash.slice(1);

		if (path.startsWith('/item')) {
			const id = path.slice(6);
			item = await fetch(`https://node-hnapi.herokuapp.com/item/${id}`).then(r => r.json());

			window.scrollTo(0,0);
		} else if (path.startsWith('/top')) {
			page = +path.slice(5);
			item = null;
		} else {
			window.location.hash = '/top/1';
		}
	}

	onMount(hashchange);
</script>

<svelte:window on:hashchange={hashchange}/>

<section class="blog-list">
	{#if item}
		<Item {item} returnTo="#/top/{page}"/>
	{:else if page}
		<List {page}/>
	{/if}
</section>