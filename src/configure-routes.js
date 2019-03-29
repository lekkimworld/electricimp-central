module.exports = (app) => {
    app.use("/api", require("./routes/api.js"));
    app.use("/", require("./routes/root.js"));
}
