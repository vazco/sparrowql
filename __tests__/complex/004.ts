import { build } from 'sparrowql';
import { v1 as uuid } from 'uuid';

testWithNCollections(
  'complex 004',
  [uuid(), uuid()] as const,
  async (collectionA, collectionB) => {
    const docsA = [
      { _id: 0, a: uuid(), b: uuid() },
      { _id: 1, a: uuid(), b: uuid() },
      { _id: 2, a: uuid(), b: uuid() },
      { _id: 3, a: uuid(), b: uuid() },
      { _id: 4, a: uuid(), b: uuid() },
    ];

    const docsB = [
      { _id: 0, c: uuid(), d: uuid() },
      { _id: 1, c: uuid(), d: uuid() },
      { _id: 2, c: uuid(), d: uuid() },
      { _id: 3, c: uuid(), d: uuid() },
      { _id: 4, c: uuid(), d: uuid() },
    ];

    await collectionA.insertMany(docsA);
    await collectionB.insertMany(docsB);

    const docs = docsA
      .map(doc => ({ _id: doc._id, d: docsB[doc._id].d }))
      .sort((a, b) => (a._id === b._id ? 0 : a._id > b._id ? 1 : -1))
      .slice(0, 3);

    const pipeline = build({
      query: { [`${collectionB.collectionName}._id`]: { $lt: 3 } },
      projection: { d: `${collectionB.collectionName}.d` },
      sort: { [`${collectionB.collectionName}.d`]: 1 },
      relations: [
        {
          weight: 1,
          from: collectionA.collectionName,
          to: collectionB.collectionName,
          foreign: '_id',
          local: '_id',
        },
      ],
      start: collectionA.collectionName,
    });

    await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual(
      docs,
    );
  },
);
