//jshint esversion:6
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");


const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

//connect to MongoDB

mongoose.connect("mongodb://localhost:27017/userDB", {
    useNewURLParser: true
});


const userSchema = {
    email: String,
    password: String
};

const User = new mongoose.model("User", userSchema);





app.get("/", (req, res) => {
    res.render("home")
})


app.get("/login", (req, res) => {
    res.render("login")
})


app.get("/register", (req, res) => {
    res.render("register")
})


app.post("/register", (req, res) => {
    const newUser = new User({
        email: req.body.username,
        password: req.body.password
    });

    newUser.save((err) => {
        if (err) {
            console.log(err)
        } else {
            res.render("secrets")
        }
    });
})

app.post("/login", (req,res) => {
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({email: username}, (err, foundUser) => {
        if(err){
            console.log(err)
        } else {
            //find if there is a user with the email in the database
            if (foundUser) {
                //find if the user in the database has the identical password 
                if(foundUser.password === password){
                    res.render("secrets"); 
                } 
            } 
        }
    })


})



app.listen(3000, () => {
    console.log("Good job dumbass - you started a server!")
})