import { MongoClient } from 'mongodb';
import { v1 as uuid } from 'uuid';

module.exports = async function setup() {
    if (global.__MONGO__ !== undefined) return;

    global.__MONGO__ = {};
    global.__MONGO__.server = process.env.MONGO_URL || `mongodb://localhost:27017/${uuid()}`;
    global.__MONGO__.client = await waitAndConnect(global.__MONGO__.server);
    global.__MONGO__.db = await global.__MONGO__.client.db();
};

async function waitAndConnect(server) {
    while (true) {
        try {
            return await MongoClient.connect(
                server,
                {autoReconnect: false, poolSize: 1, useNewUrlParser: true}
            );
        } catch (error) {
            await new Promise(resolve => setTimeout(resolve, 250));
        }
    }
}
