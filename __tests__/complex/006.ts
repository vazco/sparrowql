import { build } from 'sparrowql';
import { v1 as uuid } from 'uuid';

testWithNCollections('complex 006', [uuid()] as const, async collectionA => {
  const docs = [
    { _id: 0, a: uuid(), b: uuid() },
    { _id: 1, a: uuid(), b: uuid() },
    { _id: 2, a: uuid(), b: uuid() },
    { _id: 3, a: uuid(), b: uuid() },
    { _id: 4, a: uuid(), b: uuid() },
  ];

  await collectionA.insertMany(docs);

  docs.splice(0, 1);
  docs.splice(2, 2);

  const pipeline = build({
    limit: 2,
    query: { [`${collectionA.collectionName}._id`]: { $gt: 0 } },
    sort: { [`${collectionA.collectionName}._id`]: 1 },
    start: collectionA.collectionName,
  });

  await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual(
    docs,
  );
});
