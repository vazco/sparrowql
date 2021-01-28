import { QueryType, Relation } from './build';
import { PREFIX_COMPUTED, PREFIX_JOINED } from './const';

export function closestPath(
  relations: Relation[],
  starts: Relation[],
  ends: string[],
  query?: QueryType,
) {
  let bestCost = Infinity;
  let bestPath: Relation[] = [];

  for (const start of starts) {
    const { cost, path } = closestPathBFS(relations, start, ends, query);
    if (bestCost > cost) {
      bestCost = cost;
      bestPath = path;
    }
  }

  return { cost: bestCost, path: bestPath };
}

export function closestPathBFS(
  relations: Relation[],
  start: Relation,
  ends: string[],
  query?: QueryType,
): { cost: number; path: Relation[] } {
  const visited = { [start.from]: start };
  const inQuery: string[] = Object.keys(query || {})
    .map(getNameCollection)
    .filter(Boolean);

  const queue = [start.from];
  while (queue.length) {
    let next = queue.shift();

    if (next && ends.includes(next)) {
      const path = [];

      while (visited[next] !== start) {
        path.push(visited[next]);
        next = visited[next].to;
      }

      path.push(start);

      return {
        cost: path.reduce(
          (a, b) => a + (b.weight || 1) / (inQuery.includes(b.to) ? 5 : 1),
          0,
        ),
        path,
      };
    }

    for (const relation of relations) {
      if (next === relation.to && visited[relation.from] === undefined) {
        visited[relation.from] = relation;
        queue.push(relation.from);
      }
    }
  }

  return { cost: Infinity, path: [] };
}

export function getNameCollection(name: number): undefined;
export function getNameCollection(name: Record<string, unknown>): undefined;
export function getNameCollection(name: string): string;
export function getNameCollection(
  name: number | Record<string, unknown> | string,
): string | undefined {
  if (name === 0 || name === 1) {
    return undefined;
  }
  if (typeof name === 'object') {
    return undefined;
  }

  if (typeof name === 'string') {
    return name.split('.', 2)[0];
  }

  return undefined;
}

export function getNameRelative(
  prefix: string,
  name: Record<string, unknown>,
  isPath: boolean,
): Record<string, unknown>;
export function getNameRelative(
  prefix: string,
  name: string | number,
  isPath: boolean,
): string;
export function getNameRelative(
  prefix: string,
  name: string | number | Record<string, unknown>,
  isPath: boolean,
): string | Record<string, unknown> | number {
  if (name === 0 || name === 1) {
    return name;
  }
  if (typeof name === 'object') {
    return name;
  }
  if (typeof name === 'string') {
    if (isOperator(name)) {
      return name;
    }
    if (isComputed(name)) {
      name = stripComputed(name).split('.').slice(1).join('.');
    } else if (name.startsWith(prefix.replace(/\.?$/, '.'))) {
      name = name.replace(prefix, '');
    } else {
      name = `${PREFIX_JOINED}${name}`;
    }
  }

  return isPath ? `$${name}` : name;
}

export function isComputed(field: string) {
  return field.startsWith(PREFIX_COMPUTED);
}

export function isOperator(field: string) {
  return field.startsWith('$');
}

export function makeComputed(field: string) {
  return PREFIX_COMPUTED + field;
}

export function stripComputed(field: string) {
  return field.replace(PREFIX_COMPUTED, '');
}
