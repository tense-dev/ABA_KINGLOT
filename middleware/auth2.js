const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const axios = require("axios");
dotenv.config();

verifyBody = (req, res, next) => {
    axios.defaults.headers.common["cache-control"] = "no-cache";
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );
    res.setHeader("Content-Type", "application/json");
    if (req.method == "OPTIONS") {
        res.header("Access-Control-Allow-Methods", "PUT, POST, GET");
        return res.status(200).json({});
    }
    let error = {};
    if (req.body.token) {
        let token = req.body.token; +
        jwt.verify(token, process.env.SECRETKEY_BODY, function(err, payload) {
            if (err) {
                res.status(401).json({
                    code: 2,
                    msg: "Authentication body failed!",
                });
            } else {
                if (payload) {
                    req.body = payload;
                    next();
                } else {
                    res.setHeader("Content-Type", "application/json");
                    res.writeHead(401);
                    res.json({
                        code: 2,
                        msg: "Authentication body failed!",
                    });
                }
            }
        });
    } else {
        res.status(401).send({
            code: 2,
            msg: "Please make sure your request has an values body",
        });
    }
};
module.exports = verifyBody;