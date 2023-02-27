const mongooose = require("mongoose")
mongooose.set('strictQuery','False')

const MongooseConnect = (cb)=>{
    mongooose
    .connect('mongodb://127.0.0.1:27017/testdb?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+1.7.1',{useNewUrlParser:true})
    .then(results=>{
    cb(results)
    console.log("connected to database")
    })
    .catch(err=>console.log(err))
}
module.exports = MongooseConnect
