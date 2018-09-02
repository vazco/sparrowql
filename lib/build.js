const {closestPath, getNameCollection, getNameRelative, isComputed, isOperator, stripComputed} = require('./utils');

function build(options) {
    return translate(options.start, prepare(options));
}

// eslint-disable-next-line complexity
function prepare({aliases = {}, computed, limit, projection, query, relations = [], skip, sort, start}) {
    const relative = getNameRelative.bind(null, `${start}.`);

    const steps = [];

    const joined = [start];
    const mapped = [
        ...(projection ? Object.values(projection) : []),
        ...(query ? Object.keys(query).filter(field => !isOperator(field)) : []),
        ...(sort ? Object.keys(sort) : [])
    ]
        .map(getNameCollection)
        .filter(Boolean);

    const isBaseSort = !!sort && Object.keys(sort).every(field => field.startsWith(start));

    if (computed) {
        const expanded = {};

        let $ = 0;
        while (++$ < 100) {
            const toExpand = mapped.findIndex(field => isComputed(field) && !expanded[stripComputed(field)]);
            if (toExpand === -1) break;

            const name = stripComputed(mapped[toExpand]);
            if (computed[name] === undefined) throw new Error(`Invalid computed field name: "${name}".`);

            mapped.push(...computed[name].required.map(getNameCollection));
            expanded[name] = true;
        }
    }

    const needed = mapped.filter((item, index, array) => array.indexOf(item) === index).sort();

    let $ = 0;
    while ($++ < 100) {
        inlineSort();
        inlineMatch();
        inlineGroup();
        inlineSort();
        inlineLimitAndSkip();

        const toJoin = needed.filter(name => !joined.includes(name));
        if (toJoin.length === 0) break;

        const toCheck = relations.filter(relation => toJoin.includes(relation.to));
        if (toCheck.length === 0)
            throw new Error(
                `Needed connection to ${toJoin.map(name => `"${name}"`).join(', ')} but no way to connect.`
            );

        const {cost, path} = closestPath(relations, toCheck, joined, query);
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

        throw new Error(`Needed connection to ${toJoin.map(name => `"${name}"`).join(', ')} but no way to connect.`);
    }

    inlineLimitAndSkip();

    // Optimize sort.
    if (isBaseSort && steps.some(step => 'limit' in step) && steps.some(step => 'sort' in step)) {
        const indexMatch = steps.findIndex(step => 'match' in step);

        steps.splice(indexMatch + 1, 0, steps[steps.findIndex(step => 'sort' in step)]);

        if (steps.some(step => 'skip' in step)) {
            steps.splice(indexMatch + 2, 0, steps.splice(steps.findIndex(step => 'skip' in step), 1)[0]);
            steps.splice(indexMatch + 3, 0, steps.splice(steps.findIndex(step => 'limit' in step), 1)[0]);
        } else {
            steps.splice(indexMatch + 2, 0, steps.splice(steps.findIndex(step => 'limit' in step), 1)[0]);
        }
    }

    if (projection) {
        steps.push({
            projection: Object.keys(projection).reduce(
                (object, field) => Object.assign(object, {[field]: relative(projection[field], true)}),
                {}
            )
        });
    }

    return steps;

    function inlineGroup() {
        const toCompute = needed
            .filter(name => isComputed(name) && !joined.includes(name))
            .map(name => [name, computed[stripComputed(name)]])
            .filter(definition => definition[1].required.every(field => joined.includes(getNameCollection(field))));

        if (toCompute.length !== 0) {
            toCompute.forEach(([name, definition]) => {
                const isAbsolute = steps.some(step => 'group' in step || 'projection' in step);

                joined.push(name);
                steps.push({
                    [definition.mapper ? 'projection' : 'group']: Object.assign(
                        {},
                        projection
                            ? Object.keys(projection).reduce((object, field) => {
                                  object[field] = definition.mapper
                                      ? 1
                                      : {$first: isAbsolute ? `$${field}` : relative(projection[field], true)};
                                  return object;
                              }, {})
                            : {},
                        projection
                            ? Object.values(projection).reduce((object, value) => {
                                  if (typeof value !== 'string') return object;

                                  const collection = getNameCollection(value);
                                  if (!needed.includes(collection)) return object;

                                  const field = relative(collection, false);
                                  if (!field) return object;

                                  object[field] = definition.mapper
                                      ? 1
                                      : {$first: isAbsolute ? `$${field}` : relative(projection[field], true)};
                                  return object;
                              }, {})
                            : {},
                        definition.perform(relative)
                    )
                });

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
                    !computed[stripComputed(collection)].mapper
            )
        )
            return;

        if (skip > 0) {
            steps.push({skip});
            skip = undefined;
        }

        if (limit > 0) {
            steps.push({limit});
            limit = undefined;
        }
    }

    function inlineMatch() {
        if (!query) return;

        const available = Object.keys(query).filter(
            key =>
                isOperator(key)
                    ? query[key].required.every(key => joined.includes(getNameCollection(key)))
                    : joined.includes(getNameCollection(key))
        );

        if (available.length) {
            const match = {};

            available.forEach(field => {
                match[relative(field, false)] = isOperator(field) ? query[field].perform(relative) : query[field];
                delete query[field];
            });

            steps.push({match});
            inlineSort();
        }
    }

    function inlineRelation(relation) {
        joined.push(relation.to);

        steps.push({
            relation: Object.assign({}, relation, {
                local: relative([relation.from, relation.local].join('.'), false),
                toAlias: aliases[relation.to] || relation.to
            })
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
                    !computed[stripComputed(collection)].mapper
            )
        )
            return;

        const entries = Object.entries(sort);
        if (entries.length === 0) {
            sort = undefined;
            return;
        }

        if (entries.every(entry => joined.includes(getNameCollection(entry[0])))) {
            steps.push({
                sort: entries.reduce(
                    (object, entry) => Object.assign(object, {[relative(entry[0], false)]: entry[1]}),
                    {}
                )
            });
            sort = undefined;
        }
    }
}

const translateOperators = {
    group: (start, step) => [{$group: step.group}],
    limit: (start, step) => [{$limit: step.limit}],
    match: (start, step) => [{$match: step.match}],
    projection: (start, step) => [{$project: step.projection}],
    relation: (start, step) => [
        {
            $lookup: {
                as: getNameRelative(start, step.relation.to, false),
                foreignField: step.relation.foreign,
                from: step.relation.toAlias,
                localField: step.relation.local
            }
        },
        {
            $unwind: {
                path: getNameRelative(start, step.relation.to, true),
                preserveNullAndEmptyArrays: true
            }
        }
    ],
    skip: (start, step) => [{$skip: step.skip}],
    sort: (start, step) => [{$sort: step.sort}]
};

function translate(start, steps) {
    const pipeline = [];

    for (const step of steps) {
        const operators = Object.keys(step);
        if (operators.length !== 1) {
            throw new Error(`Invalid step: ${JSON.stringify(step)}`);
        }

        const operator = operators[0];
        if (!(operator in translateOperators)) {
            throw new Error(`Unknown operator: ${operator}`);
        }

        pipeline.push(...translateOperators[operator](start, step));
    }

    return pipeline;
}

module.exports = {
    build,
    prepare,
    translate
};
