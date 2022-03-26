//jshint esversion:6
require('dotenv').config()
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');



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


const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

//use passport local mongoose to hash and salt passwords and save users into Mongo DB
userSchema.plugin(passportLocalMongoose);


const User = new mongoose.model("User", userSchema);

//create a local login strategy
passport.use(User.createStrategy());
//use passport-local-mongoose to serilize and deserialize data
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", (req, res) => {
    res.render("home")
})


app.get("/login", (req, res) => {
    res.render("login")
})


app.get("/register", (req, res) => {
    res.render("register")
})

app.get("/secrets", (req, res) => {
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