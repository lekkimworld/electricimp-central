const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

app.get("/*", (req, res) => {
    console.log("Received GET request: " + req.originalUrl);
    res.type("json");
    res.send({"status": "ok"});
})

app.post("/*", (req, res) => {
    console.log("Received POST request: " + req.originalUrl);
    console.log(`Body: ${JSON.stringify(req.body)}`);
    res.type("json");
    res.send({"status": "ok"});
})

app.listen(process.env.PORT || 8080);