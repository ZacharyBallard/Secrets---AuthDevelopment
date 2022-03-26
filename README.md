# Building Out an OAuth App

This is a ten step process to set up Google OAuth in your app.js using express, ejs, mongoDB, mongoose, and passport -- this is a breakdown/brainstorm after walking through the tutorial via LondonAppBrewery 


## Step 1 require needed dependencies 
```
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
```
## Step 2 create your Express App, serve up static files housed in the Public folder, set the JS template engine to ejs, and use body-parser.urlencoded to be able ot pull information from the forms submitted
```
const app = express();
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));
```

## Step 3 use express-session to initialize the session, use passport to initialize passport, and use passport to set up our session 

initialize session
```
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));
```
initialize passport
```
app.use(passport.initialize());
```
use passport to set up our session
app.use(passport.session());



## Step 4 connect to your Database (in our case - connect to a MongodDB hosted on this computer using localhost mongodb://localhost:27017/<nameofDB>)

connect to MongoDB
```
mongoose.connect("mongodb://localhost:27017/userDB", {
    useNewURLParser: true
});
```

## Step 5 set up the schema to be used throughout the app

update schema to take in information from Oauth
```
const userSchema = new mongoose.Schema({
    //standard key/values for every signup including local signup
    email: String,
    password: String,
    //added key/value of schema to save the data coming from Google auth and saved as googleId
    googleId: String,
    //added key/value of schema in order to save secrets for the person logged in
    secret: String
});
```
  
use passport-local-mongoose as a plugin to hash and salt passwords and save users into Mongo DB
  ```
userSchema.plugin(passportLocalMongoose);
  ```
use the npm package findOrCreate as a plugin on our schema for convenience later in our code base with configuring the Google OAuth Strategy  
  ```
userSchema.plugin(findOrCreate);
  ```
create the mongoose model for the User using the now established userSchema
  ```
const User = new mongoose.model("User", userSchema);
  ```


## Step 6 create our local login strategy

create a local login strategy
  ```
passport.use(User.createStrategy());
  ```


## Step 7 serialize and deserialize data from user 

using passport instead of passport-local-mongoose to serialize and deserialize data in order to handle a wider range rather than just local - including Google auth -- *note: if you use passport-local-mongoose this will cause fatal error with Google OAuth resulting in a crash due to improper serialization/deserialization
  ```
passport.serializeUser(function (user, done) {
    done(null, user.id)
});
passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user)
    })
});
```

## Step 8 Setting Up Google Strategy 

- in your browser navigate to https://console.developers.google.com/apis/dashboard
- set up a new project, give it a name, leave location alone, CREATE    
- select APIs and Services on left panel
- select credentials on left panel
-  create credentials --> OAuth Client ID
- application type? --> web application
- Authorized JavaScript Origins? (where is the request) --> http://localhost:3000
- Authorized redirect URIs (where do you want the authenciated user to be redirected?) --> for this sample app --> http://localhost:3000/auth/google/secrets
- after credentials are created a model will pop up with your clientID and clientSecret -- put these in your .env file for security **never directly place in your app**

### configure google OAuth
  ```
passport.use(new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets"
    },
    function (accessToken, refreshToken, profile, cb) {
        // use console.log(profile); if you would like to see exactly what gets brought over from google as the "profile"

        //use the findOrCreate npm package to be able to pull this code straight from 
        //https://www.passportjs.org/packages/passport-google-oauth20/
        User.findOrCreate({
            googleId: profile.id
        }, function (err, user) {
            return cb(err, user);
        });
    }
));
```

## Step 9 Setting Up Routes

```
app.get("/", (req, res) => {
    res.render("home")
})
  ```

initiate authentication with google using the docs from https://www.passportjs.org/packages/passport-google-oauth2/
```
  app.get("/auth/google",
    passport.authenticate("google", {
        scope: ["profile"]
    }));
```

once authenticated via Google OAuth how does it redirect
```
app.get("/auth/google/secrets",
    passport.authenticate("google", {
        failureRedirect: "/login"
    }),
    function (req, res) {
        // Successful authentication, redirect secrets.
        res.redirect("/secrets");
    });
```
  
### Add remaining routes

  ```
app.get("/login", (req, res) => {
    res.render("login")
})


app.get("/register", (req, res) => {
    res.render("register")
})

app.get("/secrets", (req, res) => {
    //go through the DB and pull the secrets where the condition is not equal to null
    User.find({"secret": {$ne:null}}, function(err, foundUsers){
        if(err){
            console.log(err)
        } else {
            if(foundUsers){
                res.render("secrets", {usersWithSecrets:foundUsers})
            }
        }
    })
})

app.get("/submit", (req, res) => {
    //check to see if authenticated 
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
})

app.post("/submit", (req, res) => {
    const submittedSecret = req.body.secret;

    console.log(req.user.id);

    User.findById(req.user.id, (err, foundUser) => {
        if(err){
            console.log(err)
        } else {
            if(foundUser){
                foundUser.secret = submittedSecret;
                foundUser.save(function(){
                    res.redirect("/secrets")
                })
            }
        }
    })
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
```


## Step 10 make sure your server is listening 

  ```
app.listen(3000, () => {
    console.log("Good job - you started a server!")
})

```

to see full code page with directions placed throughout visit https://github.com/ZacharyBallard/Secrets---AuthDevelopment/blob/master/README/oAuth_directions.js
