const express = require('express');
const userModel = require('./models/user');
const postModel = require("./models/post");
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

app.use(express.json());
app.use(express.urlencoded({extended:true}));

app.set("view engine" , "ejs");
app.use(express.static(path.join(__dirname , "public")));

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const user = require('./models/user');
app.use(cookieParser());

const upload = require('./config/multerconfig');
const post = require('./models/post');


app.get("/" , function(req , res) {
    res.render("index");
});


app.get("/login" , function(req , res) {
    res.render("login");
});

app.post("/login" , async function(req,res) {
    let {email , password} = req.body;
    let user = await userModel.findOne({email});
    if(!user)  return res.status(500).send("something went wrong");
    
    else {
        bcrypt.compare(password , user.password , function(err , result) {
            if(result) {
                let token = jwt.sign({email : email , userid: user._id} , "shhhhhh");
                res.cookie("token" , token);
                res.redirect("/profile");
            }
            
            else res.redirect("/login");
        });
    }
    
});


app.get("/like/:id" , isLoggedIn , async (req , res) => {
    let post = await postModel.findOne({_id:req.params.id}).populate("user");
    
    if(post.likes.indexOf(req.user.userid) === -1 ) {
        post.likes.push(req.user.userid);
    } 
    
    else {
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }
    await post.save();
    res.redirect("/profile");
});

app.post("/register"  , async function(req , res) {
    let {name , username , age , email , password } = req.body;
    let user = await userModel.findOne({email});
    if(user) {
        return  res.status(500).send("user already registered");
    }

    else {
        bcrypt.genSalt(10 , (err , salt) => {
            bcrypt.hash(password , salt ,  async (err , hash) => {
                let user = await userModel.create({
                    username,
                    email,
                    password:hash,
                    age,
                    name,
                });

                let token = jwt.sign({email : email , userid: user._id} , "shhhhhh");
                res.cookie("token" , token);
                res.redirect("/profile");
            });
        });
    }
});

app.get("/logout" , function (req , res) {
    res.cookie("token" , "");
    res.redirect("/login");
});


app.post("/post" , isLoggedIn , async (req, res) => {
    let user = await userModel.findOne({email : req.user.email});
    let {content} = req.body;
    let post = await postModel.create({
        user : user._id,
       content
    });
    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile");
});


app.get("/edit/:id" , isLoggedIn , async (req, res) => {

    let post = await postModel.findOne({_id :req.params.id});
    console.log(post.content);
    res.render("edit" , {post});

});

app.post("/update/:id" , isLoggedIn , async function(req,res) {
    let post = await postModel.findOneAndUpdate({_id : req.params.id} , {content: req.body.content} , {new:true});
    console.log(post);
    res.redirect("/profile");
});

app.get("/profile" , isLoggedIn  , async (req , res) =>  {
    let user = await userModel.findOne({email : req.user.email}).populate("posts");
    console.log(user);
    res.render("profile" , {user});
});

function isLoggedIn(req, res , next) {
    if(req.cookies.token === "") {
        res.redirect("/login");
    }

    else if(req.cookies.token === undefined) {

        res.redirect("/login");
    }

    else {
        let data = jwt.verify(req.cookies.token , "shhhhhh");
        req.user = data;
        next();
    }
}

app.get("/upload", isLoggedIn , function(req,res) {
    res.render("upload");
});

app.post("/upload" , isLoggedIn , upload.single("image") ,  async function(req , res) {
    let user =  await userModel.findOne({email: req.user.email});
    user.profilepic = req.file.filename;
    await user.save();
    res.redirect("/profile");
} );

app.get("/delete/:id" , isLoggedIn ,async function(req,res) {
    let post = await postModel.findOne({_id :req.params.id});
    console.log(post);
    res.render("delete" , {post});
});

app.post("/delete/:id" , isLoggedIn , async function(req , res) {
    let post = await postModel.findOne({_id :req.params.id});
    let u = await userModel.findOne({_id : post.user});

    await postModel.findOneAndDelete({_id :req.params.id});
    let x = await u.posts.indexOf(req.params.id);
    await u.posts.splice(x , 1);
    console.log(u);
    res.redirect("/profile");
});

app.get("/explore" , isLoggedIn , async function(req , res) {
    let posts = await postModel.find();

    res.render("explore" , {posts} );
});


app.listen(3000);
