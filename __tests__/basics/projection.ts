import { ObjectID } from 'mongodb';
import { build } from 'sparrowql';
import { v1 as uuid } from 'uuid';

describe('projection', () => {
  testWithNCollections(
    'should work with 0',
    [uuid()] as const,
    async collectionA => {
      const docs: { _id?: ObjectID; x?: string; y?: string }[] = [
        { x: uuid(), y: uuid() },
      ];
      await collectionA.insertMany(docs);

      delete docs[0]._id;

      const pipeline = build({
        projection: { _id: 0 },
        start: collectionA.collectionName,
      });

      await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual(
        docs,
      );
    },
  );

  testWithNCollections(
    'should work with 1',
    [uuid()] as const,
    async collectionA => {
      const docs: { x?: string; y?: string }[] = [{ x: uuid(), y: uuid() }];
      await collectionA.insertMany(docs);

      delete docs[0].y;

      const pipeline = build({
        projection: { x: 1 },
        start: collectionA.collectionName,
      });

      await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual(
        docs,
      );
    },
  );

  testWithNCollections(
    'should work with operator',
    [uuid()] as const,
    async collectionA => {
      const docs: { x?: string[]; y?: string }[] = [{ x: [uuid()], y: uuid() }];
      await collectionA.insertMany(docs);

      delete docs[0].y;

      const pipeline = build({
        projection: { x: { $slice: ['$x', 0, 1] } },
        start: collectionA.collectionName,
      });

      await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual(
        docs,
      );
    },
  );

  testWithNCollections(
    'should work with path',
    [uuid()] as const,
    async collectionA => {
      const docs: { x?: string; y?: string }[] = [{ x: uuid(), y: uuid() }];
      await collectionA.insertMany(docs);

      docs[0].x = docs[0].y;
      delete docs[0].y;

      const pipeline = build({
        projection: { x: `${collectionA.collectionName}.y` },
        start: collectionA.collectionName,
      });

      await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual(
        docs,
      );
    },
  );

  testWithNCollections(
    'should work with nested path',
    [uuid()] as const,
    async collectionA => {
      const docs: { x?: string; y?: { z: string } }[] = [
        { x: uuid(), y: { z: uuid() } },
      ];
      await collectionA.insertMany(docs);

      docs[0].x = docs[0].y?.z;
      delete docs[0].y;

      const pipeline = build({
        projection: { x: `${collectionA.collectionName}.y.z` },
        start: collectionA.collectionName,
      });

      await expect(collectionA.aggregate(pipeline).toArray()).resolves.toEqual(
        docs,
      );
    },
  );
});
