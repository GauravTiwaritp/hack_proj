const express = require("express");
const url = require("url");
const app = express();
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

app.set("view engine", "ejs");
app.use("/public", express.static("public"));
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect("mongodb://localhost:27017/userDB");
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  name: String,
  to: String,
  for: String,
  participant: Number,
  date: String,
  time: String,
  status: String,
  cabprovider: String,
  cabOrgName: String,
  phone: Number,
  msg: String,
});

userSchema.plugin(passportLocalMongoose);
//cabheadSchema.plugin(passportLocalMongoose);
const user = new mongoose.model("User", userSchema);
//const cabhead = new mongoose.model("Cabhead", cabheadSchema);
passport.use(user.createStrategy());
passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());

app.get("/user_home", (req, res) => {
  res.render("user_home");
});

app.get("/user_register", (req, res) => {
  res.render("user_register");
});

app.get("/secrets", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("home");
  } else {
    console.log("hello");
    res.redirect("/user_register");
  }
});
app.post("/user_register", (req, res) => {
  user.register(
    { username: req.body.username },
    req.body.password,

    function (err, user) {
      console.log("hello err1");
      if (err) {
        console.log("hello err2");
        console.log(err);
        res.redirect("/user_register");
      } else {
        passport.authenticate("local")(req, res, function () {
          console.log("hello fail");
          res.redirect("/submit");
        });
      }
    }
  );
});
app.get("/user_login", (req, res) => {
  res.render("user_login");
});
app.get("/submit", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/user_login");
  }
});
app.post("/user_login", (req, res) => {
  try {
    const user1 = new user({
      username: req.body.username,
      password: req.body.password,
    });

    req.login(user1, function (err) {
      if (err) {
        console.log(err);
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/submit");
        });
      }
    });
  } catch {}
});
app.post("/submit", (req, res) => {
  const name = req.body.name;
  const to = req.body.to;
  const for1 = req.body.for;
  const participant = req.body.participant;
  const date = req.body.date;
  const time = req.body.time;
  user.findById(req.user.id).then((foundUser) => {
    foundUser.name = name;
    foundUser.to = to;
    foundUser.for = for1;
    foundUser.participant = participant;
    foundUser.date = date;
    foundUser.time = time;
    foundUser.save().then((foundUser) => {
      res.redirect("/request_cab");
    });
  });
});

app.get("/request_cab", (req, res) => {
  user
    .find({
      $and: [
        { cabprovider: { $exists: false } },
        { cabOrgName: { $exists: false } },
        { to: { $exists: true } },
      ],
    })
    .then((found) => {
      res.render("request_cab", { use: found });
    });
});

app.get("/cab_home", (req, res) => {
  res.render("cab_home");
});

app.get("/cab_login", (req, res) => {
  res.render("cab_login");
});

app.get("/cab_register", (req, res) => {
  res.render("cab_register");
});
app.post("/cab_register", (req, res) => {
  user.register(
    { username: req.body.username },
    req.body.password,

    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/cab_register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/cab_secrets");
        });
      }
    }
  );
});

app.get("/cab_secrets", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("cab_secrets");
  } else {
    res.redirect("/cab_register");
  }
});

app.post("/cab_secrets", (req, res) => {
  // cabOrgName: String,
  // phone: Number,

  console.log(req.body.phone);
  const name = req.body.name;
  const cabOrgName = req.body.cabOrgName;
  const phone = req.body.phone;
  console.log(name);
  console.log(cabOrgName);
  user.findById(req.user.id).then((found) => {
    found.name = name;
    found.cabOrgName = cabOrgName;
    found.phone = phone;
    found.save().then((foundUser) => {
      res.redirect("/request_cab");
    });
  });
});
app.post("/cab_login", (req, res) => {
  try {
    const user1 = new user({
      username: req.body.username,
      password: req.body.password,
    });
    user.find({ cabOrgName: { $exists: true } }).then((found) => {
      req.login(user1, function (err) {
        if (err) {
          console.log(err);
        } else {
          passport.authenticate("local")(req, res, function () {
            res.redirect("/request_cab");
          });
        }
      });
    });
  } catch {}
});

app.get("/message", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("message");
  } else {
    res.redirect("/cab_login");
  }
});

app.post("/message", (req, res) => {
  const msg = req.body.msg;
  const id = req.body.inde;
  console.log(id);
  user
    .findById(id)
    .then((found) => {
      found.msg = msg;
      found.save().then((foundUser) => {
        res.redirect("/request_cab");
      });
    })
    .catch((err) => {
      console.log(err);
    });
});

app.get("/approve_cab", (req, res) => {
  if (req.isAuthenticated()) {
    user
      .find({
        $and: [{ _id: req.user.id }],
      })
      .then((found) => {
        res.render("approve_cab", { use: found });
      });
  } else {
    res.redirect("/user_login");
  }
});
app.listen(80);

// .find({
//   $and: [
//     { cabprovider: { $exists: false } },
//     { cabOrgName: { $exists: false } },
//     { to: { $exists: true } },
//   ],
// })
