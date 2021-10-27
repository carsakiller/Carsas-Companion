var express = require('express');
var router = express.Router();


router.get('/players', (req, res) => {
	res.json(c2.getPlayers());
})

module.exports = router;