const moment = require("moment")
const consolas = console.log
console.log = function (...args) {
  const timestamp = new Date().toISOString()
  consolas.apply(console, [`[${moment(timestamp).format("YY-MMM-DD HH:mm")}]`, ...args])
}


const express = require('express')
const cron = require('node-cron')
const app = express()
app.use(express.json({ limit: '10mb' }))
const port = 3005

const API  = require("./api.js")
var cred = require("./cred.js")
const DB = require("./db.js")
const sync = require("./sync.js")
const wish = require("./wish.js")

cred.mysql.connectionLimit = 100
cred.mysql.multipleStatements = true

var mysql = require('mysql');
var db = new DB(mysql.createPool(cred.mysql))

const api = new API(db)

app.get('/api', (req, res)=>{
  res.status(200).send()
})

app.post('/api', api.call.bind(api))

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
})

if(cred.cron.sync){
  const syncMin = moment().add(1, 'minute').format('mm')
  console.log(`Sync minute - ${syncMin}`)
  cron.schedule(`${syncMin} * * * *`, () => {
    sync(db)
  })
}

if(cred.cron.wish){
  cron.schedule('0 4 * * *', () => {
    wish(db)
  }) 
}

