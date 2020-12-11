import { visit, ASTNode, FieldDefinitionNode, TypeNode, NamedTypeNode } from 'graphql/language';
import { GraphQLResolveInfo } from 'graphql/type';

import { build, Options, Relation } from 'sparrowql';
import { GraphQLType } from 'graphql';

function extractType(type: GraphQLType): GraphQLType {
  return 'ofType' in type ? extractType(type.ofType) : type;
}

function isNamedTypeNode(type: FieldDefinitionNode | TypeNode): type is NamedTypeNode {
  return type.kind === 'NamedType';
}

function extractTypeAST(type: FieldDefinitionNode | TypeNode): NamedTypeNode {
  return isNamedTypeNode(type) ? type : extractTypeAST(type.type);
}

export function astToOptions(schemaAST: ASTNode, {directiveCollection = 'collection', directiveRelation = 'relationTo'} = {}) {
    // Local mappings.
    const collection2type: Record<string, string> = {};
    const type2collection: Record<string, string> = {};

    // Standard options.
    const collections: string[] = [];
    const relations: Relation[] = [];
    const typeMap: Record<string, string> = {};

    visit(schemaAST, {
        FieldDefinition(node) {
            if (!node.directives || node.directives.length === 0) return false;
            for (const directive of node.directives) {
                if (directive.name.value !== directiveRelation) continue;

                const relation = {
                    foreign: null,
                    from: collections[0],
                    local: null,
                    to: type2collection[(node.type as any).type.name.value] // Typings do not match for NamedType
                };

                for (const {name, value} of directive.arguments ?? []) {
                    // Typings do not match for VariableNode
                    if (name.value === 'as') relation.to = (value as any).value;
                    else if (name.value === 'foreign') relation.foreign = (value as any).value;
                    else if (name.value === 'local') relation.local = (value as any).value;
                }

                relations.push(relation);
                typeMap[`${collection2type[relation.from]}.${node.name.value}`] = relation.to;
                break;
            }

            return false;
        },
        ObjectTypeDefinition(node) {
            if (node.name.value === 'Query')
                for (const field of node.fields ?? [])
                    typeMap[`Query.${field.name.value}`] = type2collection[extractTypeAST(field.type).name.value];

            if (!node.directives || node.directives.length === 0) return false;
            for (const directive of node.directives) {
                if (directive.name.value !== directiveCollection) continue;

                for (const argument of directive.arguments ?? []) {
                    if (argument.name.value !== 'name') continue;

                    // Typings do not match for VariableNode
                    const argumentValue = (argument.value as any).value;
                    type2collection[node.name.value] = argumentValue;
                    collection2type[argumentValue] = node.name.value;
                    collections.unshift(argumentValue);

                    return undefined;
                }
            }

            return false;
        }
    });

    return {collections, relations, typeMap};
}

export function astToPipeline(info: GraphQLResolveInfo, options: Options) {
    const scopes: string[] = [];
    const inflateMap: Record<string, {}> = {};
    const projection: any = {};

    const rootType = extractType(info.schema.getQueryType()!);
    const extractPathType = (path: any[]) =>
        path.reduce((node, field) => extractType(node.getFields()[field].type), rootType).name;

    visit(info.operation, {
        Field(node) {
            if (node.selectionSet) {
                scopes.push(node.name.value);
            } else {
                const field = node.name.value;
                const scope = scopes[scopes.length - 1];
                const path = scopes.concat(field);
                const target = path.join('__SPARROWQL__');

                const y = scopes.length === 1 ? [] : scopes.slice(0, -1);
                const x = `${extractPathType(y)}.${scope}`;

                projection[target] = `${options.typeMap?.[x]}.${field}`;

                let position = inflateMap;
                while (path.length > 1) {
                    const part = path.shift()!;
                    if (position[part] === undefined) {
                        position[part] = {};
                    }

                    position = position[part];
                }

                position[path[0]] = `$${target}`;
            }
        },
        SelectionSet: {
            leave() {
                scopes.pop();
            }
        }
    });

    return build({...options, projection}).concat({$project: inflateMap[info.fieldName]});
}
