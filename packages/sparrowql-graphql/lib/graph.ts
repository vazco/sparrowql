import {visit} from 'graphql/language';

import {build} from 'sparrowql';

function extractType(type) {
    return type.ofType ? extractType(type.ofType) : type;
}

function extractTypeAST(type) {
    return type.kind === 'ListType' || type.kind === 'NonNullType' ? extractTypeAST(type.type) : type;
}

export function astToOptions(schemaAST, {directiveCollection = 'collection', directiveRelation = 'relationTo'} = {}) {
    // Local mappings.
    const collection2type = {};
    const type2collection = {};

    // Standard options.
    const collections = [];
    const relations = [];
    const typeMap = {};

    visit(schemaAST, {
        FieldDefinition(node) {
            if (!node.directives || node.directives.length === 0) return false;
            for (const directive of node.directives) {
                if (directive.name.value !== directiveRelation) continue;

                const relation = {
                    foreign: null,
                    from: collections[0],
                    local: null,
                    to: type2collection[node.type.type.name.value]
                };

                for (const {name, value} of directive.arguments) {
                    if (name.value === 'as') relation.to = value.value;
                    else if (name.value === 'foreign') relation.foreign = value.value;
                    else if (name.value === 'local') relation.local = value.value;
                }

                relations.push(relation);
                typeMap[`${collection2type[relation.from]}.${node.name.value}`] = relation.to;
                break;
            }

            return false;
        },
        ObjectTypeDefinition(node) {
            if (node.name.value === 'Query')
                for (const field of node.fields)
                    typeMap[`Query.${field.name.value}`] = type2collection[extractTypeAST(field.type).name.value];

            if (!node.directives || node.directives.length === 0) return false;
            for (const directive of node.directives) {
                if (directive.name.value !== directiveCollection) continue;

                for (const argument of directive.arguments) {
                    if (argument.name.value !== 'name') continue;

                    type2collection[node.name.value] = argument.value.value;
                    collection2type[argument.value.value] = node.name.value;
                    collections.unshift(argument.value.value);

                    return undefined;
                }
            }

            return false;
        }
    });

    return {collections, relations, typeMap};
}

export function astToPipeline(info, options) {
    const scopes = [];
    const inflateMap = {};
    const projection = {};

    const rootType = extractType(info.schema.getQueryType());
    const extractPathType = path =>
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

                projection[target] = `${options.typeMap[x]}.${field}`;

                let position = inflateMap;
                while (path.length > 1) {
                    const part = path.shift();
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
