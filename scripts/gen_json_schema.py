import sys
import json
from linkml.generators.jsonschemagen import JsonSchemaGenerator
from linkml_runtime.utils.schemaview import SchemaView


def main():
    if len(sys.argv) < 2:
        sys.exit(1)

    yaml_file = sys.argv[1]
    view = SchemaView(yaml_file)
    gen = JsonSchemaGenerator(yaml_file, useuris=True, mergeimports=True)

    schema_dict = json.loads(gen.serialize())

    # Post-process the JSON Schema to handle @language containers and designates_type
    def process_properties(cls_name, properties):
        for slot_name in list(properties.keys()):
            # Use induced slot for class-specific details (like designates_type)
            induced_slot = None
            if cls_name:
                try:
                    induced_slot = view.induced_slot(slot_name, cls_name)
                except:
                    pass

            slot = view.get_slot(slot_name)
            target = induced_slot or slot
            if not target:
                continue

            # 1. Handle @language containers
            container = None
            if target.range in view.all_classes():
                cls = view.get_class(target.range)
                if "jsonld_container" in cls.annotations:
                    container = cls.annotations["jsonld_container"].value
            elif target.range in view.all_types():
                typ = view.get_type(target.range)
                if "jsonld_container" in typ.annotations:
                    container = typ.annotations["jsonld_container"].value

            if "jsonld_container" in target.annotations:
                container = target.annotations["jsonld_container"].value

            if container == "@language":
                properties[slot_name] = {
                    "type": "object",
                    "additionalProperties": {"type": "string"},
                    "description": target.description or "",
                }
                continue

            # 2. Handle designates_type enum resolution
            if target.designates_type and cls_name:
                properties[slot_name]["enum"] = [cls_name]

    if "$defs" in schema_dict:
        for cls_name, cls_def in schema_dict["$defs"].items():
            if "properties" in cls_def:
                process_properties(cls_name, cls_def["properties"])

    if "properties" in schema_dict:
        # Identify the root class or all top-level classes
        tree_roots = [n for n, c in view.all_classes().items() if c.tree_root]
        if tree_roots:
            root_cls = tree_roots[0]
            descendants = [d for d in view.class_descendants(root_cls)
                           if not view.get_class(d).abstract]

            if len(descendants) > 1:
                # If there are subclasses, use anyOf at the root to allow polymorphic validation
                schema_dict["anyOf"] = [
                    {"$ref": f"#/$defs/{d}"} for d in descendants]
                # Remove top-level properties/required as they are now in anyOf
                schema_dict.pop("properties", None)
                schema_dict.pop("required", None)
                schema_dict.pop("type", None)
            else:
                process_properties(root_cls, schema_dict["properties"])
        else:
            process_properties(None, schema_dict["properties"])

    print(json.dumps(schema_dict, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
