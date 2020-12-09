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
var axios = require("axios");
const e = require("express");

const REWARD = function(entity) {};

REWARD.mission_month = async(req, res, next) => {
    let username = req.user.username;
    if (req.user.username && req.user) {
        let userdata = await Func.exeSQL(
            "SELECT * FROM t_member_account WHERE username = ? AND phone_number = ?", [req.user.username, req.user.phone_number]
        );

        if (userdata && userdata[0] != null) {
            let amountUser = await Func.selectCredit(req.user.username, serverAPI);
            let datedate = moment(new Date()).format("YYYY-MM-DD");
            let sumdeposit = await Func.exeSQL(
                "SELECT SUM(amount) as count FROM t_deposit_statement WHERE amount > 0 AND status = 1 AND account = ?  AND MONTH(date) = MONTH(CURRENT_DATE) ORDER BY id DESC", [req.user.username, datedate]
            );
            let sumdwithdraw = await Func.exeSQL(
                "SELECT SUM(amount) as count FROM t_withdraw_statement WHERE status = 1 AND account = ? AND MONTH(date) = MONTH(?) ORDER BY id DESC", [req.user.username, datedate]
            );
            let sumdepositbonus = await Func.exeSQL(
                "SELECT SUM(bonus) as count FROM t_deposit_statement WHERE bonus > 0 AND status = 1 AND account = ?  AND MONTH(date) = MONTH(CURRENT_DATE) ORDER BY id DESC", [req.user.username, datedate]
            );

            sumdwithdraw[0].count == null ? 0 : sumdwithdraw[0].count;

            if (sumdeposit[0].count > 0) {
                sumdeposit = sumdeposit[0].count;
                let amountdiff = 0;

                if (sumdepositbonus[0].count >= amountUser.currentCredit) {
                    amountdiff = sumdeposit - amountUser.currentCredit;
                } else {
                    if (sumdepositbonus[0].count > sumdeposit) {
                        amountdiff =
                            sumdeposit -
                            (amountUser.currentCredit - sumdepositbonus[0].count);
                    } else {
                        amountdiff =
                            sumdeposit -
                            (amountUser.currentCredit - sumdepositbonus[0].count) -
                            sumdepositbonus[0].count;
                    }
                }
                if (amountdiff > 0) {
                    let config = await Func.exeSQL(
                        " SELECT " +
                        " t1.*, " +
                        " t2.id as idid" +
                        " FROM t_reward_config t1 " +
                        " left join t_reward_statment t2 on t1.id = t2.reward_id AND  t2.username = ? " +
                        " AND MONTH(t2.datetime) = MONTH(CURRENT_DATE) AND YEAR(t2.datetime) = YEAR(CURRENT_DATE) and t2.status = 1" +
                        " WHERE t2.id is null AND t1.type = 'DIAMOND'" +
                        " ORDER BY t1.level asc LIMIT 1", [username]
                    );

                    let cashback_before = await Func.exeSQL("SELECT SUM(qty_change) as amount FROM t_reward_statment WHERE `status` = 2 AND username = ? AND MONTH(datetime) = MONTH(CURRENT_DATE) AND YEAR(datetime) = YEAR(CURRENT_DATE) AND type = 'DIAMOND'", [username])
                    if (config.length > 0) {
                        let qty_change = cashback_before[0].amount > 0 ? cashback_before[0].amount : 0;
                        amountdiff = amountdiff - parseFloat(qty_change);
                        let persen = ((amountdiff / parseFloat(config[0].qty)) * 100);
                        persen = persen > 100 ? 100 : persen;
                        res.json({
                            code: 0,
                            msg: "ดึงข้อมูล สำเร็จ",
                            payload: {
                                persen: parseFloat(persen).toFixed(2),
                                is_receive: parseFloat(persen).toFixed(2) == 100 ? true : false,
                                lossamount: amountdiff,
                                level: config[0].level,
                                id: config[0].id,
                            },
                            type: [
                                { type: 1, name: "รับเป็นเครดิต" },
                                { type: 2, name: "รับเป็นเหรียญ" },
                            ],
                        });
                    } else {
                        res.json({
                            code: 1,
                            msg: "ไม่มีกิจกรรมนี้ในระบบ",
                        });
                    }
                } else {
                    res.json({
                        code: 0,
                        msg: "ดึงข้อมูล สำเร็จ",
                        payload: {
                            persen: 0,
                            is_receive: false,
                            lossamount: 0,
                            level: 1,
                            id: 0,
                        },
                    });
                }
            } else {
                res.json({
                    code: 0,
                    msg: "ดึงข้อมูล สำเร็จ",
                    payload: {
                        persen: 0,
                        is_receive: false,
                        lossamount: 0,
                        level: 1,
                        id: 0,
                    },
                });
            }
        } else {
            res.json({
                code: 1,
                msg: "ไม่พบบัญชีผู้ใช้งาน!!!",
            });
        }
    } else {
        res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

REWARD.get_mission_month = async(req, res, next) => {
    let id = req.body.id;
    let type = 2;
    let username = req.user.username;
    let payload = {};
    if (id > 0) {
        let config = await Func.exeSQL(
            "SELECT * FROM t_reward_config WHERE id = ?", [id]
        );
        let emp = await Func.exeSQL(
            "SELECT * FROM t_member_account WHERE username = ?", [username]
        );
        //เช็ครอบ
        let maxlevel = await Func.exeSQL("SELECT max(level) as level FROM t_reward_config WHERE type = 'DIAMOND'");


        if (config.length > 0) {
            let amount = 0;
            let point = 0;
            point = config[0].point;
            if (type == 2) {
                let AfterPoint = emp[0].point + point
                await Func.exeSQL(
                    "UPDATE t_member_account SET diamond = ? WHERE username = ?", [AfterPoint, username]
                );
                payload = {
                    username: username,
                    reward_id: id,
                    point: point,
                    amount: emp[0].amount,
                    befor_point: emp[0].point,
                    after_point: AfterPoint,
                    round: 1,
                    status: 1,
                    type: config[0].type, //"DIAMOND",
                    level: config[0].level,
                    qty_change: config[0].qty
                };
                let result = await Func.exeSQL("INSERT INTO t_reward_statment SET ?", [
                    payload,
                ]);

                if (maxlevel[0].level == config[0].level) {
                    let update = await Func.exeSQL("update t_reward_statment set `status` = 2 where username = ? AND MONTH(t2.datetime) = MONTH(CURRENT_DATE) AND YEAR(t2.datetime) = YEAR(CURRENT_DATE)", [
                        username,
                    ]);
                }

                if (result) {
                    res.json({
                        code: 0,
                        msg: "รับรางวัลสำเร็จ",
                    });
                } else {
                    res.json({
                        code: 1,
                        msg: "รับรางวัลไม่สำเร็จ กรุณาติดต่อพนักงาน",
                    });
                }
            }

        } else {
            res.json({
                code: 1,
                msg: "กิจกรรมนี้ไม่มีแล้ว",
            });
        }
    } else {
        res.json({
            code: 1,
            msg: "!PARAMETER NOT FOUND",
        });
    }
};

REWARD.mission_day = async(req, res) => {
    if (req.user && req.user.username) {
        let get_deposit = await Func.exeSQL("CALL getRewardDayByUser(?,?,?)", [
            req.body.month,
            req.body.year,
            req.user.username,
        ]);
        if (get_deposit[0]) {
            res.json(get_deposit[0]);
        }
    }
};

REWARD.receive_mission_day = async(req, res) => {
    let username = req.user.username;
    let id = req.body.id;
    if (
        req.user &&
        req.user.username &&
        req.body.id > 0 &&
        req.body.reward_id > 0
    ) {
        let config = await Func.exeSQL(
            "SELECT * FROM t_reward_config WHERE id = ?",
            req.body.reward_id
        );
        let currentdate = moment().format("YYYY-MM-DD");
        if (config[0]) {
            let updated = await Func.exeSQL(
                "UPDATE t_reward_deposit SET accepted = 1 , accepted_date = ? , `status` = 2 WHERE id = ?", [currentdate, req.body.id]
            );
            let emp = await Func.exeSQL(
                "SELECT * FROM t_member_account WHERE username = ?", [username]
            );

            let amount = 0;
            let point = 0;
            point = config[0].point;
            let AfterPoint = emp[0].diamond + point;
            await Func.exeSQL(
                "UPDATE t_member_account SET diamond = ? WHERE username = ?", [AfterPoint, username]
            );
            payload = {
                username: username,
                reward_id: id,
                point: point,
                amount: amount,
                befor_point: emp[0].point,
                after_point: AfterPoint,
                round: 1,
                status: 1,
                type: "POINT",
                level: config[0].level,
            };
            let result = await Func.exeSQL("INSERT INTO t_reward_statment SET ?", [
                payload,
            ]);
            if (result) {
                res.json({
                    code: 0,
                    msg: "สำเร็จ",
                });
            }
        } else {
            res.json({
                code: 1,
                msg: "ไม่สำเร็จ",
            });
        }
    } else {
        res.json({
            code: 1,
            msg: "! PARAMETER NOT FOUND",
        });
    }
};

module.exports = REWARD;