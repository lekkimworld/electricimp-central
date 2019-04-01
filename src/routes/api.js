const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const websocket = require("../websocket.js");
const auth = require("../configure-authentication.js");
const eventing = require("../configure-events.js");

// constants
const VALID_TYPES = ["motion"];
const VALID_ACTIONS = ["attacking-snowspeeder", "broken-snowspeeder"];

// use JSON for POST bodies
router.use(bodyParser.json());

router.post("/simulate", (req, res) => {
    // get action
    const action = req.body.action;
    if (!action) return res.status(417).send({"status": "error", "error": "Missing action"});

    if (!VALID_ACTIONS.includes(action)) return res.status(417).send({"status": "error", "error": `Invalid / unknown action (${action})`});
    let obj;
    if (action === "broken-snowspeeder") {
        obj = {
            "type": "motion",
            "movement": false,
            "simulate": true,
            "x": 0,
            "y": 0,
            "z": "0"
        }
    } else if (action === "attacking-snowspeeder") {
        obj = {
            "type": "motion",
            "movement": true,
            "simulate": true,
            "x": 0,
            "y": 0,
            "z": "0"
        }
    }

    // send to event topic
    eventing.topics.events.publish(`simulate.${obj.type}`, obj);

    // send to queue
    if (obj.type === "motion") {
        eventing.queues.motion.publish(obj);
    }
})

router.post("/data", (req, res) => {
    // set content type
    res.type("json");

    // get bearer token
    if (!req.headers.authorization || req.headers.authorization !== `Bearer ${process.env.BEARER_TOKEN}`) return res.status(401).send({"status": "error"});

    // verify json
    if (req.headers["content-type"] !== "application/json") return res.status(417).send({"status": "error", "error": "Content-Type must be application/json"});

    // get body and validate type
    const obj = req.body;
    if (!obj.type || !VALID_TYPES.includes(obj.type)) return res.status(417).send({"status": "error", "error": `Missing type or invalid type (${VALID_TYPES.join()})`});
    eventing.topics.events.publish(`data.${obj.type}`, obj);

    // send to appropriate queue
    if (obj.type === "motion") {
        eventing.queues.motion.publish(obj);
    }

    // return
    res.status(204).send({"status": "success", "data": data});
})

router.get("/events", auth.isLoggedIn, (req, res) => {
    // get websockt and initialize stream
    const wsController = websocket.getInstance();
    const stream = wsController.initializeStream();

    // listen to topic and stream data to websocket
    eventing.topics.events.subscribe("#", (routingKey, content) => {
        stream.write({"msg": `${routingKey.toUpperCase()}: ${content}`})
    });

    // return to caller
    res.type("json");
    return res.send({"status": "success"});
})

module.exports = router;
