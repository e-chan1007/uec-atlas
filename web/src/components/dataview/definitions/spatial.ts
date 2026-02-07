import type { SchemaOpeningHoursSpecification } from "generated/organization";
import type { StructureAmenity } from "generated/spatial";
import type { LinkedSpatialEntity, RawSpatialEntity } from "@/data/spatial";
import AddressView from "../AddressView.astro";
import LinkCardList from "../LinkCardList.astro";
import OpeningHoursView from "../OpeningHoursView.astro";
import StructureAmenityList from "../StructureAmenityList.astro";
import { defineDataViewItems } from "../types";

const createSpatialLinkCardSection = (
  title: string,
  key: keyof LinkedSpatialEntity["properties"],
) =>
  defineDataViewItems<LinkedSpatialEntity>()(
    ({ componentItem, sectionItem }) => [
      sectionItem({
        type: "section",
        title,
        when: (item) =>
          (Array.isArray(item.properties[key]) &&
            (item.properties[key] as LinkedSpatialEntity[]).length > 0) ||
          (!!item.properties[key] && !Array.isArray(item.properties[key])),
        items: [
          componentItem({
            type: "component",
            component: LinkCardList,
            props: (item) => {
              const values = Array.isArray(item.properties[key])
                ? item.properties[key]
                : [item.properties[key]];
              return {
                items: values.map((place) => ({
                  name: place.properties.name,
                  uri: place.id,
                  tags: [place.properties.type],
                })),
                fallbackName: {
                  ja: "無名の地物",
                  en: "Unnamed Feature",
                },
              };
            },
          }),
        ],
      }),
    ],
  );

export const spatialDataView = defineDataViewItems<LinkedSpatialEntity>()(
  ({ componentItem, sectionItem }) => [
    componentItem({
      type: "component",
      component: StructureAmenityList,
      when: (props) => props.amenities.length > 0,
      props: (item) => ({
        amenities:
          "amenities" in item.properties
            ? (item.properties.amenities as StructureAmenity[])
            : [],
      }),
    }),
    sectionItem({
      type: "section",
      title: "所在地",
      when: (item) => !!item.properties.address,
      items: [
        componentItem({
          type: "component",
          component: AddressView,
          props: (item) => ({
            address: item.properties.address,
          }),
        }),
      ],
    }),
    sectionItem({
      type: "section",
      title: "利用時間",
      when: (item) =>
        "openingHoursSpecification" in item.properties &&
        Array.isArray(item.properties.openingHoursSpecification),
      items: [
        componentItem({
          type: "component",
          component: OpeningHoursView,
          props: (item) => ({
            openingHours:
              "openingHoursSpecification" in item.properties
                ? (item.properties
                    .openingHoursSpecification as SchemaOpeningHoursSpecification[])
                : [],
          }),
        }),
      ],
    }),
    sectionItem({
      type: "section",
      title: "運営組織",
      when: (item) => item.properties.managedBy.length > 0,
      items: [
        componentItem({
          type: "component",
          component: LinkCardList,
          props: (item) => ({
            items: item.properties.managedBy.map((org) => ({
              name: org.name,
              uri: org.id,
              tags: [org.type],
            })),
            fallbackName: {
              ja: "無名の組織",
              en: "Unnamed Organization",
            },
          }),
        }),
      ],
    }),
    ...createSpatialLinkCardSection("地物の所在", "containedInPlace"),
    ...createSpatialLinkCardSection("内部の地物", "containsPlace"),
    ...createSpatialLinkCardSection("接続先の地物", "connectedTo"),
    ...createSpatialLinkCardSection("付属する地物", "hasPart"),
    ...createSpatialLinkCardSection("付属先の地物", "isPartOf"),
    ...createSpatialLinkCardSection("交差する地物", "intersectsPlace"),
  ],
);

export const allSpatialDataView = defineDataViewItems<{
  features: RawSpatialEntity[];
}>()(({ componentItem, sectionItem }) => [
  componentItem({
    type: "component",
    component: LinkCardList,
    props: (value) => ({
      items: value.features.map((place) => ({
        name: place.properties.name,
        uri: place.id,
        tags: [place.properties.type],
      })),
      fallbackName: {
        ja: "無名の地物",
        en: "Unnamed Feature",
      },
    }),
  }),
]);
