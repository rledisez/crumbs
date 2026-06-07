<script lang="ts">
	import NotesView from '$lib/components/NotesView.svelte';
	import { getPreferences } from '$lib/stores/preferences.svelte.js';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	const prefs = $derived(getPreferences());

	onMount(() => {
		if (!prefs.separateShares) {
			goto('/');
		}
	});
</script>

<svelte:head>
	<title>Shared Crumbs</title>
</svelte:head>

{#if prefs.separateShares}
	<NotesView filter="all" shareFilter="shared" />
{/if}
