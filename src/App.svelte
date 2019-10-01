<script>
	import Header from "./Header/Header.svelte";
	import BlogList from "./BlogList/BlogList.svelte";
	import Footer from "./Footer/Footer.svelte";
	let name = 'world';
</script>

<Header/>
<main class="main">
	<BlogList/>
</main>
<Footer/>