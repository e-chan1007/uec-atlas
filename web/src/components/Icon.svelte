<script lang="ts">
  import { getIconData, stringToIcon, iconToSVG } from "@iconify/utils";
  import type { IconifyJSON } from "@iconify/types";

  // サーバーサイドでのみ使用されるアイコンデータ
  import mdiIcons from "@iconify-json/mdi/icons.json";

  interface Props {
    name: string;
    size?: string | number;
    class?: string;
    [key: string]: any;
  }

  let { name, size = "1em", class: className, ...restProps }: Props = $props();

  const collections: Record<string, IconifyJSON> = {
    mdi: mdiIcons as IconifyJSON,
  };

  // SVG文字列を生成する派生ステート
  const svgHtml = $derived.by(() => {
    const parsed = stringToIcon(name);
    if (!parsed || !collections[parsed.prefix]) return null;

    const data = getIconData(collections[parsed.prefix], parsed.name);
    if (!data) return null;

    // iconToSVG は viewBox や body (path) を返します
    const renderData = iconToSVG(data, {
      height: size,
      width: size,
    });

    // 属性を文字列に変換
    const attributes = Object.entries(renderData.attributes)
      .map(([key, value]) => `${key}="${value}"`)
      .join(" ");

    // 最終的なSVGタグを組み立て
    return `<svg ${attributes}>${renderData.body}</svg>`;
  });
</script>

{#if svgHtml}
  <span class={className} {...restProps}>
    {@html svgHtml}
  </span>
{:else}
  <span class="icon-missing">[{name}]</span>
{/if}

<style>
  span {
    display: inline-flex;
    align-self: center;
  }
  span :global(svg) {
    display: block;
    fill: currentColor;
  }
</style>
