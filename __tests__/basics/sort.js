const {v1: uuid} = require('uuid');

const {build} = require('sparrowql');

describe('sort', () => {
    testWithNCollections(1, 'should work', async collectionA => {
        const docs = [
            {x: uuid(), y: uuid()},
            {x: uuid(), y: uuid()},
            {x: uuid(), y: uuid()},
            {x: uuid(), y: uuid()},
            {x: uuid(), y: uuid()}
        ];

        await collectionA.insertMany(docs);

        docs.sort((a, b) => (a.x === b.x ? 0 : a.x > b.x ? 1 : -1));

        const pipeline = build({
            sort: {[`${collectionA.collectionName}.x`]: 1},
            start: collectionA.collectionName
        });

        await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual(docs);
    });
});
