//jshint esversion:6
require('dotenv').config()
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');



const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));


//initialize session
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

//initialize passport
app.use(passport.initialize());

//use passport to set up our session
app.use(passport.session());


//connect to MongoDB

mongoose.connect("mongodb://localhost:27017/userDB", {
    useNewURLParser: true
});

//update schema to take in information from Oauth
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
});

//use passport local mongoose to hash and salt passwords and save users into Mongo DB
userSchema.plugin(passportLocalMongoose);
//in order to use npm mongoose findOrCreate we need to add this separate packages as a plugin
userSchema.plugin(findOrCreate);


const User = new mongoose.model("User", userSchema);

//create a local login strategy
passport.use(User.createStrategy());



//using passport instead of passport-local-mongoose to serialize and deserialize date in order to handle a wider range rather than just local - including Google auth
passport.serializeUser(function (user, done) {
    done(null, user.id)
});
passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user)
    })
});

//configure google OAuth
passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets"
    },
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);

        User.findOrCreate({
            googleId: profile.id
        }, function (err, user) {
            return cb(err, user);
        });
    }
));



app.get("/", (req, res) => {
    res.render("home")
})

//initiate authentication with google
app.get("/auth/google",
    passport.authenticate("google", {
        scope: ["profile"]
    }));

//once authenticated how does it redirect -->
app.get("/auth/google/secrets",
    passport.authenticate("google", {
        failureRedirect: "/login"
    }),
    function (req, res) {
        // Successful authentication, redirect secrets.
        res.redirect("/secrets");
    });


app.get("/login", (req, res) => {
    res.render("login")
})


app.get("/register", (req, res) => {
    res.render("register")
})

app.get("/secrets", (req, res) => {
    //check to see if authenticated 
    if (req.isAuthenticated()) {
        res.render("secrets");
    } else {
        res.redirect("/login");
    }
})

app.get("/logout", (req, res) => {
    //deauthenticate and end the session
    req.logout();
    res.redirect("/");
});



app.post("/register", (req, res) => {

    //using passport local mongoose .register method

    User.register({
        username: req.body.username
    }, req.body.password, (err, user) => {
        if (err) {
            console.log(err)
            res.redirect("/register")
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            })
        }
    })
})

app.post("/login", (req, res) => {
    const user = new User({
        username: req.body.username,
        password: req.body.password
    })

    //use the login function given from passport  -- AUTHENTICATES AND SENDS A COOKIE
    req.login(user, (err) => {
        if (err) {
            console.log(err)
        } else {
            //same authentication syntax as registering -- AUTHENTICATES AND SENDS A COOKIE
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets")
            })
        }
    })

})



app.listen(3000, () => {
    console.log("Good job dumbass - you started a server!")
})