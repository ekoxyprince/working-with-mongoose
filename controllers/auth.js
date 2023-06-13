const User = require('../models/user');
const nodemailer = require('nodemailer')
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const user = require('../models/user');
const {validationResult} = require("express-validator/check")

const transporter = nodemailer.createTransport({
  host:'mail.astrodev.com.ng',
  port:'465',
  secure:true,
  tls:{
  rejectUnauthorized:true
  },
  auth:{
    user:'contact@astrodev.com.ng',
    pass:'jesuslovesmesomuch'
  }
})

exports.getLogin = (req, res, next) => {
  let message = req.flash('error')
  if(message.length>0){
    message = message[0]
  }else{
    message = null
  }
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    isAuthenticated: false,
    errorMessage:message
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash('error')
  if(message.length>0){
    message = message[0]
  }else{
    message = null
  }
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    isAuthenticated: false,
    errorMessage:message
  });
};

exports.postLogin = (req, res, next) => {
  let {email,password} = req.body
  User.findOne({email:email})
    .then(user => {
      if(!user){
        req.flash('error', 'no user found with email')
        return res.redirect("/login")
      }
      bcrypt.compare(password,user.password)
      .then(doMatch =>{
        if(doMatch){
          req.session.isLoggedIn = true;
          req.session.user = user;
          return req.session.save(err => {
            console.log(err);
             res.redirect("/")
          });
        }
        req.flash('error', 'your password is incorrect')
         res.redirect("/login")
      })
    })
    .catch(err =>{
      res.redirect("/login")
      console.log(err)
    } );
};

exports.postSignup = (req, res, next) => {
let {email,password} = req.body
const errors = validationResult(req)
if(!errors.isEmpty()){
  console.log(errors.array()[0].msg)
  return res
  .status(422)
  .render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    isAuthenticated: false,
    errorMessage:errors.array()[0].msg,
    oldInput:{email,password}
  });
}
   bcrypt.hash(password,12)
  .then(hashedPassword=>{
    let user = new User({
      email:email,
      password:hashedPassword,
      cart:{items:[]}
    })
    return user.save()
  })
  .then((results)=>{
    res.redirect("/login")
   return transporter.sendMail({from:'<contact@astrodev.com.ng>',
    to:email,
    subject:"Signup Successful",
    text:'You just sucessfully signed up'}
    )
  })

  .catch(err=>console.log(err))
};

exports.postLogout = (req, res, next) => {
  req.session.destroy(err => {
    console.log(err);
    res.redirect('/');
  });
};

exports.getResetpassword = (req,res,next)=>{
  let message = req.flash('error')
  if(message.length>0){
    message = message[0]
  }else{
    message = null
  }
  res.render('auth/reset',{
    path: '/reset',
    pageTitle: 'Reset Password',
    isAuthenticated: false,
    errorMessage:message
  })
}
exports.postResetpassword = (req,res,next)=>{
  let {email} = req.body
 crypto.randomBytes(32,(err,buffer)=>{
  if (err){
    console.log(err)
   return res.redirect("/login")
  }
  let token = buffer.toString('hex')
  User
  .findOne({email:email})
  .then(user=>{
 if(!user){
  req.flash('error','No user found')
  return res.redirect("/reset")
 }
 user.resetToken = token
 user.resetTokenExpire = Date.now() + 3600000
 return user
 .save()
 .then(results=>{
  res.redirect("/login")
  return transporter.sendMail({
    from:'contact@astrodev.com.ng',
    to:email,
    subject:'Reset Link',
    html:`<a href='http://localhost:3000/reset/${token}'>Reset Password Link</a>`})
})
  })
  .catch(err=>console.log(err))
 })
}

exports.getNewPassword = (req,res,next)=>{
  let {token} = req.params
  User.findOne({resetToken:token,resetTokenExpire:{$gt:Date.now()}})
  .then(user=>{
    if(!user){
      req.flash('error','Invalid token session')
      return res.redirect("/reset")
    }
    let message = req.flash('error')
    if(message.length>0){
      message = message[0]
    }else{
      message = null
    }
    res.render("auth/new-password",{
      path: '/reset-password',
      pageTitle: 'reset-password',
      isAuthenticated: false,
      errorMessage:message,
      userId:user._id.toString(),
      token:token
    })
  })
  .catch(err=>console.log(err))
}

exports.postNewPassword = (req,res,next)=>{
  let {password,_id,token} = req.body
  let resetUser;
  User
  .findOne({resetToken:token,resetTokenExpire:{$gt:Date.now()},_id:_id})
  .then(user=>{
   resetUser = user;
  return bcrypt.hash(password,12)
  })
  .then(hashedPassword=>{
    resetUser.password =hashedPassword;
    resetUser.resetToken = undefined
    resetUser.resetTokenExpire = undefined
    return resetUser.save()
  })
  .then(results=>{
    res.redirect("/login")
  })

}