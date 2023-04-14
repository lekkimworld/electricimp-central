// load environment variables for localhost
require("dotenv").config();
const terminateListener = require("../terminate-listener.js");
const eventing = require("../configure-events.js");
const oauth = require("../salesforce-oauth.js");
const jsforce = require("jsforce");

let accessData;

const sendPlatformEvent = (wrapper, callback) => {
    const payload = wrapper.payload;
    const retryCount = wrapper.retryCount;
    console.log(`Preparing to send platform event - retryCount <${retryCount}>`, wrapper);

    new Promise((resolve, reject) => {
        if (accessData) return resolve(accessData);
        oauth().then((data) => {
            accessData = data;
            resolve(accessData);
        });
    }).then((data) => {
        const conn = new jsforce.Connection({
            instanceUrl: data.instance_url,
            accessToken: data.access_token
        });
        const event_payload = {
            Running__c: payload.movement,
            Asset_ID__c: process.env.ASSET_ID,
            Timestamp__c: new Date().toISOString(),
        };
        console.log("Prepared event payload", event_payload);
        conn.sobject(process.env.PLATFORM_EVENT_NAME || "Electric_Imp_Event__e")
            .create(event_payload)
            .then((sf_result) => {
                // post to topic
                console.log("Sent Platform Event to Salesforce", event_payload);
                eventing.topics.events.publish("success.event.motion", `Sent Platform Event to Salesforce`);
                if (
                    process.env.SF_CHATTER_MENTION_USERID &&
                    process.env.SF_CHATTER_MENTION_BODYTEXT &&
                    payload.hasOwnProperty("movement") &&
                    payload.movement === false
                ) {
                    conn.chatter.resource("/feed-elements").create(
                        {
                            body: {
                                messageSegments: [
                                    {
                                        type: "mention",
                                        id: process.env.SF_CHATTER_MENTION_USERID,
                                    },
                                    {
                                        type: "Text",
                                        text: process.env.SF_CHATTER_MENTION_BODYTEXT,
                                    },
                                ],
                            },
                            feedElementType: "FeedItem",
                            subjectId: "me",
                        },
                        function (err, result) {
                            if (err) {
                                return console.error(err);
                            }
                            console.log("Id: " + result.id);
                            console.log("URL: " + result.url);
                            console.log("Body: " + result.body.messageSegments[0].text);
                            console.log("Comments URL: " + result.capabilities.comments.page.currentPageUrl);
                        }
                    );
                }
            })
            .catch((err) => {
                // post to topic
                const msg = `Could not send Platform Event to Salesforce (${err.message}) retryCount <${wrapper.retryCount}>`;
                console.log(msg, err);

                // increment retry count
                wrapper.retryCount = retryCount + 1;

                // send feedback to topic
                eventing.topics.events.publish(
                    "error.event.motion",
                    msg
                );
                wrapper.error = err;
                accessData = undefined;
            })
            .then(() => {
                // retry if okay
                if (wrapper.error && wrapper.retryCount < 5) {
                    delete wrapper.error;
                    return sendPlatformEvent(wrapper, callback);
                } else {
                    // acknowledge processing to queue
                    callback();
                }
            });
    });
}

eventing.queues.motion.subscribe((payload, callback) => {
    console.log("Received queue message with payload", payload);
    sendPlatformEvent({retryCount: 0, payload}, callback);
});

// setup termination listener
terminateListener(() => {
    console.log("Terminating services");
    eventing.close();
    console.log("Terminated services");
});
