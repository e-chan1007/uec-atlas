import yaml
import json
import glob
import os


def generate_map(schema_dir):
    ontology_map = {}

    for yaml_file in glob.glob(os.path.join(schema_dir, "*.yaml")):
        filename = os.path.basename(yaml_file).replace(".yaml", ".ttl")

        with open(yaml_file, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)

            if "classes" in data:
                for class_name in data["classes"]:
                    ontology_map[class_name] = filename

            if "slots" in data:
                for slot_name in data["slots"]:
                    ontology_map[slot_name] = filename

    print(json.dumps(ontology_map, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    argv = os.sys.argv
    if len(argv) != 2:
        print("Usage: python gen_ontology_map.py <schema_dir>")
        os.sys.exit(1)

    generate_map(argv[1])
