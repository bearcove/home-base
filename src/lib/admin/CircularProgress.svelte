<script lang="ts">
    type Props = {
        progress: number; // between 0 and 1
        radius: number;
        color: string;
    };

    let { progress = 0, radius = 10, color = "#4CAF50" }: Props = $props();

    let pathData = $state("");

    $effect(() => {
        // Convert progress (0-1) to degrees (0-360)
        const degrees = progress * 360;

        // Convert to radians
        const rad = (degrees * Math.PI) / 180;

        // Calculate end point
        const x = 12 + radius * Math.sin(rad);
        const y = 12 - radius * Math.cos(rad);

        // Determine which arc flag to use (0 for small arc, 1 for large arc)
        const largeArcFlag = degrees > 180 ? 1 : 0;

        pathData = `M 12 ${12 - radius} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x} ${y}`;
    });
</script>

<svg width="24" height="24" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r={radius} fill="rgba(128, 128, 128, 0.2)" />
    <path d={pathData} fill="none" stroke={color} stroke-width="4" stroke-linecap="round" />
</svg>
