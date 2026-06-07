<script lang="ts">
	import NotesView from '$lib/components/NotesView.svelte';
	import { getPreferences } from '$lib/stores/preferences.svelte.js';

	const prefs = $derived(getPreferences());
</script>

<svelte:head>
	<title>{prefs.separateShares ? 'My Crumbs' : 'Crumbs'}</title>
</svelte:head>

<NotesView filter="all" shareFilter={prefs.separateShares ? 'my' : null} />
