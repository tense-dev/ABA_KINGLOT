const sql = require("../Config/db");
const Func = require("../services/function");
const moment = require("moment");
const request = require("request");
const sha1 = require("sha1");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
dotenv.config();
const serverAPI = process.env.SERVICE_API;
const token_line = process.env.TOKEN_LINE;
const serverAPIAff = process.env.SERVICE_APIAFF;
const service = process.env.SERVICE;
const registerLink = process.env.REGISTERLINK;
const prefix = process.env.PREFIX_NAMEUSER;

const kue = require("kue");
const AFF = require("./affiliate");
let queue = kue.createQueue({
    prefix: service, // Can change this value incase you're using multiple apps using same
});

const WITHDRAW = function(entity) {};

WITHDRAW.withdraw = async(req, res, next) => {
    const resultwithdraw = require("../services/queue_withdraw");
    console.log(resultwithdraw);
    if (req.user && req.body && req.body.amount) {
        let userdata = req.user;
        let username = req.user.username;
        let amount = parseFloat(req.body.amount);

        var job = queue
            .create("withdraw", {
                title: "withdraw",
                user: userdata,
                amount: amount,
                service: service,
            })
            .priority("high")
            .delay(500)
            .removeOnComplete(true)
            .save();
        queue.process("withdraw", 1, async(job, callback) => {
            await resultwithdraw(job.data.user, job.data.amount, (done, result) => {
                if (done) {
                    console.log(done);
                    callback(result);
                } else {
                    callback(null, result);
                }
            });
        });
        job
            .on("complete", function(result) {
                res.json({
                    code: result.code,
                    msg: result.msg,
                });
            })
            .on("failed", function(errorMessage) {
                console.log(errorMessage);
                res.json({
                    code: 1,
                    msg: "เกิดข้อผิดพลาด กรุณาทำรายการใหม่อีกครั้ง!!!",
                });
            });
    } else {
        return res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

AFF.affiliateWithdraw = async(req, res) => {
    if (req.user) {
        let username = req.user.username.toString();
        let current = parseFloat(req.body.current);

        await Func.exeSQL("UPDATE affiliated SET current = ? WHERE username = ?", [
            current,
            username,
        ]);

        let token = await Func.exeSQL(
            "SELECT token FROM affiliated WHERE username = ?", [current, username]
        );

        let log = {
            username: username,
            token: token.length > 0 ? token[0].token : "",
            service: "EVOPLAY666",
            current: current,
            hash: sha1(moment().format("YYYY-MM-DD HH:mm:ss") + username),
        };
        await Func.exeSQL("INSERT INTO affiliated_log SET ?", [log]);

        res.json({
            code: "0",
            msg: "SUCCESS",
        });
    } else {
        res.json({
            code: "ERROR",
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

module.exports = WITHDRAW;