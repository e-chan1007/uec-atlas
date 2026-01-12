import sys
import re
from linkml.generators.typescriptgen import TypescriptGenerator
from linkml_runtime.utils.schemaview import SchemaView


def main():
    if len(sys.argv) < 2:
        sys.exit(1)

    yaml_file = sys.argv[1]
    view = SchemaView(yaml_file)
    gen = TypescriptGenerator(yaml_file, useuris=True, mergeimports=True)
    output = gen.serialize()

    # 1. Replace I18NString definition with Record<string, string>
    pattern_i18n = r"(/\*\*.*?\*/\s*)?export (interface|type) I18NString\b.*?(\n\}|;)"
    output, count = re.subn(
        pattern_i18n, "export type I18NString = Record<string, string>;", output, flags=re.DOTALL)
    if count == 0 and ("I18NString" in view.all_types() or "I18NString" in view.all_classes()):
        output = "export type I18NString = Record<string, string>;\n" + output

    # 2. Identify slots that should be I18NString
    def get_lang(el):
        if not el:
            return None
        ann = el.annotations.get("jsonld_container")
        return getattr(ann, "value", None) if ann else None

    target_slots = []
    for slot_name, slot in view.all_slots().items():
        is_i18n = (slot.range == "I18NString" or
                   get_lang(slot) == "@language" or
                   get_lang(view.get_element(slot.range)) == "@language")
        if is_i18n:
            target_slots.append(slot_name)

    # 3. Replace property types in interfaces for target slots
    if target_slots:
        # Sort by length descending to match longer names first just in case
        target_slots.sort(key=len, reverse=True)
        # Capture the property name and the punctuation (?: or :)
        pattern = rf"\b({'|'.join(target_slots)})(\??:)\s*[^,;\n]+"
        output = re.sub(pattern, r"\1\2 I18NString", output)

    print(output)


if __name__ == "__main__":
    main()
