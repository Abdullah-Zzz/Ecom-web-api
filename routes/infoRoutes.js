const express = require('express')
const router = express.Router()
const {getItems} = require('../controllers/dataController')

router.get('/getitems', getItems)


module.exports = router; 