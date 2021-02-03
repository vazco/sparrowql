import {
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLType,
  ListValueNode,
  NullValueNode,
  ObjectValueNode,
  ValueNode,
  VariableNode,
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

// TODO: Improve typings
type ValueNodeWithValue = Exclude<
  ValueNode,
  VariableNode | NullValueNode | ListValueNode | ObjectValueNode
>;

function extractType(type: GraphQLType): GraphQLType {
  return 'ofType' in type ? extractType(type.ofType) : type;
}

function isNamedTypeNode(
  type: FieldDefinitionNode | TypeNode,
): type is NamedTypeNode {
  return type.kind === 'NamedType';
}

function extractTypeAST(type: FieldDefinitionNode | TypeNode): NamedTypeNode {
  return isNamedTypeNode(type) ? type : extractTypeAST(type.type);
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

        const relation: Relation = {
          foreign: null,
          from: collections[0],
          local: null,
          // TODO: Typings do not match for NamedType
          // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-unsafe-member-access
          to: type2collection[node.type.type.name.value],
        };

        for (const { name, value } of directive.arguments ?? []) {
          // Typings do not match for VariableNode
          if (name.value === 'as') {
            relation.to = value.value.toString();
          } else if (name.value === 'foreign') {
            relation.foreign = (value as ValueNodeWithValue).value.toString();
          } else if (name.value === 'local') {
            relation.local = (value as ValueNodeWithValue).value.toString();
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

          // Typings do not match for VariableNode
          const argumentValue = (argument.value as ValueNodeWithValue).value.toString();
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

export function astToPipeline(info: GraphQLResolveInfo, options: Options) {
  const scopes: string[] = [];
  const inflateMap: Record<string, ProjectionType | string> = {};
  const projection: ProjectionType = {};

  const rootType = extractType(info.schema.getQueryType()!);
  const extractPathType = (path: string[]) =>
    (path.reduce(
      (node, field) =>
        extractType((node as GraphQLObjectType).getFields()[field].type),
      rootType,
    ) as GraphQLScalarType).name;

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

          position = position[part] as ProjectionType;
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
    $project: inflateMap[info.fieldName] as ProjectionType,
  });
}
