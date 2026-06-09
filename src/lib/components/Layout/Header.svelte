<script lang="ts">
	import SearchBar from '../SearchBar.svelte';
	import SyncIndicator from '../SyncIndicator.svelte';
	import Menu from 'lucide-svelte/icons/menu';
	import Search from 'lucide-svelte/icons/search';

	interface Props {
		onMenuToggle: () => void;
	}

	let { onMenuToggle }: Props = $props();
	let mobileSearchOpen = $state(false);
</script>

<header class="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/80 backdrop-blur-md px-4">
	{#if mobileSearchOpen}
		<!-- Mobile expanded search -->
		<div class="flex flex-1 items-center gap-2 lg:hidden">
			<SearchBar onClose={() => (mobileSearchOpen = false)} />
		</div>
	{:else}
		<button
			onclick={onMenuToggle}
			class="rounded-lg p-2 hover:bg-[var(--border-subtle)]"
			aria-label="Toggle sidebar"
		>
			<Menu class="h-6 w-6 text-[var(--text)]" />
		</button>

		<div class="flex items-center gap-2">
			<img src="/favicon-96x96.png" alt="" class="h-8 w-8" />
			<h1 class="text-xl font-bold tracking-tight text-[var(--primary)]">Crumbs</h1>
		</div>

		<!-- Desktop search bar -->
		<div class="mx-4 hidden flex-1 lg:block">
			<SearchBar />
		</div>

		<!-- Mobile search icon -->
		<button
			onclick={() => (mobileSearchOpen = true)}
			class="ml-auto rounded-lg p-2 hover:bg-[var(--border-subtle)] lg:hidden"
			aria-label="Search"
		>
			<Search class="h-5 w-5 text-[var(--text)]" />
		</button>

		<div class="flex items-center gap-2">
			<SyncIndicator />
		</div>
	{/if}
</header>
