const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const axios = require("axios");
dotenv.config();

verifyToken = (req, res, next) => {
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
    if (req.headers.authorization) {
        let token = req.headers.authorization.split(" ")[1];
        jwt.verify(token, process.env.SECRET, function(err, payload) {
            if (err) {
                res.status(401).json({
                    code: 2130,
                    msg: "Authentication Headers failed!",
                });
            } else {
                if (payload) {
                    if (payload.result[0] != undefined) {
                        req.user = payload.result[0];
                    } else {
                        req.user = payload.result;
                    }
                    token = req.body.token;
                    if (token) {
                        jwt.verify(token, process.env.SECRETKEY_BODY, function(
                            err,
                            payload
                        ) {
                            if (err) {
                                res.status(401).json({
                                    code: 2120,
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
                                        code: 2120,
                                        msg: "Authentication body failed!",
                                    });
                                }
                            }
                        });
                    } else {
                        next();
                    }
                } else {
                    res.setHeader("Content-Type", "application/json");
                    res.writeHead(401);
                    res.json({
                        code: 2130,
                        msg: "Authentication Headers failed!",
                    });
                }
            }
        });
    } else {
        res.status(401).send({
            code: 2150,
            message: "Please make sure your request has an Authorization headers",
        });
    }
};
module.exports = verifyToken;