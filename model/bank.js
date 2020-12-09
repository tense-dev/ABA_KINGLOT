const sql = require("../Config/db");
const Func = require("../services/function");
const moment = require("moment");
const request = require("request");
const sha1 = require("sha1");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const { exeSQL } = require("../services/function");
const e = require("express");
dotenv.config();
const serverAPI = process.env.SERVICE_API;
const token_line = process.env.TOKEN_LINE;
const serverAPIAff = process.env.SERVICE_APIAFF;
const service = process.env.SERVICE;
const registerLink = process.env.REGISTERLINK;
const prefix = process.env.PREFIX_NAMEUSER;

const BANK = function(entity) {};

BANK.add_member_bank = async(req, res) => {
    let bank_number = req.body.bank_number;
    let bank_code = req.body.bank_code;
    let username = req.user.username;

    resultCheckCount = await Func.exeSQL(
        "SELECT COUNT(id) as count FROM t_member_bank WHERE username = ?", [username]
    );
    if (resultCheckCount[0]) {
        // if (resultCheckCount[0].count == 5) {
        //     res.json({
        //         code: 1,
        //         msg: "สามารถเพิ่มบัญชีได้สูงสุด 5 บัญชีเท่านั้น",
        //     });
        // }

        if (1 == 1) {
            res.json({
                code: 1,
                msg: "! ปิดปรับปรุง ระบบเพิ่ม 5 บัญชี",
            });
        }
    }

    if (req.body && bank_number && bank_code) {
        bankList = await Func.checkBank(bank_code, bank_number);
        if (bankList && Object.keys(bankList).length > 0) {
            resultCheck = await Func.exeSQL(
                "SELECT * FROM t_member_bank WHERE bank_number = ? AND bank_code = ? AND username = ?", [
                    bankList.bank_number,
                    bankList.bank_code,
                    username,
                ]
            );
            let _banktype = await Func.checkbank_type(bank_code);
            if (!resultCheck.length > 0) {
                let payload = {
                    username: username,
                    full_name: bankList.bank_name,
                    bank_code: bankList.bank_code,
                    bank_name: _banktype,
                    bank_number: bankList.bank_number,
                    createdAt: new Date(),
                };
                try {
                    let resultInsert = await Func.exeSQL(
                        "INSERT INTO t_member_bank SET ? ", [payload]
                    );

                    if (resultInsert) {
                        res.json({
                            code: 0,
                            msg: "เพิ่มบัญชีเรียบร้อย",
                        });
                    } else {
                        res.json({
                            code: 1,
                            msg: "เพิ่มบัญชีไม่สำเร็จ กรุณาลองใหม่อีกครั้ง!",
                        });
                    }

                } catch (error) {
                    res.json({
                        code: 1,
                        msg: "มีเลขบัญชีนี้แล้วในระบบ",
                    });
                }
            } else {
                res.json({
                    code: 1,
                    msg: "มีเลขบัญชีนี้แล้วในระบบ",
                });
            }
        } else {
            res.json({
                code: 1,
                msg: "บัญชีธนาคารของคุณไม่ถูกต้อง!",
            });
        }
    } else {
        res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

BANK.del_member_bank = async(req, res) => {
    let bank_number = req.body.bank_number;
    let username = req.user.username;
    result = await Func.exeSQL(
        "DELETE FROM t_member_bank WHERE username = ? AND bank_number = ?", [username, bank_number]
    );
    if (result) {
        res.json({
            code: 0,
            msg: "ลบบัญชีหมายเลข " + bank_number + " เรียบร้อย",
        });
    } else {
        res.json({
            code: 1,
            msg: "ลบข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
        });
    }
};

BANK.list_member_bank = async(req, res) => {
    let username = req.user.username;
    result = await Func.exeSQL(
        "SELECT * FROM t_member_bank WHERE username = ? ", [username]
    );
    if (result.length > 0) {
        res.json({
            code: 0,
            payload: result,
        });
    } else {
        res.json({
            code: 1,
            msg: "ไม่พบข้อมูลบัญชี",
        });
    }
};

BANK.verify_bank = async(req, res) => {
    let bank_number = req.body.bank_number;
    let bank_code = req.body.bank_code;
    let username = req.user.username;
    if (req.body && bank_number && bank_code) {
        bankList = await Func.checkBank(bank_code, bank_number);
        if (bankList && Object.keys(bankList).length > 0) {
            resultCheck = await Func.exeSQL(
                "SELECT * FROM t_member_bank WHERE bank_number = ? AND bank_code = ? AND username = ?", [
                    bankList.bank_number,
                    bankList.bank_code,
                    username
                ]
            );
            let _banktype = await Func.checkbank_type(bank_code);
            console.log('resultCheck', resultCheck.length)
            if (!resultCheck.length > 0) {
                try {
                    let payload = {
                        username: username,
                        full_name: bankList.bank_name,
                        bank_code: bankList.bank_code,
                        bank_name: _banktype,
                        bank_number: bankList.bank_number,
                        createdAt: new Date(),
                    };
                    let resultInsert = await Func.exeSQL(
                        "INSERT INTO t_member_bank SET ? ", [payload]
                    );
                    await exeSQL(
                        "UPDATE t_member_account SET full_name = ? ,bank_code = ? , bank_type = ? ,bank_number = ? WHERE username = ?", [
                            bankList.bank_name,
                            bankList.bank_code,
                            _banktype,
                            bankList.bank_number,
                            username,
                        ]
                    );
                    if (resultInsert) {
                        res.json({
                            code: 0,
                            msg: "ยืนยันบัญชีสำเร็จ",
                        });
                    } else {
                        res.json({
                            code: 1,
                            msg: "ยืนยันบัญชีไม่สำเร็จ กรุณาลองใหม่อีกครั้ง!",
                        });
                    }
                } catch (error) {
                    res.json({
                        code: 1,
                        msg: "มีเลขบัญชีนี้แล้วในระบบ",
                    });
                }

            } else {
                res.json({
                    code: 1,
                    msg: "มีเลขบัญชีนี้แล้วในระบบ",
                });
            }
        } else {
            res.json({
                code: 1,
                msg: "บัญชีธนาคารของคุณไม่ถูกต้อง!",
            });
        }
    } else {
        res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

BANK.changebank = async(req, res) => {
    let bank_number = req.body.bank_number;
    let username = req.user.username;
    if (bank_number && username) {
        let bank_member = await exeSQL(
            "SELECT * FROM t_member_bank WHERE bank_number = ? AND username = ?", [bank_number, username]
        );
        if (bank_member.length > 0) {

            try {
                let resultbank = bank_member[0];
                let result = await exeSQL(
                    "UPDATE t_member_account SET full_name = ? ,bank_code = ? , bank_type = ? ,bank_number = ? WHERE username = ?", [
                        resultbank.full_name,
                        resultbank.bank_code,
                        resultbank.bank_name,
                        resultbank.bank_number,
                        username,
                    ]
                );
                if (result) {
                    res.json({
                        code: 0,
                        msg: "เลือกบัญชี สำเร็จ",
                    });
                } else {
                    res.json({
                        code: 1,
                        msg: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
                    });
                }
            } catch (error) {
                console.log(error)
            }

        } else {
            res.json({
                code: 1,
                msg: "ไม่พบเลขบัญชีของคุณนี้ " + req.body.bank_number + " ในระบบ",
            });
        }
    } else {
        res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

BANK.showBank = async(req, res) => {
    let bank_code = req.user.bank_code;
    let TRUEWALLET = req.query.bank ? req.query.bank : null;
    if (req.user && Object.keys(req.user).length > 0 && bank_code) {
        if (TRUEWALLET != null) {
            let result = {};
            result = await Func.exeSQL(
                "SELECT id,code,bank_name,name as full_name ,number FROM t_deposit_rule WHERE `status` = 1 AND code = 'TRUEWALLET'", []
            );
            if (result[0] && result[0] != null) {
                res.json(result[0]);
            } else {
                res.json({
                    code: 1,
                    msg: "ไม่สามารถตรวจสอบบัญชีได้ใน ขณะนี้!",
                });
            }
        } else {
            bank_code = bank_code ? bank_code : "TRUEWALLET";
            let result = {};
            if (bank_code != "SCB" && bank_code != "KBANK") {
                bank_code = "OTHER";
            }
            result = await Func.exeSQL(
                "SELECT id,code,bank_name,name as full_name ,number FROM t_deposit_rule WHERE `status` = 1 AND (scope = ? OR  scope = 'ALL') AND code != 'TRUEWALLET'", [bank_code]
            );
            if (result[0] != null) {
                res.json(result);
            } else {
                res.json({
                    code: 1,
                    msg: "ไม่สามารถตรวจสอบบัญชีได้ใน ขณะนี้!",
                });
            }
        }
    } else {
        res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

module.exports = BANK;