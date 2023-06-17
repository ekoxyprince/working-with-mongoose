const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf')
const flash = require("connect-flash")
const logger = require('morgan')
const multer = require('multer')
const errorController = require('./controllers/error');
const User = require('./models/user');
const MONGODB_URI =
  'mongodb://127.0.0.1:27017/testdb?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+1.7.1';

const app = express();
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});
const csrfProtection = csrf();
const fileStorage = multer.diskStorage({
  destination:(req,file,cb)=>{
    cb(null,'public/images/')
  },
  filename:(req,file,cb)=>{
    cb(null,Date.now()+"--"+file.originalname)
  }
})
const fileFilter = (req,file,cb)=>{
if(file.mimetype === 'image/png' || file.mimetype === 'image/jpeg'){
 cb(null,true)
}else{
 cb(null,false)
}
}
app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');
const localVariables = require("./middleware/local-var")
app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({storage:fileStorage,fileFilter:fileFilter}).single('image'))
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: 'my secret',
    resave: false,
    saveUninitialized: false,
    store: store
  })
);
app.use(logger('dev'))
app.use(csrfProtection)
app.use(localVariables);
app.use(flash())
app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);
app.get('/500',errorController.get500)
app.use(errorController.get404);
app.use(require('./middleware/errorhandler'))
mongoose
  .connect(MONGODB_URI)
  .then(result => {
    app.listen(3000);
  })
  .catch(err => {
    console.log(err);
  });
