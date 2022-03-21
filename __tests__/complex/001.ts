import { build } from 'sparrowql';
import { v1 as uuid } from 'uuid';

testWithNCollections(
  'complex 001',
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
      { _id: 0, x: uuid(), y: uuid() },
      { _id: 1, x: uuid(), y: uuid() },
      { _id: 2, x: uuid(), y: uuid() },
      { _id: 3, x: uuid(), y: uuid() },
      { _id: 4, x: uuid(), y: uuid() },
    ];

    await collectionA.insertMany(docsA);
    await collectionB.insertMany(docsB);

    const docs = docsA.map(doc => ({ _id: doc._id, x: docsB[doc._id].x }));

    const pipeline = build({
      projection: { x: `${collectionB.collectionName}.x` },
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
