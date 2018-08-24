const {v1: uuid} = require('uuid');

const {build} = require('sparrowql');

describe('limit', () => {
    testWithNCollections(1, 'should work', async collectionA => {
        const docs = [{x: uuid(), y: uuid()}];
        await collectionA.insertMany(docs);

        const pipeline = build({
            limit: 1,
            start: collectionA.collectionName
        });

        await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual(docs);
    });
});
