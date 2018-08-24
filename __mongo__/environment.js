const NodeEnvironment = require('jest-environment-node');
const {v1: uuid} = require('uuid');

const setup = require('./setup');
const teardown = require('./teardown');

class MongoEnvironment extends NodeEnvironment {
    async setup() {
        await setup();
        await super.setup();

        this.global.testWithNCollections = (n, name, fn) => {
            this.global.test(name, async () => {
                const collections = Array.from({length: n}, () => global.__MONGO__.db.collection(uuid()));
                try {
                    await fn(...collections);
                } finally {
                    await Promise.all(collections.map(collection => collection.drop()));
                }
            });
        };
    }

    async teardown() {
        await teardown();
        await super.teardown();
    }
}

module.exports = MongoEnvironment;
