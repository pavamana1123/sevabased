const otp=require("./otp.js"),cdn=require("./cdn.js"),sendError=(e,n,s)=>{e.status(n),e.send(s)},getPreachers=async({body:e},n,s)=>{const{id:a}=e;s.query("SELECT id, name, role FROM approles where role='preacher' UNION SELECT null, \"None\", null ORDER BY role desc, name").then((e=>{e?(n.status(200),n.send(e)):sendError(n,500,"Unknown error while fetching buddy list. Got undefined or null result")})).catch((e=>{sendError(n,500,e)}))},verifyUser=async({body:e},n,s)=>{const{id:a}=e;s.query(`\n    SELECT users.id, users.name, roles.id as roleID, roles.name as roleName, roles.index as roleIndex\n      FROM (\n          SELECT id, name, phone, email, "participant" as roleID FROM participants\n          UNION\n          SELECT id, name, phone, email, roleID FROM incumbents\n      ) AS users\n    JOIN roles ON users.roleID=roles.id\n    WHERE phone = '${a}' or email = '${a}';`).then((e=>{e?e.length?(n.status(200),n.send(e)):sendError(n,404,"User not found"):sendError(n,500,"Unknown error while verifying user. Got undefined or null result")})).catch((e=>{sendError(n,500,e)}))},sendOTP=async({body:e},n)=>{otp.send(e).then((({status:e,error:s})=>{n.status(e).send(s)})).catch((e=>{console.log(e),sendError(n,500,e)}))},verifyOTP=async({body:e},n)=>{otp.verify(e).then((({status:e,error:s})=>{n.status(e).send(s)})).catch((e=>{sendError(n,500,e)}))},setUserPhoto=async({body:e},n,s)=>{const{filename:a,imageDataURL:t}=e,r=t.split(";base64,").pop(),i=Buffer.from(r,"base64");cdn.put(a,i).then((()=>{n.send()})).catch((e=>{sendError(n,500,`Could not set user photo: ${e}`)}))},getBuddies=async({body:e},n,s)=>{const{id:a}=e;s.query(`SELECT * FROM participants WHERE buddy='${a}' order by name;`).then((e=>{e?(n.status(200),n.send(e)):sendError(n,500,"Unknown error while fetching buddy list. Got undefined or null result")})).catch((e=>{sendError(n,500,e)}))},getAssignees=async({body:e},n,s)=>{const{id:a}=e;s.query(`SELECT assignees.*, IFNULL(incumbents.roleID, "participant") as roleID, IFNULL(roles.name, "Participant") as roleName, IFNULL(roles.index, 9) as roleIndex FROM\n  (SELECT participants.id, participants.name, participants.phone, participants.dob, participants.courseID, participants.buddy as buddyID, incumbents.name as buddyName, incumbents.phone as buddyPhone FROM participants\n  LEFT JOIN incumbents on incumbents.id=participants.buddy\n  WHERE participants.preacher='${a}') as assignees\n  LEFT JOIN incumbents on incumbents.id=assignees.id\n  LEFT JOIN roles on roles.id=incumbents.roleID\n  ORDER BY roleIndex, assignees.name`).then((e=>{e?(n.status(200),n.send(e)):sendError(n,500,"Unknown error while fetching assignees list. Got undefined or null result")})).catch((e=>{sendError(n,500,e)}))},getHomeData=async({body:e},n,s)=>{const{id:a,roleID:t}=e;s.query(((e,n)=>"participant"===n?`SELECT connect.*, incumbents.name as buddyName, incumbents.phone as buddyPhone FROM\n        (SELECT participants.preacher as preacherID, participants.buddy as buddyID, incumbents.name as preacherName, incumbents.phone as preacherPhone FROM participants\n        LEFT JOIN incumbents ON incumbents.id=participants.preacher\n        WHERE participants.id='${e}' and incumbents.roleID='folk-guide') connect\n        LEFT JOIN incumbents ON incumbents.id=connect.buddyID and incumbents.roleID='buddy-coord'`:"")(a,t)).then((e=>{e?(n.status(200),n.send(e[0]||[])):sendError(n,500,"Unknown error while fetching home data. Got undefined or null result")})).catch((e=>{sendError(n,500,e)}))},getUsers=async(e,n,s)=>{s.query('\n    SELECT users.id, users.name, users.phone, roles.id as roleID, roles.name as roleName, roles.index as roleIndex\n      FROM (\n          SELECT id, name, phone, email, "participant" as roleID FROM participants\n          UNION\n          SELECT id, name, phone, email, roleID FROM incumbents\n      ) AS users\n    JOIN roles ON users.roleID=roles.id\n    ORDER BY roleIndex asc, users.name asc;').then((e=>{e?e.length?(n.status(200),n.send(e)):sendError(n,404,"No users found"):sendError(n,500,"Unknown error while fetching users. Got undefined or null result")})).catch((e=>{sendError(n,500,e)}))},getCatchupData=async(e,n,s)=>{s.query('\n    SELECT participants.id, participants.phone, participants.name, CASE WHEN LEAST(participants.date, MIN(calendar.startDate)) < DATE_SUB(CURDATE(), INTERVAL 2 MONTH) THEN DATE_SUB(CURDATE(), INTERVAL 2 MONTH) ELSE LEAST(participants.date, MIN(calendar.startDate)) END AS date FROM participants JOIN participation ON participation.participantID=participants.id JOIN calendar ON calendar.id=participation.eventID WHERE participants.id IN (SELECT id FROM participants WHERE courseID!="FEC" AND courseID!="") GROUP BY participants.name;\n\n    SELECT participants.id, calendar.id as eventID, participants.name, participants.phone, calendar.startDate AS date, sessions.name AS sessionName, sessions.code, participation.attendance FROM participation JOIN calendar ON calendar.id=participation.eventID JOIN sessions ON sessions.id=calendar.sessionID JOIN participants ON participants.id=participation.participantID WHERE participation.participantID IN (SELECT id FROM participants WHERE courseID!="FEC" AND courseID!="" ORDER BY name) AND calendar.courseID=\'SOS\' ORDER BY participation.participantID, calendar.startDate;\n    \n    SELECT sessions.code, sessions.name, calendar.startDate AS date, calendar.startTime, calendar.endTime FROM calendar JOIN sessions ON sessions.id=calendar.sessionID WHERE calendar.startDate=(SELECT MIN(calendar.startDate) FROM calendar JOIN sessions ON sessions.id = calendar.sessionID WHERE calendar.startDate>NOW() AND sessions.type="CATCHUP") AND calendar.courseID=\'SOS\' AND sessions.type="CATCHUP" ORDER BY calendar.startTime;\n\n    SELECT calendar.id as eventID, calendar.startDate AS date, sessions.code, sessions.name FROM calendar JOIN sessions ON sessions.id = calendar.sessionID WHERE calendar.startDate > (SELECT MIN(mindate.date) AS date FROM (SELECT LEAST(participants.date, MIN(calendar.startDate)) AS date FROM participants JOIN participation ON participation.participantID=participants.id JOIN calendar ON calendar.id=participation.eventID WHERE participants.id IN (SELECT id FROM participants WHERE courseID!="FEC" AND courseID!="") GROUP BY participants.name) mindate) AND calendar.startDate < NOW() AND calendar.courseID=\'SOS\' ORDER BY calendar.startDate;\n  ').then((e=>{e?e.length?(n.status(200),n.send(e)):sendError(n,404,"No users found"):sendError(n,500,"Unknown error while fetching catchup data. Got undefined or null result")})).catch((e=>{sendError(n,500,e)}))},endpoints={"/get-preachers":getPreachers,"/verify-user":verifyUser,"/send-otp":sendOTP,"/verify-otp":verifyOTP,"/set-user-photo":setUserPhoto,"/get-buddies":getBuddies,"/get-assignees":getAssignees,"/get-users":getUsers,"/get-home-data":getHomeData,"/get-catchup-data":getCatchupData};class API{constructor(e){this.db=e}async call(e,n){var s=e.get("endpoint"),a=e.get("user");console.log(`[API] [${a||"NO-USER"}] ${s}`),s in endpoints?endpoints[s](e,n,this.db):sendError(n,400,`Endpoint ${s} not found`)}}module.exports=API;