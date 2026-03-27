const { MongoClient } = require("mongodb")//db connection 

//url for connection 
const url = "mongodb://cafeUser:cafe123@ac-cnbwmgr-shard-00-00.e1k8bqx.mongodb.net:27017,ac-cnbwmgr-shard-00-01.e1k8bqx.mongodb.net:27017,ac-cnbwmgr-shard-00-02.e1k8bqx.mongodb.net:27017/?ssl=true&replicaSet=atlas-p1q274-shard-0&authSource=admin&appName=CafeInventory"

const client = new MongoClient(url)

let db

async function connectDB() {
    await client.connect()
    db = client.db("cafeinventory")  
    console.log("✅ MongoDB Connected")
}

function getDB() {
    return db
}

module.exports = { connectDB, getDB }