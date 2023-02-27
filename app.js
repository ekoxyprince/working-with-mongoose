const path = require('path');
const mongooose = require("mongoose")
const express = require('express');
const bodyParser = require('body-parser');
const MongooseConnect = require("./util/database")
const errorController = require('./controllers/error');
const User = require('./models/user');

const app = express();

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');


app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  User.findById("63f9fe647d8c324477def6c6")
    .then(user => {
      req.user = user;
      next();
    })
    .catch(err => console.log(err));
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);

MongooseConnect(results=>{
  app.listen(3000,()=>{
    User.findOne()
    .then(user=>{
      if(!user){
        const user = new User({
          name:"prince",
          email:"denniseinstien@gmail.com",
          cart:{
            items:[]
          }
        })
        user.save()
      }
    })
   
    console.log("server running on port 3000")
  })
})




app.use(errorController.get404);


