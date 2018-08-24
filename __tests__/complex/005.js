const {v1: uuid} = require('uuid');

const {build} = require('sparrowql');

testWithNCollections(3, 'complex 005', async (collectionA, collectionB, collectionC) => {
    const docsA = [
        {_id: 0, a: uuid(), b: uuid()},
        {_id: 1, a: uuid(), b: uuid()},
        {_id: 2, a: uuid(), b: uuid()},
        {_id: 3, a: uuid(), b: uuid()},
        {_id: 4, a: uuid(), b: uuid()}
    ];

    const docsB = [
        {_id: 0, c: uuid(), d: uuid()},
        {_id: 1, c: uuid(), d: uuid()},
        {_id: 2, c: uuid(), d: uuid()},
        {_id: 3, c: uuid(), d: uuid()},
        {_id: 4, c: uuid(), d: uuid()}
    ];

    const docsC = [
        {_id: 0, e: uuid(), f: uuid()},
        {_id: 1, e: uuid(), f: uuid()},
        {_id: 2, e: uuid(), f: uuid()},
        {_id: 3, e: uuid(), f: uuid()},
        {_id: 4, e: uuid(), f: uuid()}
    ];

    await collectionA.insertMany(docsA);
    await collectionB.insertMany(docsB);
    await collectionC.insertMany(docsC);

    const docs = docsA
        .map(doc => ({_id: doc._id, f: docsC[doc._id].f}))
        .sort((a, b) => (a._id === b._id ? 0 : a._id > b._id ? 1 : -1))
        .slice(0, 3);

    const pipeline = build({
        query: {[`${collectionC.collectionName}._id`]: {$lt: 3}},
        projection: {f: `${collectionC.collectionName}.f`},
        sort: {[`${collectionC.collectionName}.f`]: 1},
        relations: [
            {
                weight: 1,
                from: collectionA.collectionName,
                to: collectionB.collectionName,
                foreign: '_id',
                local: '_id'
            },
            {
                weight: 1,
                from: collectionB.collectionName,
                to: collectionC.collectionName,
                foreign: '_id',
                local: '_id'
            }
        ],
        start: collectionA.collectionName
    });

    await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual(docs);
});
