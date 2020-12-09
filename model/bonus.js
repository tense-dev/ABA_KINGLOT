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

const BONUS = function(entity) {};

BONUS.freebonus = async(req, res) => {
    const username = req.user.username;
    let result = {};
    if (req.user && Object.keys(req.user).length > 0 && username) {
        let result = await Func.exeSQL( // AND start_time >= ? AND end_time <= ?
            "SELECT id,start_time,end_time,trunover,bonus FROM t_member_free_bonus WHERE username = ? AND status = 0", [
                username,
                moment().format("Y-MM-DD HH:mm:ss"),
                moment().format("Y-MM-DD HH:mm:ss"),
            ]
        );
        if (result.length > 0) {
            res.json({
                code: 0,
                msg: "ดึงข้อมูลสำเร็จ",
                payload: result,
            });
        } else {
            res.json({
                code: 1,
                msg: "ไม่พบโบนัสสำหรับยูสเซอร์นี้!",
            });
        }
    } else {
        res.json({
            code: 1,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

BONUS.getFreebonus = async(req, res) => {
    const id = req.body.id;
    const username = req.user.username;
    let bonus = {};
    let insertFreebonus = {};
    let resultUpdate = {};
    let resultAddcredit = {};
    let updatefreeBonus = {};
    if (req.user && req.body && req.body.id) {
        bonus = await Func.exeSQL(
            "SELECT * FROM t_member_free_bonus WHERE id = ?", [id]
        );
        if (bonus && bonus.length > 0) {
            let payload = {};
            if (bonus[0].comment == 'เครดิตฟรี 50 บาท') {
                payload = {
                    id: null,
                    date: moment(new Date()).format("Y-MM-DD"),
                    time: moment(new Date()).format("HH:mm:ss"),
                    amount: 0,
                    bank: 94,
                    account: username,
                    bonus: 50,
                    point: 0,
                    fix_multiple: 50,
                    channel: "Register",
                    detail: 'เครดิตฟรี 50 บาท',
                    tx_hash: bonus[0].hesh, //bonus[0].hesh,
                    status: 0,
                    is_bonus: 1,
                    use_bonus: 1150,
                    withdraw_fix: 2500, //ต้องทำเทินเท่าไหร่
                    is_check: 1,
                    befor_credit: 0,
                    after_credit: 50,
                    fix_withdraw: 500, //อันถอน
                    comment: 'เครดิตฟรี 50 บาท',
                };
            } else {
                payload = {
                    id: null,
                    date: moment(new Date()).format("Y-MM-DD"),
                    time: moment(new Date()).format("HH:mm:ss"),
                    amount: 0,
                    bank: 107,
                    account: req.user.username,
                    bonus: bonus[0].bonus,
                    point: 0,
                    fix_multiple: 3,
                    channel: "FREE",
                    detail: "FREE",
                    tx_hash: bonus[0].hesh,
                    status: 0,
                    is_bonus: 1,
                    use_bonus: "107",
                    withdraw_fix: bonus[0].trunover, //ต้องทำเทิน
                    is_check: 0,
                    befor_credit: 0,
                    after_credit: 0,
                    fix_withdraw: bonus[0].fix_withdraw, //อันถอน
                };
            }
            try {
                insertFreebonus = await Func.exeSQL(
                    "INSERT INTO t_deposit_statement SET ? ", [payload]
                );
                if (insertFreebonus) {
                    resultUpdate = await Func.exeSQL(
                        "UPDATE t_member_free_bonus SET status = 1 WHERE id = ?", [id]
                    );
                    if (resultUpdate) {
                        resultAddcredit = await Func.addCreditFreeUser(
                            username,
                            bonus,
                            serverAPI
                        );
                        if (resultAddcredit) {
                            if (parseFloat(resultAddcredit.previousDownlineGiven) <= 10) {
                                updatefreeBonus = await Func.exeSQL(
                                    "UPDATE t_deposit_statement SET is_check = -1 WHERE account = ?", [username]
                                );
                            }
                            updatefreeBonus = await Func.exeSQL(
                                "UPDATE t_deposit_statement SET is_check = 1 , status = 1 , befor_credit = ? ,after_credit = ? WHERE id = ?", [
                                    resultAddcredit.previousDownlineGiven.toFixed(2),
                                    resultAddcredit.currentBalance.toFixed(2),
                                    insertFreebonus.insertId,
                                ]
                            );
                            if (updatefreeBonus) {
                                res.json({
                                    code: 0,
                                    msg: "รับโบนัสเรียบร้อยแล้ว",
                                });
                            } else {
                                res.json({
                                    code: 1,
                                    msg: "รับโบนัสไม่สำเร็จ กรุณาติดต่อพนักงาน!",
                                });
                            }
                        } else {
                            res.json({
                                code: 1,
                                msg: "รับโบนัสไม่สำเร็จ กรุณาติดต่อพนักงาน!",
                            });
                        }
                    } else {
                        res.json({
                            code: 1,
                            msg: "รับโบนัสฟรีไม่สำเร็จ กรุณาลองใหม่ภายหลัง!",
                        });
                    }
                } else {
                    res.json({
                        code: 1,
                        msg: "เพิ่มรายการฟรีโบนัสไม่สำเร็จ!",
                    });
                }
            } catch (error) {
                console.log("================================================================================================================== > " + error)
            }
        } else {
            res.json({
                code: 1,
                msg: "ไม่พบฟร๊โบนัสดังกล่าว!",
            });
        }
    } else {
        res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

BONUS.is_bonus = async(req, res) => {
    const username = req.user.username;
    const is_bonus = req.body.is_bonus ? req.body.is_bonus : 0;
    let result = {};
    result = await Func.exeSQL(
        "UPDATE t_member_account SET is_bonus = ? WHERE username = ? ", [is_bonus, username]
    );
    if (result) {
        res.json({
            code: 0,
            msg: "อัพเดทโบนัสเสร็จเรียบร้อย!",
        });
    } else {
        res.json({
            code: 1,
            msg: "เกิดข้อผิดพลาด กรุณาลองใหม่ภายหลัง!",
        });
    }
};

BONUS.bonus = async(req, res) => {
    const Bonus_list = await Func.selectBonusALL(req.user, 1000);
    if (Bonus_list) {
        res.json({
            code: 0,
            msg: "ดึงข้อมูลสำเร็จ",
            payload: Bonus_list,
        });
    }
};

BONUS.bonus_id = async(req, res) => {
    if (req.params && req.params.bonus_id) {
        let bonusDetail = await Func.exeSQL(
            "SELECT bonus_type,fix_deposit,bunnus_limit FROM t_bonus_config WHERE use_bonus = ? ", [req.params.bonus_id]
        );
        if (bonusDetail.length > 0) {
            res.json({
                code: 0,
                msg: "ดึงข้อมูลโบนัสสำเร็จ!",
                payload: bonusDetail[0],
            });
        } else {
            res.json({
                code: 1,
                msg: "ไม่พบโบนัสดังกล่าว!",
            });
        }
    } else {
        res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

module.exports = BONUS;