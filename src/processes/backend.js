// load environment variables for localhost
require("dotenv").config();
const terminateListener = require("../terminate-listener.js");
const eventing = require("../configure-events.js");
const oauth = require("../salesforce-oauth.js");
const jsforce = require("jsforce");

eventing.queues.motion.subscribe((payload, callback) => {
    // send event to Salesforce
    oauth().then((data) => {
        const conn = new jsforce.Connection({
            instanceUrl: data.instance_url,
            accessToken: data.access_token,
            version: process.env.SF_API_VERSION || "57.0",
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
                console.log("Send Platform Event to Salesforce", event_payload);
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
                console.log(err);
                eventing.topics.events.publish(
                    "error.event.motion",
                    `Could not send Platform Event to Salesforce (${err.message})`
                );
            })
            .then(() => {
                // acknowledge processing to queue
                callback();
            });
    });
});

// setup termination listener
terminateListener(() => {
    console.log("Terminating services");
    eventing.close();
    console.log("Terminated services");
});
