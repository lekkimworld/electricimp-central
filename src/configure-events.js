const url = process.env.CLOUDAMQP_URL;
if (!url) throw Error('Missing CLOUDAMQP_URL environtment variable');
const connPromise = require('amqplib').connect(url);
const QUEUE_MOTION = "QUEUE.MOTION";
const TOPIC_EVENTS = "TOPIC.EVENTS";

const queuePublish = queueName => (data) => {
    return connPromise.then(conn => {
        return conn.createChannel();
    }).then(ch => {
        return ch.assertQueue(queueName).then(() => {
            ch.sendToQueue(queueName, Buffer.from(typeof data === "object" ? JSON.stringify(data): data));
            return ch.close();
        })
    })
}
const queueSubscribe = queueName => callback => {
    connPromise.then(conn => {
        return conn.createChannel();
    }).then(ch => {
        return ch.assertQueue(queueName).then(q => {
            console.log(`queueSubscribe - binding channel to queue <${q.queue}>`)
            ch.consume(queueName, msg => {
                if (msg === null) return;
                let payload = msg.content;
                try {
                    payload = JSON.parse(payload);
                } catch (err) {}
                setImmediate(() => {
                    try {
                        callback(payload, () => {
                            ch.ack(msg);
                        });
                    } catch (err) {
                        console.log(`queueSubscribe - ERROR caught when calling back with message for queue <${queueName}>: ${err.message}`)
                    }
                })
            })
        })
    })
}
const topicPublish = exchangeName => (key, data) => {
    return connPromise.then(conn => {
        return conn.createChannel();
    }).then(ch => {
        return ch.assertExchange(exchangeName, "topic", {"durable": false}).then(() => {
            ch.publish(exchangeName, key, Buffer.from(typeof data === "object" ? JSON.stringify(data): data));
            return ch.close();
        })
    })
}
const topicSubscribe = exchangeName => (routingKey, callback) => {
    connPromise.then(conn => {
        return conn.createChannel();
    }).then(ch => {
        return ch.assertExchange(exchangeName, "topic", {"durable": false}).then(() => {
            return ch.assertQueue("", {"exclusive": true})
        }).then(q => {
            console.log(`topicSubscribe - binding channel to queue <${q.queue}>, exchange <${exchangeName}>, key <${routingKey}>`)
            ch.bindQueue(q.queue, exchangeName, routingKey);
            ch.consume(q.queue, msg => {
                if (msg === null) return;
                try {
                    callback(msg.fields.routingKey, msg.content, msg);
                } catch (err) {
                    console.log(`topicSubscribe - ERROR caught when calling back with message for exchange <${exchangeName}> and routing key <${routingKey}>: ${err.message}`)
                }
            }, {"noAck": true});
        })
    })
}

module.exports = {
    "connectionPromise": connPromise,
    "queues": {
        "motion": {
            "publish": queuePublish(QUEUE_MOTION),
            "subscribe": queueSubscribe(QUEUE_MOTION)
        }
    },
    "topics": {
        "events": {
            "publish": topicPublish(TOPIC_EVENTS),
            "subscribe": topicSubscribe(TOPIC_EVENTS)
        }
    },
    "close": () => {
        connPromise.then(conn => {
            conn.close();
        })
    }
}
