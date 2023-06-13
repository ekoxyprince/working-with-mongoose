const express = require('express');

const authController = require('../controllers/auth');

const {check,body} = require("express-validator/check");
const User = require('../models/user');

const router = express.Router();

router
.route('/login')
.get( authController.getLogin)
.post( authController.postLogin);

router
.route('/signup')
.get(authController.getSignup)
.post(check('email')
.isEmail()
.withMessage('please enter a valid email')
.normalizeEmail()
.custom((value,{req})=>{
// if(value === 'abc@abc.com'){
//     throw new Error('this email address is forbidden')
// }
// return true
 return User.findOne({email:value})
.then(found=>{
  if(found){
    return Promise.reject('User already Exists with this email address')
  }
})
}),
body('password','password must contain number and letters and must be greater than 5')
.isLength({min:8})
.isAlphanumeric()
.trim(),
body('confirmPassword')
.custom((value,{req})=>{
    if(value !== req.body.password){
  throw new Error('Passwords do not match')
    }
    return true
})
.trim(),
authController.postSignup);
router
.route("/reset")
.get(authController.getResetpassword)
.post(authController.postResetpassword);

router
.route('/reset/:token')
.get(authController.getNewPassword)

router
.route("/change-password")
.post(authController.postNewPassword)

router
.route("/logout")
.post(authController.postLogout);




module.exports = router;