import sys
import json
import os
from linkml_runtime.utils.schemaview import SchemaView


def main():
    if len(sys.argv) < 2:
        sys.exit(1)

    yaml_file = sys.argv[1]
    view = SchemaView(yaml_file)

    # Identify the root class
    roots = [n for n, c in view.all_classes().items() if c.tree_root]
    target = roots[0] if roots else None

    # Context file reference (assuming it's in the same directory or resolved by the consumer)
    basename = os.path.basename(yaml_file).replace(".yaml", "")
    context_file = f"{basename}.context.jsonld"

    # Construct a basic JSON-LD Frame
    frame = {
        "@context": context_file,
        "@embed": "@always",
    }
    if target:
        cls = view.get_class(target)
        # We use the class name or its URI if available
        frame["@type"] = cls.class_uri or target

    print(json.dumps(frame, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
