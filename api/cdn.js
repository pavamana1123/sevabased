const cred = require("./cred.js")
const cdnURL = 'https://cdn.iskconmysore.org/content?path=folkapp/dp'
const axios = require("axios")

const cdn = {
  
    head: (filename) => {
      return new Promise((resolve, reject) => {
        axios.head(`${cdnURL}/${filename}`)
          .then(() => {
              resolve()
          })
          .catch((error) => reject(`Error during CDN HEAD request: ${error.message}`))
      })
    },
  
    put: (filename, binaryFile) => {
      return new Promise((resolve, reject) => {
        axios.put(`${cdnURL}/${filename}`, binaryFile,
        {
          headers: {
            'Content-Type': 'image/jpeg',
            'api-key': cred.cdn.apiKey
          }
        })
        .then(() => {
          resolve('File updated successfully')
        })
        .catch((error) => reject(`Error during CDN PUT request: ${error.message}`))
      })
    },
  
    delete: (filename) => {
      return new Promise((resolve, reject) => {
        axios.delete(`${cdnURL}/${filename}`, 
        {
          headers: {
            'api-key': cred.cdn.apiKey
          },
        })
        .then(() => {
          resolve('File deleted successfully')
        })
        .catch((error) => reject(`Error during CDN DELETE request: ${error.message}`))
      })
    },
  
  }

module.exports = cdn