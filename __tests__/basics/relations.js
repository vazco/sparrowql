const {v1: uuid} = require('uuid');

const {build} = require('sparrowql');

describe('limit', () => {
    testWithNCollections(2, 'should work', async (collectionA, collectionB) => {
        const docsA = [{_id: 0, x: uuid(), y: uuid()}];
        const docsB = [{_id: 0, x: uuid(), y: uuid()}];

        await collectionA.insertMany(docsA);
        await collectionB.insertMany(docsB);

        const pipeline = build({
            projection: {
                x: `${collectionB.collectionName}.x`,
                y: `${collectionB.collectionName}.y`
            },
            relations: [
                {
                    weight: 1,
                    from: collectionA.collectionName,
                    to: collectionB.collectionName,
                    foreign: '_id',
                    local: '_id'
                }
            ],
            start: collectionA.collectionName
        });

        await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual(docsB);
    });

    testWithNCollections(2, 'should fail without path', async (collectionA, collectionB) => {
        const docsA = [{_id: 0, x: uuid(), y: uuid()}];
        const docsB = [{_id: 0, x: uuid(), y: uuid()}];

        await collectionA.insertMany(docsA);
        await collectionB.insertMany(docsB);

        expect(() =>
            build({
                projection: {
                    x: `${collectionB.collectionName}.x`,
                    y: `${collectionB.collectionName}.y`
                },
                relations: [
                    {
                        weight: 1,
                        from: collectionB.collectionName,
                        to: collectionB.collectionName,
                        foreign: 'aId',
                        local: '_id'
                    }
                ],
                start: collectionA.collectionName
            })
        ).toThrowError(/no way to connect/);
    });

    testWithNCollections(2, 'should fail without target', async (collectionA, collectionB) => {
        const docsA = [{_id: 0, x: uuid(), y: uuid()}];
        const docsB = [{_id: 0, x: uuid(), y: uuid()}];

        await collectionA.insertMany(docsA);
        await collectionB.insertMany(docsB);

        expect(() =>
            build({
                projection: {
                    x: `${collectionB.collectionName}.x`,
                    y: `${collectionB.collectionName}.y`
                },
                start: collectionA.collectionName
            })
        ).toThrowError(/no way to connect/);
    });
});
