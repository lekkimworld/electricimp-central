// load environment variables for localhost
require('dotenv').config();
const terminateListener = require("../terminate-listener.js");
const eventing = require("../configure-events.js");
const oauth = require("../salesforce-oauth.js");
const jsforce = require("jsforce");

eventing.queues.motion.subscribe((payload, callback) => {
	// send event to Salesforce
	oauth().then(data => {
		const conn = new jsforce.Connection({
			"instanceUrl": data.instance_url,
			"accessToken": data.access_token
		});
		conn.sobject(process.env.PLATFORM_EVENT_NAME).create({
			"Speeder_External_ID__c": process.env.SPEEDER_EXTERNAL_ID,
			"Attacking__c": payload.movement
			}).then(sf_result => {		
			// post to topic
			eventing.topics.events.publish("success.snowspeeder", `Sent Platform Event to Salesforce`);

		}).catch(err => {
			// post to topic
			eventing.topics.events.publish("error.snowspeeder", `Could not send Platform Event to Salesforce (${err.message})`);

		}).then(() => {
			// acknowledge processing to queue
			callback();
		})
		
	})
})

// setup termination listener
terminateListener(() => {
	console.log("Terminating services");
	eventing.close();
	console.log("Terminated services");
});