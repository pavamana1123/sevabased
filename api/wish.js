const moment = require("moment")
const axios = require("axios")
const cred = require("./cred.js")

const TelegramBot = require('node-telegram-bot-api')
const bot = new TelegramBot(cred.telebot.botToken, {polling: false})

const wameURL = "https://wame.iskconmysore.org"
const template = "folk_wish"
const message = `Hare Krishna Chi. {{1}} !! 🌟🎉

Wishing you a very happy Krishna Conscious birthday!! 🎂 May Their Lordships Sri Sri Krishna Balaram shower upon you Their choicest blessings ✨

Make this day special by visiting our temple 🛕 and having a divine darshan of the Lord. 🙏

With heartfelt wishes,
{{2}}`

const wish = (db)=>{


    db.query(`SELECT name, phone, preacher, dob FROM participants WHERE dob LIKE '%${moment().format("-MM-DD")}'`)
    .then(result=>{
        if(result.length){
            console.log("[WISH]", `${result.length} wishes today..`)
            result.forEach(({name, phone, preacher}) => {
                const shortName = name.split(" ")[0]
                const fullName = preacher=="SKKD"?"Sanaka Kumar Dasa":"Pavana Prana Dasa"
                axios.post(wameURL, 
                    {
                        template,
                        phone,
                        values: [
                            shortName,
                            fullName
                        ]
                    },
                    {
                        headers: {
                            "api-key": cred.wame.apiKey
                        }
                    }
                ).then(()=>{
                    console.log("[WISH]", `Wish sent to ${name} (${phone})`)
                    bot.sendMessage(cred.telebot.wishChatID, `Below wish is sent to ${name} (${phone})

${message.replace("{{1}}", shortName).replace("{{2}}", fullName)}`)
                }).catch(err=>{
                    console.log("[WISH]", `Wish error: ${err}`)
                    bot.sendMessage(cred.telebot.wishChatID, `Wish error: ${err}`)
                })
            })
        }else{
            console.log("[WISH]", "No birthdays today!")
            bot.sendMessage(cred.telebot.wishChatID, "No birthdays today!")
        }
    }).catch(err=>{
        console.log(`[WISH] Wish error: ${err}`)
        bot.sendMessage(cred.telebot.wishChatID, `Wish error: ${err}`)
    })
}

module.exports = wish