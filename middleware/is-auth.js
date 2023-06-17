const User = require("../models/user")


module.exports = (req,res,next)=>{
if(!req.session.isLoggedIn){
    return res.redirect("/login")
}
User
.findById(req.session.user._id)
.then(user=>{
    if(!user){
        return next()
    }
    req.user = user
    next()
})
.catch(error=>{
    throw new Error(error)
})
}