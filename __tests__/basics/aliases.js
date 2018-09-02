const {v1: uuid} = require('uuid');

const {build} = require('sparrowql');

describe('aliases', () => {
    testWithNCollections(2, 'should work', async (collectionA, collectionB) => {
        const docsA = [{_id: 0, x: uuid(), y: uuid()}];
        const docsB = [{_id: 0, x: uuid(), y: uuid()}];

        await collectionA.insertMany(docsA);
        await collectionB.insertMany(docsB);

        const pipeline = build({
            aliases: {A: collectionA.collectionName, B: collectionB.collectionName},
            projection: {
                x: 'B.x',
                y: 'B.y'
            },
            relations: [
                {
                    weight: 1,
                    from: 'A',
                    to: 'B',
                    foreign: '_id',
                    local: '_id'
                }
            ],
            start: 'A'
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
                aliases: {A: collectionA.collectionName, B: collectionB.collectionName},
                projection: {
                    x: 'B.x',
                    y: 'B.y'
                },
                relations: [
                    {
                        weight: 1,
                        from: 'B',
                        to: 'B',
                        foreign: 'aId',
                        local: '_id'
                    }
                ],
                start: 'A'
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
                aliases: {A: collectionA.collectionName, B: collectionB.collectionName},
                projection: {
                    x: 'B.x',
                    y: 'B.y'
                },
                start: 'A'
            })
        ).toThrowError(/no way to connect/);
    });
});
