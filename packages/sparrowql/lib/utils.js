const {PREFIX_COMPUTED, PREFIX_JOINED} = require('./const');

function closestPath(relations, starts, ends, query) {
    let bestCost = Infinity;
    let bestPath = [];

    for (const start of starts) {
        const {cost, path} = closestPathBFS(relations, start, ends, query);
        if (bestCost > cost) {
            bestCost = cost;
            bestPath = path;
        }
    }

    return {cost: bestCost, path: bestPath};
}

function closestPathBFS(relations, start, ends, query) {
    const visited = {[start.from]: start};
    const inQuery = Object.keys(query || {}).map(getNameCollection);

    const queue = [start.from];
    while (queue.length) {
        let next = queue.shift();

        if (ends.includes(next)) {
            const path = [];

            while (visited[next] !== start) {
                path.push(visited[next]);
                next = visited[next].to;
            }

            path.push(start);

            return {cost: path.reduce((a, b) => a + (b.weight || 1) / (inQuery.includes(b.to) ? 5 : 1), 0), path};
        }

        for (const relation of relations) {
            if (next === relation.to && visited[relation.from] === undefined) {
                visited[relation.from] = relation;
                queue.push(relation.from);
            }
        }
    }

    return {cost: Infinity, path: []};
}

function getNameCollection(name) {
    if (name === 0 || name === 1) return undefined;
    if (typeof name === 'object') return undefined;

    return name.split('.', 2)[0];
}

function getNameRelative(prefix, name, isPath, isRelation = false) {
    if (name === 0 || name === 1) return name;
    if (typeof name === 'object') return name;
    if (isOperator(name)) return name;
    if (isComputed(name)) {
        name = stripComputed(name)
            .split('.')
            .slice(1)
            .join('.');
    } else if (!isRelation && name.startsWith(prefix)) {
        name = name.replace(prefix, '');
    } else {
        name = `${PREFIX_JOINED}${name}`;
    }

    return isPath ? `$${name}` : name;
}

function isComputed(field) {
    return field.startsWith(PREFIX_COMPUTED);
}

function isOperator(field) {
    return field.startsWith('$');
}

function makeComputed(field) {
    return PREFIX_COMPUTED + field;
}

function stripComputed(field) {
    return field.replace(PREFIX_COMPUTED, '');
}

module.exports = {
    closestPath,
    closestPathBFS,
    getNameCollection,
    getNameRelative,
    isComputed,
    isOperator,
    makeComputed,
    stripComputed
};
