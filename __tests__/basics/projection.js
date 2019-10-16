const {v1: uuid} = require('uuid');

const {build} = require('sparrowql');

describe('projection', () => {
    testWithNCollections(1, 'should work with 0', async collectionA => {
        const docs = [{x: uuid(), y: uuid()}];
        await collectionA.insertMany(docs);

        delete docs[0]._id;

        const pipeline = build({
            projection: {_id: 0},
            start: collectionA.collectionName
        });

        await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual(docs);
    });

    testWithNCollections(1, 'should work with 1', async collectionA => {
        const docs = [{x: uuid(), y: uuid()}];
        await collectionA.insertMany(docs);

        delete docs[0].y;

        const pipeline = build({
            projection: {x: 1},
            start: collectionA.collectionName
        });

        await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual(docs);
    });

    testWithNCollections(1, 'should work with operator', async collectionA => {
        const docs = [{x: [uuid()], y: uuid()}];
        await collectionA.insertMany(docs);

        delete docs[0].y;

        const pipeline = build({
            projection: {x: {$slice: ['$x', 0, 1]}},
            start: collectionA.collectionName
        });

        await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual(docs);
    });

    testWithNCollections(1, 'should work with path', async collectionA => {
        const docs = [{x: uuid(), y: uuid()}];
        await collectionA.insertMany(docs);

        docs[0].x = docs[0].y;
        delete docs[0].y;

        const pipeline = build({
            projection: {x: `${collectionA.collectionName}.y`},
            start: collectionA.collectionName
        });

        await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual(docs);
    });

    testWithNCollections(1, 'should work with nested path', async collectionA => {
        const docs = [{x: uuid(), y: {z: uuid()}}];
        await collectionA.insertMany(docs);

        docs[0].x = docs[0].y.z;
        delete docs[0].y;

        const pipeline = build({
            projection: {x: `${collectionA.collectionName}.y.z`},
            start: collectionA.collectionName
        });

        await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual(docs);
    });
});
