<script>
    export let value, label, type = 'text';

    const typeAction = (node) => {
        node.type = type;
    }
</script>

<div class="mb-2">
    <input
        type="text"
        class="w-full px-4 py-2 font-semibold text-sm border border-[#EFE3DE] rounded-md focus:border-[#EFE3DE] focus:outline-none focus:ring-1 focus:ring-[#EFE3DE] placeholder-[#EFE3DE]"
        placeholder={label}
        use:typeAction
        bind:value={value}
    />
</div>