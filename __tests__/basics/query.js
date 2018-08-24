const {v1: uuid} = require('uuid');

const {build} = require('sparrowql');

describe('query', () => {
    testWithNCollections(1, 'should work', async collectionA => {
        const docs = [{x: uuid(), y: uuid()}, {x: uuid(), y: uuid()}];
        await collectionA.insertMany(docs);

        docs.splice(1, 1);

        const pipeline = build({
            query: {[`${collectionA.collectionName}.x`]: docs[0].x},
            start: collectionA.collectionName
        });

        await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual(docs);
    });

    testWithNCollections(1, 'should work with operator', async collectionA => {
        const docs = [{x: uuid(), y: uuid()}, {x: uuid(), y: uuid()}];
        await collectionA.insertMany(docs);

        docs.splice(1, 1);

        const pipeline = build({
            query: {[`${collectionA.collectionName}.x`]: {$eq: docs[0].x}},
            start: collectionA.collectionName
        });

        await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual(docs);
    });
});
