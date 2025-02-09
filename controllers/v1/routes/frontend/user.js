const router = require('express').Router();
const { captureErrorAndRespond } = require('../../../../middleware/errors');
router.get('/', (req, res) => {
    try{
    return res.json({
        message: 'Hello World',
    })
    }
    catch(err) {
        return captureErrorAndRespond(err, res);
    }
});

module.exports = router;