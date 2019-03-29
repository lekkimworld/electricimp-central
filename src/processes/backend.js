// load environment variables for localhost
require('dotenv').config();
const terminateListener = require("../terminate-listener.js");
const eventing = require("../configure-events.js");

eventing.queues.motion.subscribe((payload, callback) => {
	console.log(payload);
	callback();
})

// setup termination listener
terminateListener(() => {
	console.log("Terminating services");
	eventing.close();
	console.log("Terminated services");
});