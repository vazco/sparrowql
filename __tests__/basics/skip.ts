import { build } from 'sparrowql';
import { v1 as uuid } from 'uuid';

describe('skip', () => {
  testWithNCollections('should work', [uuid()] as const, async collectionA => {
    const docs = [{ x: uuid(), y: uuid() }];
    await collectionA.insertMany(docs);

    const pipeline = build({
      skip: 1,
      start: collectionA.collectionName,
    });

    await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual(
      [],
    );
  });
});
