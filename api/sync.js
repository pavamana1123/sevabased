const axios = require('axios')
const cred = require("./cred.js")
const TelegramBot = require('node-telegram-bot-api')

const bot = new TelegramBot(cred.telebot.botToken, {polling: false})
const url = "https://docs.google.com/spreadsheets/d/186h3EpvZSvCD8Mcn7NU9TN70BGz_BZtKlSXGHVH_laU/edit#"
const sheets =  [
  "Participants",
  "Courses",
  "Sessions",
  "Calendar",
  "Participation",
]

const columns = {
  participants: ['id', 'date', 'name', 'phone', 'email', 'preacher', 'buddy', 'courseID', 'category', 'source', 'dob', 'snooze', 'comments', 'yearOfJoining', 'skills', 'institution', 'tShirtSize', 'native', 'isStudent', 'course', 'company', 'designation'],

  participation: ['participantID', 'eventID', 'caller', 'phone', 'response', 'time', 'attendance', 'remarks', 'name'],

  calendar: ['id', 'startDate', 'endDate', 'startTime', 'endTime', 'name', 'courseID', 'speaker', 'venue', 'cost', 'type', 'sessionID', 'felicitation', 'hidden', 'remarks'],

  incumbents: ['id', 'name', 'phone', 'email', 'roleID'],

  courses: ["id", "name", "level"],

  sessions: ["courseID", "name", "message", "id", "type", "code", "index", "canvaLink", "videoLink"]

}

const baseColumns = ['comments', 'remarks', 'skills', 'remarks', 'message']

const admins = [
  {
    id: 'PVPD',
    name: 'Pavana Prana Dasa',
    phone: '6364903722',
    email: 'pvpd@iskconmysore.org',
    roleID: 'app-admin'
  },
  {
    id: 'PVPD',
    name: 'Pavana Prana Dasa',
    phone: '6364903722',
    email: 'pvpd@iskconmysore.org',
    roleID: 'folk-guide'
  },
  {
    id: 'SKKD',
    name: 'Sanaka Kumara Dasa',
    phone: '6364903726',
    email: 'skkd@iskconmysore.org',
    roleID: 'folk-guide'
  },
  {
    id: 'KSD',
    name: 'Karunya Sagar Dasa',
    phone: '9880544450',
    email: 'ksd@iskconmysore.org',
    roleID: 'folk-guide'
  },
]

const qoute = (v, c)=>{

  if(typeof v !== 'boolean' && !v){
    v = null
  }

  if(baseColumns.indexOf(c)!=-1 && v){
    v = Buffer.from(v).toString('base64')
  }

  if (v === undefined || v === null) {
    return "NULL"
  } else if (typeof v === 'string') {
      return `"${v.replace(/"/g, `'`)}"`
  } else if (typeof v === 'boolean') {
      return v ? 1 : 0
  } else {
      return v
  }
}

Array.prototype.insert = function (table, values) {
  return `INSERT INTO ${table} (${this.map(column=>{
    return `\`${column}\``
  }).join(", ")}) VALUES (${this.map(column=>{
    return qoute(values[column], column)
  }).join(", ")})`
}

const sync = (db)=>{
  console.log("[SYNC]", "sync started")
  axios.post('https://sheets.iskconmysore.org', {url, sheets})
  .then((response) => {
    console.log("[SYNC]", "received sheet data")
    const data = response.data
    db.query(`

      BEGIN;

      ${[...sheets].reverse().map(sheet=>{
        return `DELETE FROM ${sheet.toLowerCase()}`
      }).join("; ")};

      DELETE FROM incumbents;

      ${sheets.map(sheet=>{
        sheet = sheet.toLowerCase()
        return data[sheet].map(row=>{
          return columns[sheet].insert(sheet, row)
        }).join("; ")
      }).join("; ")};

      ${data.participants.filter(p=>{
        return p.buddyName == "Buddy Coordinator"
      }).concat(admins).map(p=>{
        const { id, name, phone, email } = p
        return columns.incumbents.insert("incumbents", {
          id, name, phone, email,
          roleID: p.roleID || "buddy-coord"
        })
      }).join("; ")};
      
      COMMIT;
    `.trim()
    ).then(res=>{
      console.log("[SYNC]", "sync complete")
    }).catch(err=>{
      const e = err && err.response && err.response.data? err.response.data: err && err.response ? err.response : err
      bot.sendMessage(cred.telebot.apiChatID, `[SYNC ERROR]
${e}`)
      console.log(`[SYNC] ${e}`)
    })
  })
  .catch((e) => {
    console.log(`[SYNC] ${e}`)
  })
}


module.exports = sync

