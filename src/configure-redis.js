const redis = require("redis");

// create basic client
const client = redis.createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
});
const clientPromise = new Promise((resolve) => {
    client.connect().then(() => {
        console.log("Connected to Redis...");
        resolve(client);
    });
});

module.exports = {
    client: clientPromise,
};
