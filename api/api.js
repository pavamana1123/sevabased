const otp = require("./otp.js")
const cdn = require("./cdn.js")

const sendError = (res, code, msg) => {
  res.status(code)
  res.send(msg)
}

const getPreachers = async ({ body }, res, db) => {
  const { id } = body
  db.query(`SELECT id, name, role FROM approles where role='preacher' UNION SELECT null, "None", null ORDER BY role desc, name`).then(result=>{
    if(result){
        res.status(200)
        res.send(result)
    }else{
      sendError(res, 500, "Unknown error while fetching buddy list. Got undefined or null result")
    }
  }).catch(err=>{
    sendError(res, 500, err)
  })
}

const verifyUser = async ({ body }, res, db) => {
  const { id } = body
  db.query(`
    SELECT users.id, users.name, roles.id as roleID, roles.name as roleName, roles.index as roleIndex
      FROM (
          SELECT id, name, phone, email, "participant" as roleID FROM participants
          UNION
          SELECT id, name, phone, email, roleID FROM incumbents
      ) AS users
    JOIN roles ON users.roleID=roles.id
    WHERE phone = '${id}' or email = '${id}';`
  ).then(result=>{
    if(result){
      if(result.length){
        res.status(200)
        res.send(result)
      }else{
        sendError(res, 404, "User not found")
      }
    }else{
      sendError(res, 500, "Unknown error while verifying user. Got undefined or null result")
    }
  }).catch(err=>{
    sendError(res, 500, err)
  })
}

const sendOTP = async ({ body }, res) => {
  otp.send(body)
  .then(({status, error}) => {
    res.status(status).send(error)
  })
  .catch(error => {
    console.log(error)
    sendError(res, 500, error)
  })
}

const verifyOTP = async ({ body }, res) => {
  otp.verify(body)
  .then(({status, error}) => {
    res.status(status).send(error)
  })
  .catch(error => {
    sendError(res, 500, error)
  })
}

const setUserPhoto = async ({body}, res, db) => {
  const { filename, imageDataURL } = body
  const base64Data = imageDataURL.split(';base64,').pop()
  const binaryBuffer = Buffer.from(base64Data, 'base64');

  cdn.put(filename, binaryBuffer).then(()=>{
    res.send()
  }).catch(err => {
    sendError(res, 500, `Could not set user photo: ${err}`)
  })
}

const getBuddies = async ({ body }, res, db) => {
  const { id } = body
  db.query(`SELECT * FROM participants WHERE buddy='${id}' order by name;`
  ).then(result=>{
    if(result){
        res.status(200)
        res.send(result)
    }else{
      sendError(res, 500, "Unknown error while fetching buddy list. Got undefined or null result")
    }
  }).catch(err=>{
    sendError(res, 500, err)
  })
}

const getAssignees = async ({ body }, res, db) => {
  const { id } = body
  db.query(`SELECT assignees.*, IFNULL(incumbents.roleID, "participant") as roleID, IFNULL(roles.name, "Participant") as roleName, IFNULL(roles.index, 9) as roleIndex FROM
  (SELECT participants.id, participants.name, participants.phone, participants.dob, participants.courseID, participants.buddy as buddyID, incumbents.name as buddyName, incumbents.phone as buddyPhone FROM participants
  LEFT JOIN incumbents on incumbents.id=participants.buddy
  WHERE participants.preacher='${id}') as assignees
  LEFT JOIN incumbents on incumbents.id=assignees.id
  LEFT JOIN roles on roles.id=incumbents.roleID
  ORDER BY roleIndex, assignees.name`
  ).then(result=>{
    if(result){
        res.status(200)
        res.send(result)
    }else{
      sendError(res, 500, "Unknown error while fetching assignees list. Got undefined or null result")
    }
  }).catch(err=>{
    sendError(res, 500, err)
  })
}

const getHomeData = async ({ body }, res, db) => {
  const { id, roleID } = body

  const getQuery = (id, roleID)=>{
    switch(roleID){
      case 'participant':
        return `SELECT connect.*, incumbents.name as buddyName, incumbents.phone as buddyPhone FROM
        (SELECT participants.preacher as preacherID, participants.buddy as buddyID, incumbents.name as preacherName, incumbents.phone as preacherPhone FROM participants
        LEFT JOIN incumbents ON incumbents.id=participants.preacher
        WHERE participants.id='${id}' and incumbents.roleID='folk-guide') connect
        LEFT JOIN incumbents ON incumbents.id=connect.buddyID and incumbents.roleID='buddy-coord'`
      default:
        return ""
    }
  }

  db.query(getQuery(id, roleID)).then(result=>{
    if(result){
        res.status(200)
        res.send(result[0] || [])
    }else{
      sendError(res, 500, "Unknown error while fetching home data. Got undefined or null result")
    }
  }).catch(err=>{
    sendError(res, 500, err)
  })
}

const getUsers = async (req, res, db) => {
  db.query(`
    SELECT users.id, users.name, users.phone, roles.id as roleID, roles.name as roleName, roles.index as roleIndex
      FROM (
          SELECT id, name, phone, email, "participant" as roleID FROM participants
          UNION
          SELECT id, name, phone, email, roleID FROM incumbents
      ) AS users
    JOIN roles ON users.roleID=roles.id
    ORDER BY roleIndex asc, users.name asc;`
  ).then(result=>{
    if(result){
      if(result.length){
        res.status(200)
        res.send(result)
      }else{
        sendError(res, 404, "No users found")
      }
    }else{
      sendError(res, 500, "Unknown error while fetching users. Got undefined or null result")
    }
  }).catch(err=>{
    sendError(res, 500, err)
  })
}

const getCatchupData = async (req, res, db) => {

  db.query(`
    SELECT participants.id, participants.phone, participants.name, CASE WHEN LEAST(participants.date, MIN(calendar.startDate)) < DATE_SUB(CURDATE(), INTERVAL 2 MONTH) THEN DATE_SUB(CURDATE(), INTERVAL 2 MONTH) ELSE LEAST(participants.date, MIN(calendar.startDate)) END AS date FROM participants JOIN participation ON participation.participantID=participants.id JOIN calendar ON calendar.id=participation.eventID WHERE participants.id IN (SELECT id FROM participants WHERE courseID!="FEC" AND courseID!="") GROUP BY participants.name;

    SELECT participants.id, calendar.id as eventID, participants.name, participants.phone, calendar.startDate AS date, sessions.name AS sessionName, sessions.code, participation.attendance FROM participation JOIN calendar ON calendar.id=participation.eventID JOIN sessions ON sessions.id=calendar.sessionID JOIN participants ON participants.id=participation.participantID WHERE participation.participantID IN (SELECT id FROM participants WHERE courseID!="FEC" AND courseID!="" ORDER BY name) AND calendar.courseID='SOS' ORDER BY participation.participantID, calendar.startDate;
    
    SELECT sessions.code, sessions.name, calendar.startDate AS date, calendar.startTime, calendar.endTime FROM calendar JOIN sessions ON sessions.id=calendar.sessionID WHERE calendar.startDate=(SELECT MIN(calendar.startDate) FROM calendar JOIN sessions ON sessions.id = calendar.sessionID WHERE calendar.startDate>NOW() AND sessions.type="CATCHUP") AND calendar.courseID='SOS' AND sessions.type="CATCHUP" ORDER BY calendar.startTime;

    SELECT calendar.id as eventID, calendar.startDate AS date, sessions.code, sessions.name FROM calendar JOIN sessions ON sessions.id = calendar.sessionID WHERE calendar.startDate > (SELECT MIN(mindate.date) AS date FROM (SELECT LEAST(participants.date, MIN(calendar.startDate)) AS date FROM participants JOIN participation ON participation.participantID=participants.id JOIN calendar ON calendar.id=participation.eventID WHERE participants.id IN (SELECT id FROM participants WHERE courseID!="FEC" AND courseID!="") GROUP BY participants.name) mindate) AND calendar.startDate < NOW() AND calendar.courseID='SOS' ORDER BY calendar.startDate;
  `
  ).then(result=>{
    if(result){
      if(result.length){
        res.status(200)
        res.send(result)
      }else{
        sendError(res, 404, "No users found")
      }
    }else{
      sendError(res, 500, "Unknown error while fetching catchup data. Got undefined or null result")
    }
  }).catch(err=>{
    sendError(res, 500, err)
  })
}

const endpoints = {
  "/get-preachers": getPreachers,
  "/verify-user": verifyUser,
  "/send-otp": sendOTP,
  "/verify-otp": verifyOTP,
  "/set-user-photo": setUserPhoto,
  "/get-buddies": getBuddies,
  "/get-assignees": getAssignees,
  "/get-users": getUsers,
  "/get-home-data": getHomeData,
  "/get-catchup-data": getCatchupData,
}

class API {
    constructor(db){
        this.db = db
    }

    async call(req, res) {
        var endpoint = req.get("endpoint")
        var user = req.get("user")
        console.log(`[API] [${user || "NO-USER"}] ${endpoint}`)
        if(endpoint in endpoints){
          endpoints[endpoint](req, res, this.db)
        }else{
          sendError(res, 400, `Endpoint ${endpoint} not found`)
        }
    }
}

module.exports = API