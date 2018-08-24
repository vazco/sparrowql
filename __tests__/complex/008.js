const {v1: uuid} = require('uuid');

const {build} = require('sparrowql');

testWithNCollections(1, 'complex 008', async collectionA => {
    const docs = [
        {_id: 0, a: uuid(), b: uuid()},
        {_id: 1, a: uuid(), b: uuid()},
        {_id: 2, a: uuid(), b: uuid()},
        {_id: 3, a: uuid(), b: uuid()},
        {_id: 4, a: uuid(), b: uuid()}
    ];

    await collectionA.insertMany(docs);

    docs.splice(1, 4);

    const pipeline = build({
        query: {
            $and: {
                required: [`${collectionA.collectionName}._id`],
                perform: relative => [{[relative(`${collectionA.collectionName}._id`, false)]: 0}]
            }
        },
        start: collectionA.collectionName
    });

    await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual(docs);
});
