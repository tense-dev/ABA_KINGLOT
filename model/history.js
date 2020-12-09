const sql = require("../Config/db");
const Func = require("../services/function");
const moment = require("moment");
const request = require("request");
const sha1 = require("sha1");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const { exeSQL } = require("../services/function");
dotenv.config();
const serverAPI = process.env.SERVICE_API;
const token_line = process.env.TOKEN_LINE;
const serverAPIAff = process.env.SERVICE_APIAFF;
const service = process.env.SERVICE;
const registerLink = process.env.REGISTERLINK;
const prefix = process.env.PREFIX_NAMEUSER;

const HISTORY = function(entity) {};

HISTORY.history = async(req, res) => {
    const history_type = req.params.type;
    const username = req.user.username;
    //console.log(username);
    let deposit = {};
    let withdraw = {};
    let bonus = {};
    if (history_type == "deposit") {
        deposit = await Func.exeSQL(
            "SELECT * FROM t_deposit_statement WHERE account = ? AND amount > 0 ORDER BY id DESC LIMIT 20", [username]
        );
        res.json({
            code: 0,
            msg: "ข้อมูลการฝากเงิน",
            payload: deposit,
        });
    } else if (history_type == "withdraw") {
        withdraw = await Func.exeSQL(
            "SELECT * FROM t_withdraw_statement WHERE account = ? ORDER BY id DESC LIMIT 20", [username]
        );
        res.json({
            code: 0,
            msg: "ข้อมูลการถอนเงิน",
            payload: withdraw,
        });
    } else if (history_type == "bonus") {
        bonus = await Func.exeSQL(
            "SELECT TT.* FROM t_deposit_statement as TT INNER JOIN t_bonus_config AS T2 on TT.use_bonus = T2.bonus_id and T2.bonus_id != 104 WHERE account = ? ORDER BY id DESC LIMIT 20", [username]
        );
        res.json({
            code: 0,
            msg: "ข้อมูลการฝากเงิน",
            payload: bonus,
        });
    } else if (history_type == "All") {
        deposit = await Func.exeSQL(
            "SELECT * FROM t_deposit_statement WHERE account = ? AND amount > 0 ORDER BY id DESC LIMIT 20", [username]
        );

        withdraw = await Func.exeSQL(
            "SELECT * FROM t_withdraw_statement WHERE account = ? ORDER BY id DESC LIMIT 20", [username]
        );

        bonus = await Func.exeSQL(
            "SELECT TT.* FROM t_deposit_statement as TT INNER JOIN t_bonus_config AS T2 on TT.use_bonus = T2.bonus_id and T2.bonus_id != 104 WHERE account = ? ORDER BY id DESC LIMIT 20", [username]
        );
        res.json({
            code: 0,
            msg: "ข้อมูลรายการทั้งหมด",
            deposit: deposit,
            withdraw: withdraw,
            bonus: bonus,
        });
    } else {
        res.json({
            code: 1,
            msg: "ไม่มีข้อมูลในขณะนี้!",
        });
        // exit();
    }
};

HISTORY.credit_system = async(req, res) => {
    let max_member = 0;
    let results = await Func.exeSQL(
        "SELECT * FROM f_member_account WHERE username = ? ", [req.user.username]
    );
    if (results.length > 0) {
        if (results[0].max_member != 50) {
            let statement = await Func.exeSQL(
                "SELECT COUNT(id) count, amount FROM t_deposit_statement WHERE account = ? AND date >= '2020-03-02' AND status = 1 AND amount >= 500", [req.user.username]
            );
            if (statement.length > 0) {
                if (statement[0].count >= 5) {
                    max_member = 50;
                } else if (statement[0].count >= 4) {
                    max_member = 40;
                } else if (statement[0].count >= 3) {
                    max_member = 30;
                } else if (statement[0].count >= 2) {
                    max_member = 20;
                } else if (statement[0].count >= 1) {
                    max_member = 10;
                }

                await Func.exeSQL(
                    "UPDATE `f_member_account` SET max_member= ? WHERE username=  ? ", [max_member, req.user.username]
                );
                let res = await Func.exeSQL(
                    "SELECT * FROM f_member_account WHERE username = ? ", [req.user.username]
                );
                res.json({
                    code: 0,
                    payload: res,
                });
            } else {
                res.json({
                    code: 1,
                    payload: results[0],
                });
            }
        } else {
            res.json({
                code: 0,
                payload: results[0],
            });
        }
    } else {
        res.json({
            code: 0,
            payload: [],
        });
    }
};
HISTORY.deposit_history = async(req, res) => {
    let date_now = moment().format("YYYY-MM-DD HH:mm:ss");
    let at_day = moment(date_now).day();
    let date_start = "";
    let date_end = "";
    let date_week = "";
    //////////////////////// start check date ///////////////////////////////
    if (at_day >= 3 && at_day <= 5) {
        date_week = moment(date_now).add(-1, "days").format("YYYY-MM-DD");
        date_start = moment(moment(date_week).startOf("week"))
            .add(3, "days")
            .format("YYYY-MM-DD 00:00:00");
        date_end = moment(moment(date_week).endOf("week"))
            .add(-1, "days")
            .format("YYYY-MM-DD 23:59:59");
    } else {
        date_week = moment(date_now).add(-4, "days").format("YYYY-MM-DD");
        date_start = moment(date_week)
            .endOf("week").format("YYYY-MM-DD");
        date_end = moment(date_now).format("YYYY-MM-DD 23:59:59");
    }
    const limit = req.params.limit ? req.params.limit : 20;
    let result = await Func.exeSQL(
        "SELECT SUM(amount) as amount ,account ,'' as imagepath FROM `t_deposit_statement` WHERE date >= ?  GROUP BY account ORDER BY SUM(amount) desc LIMIT ?", [date_start, parseInt(limit)]
    );
    res.json({
        code: 0,
        payload: result,
    });
};
HISTORY.wheel_history = async(req, res) => {
    let username = req.user.username;
    if (username != '') {
        let result = await Func.exeSQL(
            "SELECT datetime,amount FROM t_wheel_statement WHERE username = ?", [username]
        );
        res.json({
            code: 0,
            payload: result,
        });
    } else {
        res.json({
            code: 1,
            payload: "!PARAMETER NO FLOUND",
        });
    }
};
HISTORY.bonusbyAff_history = async(req, res) => {
    let username = req.user.username;
    if (username != '') {
        let result = []
        let sqlMember = await exeSQL("SELECT * FROM f_member_account WHERE username = ?", username);
        if (sqlMember.length > 0) {
            let AffMember = await Func.exeSQL(
                "SELECT datetime,username,credit FROM f_member_account WHERE join_token = ? AND active_topup = 1 ORDER BY datetime  DESC  LIMIT 50", [sqlMember[0].token]
            );
            let results = [];
            for (const item of AffMember) {
                results.push({
                    date: moment(item.datetime).format('YYYY-MM-DD'),
                    time: moment(item.datetime).format('HH:mm:ss'),
                    credit: item.credit,
                    username: username
                })
            }
            res.json({
                code: 0,
                payload: results,
            });
        } else {
            res.json({
                code: 1,
                payload: [],
            });
        }
    } else {
        res.json({
            code: 1,
            payload: "!PARAMETER NO FLOUND",
        });
    }
};


module.exports = HISTORY;