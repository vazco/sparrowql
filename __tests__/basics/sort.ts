import { build } from 'sparrowql';
import { v1 as uuid } from 'uuid';

describe('sort', () => {
  testWithNCollections('should work', [uuid()] as const, async collectionA => {
    const docs = [
      { x: uuid(), y: uuid() },
      { x: uuid(), y: uuid() },
      { x: uuid(), y: uuid() },
      { x: uuid(), y: uuid() },
      { x: uuid(), y: uuid() },
    ];

    await collectionA.insertMany(docs);

    docs.sort((a, b) => (a.x === b.x ? 0 : a.x > b.x ? 1 : -1));

    const pipeline = build({
      sort: { [`${collectionA.collectionName}.x`]: 1 },
      start: collectionA.collectionName,
    });

    await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual(
      docs,
    );
  });
});
