const cred = require("./cred.js")
const otpURL = 'https://otp.iskconmysore.org/data'
const title = "OTP from FOLK Mysore App"
const axios = require("axios")

const otp = {
  
    send: ({ id, target }) => {
      return new Promise((resolve, reject) => {
        axios.post(otpURL, { id, target, title },
          { 
            headers: {
              'Content-Type': 'application/json',
              'api-key': cred.otp.apiKey,
              endpoint: "/send"
            }
          }
        ).then(() => {
          resolve({
            status: 200
          })
        })
        .catch(error => {
          resolve({
            status: error.response.status,
            error: error.message
          })
        })
      })
    },
  
    verify: ({ otp , id }) => {
      return new Promise((resolve, reject) => {
        axios.post(otpURL, { otp , id }, {
          headers: {
            'Content-Type': 'application/json',
            'api-key': cred.otp.apiKey,
            endpoint: "/verify"
          }
        })
        .then(() => {
          resolve({
            status: 200
          })
        })
        .catch(error => {
          resolve({
            status: error.response.status,
            error: error.message
          })
        })
      })
    },
  
  }

module.exports = otp