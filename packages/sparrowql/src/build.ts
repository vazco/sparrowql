import {
  closestPath,
  getNameCollection,
  getNameRelative,
  isComputed,
  isOperator,
  stripComputed,
} from './utils';

type MongoQuery = {
  required: string[];
};

type PerformQuery = {
  perform(
    relative: (name: string, shouldPrefix: boolean) => string,
  ): Record<string, any>;
};

type SortType = Record<string, -1 | 1>;
export type ProjectionType = Record<string, string>;
export type QueryType = Record<string, MongoQuery | PerformQuery>;

export type Relation = {
  local: string | null;
  foreign: string | null;
  from: string;
  to: string;
  toAlias?: string;
  weight?: number;
};

type Computed = {
  mapper: boolean;
  required: string[];
  result: string[];
  perform(
    relative: (name: string, shouldPrefix: boolean) => string,
  ): Record<string, any>;
};

export type Options = {
  aliases: Record<string, string>;
  computed: Record<string, Computed>;
  limit?: number;
  projection?: ProjectionType;
  query?: QueryType;
  relations: Relation[];
  skip?: number;
  sort?: SortType;
  start: string;
  typeMap?: Record<string, string>;
};

type GroupStep = { group: unknown };
type LimitStep = { limit: number };
type MatchStep = { match: unknown };
type ProjectionStep = { projection: ProjectionType };
type RelationStep = { relation: Relation };
type SkipStep = { skip: number };
type SortStep = { sort: SortType };

type Step =
  | GroupStep
  | LimitStep
  | MatchStep
  | ProjectionStep
  | RelationStep
  | SkipStep
  | SortStep;

function isMongoQuery(
  key: string,
  query: MongoQuery | PerformQuery,
): query is MongoQuery {
  return isOperator(key);
}

function isPerformQuery(
  key: string,
  query: MongoQuery | PerformQuery,
): query is PerformQuery {
  return isOperator(key);
}

export function build(options: Options) {
  return translate(options.start, prepare(options));
}

// eslint-disable-next-line complexity
export function prepare({
  aliases = {},
  computed,
  limit,
  projection,
  query,
  relations = [],
  skip,
  sort,
  start,
}: Options) {
  const relative = getNameRelative.bind(null, `${start}.`);

  const steps: Step[] = [];

  const joined = [start];
  const mapped = [
    ...(projection ? Object.values(projection) : []),
    ...(query ? Object.keys(query).filter(field => !isOperator(field)) : []),
    ...(sort ? Object.keys(sort) : []),
  ]
    .map(getNameCollection)
    .filter(Boolean);

  const isBaseSort =
    !!sort && Object.keys(sort).every(field => field.startsWith(start));

  if (computed) {
    const expanded: Record<string, any> = {};

    let $ = 0;
    while (++$ < 100) {
      const toExpand = mapped.find(
        field => field && isComputed(field) && !expanded[stripComputed(field)],
      );
      if (toExpand === undefined) {
        break;
      }

      const name = stripComputed(toExpand);
      if (computed[name] === undefined) {
        throw new Error(`Invalid computed field name: "${name}".`);
      }

      mapped.push(...computed[name].required.map(getNameCollection));
      expanded[name] = true;
    }
  }

  const needed = mapped
    .filter((item, index, array) => array.indexOf(item) === index)
    .sort();

  let $ = 0;
  while ($++ < 100) {
    inlineSort();
    inlineMatch();
    inlineGroup();
    inlineSort();
    inlineLimitAndSkip();

    const toJoin = needed.filter(name => !joined.includes(name));
    if (toJoin.length === 0) {
      break;
    }

    const toCheck = relations.filter(relation => toJoin.includes(relation.to));
    if (toCheck.length === 0) {
      throw new Error(
        `Needed connection to ${toJoin
          .map(name => `"${name}"`)
          .join(', ')} but no way to connect.`,
      );
    }

    const { cost, path } = closestPath(relations, toCheck, joined, query);
    if (isFinite(cost)) {
      path.forEach(single => {
        inlineRelation(single);
        inlineMatch();
        inlineGroup();
        inlineSort();
        inlineLimitAndSkip();
      });
      continue;
    }

    throw new Error(
      `Needed connection to ${toJoin
        .map(name => `"${name}"`)
        .join(', ')} but no way to connect.`,
    );
  }

  inlineLimitAndSkip();

  // Optimize sort.
  if (
    isBaseSort &&
    steps.some(step => 'limit' in step) &&
    steps.some(step => 'sort' in step)
  ) {
    const indexMatch = steps.findIndex(step => 'match' in step);

    steps.splice(
      indexMatch + 1,
      0,
      steps[steps.findIndex(step => 'sort' in step)],
    );

    const wrapAtPhase = (index: number, stepName: 'limit' | 'skip') => {
      const pivot = steps.findIndex(step => stepName in step);
      steps.splice(index, 0, steps.splice(pivot, 1)[0]);
    };

    if (steps.some(step => 'skip' in step)) {
      wrapAtPhase(indexMatch + 2, 'skip');
      wrapAtPhase(indexMatch + 3, 'limit');
    } else {
      wrapAtPhase(indexMatch + 2, 'limit');
    }
  }

  if (projection) {
    steps.push({
      projection: Object.keys(projection).reduce(
        (object, field) =>
          Object.assign(object, {
            [field]: relative(projection[field], true),
          }),
        {},
      ),
    });
  }

  return steps;

  function inlineGroup() {
    const toCompute = needed
      .filter(name => isComputed(name) && !joined.includes(name))
      .map(name => [name, computed[stripComputed(name)]] as [string, Computed])
      .filter(definition =>
        definition[1].required.every(field =>
          joined.includes(getNameCollection(field)),
        ),
      );

    if (toCompute.length !== 0) {
      toCompute.forEach(([name, definition]) => {
        const isAbsolute = steps.some(
          step => 'group' in step || 'projection' in step,
        );
        function addMappedFields(
          object: Record<string, any>,
          field: string | number,
        ) {
          if (typeof projection?.[field] === 'string') {
            if (definition.mapper) {
              projection[field]
                .replace(/^\$/, '')
                .split('.')
                .slice(1, -1)
                .forEach((_, index, parts) => {
                  object[parts.slice(0, index + 1).join('.')] = 1;
                });

              object[field] = 1;
            } else {
              object[field] = {
                $first: isAbsolute
                  ? `$${field}`
                  : relative(projection[field], true),
              };
            }
          }
          return object;
        }

        joined.push(name);
        steps.push({
          [definition.mapper ? 'projection' : 'group']: Object.assign(
            {},
            projection
              ? Object.keys(projection).reduce(addMappedFields, {})
              : {},
            projection
              ? Object.values(projection).reduce((object, value) => {
                  if (typeof value !== 'string') {
                    return object;
                  }

                  const collection = getNameCollection(value);
                  if (!needed.includes(collection)) {
                    return object;
                  }

                  const field = relative(collection, false);
                  if (!field) {
                    return object;
                  }

                  return addMappedFields(object, field);
                }, {})
              : {},
            definition.perform(relative),
          ),
          // Typescript inconsistency: https://github.com/Microsoft/TypeScript/issues/13948
        } as Step);

        inlineMatch();
        inlineSort();
        inlineLimitAndSkip();
      });
    }
  }

  function inlineLimitAndSkip() {
    if (
      (!!query && Object.keys(query).length > 0) ||
      needed.some(
        collection =>
          !joined.includes(collection) &&
          isComputed(collection) &&
          !computed[stripComputed(collection)].mapper,
      )
    ) {
      return;
    }

    if (skip && skip > 0) {
      steps.push({ skip });
      skip = undefined;
    }

    if (limit && limit > 0) {
      steps.push({ limit });
      limit = undefined;
    }
  }

  function inlineMatch() {
    if (!query) {
      return;
    }

    const available = Object.keys(query).filter(key => {
      const singleQuery = query[key];
      const keys = isMongoQuery(key, singleQuery)
        ? singleQuery.required
        : [key];
      return keys.every(key => joined.includes(getNameCollection(key)));
    });

    if (available.length) {
      const match: Record<string, unknown> = {};

      available.forEach(field => {
        const singleQuery = query[field];
        match[relative(field, false)] = isPerformQuery(field, singleQuery)
          ? singleQuery.perform(relative)
          : singleQuery;
        delete query[field];
      });

      steps.push({ match });
      inlineSort();
    }
  }

  function inlineRelation(relation: Relation) {
    joined.push(relation.to);

    steps.push({
      relation: Object.assign({}, relation, {
        local: relative([relation.from, relation.local].join('.'), false),
        toAlias: aliases[relation.to] || relation.to,
      }),
    });

    inlineMatch();
    inlineSort();
  }

  function inlineSort() {
    if (
      !sort ||
      needed.some(
        collection =>
          !joined.includes(collection) &&
          isComputed(collection) &&
          !computed[stripComputed(collection)].mapper,
      )
    ) {
      return;
    }

    const entries = Object.entries(sort);
    if (entries.length === 0) {
      sort = undefined;
      return;
    }

    if (entries.every(entry => joined.includes(getNameCollection(entry[0])))) {
      steps.push({
        sort: entries.reduce(
          (object, entry) =>
            Object.assign(object, { [relative(entry[0], false)]: entry[1] }),
          {},
        ),
      });
      sort = undefined;
    }
  }
}

const translateOperators = {
  group: (step: GroupStep) => [{ $group: step.group }],
  limit: (step: LimitStep) => [{ $limit: step.limit }],
  match: (step: MatchStep) => [{ $match: step.match }],
  projection: (step: ProjectionStep) => [{ $project: step.projection }],
  relation: (step: RelationStep, start: string) => [
    {
      $lookup: {
        as: getNameRelative(start, step.relation.to, false),
        foreignField: step.relation.foreign,
        from: step.relation.toAlias,
        localField: step.relation.local,
      },
    },
    {
      $unwind: {
        path: getNameRelative(start, step.relation.to, true),
        preserveNullAndEmptyArrays: true,
      },
    },
  ],
  skip: (step: SkipStep) => [{ $skip: step.skip }],
  sort: (step: SortStep) => [{ $sort: step.sort }],
};

const isStepOperator = (
  mapFunctions: typeof translateOperators,
  operator: string,
): operator is keyof typeof mapFunctions => {
  return operator in mapFunctions;
};

export function translate(start: string, steps: Step[]) {
  const pipeline = [];

  for (const step of steps) {
    const operators = Object.keys(step);
    if (operators.length !== 1) {
      throw new Error(`Invalid step: ${JSON.stringify(step)}`);
    }

    const operator = operators[0];
    if (!isStepOperator(translateOperators, operator)) {
      throw new Error(`Unknown operator: ${operator}`);
    }

    pipeline.push(...translateOperators[operator](step as any, start));
  }

  return pipeline;
}
