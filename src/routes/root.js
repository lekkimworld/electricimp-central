const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const passport = require("passport");
const auth = require("../configure-authentication.js");

// use JSON for POST bodies
router.use(bodyParser.json());

router.get("/logout", (req, res) => {
    console.log(`Logging out user: ${req.session.user.username}`)
    req.logout();
    req.session.destroy();
    res.redirect("/");
})

router.get("/login", passport.authenticate('oauth2', {failureRedirect: "/login"}), (req, res) => {
    console.log("Logging in...");
})

router.get('/oauth/callback', passport.authenticate('oauth2', {failureRedirect: "/login"}), (req, res) => {
    // save in session
    req.session.user = req.user;

    // successful authentication, redirect home.
    res.redirect("/admin/events");
});


router.get("/", auth.isLoggedIn, (req, res) => {
    return res.render("events", {"user": req.session.user});
})

module.exports = router;