<script lang="ts">
    import CombinedWidget from "./CombinedWidget.svelte";
</script>

<div>
    <CombinedWidget />
</div>

<style>
    div {
        display: flex;
        flex-direction: column;
        height: 100%;
    }

    @font-face {
      font-family: "IosevkaFtl";
      src: url("@home-base-fonts/IosevkaFTLNerdFont-Regular-subset.woff2") format("woff2");
      font-weight: 400;
      font-style: normal;
      font-display: swap;
    }

    @font-face {
      font-family: "IosevkaFtl";
      src: url("@home-base-fonts/IosevkaFTLNerdFont-Bold-subset.woff2") format("woff2");
      font-weight: 700;
      font-style: normal;
      font-display: swap;
    }

    @font-face {
      font-family: "Inter";
      src: url("@home-base-fonts/InterVariable.woff2") format("woff2");
      font-weight: 100 900;
      font-style: normal;
      font-display: swap;
    }
</style>
