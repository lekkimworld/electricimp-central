// load environment variables for localhost
require("dotenv").config();

const terminateListener = require("../terminate-listener.js");
const path = require("path");
const express = require("express");
const { engine } = require("express-handlebars");
const redisClient = require("../configure-redis.js").client;

// create expres app, add static content and configure sessions
const app = express();
redisClient.then((client) => {
    // static content
    app.use(express.static(path.join(__dirname, "..", "..", "public")));

    // configure session when redis client is ready
    app.use(require("../configure-session.js")(client));

    // configure authentication
    require("../configure-authentication.js").initialize(app);

    // configure handlebars for templating
    app.engine(
        "handlebars",
        engine({
            defaultLayout: "admin",
            helpers: {
                json: function (context) {
                    return JSON.stringify(context);
                },
            },
        })
    );
    app.set("view engine", "handlebars");

    // send to tls is production
    if (process.env.NODE_ENV === "production") {
        app.use((req, res, next) => {
            if (req.header("x-forwarded-proto") !== "https") res.redirect(`https://${req.header("host")}${req.url}`);
            else next();
        });
    }

    // configure routes
    require("../configure-routes.js")(app);

    // add error handler
    app.use((err, req, res, next) => {
        return res.render("error", { error: err.message });
    });

    // listen
    const port = process.env.PORT || 8080;
    const httpServer = require("http").createServer(app);
    require("../websocket.js").createInstance(httpServer);
    httpServer.listen(port);
    console.log(`Listening on port ${port}`);
});

// setup termination listener
terminateListener(() => {
    console.log("Terminating services");
    redisClient.then((client) => client.quit());
    console.log("Terminated services");
});
