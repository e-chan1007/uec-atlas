/** biome-ignore-all lint/suspicious/noExplicitAny: generic component props */
import type { Component as SvelteComponent } from "svelte";

type AnyComponent = ((props: any) => unknown) | SvelteComponent<any>;
export type ComponentProps<Component> = Component extends (
  props: infer P,
) => unknown
  ? P
  : Component extends SvelteComponent<infer P>
    ? P
    : never;

type DataViewComponentItem<V extends object, Component extends AnyComponent> = {
  type: "component";
  component: Component;
  when?: (props: ComponentProps<Component>, value: V) => boolean;
  props: (value: V) => {
    [K in keyof ComponentProps<Component>]: ComponentProps<Component>[K];
  };
};

type DataViewSectionItem<V extends object> = {
  type: "section";
  title: string;
  items: DataViewItem<V>[];
  when?: (value: V) => boolean;
};

export type DataViewItem<V extends object> =
  | DataViewSectionItem<V>
  | DataViewComponentItem<V, AnyComponent>;

export const defineDataViewItems =
  <V extends object>() =>
  <Items extends DataViewItem<V>[]>(
    definition: (utils: {
      componentItem: <Component extends AnyComponent>(
        item: DataViewComponentItem<V, Component>,
      ) => DataViewComponentItem<V, Component>;
      sectionItem: (item: DataViewSectionItem<V>) => DataViewSectionItem<V>;
    }) => Items,
  ): Items =>
    definition({
      componentItem: (item) => item,
      sectionItem: (item) => item,
    });
