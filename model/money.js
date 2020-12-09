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

const MONEY = function(entity) {};

MONEY.amount = async(req, res) => {
    if (req.user && Object.keys(req.user).length > 0) {
        const username = req.user.username;
        let amountUser = await Func.selectCredit(username, serverAPI);
        // console.log(amountUser);
        if (amountUser) {
            res.json(amountUser.currentCredit);
        } else {
            res.json({
                code: 1,
                msg: "ไม่สามารถเช็คเครดิตได้ในขณะนี้!",
            });
        }
    } else {
        res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

MONEY.turnTotal = async(req, res) => {
    let username = req.user.username;
    let dateresult;
    if (req.user) {
        let last_bonus = await Func.exeSQL(
            "SELECT use_bonus,amount,bonus,after_credit FROM t_deposit_statement WHERE account = ? AND use_bonus != 106 ORDER BY id DESC LIMIT 1", [username]
        );

        let countCheckbonus = await Func.selectCountcheckbonus(username);
        let creditTotal = await Func.selectCredit(username, serverAPI);
        let withdrawFix = await Func.exeSQL(
            "SELECT SUM(withdraw_fix) as turntotal FROM t_deposit_statement WHERE account = ? AND is_check = 1", [username]
        );

        console.log(countCheckbonus);
        if (
            last_bonus[0] &&
            countCheckbonus &&
            creditTotal &&
            withdrawFix.length > 0
        ) {
            res.json({
                code: 0,
                turntotal: countCheckbonus.length <= 0 &&
                    parseInt(creditTotal.currentCredit) != last_bonus[0].after_credit ?
                    0 : withdrawFix[0].turntotal ?
                    withdrawFix[0].turntotal : 0,
            });
        } else {
            res.json({
                code: 1,
                msg: "ไม่สามารถเช็คเทิร์นได้ในขณะนี้!",
            });
        }
    } else {
        res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

module.exports = MONEY;