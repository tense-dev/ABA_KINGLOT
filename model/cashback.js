const sql = require("../Config/db");
const Func = require("../services/function");
const moment = require("moment");
const request = require("request");
const sha1 = require("sha1");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const connection = require("../Config/db");
const { exeSQL } = require("../services/function");
dotenv.config();
const serverAPI = process.env.SERVICE_API;
const token_line = process.env.TOKEN_LINE;
const serverAPIAff = process.env.SERVICE_APIAFF;
const service = process.env.SERVICE;
const registerLink = process.env.REGISTERLINK;
const prefix = process.env.PREFIX_NAMEUSER;

const CASHBACK = function(entity) {};


CASHBACK.cashback = async(req, res, next) => {
    if (req.user.username && req.user) {
        let userdata = await Func.exeSQL(
            "SELECT * FROM t_member_account WHERE username = ? AND phone_number = ?", [req.user.username, req.user.phone_number]
        );

        if (userdata && userdata[0] != null) {
            let amountUser = await Func.selectCredit(req.user.username, serverAPI);

            let checkCashbackDeposit = await Func.exeSQL(
                "SELECT COUNT(id) count FROM t_deposit_statement WHERE account = ?  AND  date = CURRENT_DATE AND use_bonus = 1011", [req.user.username]
            );
            let checkCashbackWithdraw = await Func.exeSQL(
                "SELECT COUNT(id) count FROM t_withdraw_statement WHERE account = ?  AND  date = CURRENT_DATE AND use_bonus IN ('1012') ", [req.user.username]
            );
            if (checkCashbackDeposit[0].count == 0 && checkCashbackWithdraw[0].count == 0) {
                let datedate = moment(new Date()).format("YYYY-MM-DD");
                let sumdeposit = await Func.exeSQL(
                    "SELECT SUM(amount) as count FROM t_deposit_statement WHERE status = 1 AND account = ? AND use_bonus = 104 AND date = CURRENT_DATE ORDER BY id DESC", [req.user.username, datedate]
                );
                let sumdwithdraw = await Func.exeSQL(
                    "SELECT SUM(amount) as count FROM t_withdraw_statement WHERE status = 1 AND account = ? AND date = ? ORDER BY id DESC", [req.user.username, datedate]
                );
                sumdwithdraw[0].count == null ? 0 : sumdwithdraw[0].count;
                if (
                    sumdeposit[0].count > 0 &&
                    (sumdwithdraw[0].count == 0 || sumdwithdraw[0].count == null)
                ) {
                    sumdeposit = sumdeposit[0].count;
                    let amountdiff = sumdeposit - amountUser.currentCredit;
                    if (amountdiff > 0) {
                        if (amountdiff >= 9000) {
                            amountdiff = 9000 * 0.1;
                        } else {
                            amountdiff = amountdiff * 0.1;
                        }
                        res.json({
                            code: 0,
                            msg: "ดึงข้อมูล สำเร็จ",
                            payload: {
                                amount: amountUser.currentCredit,
                                cashback: amountdiff,
                            },
                        });
                    } else {
                        res.json({
                            code: 1,
                            msg: "ไม่พบยอดเสีย สำหรับวันนี้",
                        });
                    }
                } else {
                    res.json({
                        code: 1,
                        msg: "ไม่พบยอดเสีย สำหรับวันนี้",
                    });
                }
            } else {
                res.json({
                    code: 1,
                    msg: "คุณได้รับ Cashback สำหรับวันนี้ไปแล้ว!",
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

CASHBACK.receive_cashback = async(req, res, next) => {
    let typeCashback = req.params.type;
    let bank_number = req.user.bank_number;
    let bank_code = req.user.bank_code;
    let full_name = req.user.full_name;
    let usertype = req.user.usertype;
    if (req.user) {
        let userdata = await Func.exeSQL(
            "SELECT * FROM t_member_account WHERE username = ? AND phone_number = ?", [req.user.username, req.user.phone_number]
        );
        if (userdata && userdata != null) {
            let username = req.user.username.toString();
            let amountUser = await Func.selectCredit(username, serverAPI);
            let line_id = req.user.line_userId ? req.user.line_userId : null;
            let checkCashbackDeposit = await Func.exeSQL(
                "SELECT COUNT(id) count FROM t_deposit_statement WHERE account = ?  AND  date = CURRENT_DATE AND use_bonus = 1011", [req.user.username]
            );
            let checkCashbackWithdraw = await Func.exeSQL(
                "SELECT COUNT(id) count FROM t_withdraw_statement WHERE account = ?  AND  date = CURRENT_DATE AND use_bonus IN ('1012','402') ", [req.user.username]
            );
            if (amountUser.currentCredit > 10) {
                res.json({
                    code: 1,
                    msg: 'ต้องมียอดเครดิตคงเหลือในระบบต่ำกว่า 10 บาท',
                });
                return false;
            }
            if (checkCashbackDeposit[0].count == 0 && checkCashbackWithdraw[0].count == 0) {
                let datedate = moment(new Date()).format("YYYY-MM-DD");
                let creditTotal = await Func.selectCredit(req.user.username, serverAPI);
                if (creditTotal.currentCredit >= 0) {
                    let sumdeposit = await Func.exeSQL(
                        "SELECT SUM(amount) as count FROM t_deposit_statement WHERE status = 1 AND account = ? AND use_bonus = 104 AND date = CURRENT_DATE ORDER BY id DESC", [req.user.username, datedate]
                    );
                    let sumdwithdraw = await Func.exeSQL(
                        "SELECT SUM(amount) as count FROM t_withdraw_statement WHERE status = 1 AND account = ? AND date = ? ORDER BY id DESC", [req.user.username, datedate]
                    );
                    sumdwithdraw[0].count == null ? 0 : sumdwithdraw[0].count;
                    if (
                        sumdeposit[0].count > 0 &&
                        (sumdwithdraw[0].count == 0 || sumdwithdraw[0].count == null)
                    ) {
                        sumdeposit = sumdeposit[0].count;
                        let amountdiff = sumdeposit - amountUser.currentCredit;
                        let cashbackTotal = 0;
                        if (amountdiff >= 9000) {
                            cashbackTotal = 9000 * 0.1;
                        } else {
                            cashbackTotal = amountdiff * 0.1;
                        }
                        if (typeCashback == "addCredit") {
                            let payload = {
                                date: moment(new Date()).format("YYYY-MM-DD"),
                                time: moment(new Date()).format("HH:mm:ss"),
                                amount: 0,
                                bank: 401,
                                account: username,
                                bonus: parseInt(cashbackTotal),
                                point: 0,
                                fix_multiple: 0,
                                channel: "รับ cashback 10%",
                                detail: "",
                                tx_hash: moment(new Date()).format("YYYY-MM-DD") +
                                    parseInt(cashbackTotal) +
                                    username +
                                    "1011",
                                status: 2,
                                is_bonus: 1,
                                use_bonus: "1011", // EDIT
                                withdraw_fix: cashbackTotal * 2,
                                is_check: 1,
                                befor_credit: 0,
                                after_credit: 0,
                                comment: "ยอดฝาก : " + sumdeposit + " = ยอดเสีย : " + amountdiff,
                                fix_withdraw: 0,
                            };

                            let resultInsertStatement = await exeSQL(
                                "INSERT INTO t_deposit_statement SET ?", [payload]
                            );
                            if (resultInsertStatement) {
                                let resultAddcredit = await Func.addCreditUser(
                                    username,
                                    cashbackTotal,
                                    serverAPI
                                );
                                if (resultAddcredit == null) {
                                    let checkCredit = await Func.selectCredit(username, serverAPI);
                                    resultAddcredit = await Func.addCreditUser(
                                        username,
                                        cashbackTotal,
                                        serverAPI,
                                        creditTotal.currentCredit,
                                        checkCredit.currentCredit
                                    );
                                }
                                if (resultAddcredit) {
                                    let checkCredit = await Func.selectCredit(username, serverAPI);
                                    let resultUpdateStatement = await Func.exeSQL(
                                        "UPDATE t_deposit_statement SET after_credit = ? , befor_credit = ? ,status = 1,is_check = 1 WHERE id = ?", [
                                            checkCredit.currentCredit,
                                            checkCredit.currentCredit,
                                            resultInsertStatement.insertId,
                                        ]
                                    );
                                    if (resultUpdateStatement) {
                                        if (line_id) {
                                            let payloadNoti = {
                                                to: line_id,
                                                messages: [{
                                                    type: "text",
                                                    text: "รับ Cashback สำเร็จ ให้กับยูสเซอร์เนม " +
                                                        username +
                                                        " รวมเป็นยอด " +
                                                        cashbackTotal +
                                                        " บาท ",
                                                }, ],
                                            };
                                            axios
                                                .post(
                                                    "https://api.line.me/v2/bot/message/push",
                                                    payloadNoti, {
                                                        headers: {
                                                            Authorization: "Bearer " + token_line,
                                                            "cache-control": "no-cache",
                                                        },
                                                    }
                                                )
                                                .then((response) => {
                                                    res.json({
                                                        code: 0,
                                                        msg: "รับ Cashback สำเร็จ!",
                                                        payload: {
                                                            withdraw: cashbackTotal,
                                                        },
                                                    });
                                                })
                                                .catch(function(err) {
                                                    Func.Error_log(err, req.path, req.method, "line"),
                                                        (req.err = err);
                                                });
                                        } else {
                                            res.json({
                                                code: 0,
                                                msg: "รับ Cashback สำเร็จ!",
                                                payload: {
                                                    cashback: cashbackTotal,
                                                },
                                            });
                                        }
                                    } else {
                                        res.json({
                                            code: 1,
                                            msg: "กรุณาตรวจสอบว่ายอดเงินเข้าหรือไม่! ถ้าไม่เข้ากรุณาติดต่อพนักงาน",
                                        });
                                    }
                                } else {
                                    res.json({
                                        code: 1,
                                        msg: "ไม่สามารถเพิ่มเครดิตได้ในขณะนี้!",
                                    });
                                }
                            } else {
                                res.json({
                                    code: 1,
                                    msg: "ไม่สามารถเพิ่มรายการรับ ยอดเสียได้ในขณะนี้!",
                                });
                            }
                        } else if (typeCashback == "withdrawCashback") {
                            let payload = {
                                date: moment(new Date()).format("YYYY-MM-DD"),
                                time: moment(new Date()).format("HH:mm:ss"),
                                amount: parseInt(cashbackTotal),
                                account: username,
                                befor_credit: parseInt(cashbackTotal),
                                after_credit: 0,
                                hash: sha1(momentjs().format("YYYY-MM-DD") + username + cashbackTotal + "1012"),
                                bank: 0,
                                status: 3,
                                bank_number: bank_number,
                                bank_name: full_name,
                                bank_code: bank_code,
                                use_bonus: "1012",
                                usertype: usertype,
                                deposit_amount: 0,
                                deposit_bonus: 0,
                                amount_plus: 0,
                                withdraw_from: "CASHBACK",
                            };
                            let resultInsertwithdraw = await insertStatementwithdraw(payload);
                            if (resultInsertwithdraw) {
                                return res.json({
                                    code: "SUCCESS",
                                    msg: "เพิ่มรายการถอนสำเร็จ!",
                                });
                            } else {
                                return res.json({
                                    code: "ERROR",
                                    msg: "ไม่สามารถเพิ่มรายการถอน Cashback ได้ในขณะนี้!",
                                });
                            }
                        }
                    } else {
                        res.json({
                            code: 1,
                            msg: "ไม่พบยอดเสียสำหรับวันนี้!",
                        });
                    }
                } else {
                    res.json({
                        code: 0,
                        msg: "ไม่สามารถเช็คเครดิตได้ใน ขณะนี้!",
                        payload: {
                            cashback: 0,
                            amount: 0,
                        },
                    });
                }
            } else {
                res.json({
                    code: 1,
                    msg: "คุณได้รับ Cashback สำหรับวันนี้ไปแล้ว!",
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


const insertStatementwithdraw = (payload) => {
    return new Promise((resolve, reject) => {
        connection.query("INSERT INTO `t_withdraw_statement` SET ?", payload, function(error, results, fields) {
            console.log("INSERTED AND NOTI WILL BE SENT");
            if (error) {
                resolve(null);
            } else {
                axios.get("http://topupoffice.com/withdraw/withdrawWallet?service=" + service + "&id=" + results.insertId, {
                    timeout: 30000,
                });
                resolve(true);
            }
        });
    });
};




module.exports = CASHBACK;