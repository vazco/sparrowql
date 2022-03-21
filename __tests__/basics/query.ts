import { build } from 'sparrowql';
import { v1 as uuid } from 'uuid';

describe('query', () => {
  testWithNCollections('should work', [uuid()] as const, async collectionA => {
    const docs = [
      { x: uuid(), y: uuid() },
      { x: uuid(), y: uuid() },
    ];
    await collectionA.insertMany(docs);

    docs.splice(1, 1);

    const pipeline = build({
      query: { [`${collectionA.collectionName}.x`]: docs[0].x },
      start: collectionA.collectionName,
    });

    await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual(
      docs,
    );
  });

  testWithNCollections(
    'should work with operator',
    [uuid()] as const,
    async collectionA => {
      const docs = [
        { x: uuid(), y: uuid() },
        { x: uuid(), y: uuid() },
      ];
      await collectionA.insertMany(docs);

      docs.splice(1, 1);

      const pipeline = build({
        query: { [`${collectionA.collectionName}.x`]: { $eq: docs[0].x } },
        start: collectionA.collectionName,
      });

      await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual(
        docs,
      );
    },
  );
});
