import { Declarations } from "../model/Declarations";
import { IndentationSpec } from "../model/IndentationSpec";
import { PropertyType } from "../model/PropertyType";
import { PropertyTypeUtil } from "../util/PropertyTypeUtil";

export class ConstructorSnippetGenerator {
  declarations: Declarations;
  indentationSpec: IndentationSpec;

  constructor(declarations: Declarations, indentationSpec: IndentationSpec) {
    this.declarations = declarations;
    this.indentationSpec = indentationSpec;
  }

  generateSnippet(): string {
    let snippet = '\n';

    if (!this.declarations.lastPropertyLineNumber) {
        // If no property and trait uses is found then no need to prepend a line break.
        snippet = '';
    }

    const classDeclaration = this.declarations.getClassDeclaration();

    snippet = this.indent();

    snippet += `constructor(opts?: Partial<${classDeclaration.name}>) {\n`;

    classDeclaration.properties.forEach(property => {
        let indentLevel = 2;
        snippet += this.indent(indentLevel++);
        snippet += `if (opts?.${property.name} != null) {\n`;

        const propertyType = PropertyTypeUtil.getPropertyTypeFromNamedType(property.type);

        // Need different strategies here for different types
        if (propertyType === PropertyType.PRIMITIVE) {
            snippet += this.indent(indentLevel);
            snippet += `this.${property.name} = opts.${property.name};\n`;
        } else if (propertyType === PropertyType.OBJECT) {
            const objectDeclaration = this.declarations.importsDeclarationMap.get(property.type ?? '');
            if (objectDeclaration === undefined) {
                console.info('object not imported, mapping directly to property ', property.name);
                snippet += this.indent(indentLevel);
                snippet += `this.${property.name} = opts.${property.name};\n`;
            } else if (PropertyTypeUtil.isDeclarationEnumType(objectDeclaration)) {
                // TODO: Check to see if enum and if the object is instatiable
                snippet += this.indent(indentLevel++);
                snippet += `if (typeof opts.${property.name} === 'string') {\n`;
                
                snippet += this.indent(indentLevel);
                snippet += `this.${property.name} = ${property.type}[opts.${property.name}];\n`;

                snippet += this.indent(--indentLevel);
                snippet += '} else {\n';

                snippet += this.indent(++indentLevel);
                snippet += `this.${property.name} = opts.${property.name};\n`;

                snippet += this.indent(--indentLevel);
                snippet += '}\n';
            } else {
                snippet += this.indent(indentLevel);
                snippet += `this.${property.name} = new ${property.type}(opts.${property.name});\n`;
            }
        } else if (propertyType === PropertyType.ARRAY) {
            const arrayItemType = PropertyTypeUtil.extractItemTypeFromArrayType(property.type);
            const arrayItemTypeDeclaration = this.declarations.importsDeclarationMap.get(arrayItemType ?? '');
            if (arrayItemTypeDeclaration === undefined) {
                snippet += this.indent(indentLevel);
                snippet += `this.${property.name} = [...opts.${property.name}];\n`;    
            } else if (PropertyTypeUtil.isDeclarationEnumType(arrayItemTypeDeclaration)) {
                snippet += this.indent(indentLevel);
                snippet += `this.${property.name} = opts.${property.name}.map(val => {\n`;
                
                snippet += this.indent(++indentLevel);
                snippet += `if (typeof val === 'string') {\n`;
                
                snippet += this.indent(++indentLevel);
                snippet += `return ${arrayItemType}[val];\n`;

                snippet += this.indent(--indentLevel);
                snippet += '} else {\n';

                snippet += this.indent(++indentLevel);
                snippet += `return val;\n`;

                snippet += this.indent(--indentLevel);
                snippet += `}\n`;

                snippet += this.indent(--indentLevel);
                snippet += '});\n';
            } else {
                snippet += this.indent(indentLevel);
                snippet += `this.${property.name} = opts.${property.name}.map(val => new ${arrayItemType}(val));\n`;
            }
        }

        snippet += this.indent(--indentLevel);
        snippet += `}\n`;
    });
    
    snippet += this.indent();
    snippet += '}';

    return snippet;
  }

  private indent(level = 1) {
    let singleLevel;
    if (!this.indentationSpec.useSpaces) {
        singleLevel = '\t';
    } else {
        singleLevel = ' '.repeat(this.indentationSpec.indentSize);
    }

    return singleLevel.repeat(level);
  }
}