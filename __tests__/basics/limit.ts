import { build } from 'sparrowql';
import { v1 as uuid } from 'uuid';

describe('limit', () => {
  testWithNCollections(
    'should properly return only one document',
    [uuid()] as const,
    async collectionA => {
      const docs = [
        { x: uuid(), y: uuid() },
        { x: uuid(), y: uuid() },
      ];
      await collectionA.insertMany(docs);

      const pipeline = build({
        limit: 1,
        start: collectionA.collectionName,
      });

      await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual([
        docs[0],
      ]);
    },
  );
});
