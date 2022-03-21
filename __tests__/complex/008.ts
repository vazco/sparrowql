import { build } from 'sparrowql';
import { v1 as uuid } from 'uuid';

testWithNCollections('complex 008', [uuid()] as const, async collectionA => {
  const docs = [
    { _id: 0, a: uuid(), b: uuid() },
    { _id: 1, a: uuid(), b: uuid() },
    { _id: 2, a: uuid(), b: uuid() },
    { _id: 3, a: uuid(), b: uuid() },
    { _id: 4, a: uuid(), b: uuid() },
  ];

  await collectionA.insertMany(docs);

  docs.splice(1, 4);

  const pipeline = build({
    query: {
      $and: {
        required: [`${collectionA.collectionName}._id`],
        // @ts-expect-error Fix `QueryType`.
        perform: relative => [
          { [relative(`${collectionA.collectionName}._id`, false)]: 0 },
        ],
      },
    },
    start: collectionA.collectionName,
  });

  await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual(
    docs,
  );
});
