import NodeEnvironment from 'jest-environment-node';

import setup from './setup';
import teardown from './teardown';

export default class MongoEnvironment extends NodeEnvironment {
  async setup() {
    await setup();
    await super.setup();

    this.global.testWithNCollections = (name, collections, fn) => {
      this.global.test(name, async () => {
        const db = global.__MONGO__?.db;
        if (!db) {
          throw new Error('MongoDB is not set up!');
        }

        const instances = collections.map(name => db.collection(name));
        try {
          // @ts-expect-error: We cannot assert the length.
          await fn(...instances);
        } finally {
          await Promise.all(instances.map(collection => collection.drop()));
        }
      });
    };
  }

  async teardown() {
    await teardown();
    await super.teardown();
  }
}
