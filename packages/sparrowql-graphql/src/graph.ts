import {
  GraphQLObjectType,
  GraphQLType,
  NonNullTypeNode,
  StringValueNode,
  ValueNode,
} from 'graphql';
import {
  visit,
  ASTNode,
  FieldDefinitionNode,
  TypeNode,
  NamedTypeNode,
} from 'graphql/language';
import { GraphQLResolveInfo } from 'graphql/type';
import { build, Options, ProjectionType, Relation } from 'sparrowql';

enum RelationField {
  As = 'as',
  Foreign = 'foreign',
  Local = 'local',
}

function extractType(type: GraphQLType): GraphQLType {
  return 'ofType' in type ? extractType(type.ofType) : type;
}

function isNamedTypeNode(
  node: FieldDefinitionNode | TypeNode,
): node is NamedTypeNode {
  return node.kind === 'NamedType';
}

function isNonNullTypeNode(node: TypeNode): node is NonNullTypeNode {
  return node.kind === 'NonNullType';
}

function resolveTypeName(node: TypeNode): string {
  if (isNamedTypeNode(node)) {
    return node.name.value;
  }

  if (isNonNullTypeNode(node)) {
    return resolveTypeName(node.type);
  }

  return resolveTypeName(node);
}

function extractTypeAST(type: FieldDefinitionNode | TypeNode): NamedTypeNode {
  return isNamedTypeNode(type) ? type : extractTypeAST(type.type);
}

function isStringValueNode(
  name: string,
  value: ValueNode,
): value is StringValueNode {
  return Object.values<string>(RelationField).includes(name);
}

export function astToOptions(
  schemaAST: ASTNode,
  { directiveCollection = 'collection', directiveRelation = 'relationTo' } = {},
) {
  // Local mappings.
  const collection2type: Record<string, string> = {};
  const type2collection: Record<string, string> = {};

  // Standard options.
  const collections: string[] = [];
  const relations: Relation[] = [];
  const typeMap: Record<string, string> = {};

  visit(schemaAST, {
    FieldDefinition(node) {
      if (!node.directives || node.directives.length === 0) {
        return false;
      }
      for (const directive of node.directives) {
        if (directive.name.value !== directiveRelation) {
          continue;
        }

        const targetNodeName = resolveTypeName(node.type);

        const relation: Relation = {
          foreign: null,
          from: collections[0],
          local: null,
          to: type2collection[targetNodeName],
        };

        for (const { name, value } of directive.arguments ?? []) {
          if (!isStringValueNode(name.value, value)) {
            throw new Error(
              `Directive ${name.value}  argument value must be of string type.`,
            );
          }

          if (name.value === RelationField.As) {
            relation.to = value.value;
          } else if (name.value === RelationField.Foreign) {
            relation.foreign = value.value;
          } else if (name.value === RelationField.Local) {
            relation.local = value.value;
          }
        }

        relations.push(relation);
        typeMap[`${collection2type[relation.from]}.${node.name.value}`] =
          relation.to;
        break;
      }

      return false;
    },
    ObjectTypeDefinition(node) {
      if (node.name.value === 'Query') {
        for (const field of node.fields ?? []) {
          typeMap[`Query.${field.name.value}`] =
            type2collection[extractTypeAST(field.type).name.value];
        }
      }

      if (!node.directives || node.directives.length === 0) {
        return false;
      }
      for (const directive of node.directives) {
        if (directive.name.value !== directiveCollection) {
          continue;
        }

        for (const argument of directive.arguments ?? []) {
          if (argument.name.value !== 'name') {
            continue;
          }

          if (!isStringValueNode(argument.name.value, argument.value)) {
            throw new Error(
              `Directive ${argument.name.value}  argument value must be of string type.`,
            );
          }

          const argumentValue = argument.value.value;
          type2collection[node.name.value] = argumentValue;
          collection2type[argumentValue] = node.name.value;
          collections.unshift(argumentValue);

          return undefined;
        }
      }

      return false;
    },
  });

  return { collections, relations, typeMap };
}

type InflateMap = string | { [key: string]: InflateMap };
export function astToPipeline(info: GraphQLResolveInfo, options: Options) {
  const scopes: string[] = [];
  const inflateMap: InflateMap = {};
  const projection: ProjectionType = {};

  const queryType = info.schema.getQueryType();
  if (!queryType) {
    throw new Error('Missing Query object in schema.');
  }

  const extractPathType = (path: string[]) =>
    path.reduce(
      (node, field) =>
        extractType(node.getFields()[field].type) as GraphQLObjectType,
      queryType,
    ).name;

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

        projection[target] = `${options.typeMap?.[x] ?? ''}.${field}`;

        let position = inflateMap;
        while (path.length > 1) {
          const part = path.shift()!;
          if (position[part] === undefined) {
            position[part] = {};
          }
          const positionPart = position[part];
          if (typeof positionPart === 'string') {
            throw new Error('Incorrect position path.');
          }
          position = positionPart;
        }

        position[path[0]] = `$${target}`;
      }
    },
    SelectionSet: {
      leave() {
        scopes.pop();
      },
    },
  });

  return build({ ...options, projection }).concat({
    $project: inflateMap[info.fieldName] as Record<string, string>,
  });
}
