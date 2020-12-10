const sql = require("../Config/db");
const Func = require("../services/function");
const moment = require("moment");
const request = require("request");
const sha1 = require("sha1");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const connection = require("../Config/db");
dotenv.config();
const serverAPI = process.env.SERVICE_API;
const token_line = process.env.TOKEN_LINE;
const serverAPIAff = process.env.SERVICE_APIAFF;
const service = process.env.SERVICE;
const registerLink = process.env.REGISTERLINK;
const prefix = process.env.PREFIX_NAMEUSER;
const xmlToJson = require("xml-to-json-stream");
const e = require("express");
const { exeSQL } = require("../services/function");
const parser = xmlToJson({ attributeMode: false });
const PAC = function(entity) {};
var axios = require("axios");

PAC.login = async(req, res) => {
    let entity = req.body;
    const phone_number = entity.phone_number;
    const password = entity.password;
    let session_id = Date.now();
    const ip_login = entity.ip ? entity.ip : "";
    let result = {};
    let updateuser = {};
    if (phone_number && password) {
        result = await Func.exeSQL(
            "SELECT * FROM t_member_account WHERE phone_number = ? AND password = ?", [phone_number, password]
        );
        if (result.length > 0) {
            updateuser = await Func.exeSQL(
                "UPDATE t_member_account SET ip = ? , session_id = ? WHERE phone_number = ? ", [ip_login, session_id, phone_number]
            );
            if (updateuser.affectedRows == 1) {
                result[0].session_id = session_id;
                jwt.sign({ result },
                    process.env.SECRET, { expiresIn: "3h" },
                    (err, token) => {
                        if (err) {
                            res.status(401).json({
                                code: 2,
                                msg: "ERROR_NOT_FOUND_TOKEN_ON_METHOD",
                            });
                        } else {
                            res.status(200);
                            res.json(token);
                        }
                    }
                );
            } else {
                res.json({
                    code: 1,
                    msg: "ไม่สามารถล็อคอินได้ในขณะนี้!",
                });
            }
        } else {
            res.json({
                code: 1,
                msg: "ไม่พบสมาชิกดังกล่าว!",
            });
        }
    } else {
        res.json({
            code: 1,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

PAC.is_login = async(req, res) => {
    const session_id = req.user.session_id;
    const phone_number = req.user.phone_number;
    if (
        req.user &&
        Object.keys(req.user).length > 0 &&
        session_id &&
        phone_number
    ) {
        let result = await Func.exeSQL(
            "SELECT * FROM t_member_account WHERE phone_number = ? AND session_id = ?", [phone_number, session_id]
        );

        if (result.length > 0) {
            jwt.sign({ result },
                process.env.SECRET, { expiresIn: "3h" },
                (err, token) => {
                    if (err) {
                        res.status(401).json({
                            code: 2,
                            msg: "ERROR_NOT_FOUND_TOKEN_ON_METHOD",
                        });
                    } else {
                        res.status(200);
                        res.json(token);
                    }
                }
            );
        } else {
            res.json({
                code: 1,
                msg: "ไม่พบสมาชิกดังกล่าว!",
            });
        }
    } else {
        res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

PAC.register = async(req, res) => {
    let resultCheck = null;
    let resultInsert = {};
    let password = req.body.password;
    let phone_number = req.body.phone_number;
    let aff_join = req.body.join;
    let ip = req.body.ip ? req.body.ip : "";
    let bank_number = req.body.bank_number;
    let bank_code = req.body.bank_code.toString();

    if (req.body) {
        resultCheck = await Func.exeSQL(
            "SELECT * FROM t_member_account WHERE  phone_number LIKE ? LIMIT 1", ["%" + phone_number + "%"]
        );
        if (resultCheck.length == 0) {
            let timeLength = moment().valueOf().toString().length;
            let username =
                prefix +
                moment()
                .valueOf()
                .toString()
                .substr(timeLength - 9);


            let resultRegister = await Func.registerAPI(bank_number, 'Aa112233', bank_number);
            bankList = await Func.checkBank(bank_code, bank_number);
            if (bankList && Object.keys(bankList).length > 0) {
                if (resultRegister) {
                    username = resultRegister.data.username;
                    let payload = {
                        date_regis: new Date(),
                        username: resultRegister.data.username,
                        phone_number: phone_number,
                        password: password,
                        full_name: bankList.bank_name,
                        bank_code: bankList.bank_code,
                        bank_type: req.body.bank_type,
                        bank_number: bankList.bank_number,
                        fullname_bank: req.body.fullname_bank ? req.body.fullname_bank : null,
                        active: 0,
                        is_promotion: 0,
                        is_bonus: 1,
                        ip: ip,
                    };
                    resultInsert = await Func.exeSQL(
                        "INSERT INTO t_member_account SET ? ", [payload]
                    );
                    if (resultInsert) {
                        let payload_bank = {
                            username: username,
                            full_name: bankList.bank_name,
                            bank_code: bankList.bank_code,
                            bank_name: req.body.bank_type,
                            bank_number: bankList.bank_number,
                            createdAt: new Date(),
                        };
                        await Func.exeSQL(
                            "INSERT INTO t_member_bank SET ? ", [payload_bank]
                        );

                        let affRegis = await Func.affiliateRegister(
                            username,
                            aff_join
                        );
                        if (affRegis) {
                            res.json({
                                code: 0,
                                msg: "สมัครสมาชิกสำเร็จเรียบร้อย!",
                            });
                        } else {
                            res.json({
                                code: 0,
                                msg: "สมัครสมาชิกสำเร็จเรียบร้อย!",
                                note: "Affiliate สมัครไม่สำเร็จ",
                            });
                        }
                    } else if (req.err) {
                        res.json({
                            code: 1,
                            msg: "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง!",
                        });
                    }
                } else {
                    res.json({
                        code: 1,
                        msg: "ไม่สามารถสร้างยูสเซอร์ได้ กรุณาลองใหม่อีกครั้ง!",
                    });
                }
            } else {
                res.json({
                    code: "ERROR",
                    msg: "กรุณาแจ้งพนักงานเพื่อเพิ่มบัญชีธนาคาร สำหรับการสมัคร!",
                });
            }
        } else {
            res.json({
                code: 1,
                msg: "มีบัญชีนี้แล้วในระบบ!",
            });
        }
    } else {
        res.json({
            code: "2",
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

PAC.otp = async(req, res) => {
    const username = req.user.username;
    const phone_number = req.body.phone_number;
    let results = {};
    var digits = "0123456789";
    let OTP = "";
    for (let i = 0; i < 6; i++) {
        OTP += digits[Math.floor(Math.random() * 10)];
    }
    var options = {
        method: "POST",
        url: "http://v2.arcinnovative.com/APIConnect.php",
        headers: {
            "cache-control": "no-cache",
            Connection: "keep-alive",
            "Accept-Encoding": "gzip, deflate",
            Host: "v2.arcinnovative.com",
            Accept: "*/*",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        form: {
            username: "gadgetmashow",
            password: "6bdadd5dfab89f11899d220f264faefd",
            sender: "TOPUP-OTP",
            msg: "รหัส OTP ของคุณคือ " + OTP,
            msisdn: phone_number,
            smstype: "sms",
            ntype: "in",
        },
    };

    let created_at = moment(Date.now())
        .add(1, "minutes")
        .format("Y-MM-DD HH:mm:ss");
    req.user = await Func.exeSQL(
        "SELECT * FROM t_member_account WHERE username = ?", [username]
    );
    results = await Func.exeSQL(
        "SELECT phone_verify FROM t_member_account WHERE phone_verify = ?", [phone_number]
    );
    if (
        results.length == 0 ||
        req.user[0].phone_verify == req.body.phone_number
    ) {
        connection.query(
            "UPDATE t_member_account SET phone_verify = ?, otp_code = ?, created_at = ? WHERE username = ?", [req.body.phone_number, OTP, created_at, req.user[0].username],
            (error, results, fields) => {
                if (error)
                    throw res.json({
                        code: 1,
                        msg: "เบอร์โทรศัพท์นี้ได้ถูกใช้ไปแล้ว !",
                    });
                request(options, function(error, response, body) {
                    if (error) throw new Error(error);
                    parser.xmlToJson(body, (err, json) => {
                        if (err) {
                            res.json({
                                code: 1,
                                msg: "ข้อ OTP ไม่สำเร็จ",
                            });
                        }

                        res.json({
                            code: 0,
                            msg: "ขอ OTP สำเร็จ",
                        });
                    });
                });
            }
        );
    } else {
        res.json({
            code: 1,
            msg: "เบอร์โทรศัพท์นี้ได้ถูกใช้ไปแล้ว",
        });
    }
};

PAC.otp_verify = async(req, res) => {
    let sqlOTPPhone = {};
    let sqlUpdatePhonenumber = {};
    const username = req.user.username;
    const phone_number = req.body.phone_number;
    const otp = req.body.otp;
    sqlOTPPhone = await Func.exeSQL(
        "SELECT phone_verify, otp_code, username FROM t_member_account WHERE username = ? AND phone_verify = ? AND otp_code = ?  AND active = 0", [username, phone_number, otp]
    );
    if (sqlOTPPhone.length > 0) {
        sqlUpdatePhonenumber = await Func.exeSQL(
            "UPDATE t_member_account SET phone_number = ?, active = 1 WHERE username = ?", [phone_number, username]
        );
        if (sqlUpdatePhonenumber.affectedRows > 0) {
            let bonus = await Func.exeSQL("SELECT * FROM t_bonus_config WHERE bonus_id = 1150")
            let hash = username + moment(new Date()).format("Y-MM-DD");
            if (bonus.length > 0) {
                let payload = {
                    id: null,
                    username: username,
                    bonus: 50,
                    trunover: 2500,
                    hesh: sha1(hash),
                    start_time: null,
                    end_time: null,
                    status: 0,
                    comment: 'เครดิตฟรี 50 บาท'
                }
                insertinto = await Func.exeSQL(
                    "INSERT INTO t_member_free_bonus SET ? ", [payload]
                );
            }
            // let payload = {
            //     id: null,
            //     date: moment(new Date()).format("Y-MM-DD"),
            //     time: moment(new Date()).format("HH:mm:ss"),
            //     amount: 0,
            //     bank: 94,
            //     account: username,
            //     bonus: 50,
            //     point: 0,
            //     fix_multiple: 50,
            //     channel: "Register",
            //     detail: 'เครดิตฟรี 50 บาท',
            //     tx_hash: sha1(hash), //bonus[0].hesh,
            //     status: 0,
            //     is_bonus: 1,
            //     use_bonus: 1150,
            //     withdraw_fix: 2500, //ต้องทำเทินเท่าไหร่
            //     is_check: 1,
            //     befor_credit: 0,
            //     after_credit: 50,
            //     fix_withdraw: 500, //อันถอน
            //     comment: 'เครดิตฟรี 50 บาท',
            // };
            // if (bonus.length > 0) {
            //     console.log(0)
            //     insertExchangeDeposit = await Func.exeSQL(
            //         "INSERT INTO t_deposit_statement SET ? ", [payload]
            //     );

            //     if (insertExchangeDeposit.insertId > 0) {
            //         let bonus = [{ bonus: 50 }];
            //         resultAddcredit = await Func.addCreditFreeUser(
            //             username,
            //             bonus,
            //             serverAPI
            //         );
            //         if (resultAddcredit) {
            //             UpdateDepositStatement = await Func.exeSQL(
            //                 "UPDATE t_deposit_statement SET is_check = 1 , status = 1 , befor_credit = ? ,after_credit = ? WHERE id = ?", [
            //                     resultAddcredit.previousDownlineGiven.toFixed(2),
            //                     resultAddcredit.currentBalance.toFixed(2),
            //                     insertExchangeDeposit.insertId,
            //                 ]
            //             );
            //         }
            //     }
            // }

            res.json({
                code: 0,
                msg: "หมายเลขโทรศัพท์สำหรับเข้าสู่ระบบของคุณคือ " + phone_number + "",
            });
        } else {
            res.json({
                code: 1,
                msg: "เบอร์ " + phone_number + " ถูกใช้งานไปแล้ว",
            });
        }
    } else {
        res.json({
            code: 1,
            msg: "รหัส OTP ไม่ถูกต้อง หรือ เบอร์ " + phone_number + " ถูกใช้งานไปแล้ว",
        });
    }
};

PAC.LoginAccessToken = async(req, res, next) => {
    if (req.user && req.user.username) {
        var timestart = moment(new Date());
        axios
            .get(
                serverAPI +
                "/logingame?username=" +
                req.user.username +
                "&password=" +
                req.user.password
            )
            .then((response) => {
                Func.timeout_api("/logingame", timestart, moment(new Date()));

                if (response.data.success) {
                    res.json({
                        code: 0,
                        msg: "ดึงข้อมูล สำเร็จเรียบร้อย!",
                        url: response.data.game_url,
                    });
                } else {
                    res.json({
                        code: 1,
                        msg: "เกิดข้อผิดพลาด กรุณาลองใหม่",
                    });
                }
            })
            .catch((err) => {
                Func.timeout_api("/logingame", timestart, moment(new Date()));
            });
    } else {
        return res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

PAC.update_profile = async(req, res) => {
    //profile_image
    let username = req.user.username;
    let imagepath = req.body.urlfile;
    if (req.body.file != "" && req.user.username) {
        let result = await Func.exeSQL(
            "UPDATE t_member_account  SET profile_image = ? WHERE username = ?", [imagepath, username]
        );
        if (result) {
            res.json({
                code: 0,
                msg: "อัพเดทสำเร็จ",
            });
        } else {
            res.json({
                code: 1,
                msg: "เกิดข้อผิดพลาด",
            });
        }
    }
};
//route.post("/api/forgetPasswordWeb", async(req, res, next) => {
PAC.forgetPasswordWeb = async(req, res) => {
    console.log(req.body, req.query)
    if (req.body.phone_number && req.query.type) {
        let phone_number = req.body.phone_number;
        let type = req.query.type;
        let result_user = await Func.exeSQL("SELECT * FROM t_member_account WHERE phone_number = ?", [phone_number]);
        if (result_user.length > 0) {
            result_user = result_user[0]
            if (req.query.type == "SMS") {
                var options = {
                    method: "POST",
                    url: "http://v2.arcinnovative.com/APIConnect.php",
                    headers: {
                        "cache-control": "no-cache",
                        Connection: "keep-alive",
                        "Accept-Encoding": "gzip, deflate",
                        Host: "v2.arcinnovative.com",
                        Accept: "*/*",
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    form: {
                        username: "gadgetmashow",
                        password: "6bdadd5dfab89f11899d220f264faefd",
                        sender: "TOPUP-OTP",
                        msg: "ระบบแจ้งเตือนลืมรหัสผ่าน ยูสเซอร์เนม : " +
                            result_user.username +
                            " รหัสผ่านเว็บไซต์ : " +
                            result_user.password,
                        msisdn: result_user.phone_number,
                        smstype: "sms",
                        ntype: "in",
                    },
                };
                request(options, function(error, response, body) {
                    if (error) throw new Error(error);
                    parser.xmlToJson(body, (err, json) => {
                        if (err) {
                            res.json({
                                code: 1,
                                msg: "ไม่สามารถแจ้งเตือนรหัสผ่านได้! กรุณาลองใหม่ภายหลัง",
                            });
                        } else if (json.XML.STATUS == "OK") {
                            res.json({
                                code: 0,
                                msg: "สำเร็จ! รอรับแจ้งเตือนรหัสผ่านได้ที่ SMS",
                            });
                        } else {
                            res.json({
                                code: 1,
                                msg: "ไม่สามารถแจ้งเตือนรหัสผ่านได้! กรุณาลองใหม่ภายหลัง",
                            });
                        }
                    });
                });
            } else {
                res.json({
                    code: 1,
                    msg: "เลือกประเภทการส่งให้ถูกต้อง!!!",
                });
            }
        } else {
            res.json({
                code: 1,
                msg: "ไม่พบข้อมูลผู้ใช้งาน!!!",
            });
        }
    } else {
        res.json({
            code: 1,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};



PAC.resetpassword_web = async(req, res) => {
    if (req.user && req.body.password) {
        let username = req.user.username;
        let password = req.body.password;
        if (req.body.password == "") {
            res.json({
                code: 1,
                msg: "กรุณาระบุรหัสผ่าน"
            })
        }
        console.log(username)
        let getUser = await Func.exeSQL("SELECT * FROM t_member_account WHERE username = ?", [username]);
        if (getUser.length > 0) {
            let resultUpdate = await Func.exeSQL("UPDATE t_member_account SET password = ? WHERE username = ?", [password, username]);
            if (resultUpdate) {
                res.json({
                    code: 0,
                    msg: "เปลี่ยนรหัสผ่านเป็น " + password + " เรียบร้อย"
                })
            } else {
                res.json({
                    code: 1,
                    msg: "เกิดข้อผิดพลาด ไม่สามารถเปลี่ยนรหัสผ่านได้ในขณะนี้"
                })
            }
        } else {
            res.json({
                code: 1,
                msg: "ไม่พบยูสน์นี้ในระบบ"
            })
        }

    } else {
        res.json({
            code: 1,
            msg: "PATAMETER NOT FLOUND"
        })
    }
}

//NEW REGISTER

PAC.verify_OTP = async(req, res) => {
    let otp_verify = req.body.otp_verify;
    let phone_verify = req.body.phone_verify;
    try {
        await new Promise((resolve, reject) => {
            connection.query("SELECT * FROM t_member_account WHERE phone_verify = ? AND otp_code = ? ", [phone_verify, otp_verify], (error, checkOtp) => {
                if (error) {
                    reject("ไม่สามารถยืนยันรหัส OTP ได้ในขณะนี้!");
                } else if (checkOtp.length > 0) {
                    if (checkOtp[0].active == 1) {
                        reject("มีการยืนยันตัวตนไปแล้วสำหรับเบอร์โทรศัพท์นี้!");
                    } else {
                        if (moment(checkOtp[0].created_at).add(2, "minutes").format("YYYY-MM-DD HH:mm:ss") >= moment().format("YYYY-MM-DD HH:mm:ss")) {
                            resolve(true);
                        } else {
                            reject("OTP หมดอายุ กรุณากดขอ OTP ใหม่อีกรอบ!");
                        }
                    }
                } else {
                    reject("รหัส OTP ไม่ถูกต้องกรุณาลองใหม่อีกครั้ง!");
                }
            });
        });

        await new Promise((resolve, reject) => {
            connection.query("UPDATE t_member_account SET active = 1 WHERE phone_verify = ?", [phone_verify], (error, resultUpdate) => {
                if (error) {
                    reject("ไม่สามารถยืนยันตัวเบอร์ดังกล่าวได้ ในขณะนี้!");
                } else {
                    resolve(true);
                }
            });
        });
        res.json({
            code: 0,
            msg: "ยืนยันตัวตนสำเร็จ!",
        });
    } catch (error) {
        res.json({
            code: 1,
            msg: error,
        });
    }


};


PAC.verify_phone = async(req, res, next) => {
    if (!req.body && !req.body.phone_number) {
        return res.json({
            code: 1,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
    let phone_number = req.body.phone_number;
    if (typeof phone_number != "string") {
        return res.json({
            code: 1,
            msg: "ชนิดข้อมูลเบอร์โทรศัพท์ไม่ถูกต้อง!",
        });
    }

    if (phone_number.length != 10) {
        return res.json({
            code: 1,
            msg: "เบอร์โทรศัพท์ไม่ครบ 10 หลัก!",
        });
    }
    try {
        let checkUser = await new Promise((resolve, reject) => {
            connection.query(
                "SELECT * FROM t_member_account WHERE phone_number = ? OR phone_verify = ?", [phone_number, phone_number],
                (error, resultCheck) => {
                    if (error) {
                        reject("ไม่สามารถเช็คข้อมูลได้ในขณะนี้!");
                    } else if (resultCheck.length > 0) {
                        if (resultCheck[0].active == 0) {
                            resolve(resultCheck[0]);
                        } else if (resultCheck[0].active == 1 && resultCheck[0].username == null && resultCheck[0].bank_number == null) {
                            resolve(resultCheck[0]);
                        } else {
                            reject("เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว!");
                        }
                    } else {
                        connection.query(
                            "INSERT INTO t_member_account SET ?", { phone_number: phone_number, phone_verify: phone_number, active: 0 },
                            (error, reuslt) => {
                                if (error) {
                                    reject("ไม่สามารถเพิ่มข้อมูลสมาชิกได้!");
                                } else {
                                    resolve(true);
                                }
                            }
                        );
                    }
                }
            );
        });

        if (checkUser.username == null && checkUser.bank_number == null && checkUser.active == 1) {
            return res.json({
                code: 0,
                msg: "ดึงข้อมูลสำเร็จ",
                payload: checkUser,
            });
        }

        if (
            checkUser.created_at != null &&
            moment(checkUser.created_at).add(2, "minutes").format("YYYY-MM-DD HH:mm:ss") >= moment().format("YYYY-MM-DD HH:mm:ss")
        ) {
            return res.json({
                code: 0,
                msg: "กรุณากรอก OTP",
            });
        }

        var digits = "0123456789";
        let OTP = "";
        for (let i = 0; i < 6; i++) {
            OTP += digits[Math.floor(Math.random() * 10)];
        }
        var options = {
            method: "POST",
            url: "http://v2.arcinnovative.com/APIConnect.php",
            headers: {
                "cache-control": "no-cache",
                Connection: "keep-alive",
                "Accept-Encoding": "gzip, deflate",
                Host: "v2.arcinnovative.com",
                Accept: "*/*",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            form: {
                username: "gadgetmashow",
                password: "6bdadd5dfab89f11899d220f264faefd",
                sender: "ABA-OTP",
                msg: "รหัส OTP ของคุณคือ " + OTP,
                msisdn: phone_number,
                smstype: "sms",
                ntype: "in",
            },
        };
        let created_at = moment(Date.now()).add("minutes", 1).format("Y-MM-DD HH:mm:ss");

        await new Promise((resolve, reject) => {
            connection.query(
                "UPDATE t_member_account SET  otp_code = ?, created_at = ? WHERE phone_number = ?", [OTP, created_at, phone_number],
                (error, results, fields) => {
                    if (error) {
                        reject("ไม่สามารถสมัครสมาชิกได้ในขณะนี้!");
                    } else {
                        resolve(true);
                    }
                }
            );
        });
        await new Promise((resolve, reject) => {
            request(options, function(error, response, body) {
                if (error) throw new Error(error);
                console.log(body);
                parser.xmlToJson(body, (err, json) => {
                    if (err) {
                        reject("ไม่สามารถส่งรหัส OTP ได้ในขณะนี้!");
                    } else {
                        resolve(true);
                    }
                });
            });
        });
        res.json({
            code: 0,
            msg: "กรุณาตรวจสอบรหัส OTP ที่โทรศัพท์ของท่าน!",
        });
    } catch (error) {
        res.json({
            code: 1,
            msg: error,
        });
    }
};

PAC.register_NEW = async(req, res) => {
    const checkBank = (bank_code, bank_number) => {
        return new Promise((resolve, reject) => {
            axios
                .get("http://topupoffice.com/check?bank=" + bank_code + "&number=" + bank_number, { timeout: 60000 })
                .then((response) => {
                    if (response.data && response.data.bank_code && response.data.bank_number && response.data.bank_name) {
                        resolve(response.data);
                    } else {
                        resolve(null);
                    }
                })
                .catch((err) => {
                    console.log(err);
                    resolve(null);
                });
        });
    };
    const checkDuplibank = (bankList) => {
        return new Promise((resolve, reject) => {
            if (Object.keys(bankList).length > 0) {
                connection.query(
                    "SELECT bank_number FROM t_member_account WHERE bank_number = ? OR full_name LIKE '%' ? '%'", [bankList.bank_number, bankList.bank_name],
                    (error, resultCheck) => {
                        if (resultCheck.length == 0) {
                            resolve(true);
                        } else {
                            resolve(null);
                        }
                    }
                );
            } else {
                resolve(null);
            }
        });
    };

    const checkAllBank = (bankList) => {
        return new Promise((resolve, reject) => {
            if (Object.keys(bankList).length > 0) {
                connection.query(
                    "SELECT bank_number FROM t_member_bank WHERE  bank_number = ? AND bank_code = ?", [bankList.bank_number, bankList.bank_code],
                    (error, resultCheck) => {
                        if (resultCheck.length == 0) {
                            resolve(true);
                        } else {
                            resolve(null);
                        }
                    }
                );
            } else {
                resolve(null);
            }
        });
    };


    const insertRegister = (payload) => {
        return new Promise((resolve, reject) => {
            connection.query(
                "UPDATE `t_member_account` SET date_regis = ? , username = ?,  phone_number = ? , password  = ?, full_name = ? , bank_code = ? , bank_type = ?, fullname_bank = ?, bank_number = ?, affiliate = ?, referer = ?, is_bonus = ?,nickname = ?, age = ? , career = ? , clickid = ?, is_promotion = 0 WHERE phone_number = ?", [
                    payload.date_regis,
                    payload.username,
                    payload.phone_number,
                    payload.password,
                    payload.full_name,
                    payload.bank_code,
                    payload.bank_type,
                    payload.fullname_bank,
                    payload.bank_number,
                    payload.affiliate,
                    payload.referer,
                    // payload.is_promotion,
                    payload.is_bonus,
                    payload.nickname,
                    payload.age,
                    payload.career,
                    payload.clickid,
                    payload.phone_number,
                ],
                (error, results, fields) => {
                    if (error) {
                        console.log(error);
                        resolve(null);
                    } else if (results.changedRows > 0) {
                        resolve(true);
                    } else {
                        resolve(null);
                    }
                }
            );
        });
    };

    const affiliateRegister = async(user, user_join) => {
        return new Promise(async(resolve, reject) => {
            var digits = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
            let token = "";
            for (let i = 0; i < 16; i++) {
                token += digits[Math.floor(Math.random() * 62)];
            }
            let payload = {
                username: user,
                join: user_join,
                token: token,
                join_date: moment().format("YYYY-MM-DD HH:mm:ss"),
                service: service,
            };

            connection.query("INSERT INTO affiliated SET ?", payload, (error, result) => {
                if (error) {
                    resolve(null);
                } else {
                    console.log("INSERTED AFFILIATE");
                    resolve(token);
                }
            });
        });
    };
    const creidtFree = (affPayload, username, join_token) => {
        return new Promise(async(resolve, reject) => {
            let bonus = await Func.exeSQL("SELECT * FROM t_bonus_config WHERE bonus_id = 1150")
            let hash = username + moment(new Date()).format("Y-MM-DD");
            if (bonus.length > 0) {
                let payload = {
                    id: null,
                    username: username,
                    bonus: 50,
                    trunover: 2500,
                    hesh: sha1(hash),
                    start_time: null,
                    end_time: null,
                    status: 0,
                    comment: 'เครดิตฟรี 50 บาท'
                }
                insertinto = await Func.exeSQL(
                    "INSERT INTO t_member_free_bonus SET ? ", [payload]
                );
                if (insertinto) {
                    resolve(true)
                } else {
                    resolve(false)
                }
            }
        });
    };

    const checkAuth = (phone_number) => {
        return new Promise((resolve, reject) => {
            connection.query(
                "SELECT * FROM t_member_account WHERE phone_number = ? AND active = 1", [phone_number],
                (error, resultUser) => {
                    if (error) {
                        console.log(1);
                        resolve(null);
                    } else if (resultUser.length > 0) {
                        console.log("FOUND USER");
                        resolve(true); //authen
                    } else {
                        resolve(null);
                    }
                }
            );
        });
    };

    if (req.body && req.body.bank_code && req.body.bank_number) {
        let bank_number = req.body.bank_number.replace(/.*?(([0-9]*\.)?[0-9]+).*/g, "$1").toString();
        let bank_code = req.body.bank_code.toString();
        let bankList;
        let password = req.body.password;
        let phone_number = req.body.phone_number;
        let aff_join = req.body.join;
        if (!(await checkAuth(phone_number))) {
            return res.json({
                code: 1,
                msg: "เบอร์โทรศัพท์นี้ยังไม่ได้ยืนยันในระบบ กรุณายืนยันก่อน!",
            });
        }

        bankList = await Func.checkBank(bank_code, bank_number);
        if (bankList && Object.keys(bankList).length > 0) {
            let resultDupi = await checkDuplibank(bankList);
            if (resultDupi && (await checkAllBank(bankList))) {
                let timeLength = moment().valueOf().toString().length;
                let username =
                    prefix +
                    moment()
                    .valueOf()
                    .toString()
                    .substr(timeLength - 9);
                let resultRegister = await Func.registerAPI(username, password);
                console.log(resultRegister)
                if (resultRegister.data.username) {
                    let genUsername = resultRegister.data.username;
                    let payload = {
                        date_regis: new Date(),
                        username: genUsername,
                        phone_number: phone_number,
                        password: password,
                        full_name: bankList.bank_name,
                        bank_code: bankList.bank_code,
                        bank_type: req.body.bank_type,
                        fullname_bank: req.body.fullname_bank ? req.body.fullname_bank : null,
                        bank_number: bankList.bank_number,
                        active: 0,
                        affiliate: req.body.affiliate ? req.body.affiliate : "YOUTUBE",
                        referer: req.body.referrer ? req.body.referrer : "UNKNOWN",
                        is_bonus: req.body.is_bonus != undefined ? req.body.is_bonus : 1,
                        nickname: req.body.nickname != undefined ? req.body.nickname.toString() : null,
                        age: req.body.age != undefined ? req.body.age.replace(/[^0-9 ]/g, "") : null,
                        career: req.body.career != undefined ? req.body.career.toString() : null,
                        clickid: req.body.clickid != undefined ? req.body.clickid : null,
                    };
                    let resultInsert = await insertRegister(payload);
                    if (resultInsert) {
                        let payload_bank = {
                            username: genUsername,
                            full_name: bankList.bank_name,
                            bank_code: bankList.bank_code,
                            bank_name: req.body.bank_type,
                            bank_number: bankList.bank_number,
                            createdAt: new Date(),
                        };
                        await Func.exeSQL(
                            "INSERT INTO t_member_bank SET ? ", [payload_bank]
                        );

                        if (req.body.clickid != undefined) {
                            axios.get("https://t.firsttrackers.com/postback?cid=" + req.body.clickid + "&payout=0&txid=" + Date.now());
                        }
                        let affRegis = await Func.affiliateRegister(genUsername, aff_join);
                        if (affRegis) {
                            let credit_free = true; //await creidtFree(affRegis, genUsername, aff_join);
                            if (credit_free) {
                                res.json({
                                    code: 0,
                                    msg: "สมัครสมาชิกสำเร็จเรียบร้อย!",
                                });
                            } else {
                                res.json({
                                    code: 0,
                                    msg: "สมัครสมาชิกสำเร็จเรียบร้อย!",
                                    note: "Affiliate สมัครไม่สำเร็จ",
                                });
                            }
                        } else {
                            res.json({
                                code: 0,
                                msg: "สมัครสมาชิกสำเร็จเรียบร้อย!",
                                note: "Affiliate สมัครไม่สำเร็จ",
                            });
                        }
                    } else {
                        res.json({
                            code: 1,
                            msg: "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง! หรือ เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว!",
                        });
                    }
                } else {
                    res.json({
                        code: 1,
                        msg: "ไม่สามารถสร้างยูสเซอร์ได้ กรุณาลองใหม่อีกครั้ง!",
                    });
                }
            } else {
                res.json({
                    code: 1,
                    msg: "มีบัญชีนี้แล้วในระบบ!",
                });
            }
        } else {
            res.json({
                code: 1,
                msg: "กรุณากรอกหมายเลขบัญชีให้ถูกต้อง หรือติดต่อพนักงาน!",
            });
        }
    } else {
        res.json({
            code: 1,
            msg: "กรุณากรอกหมายเลขบัญชีให้ถูกต้อง หรือติดต่อพนักงาน!",
        });
    }
};

PAC.validateRegister = async(req, res) => {
    let type = req.params.type;
    let phone_number = req.body.phone_number;
    let bank_code = req.body.bank_code;
    let bank_number = req.body.bank_number;
    if (type == 'phone_number') {
        let result = await exeSQL("SELECT * FROM t_member_account WHERE phone_number = ?", [phone_number])
        if (result.length > 0) {
            res.json({
                code: 1,
                msg: 'เบอร์โทรศัพท์นี้มีอยุ่แล้วในระบบ'
            })
        } else {
            res.json({
                code: 0,
                msg: 'เบอร์โทรศัพท์นี้สามารถใช้งานได้'
            })
        }
    } else if (type == 'bank') {
        let isTrue = false;
        let isTrue2 = false;
        let bank = await Func.checkBank(bank_code, bank_number)
        if (bank != null) {
            let check_dup = await checkAllBank(bank);
            if (check_dup) {
                isTrue = true;
                isTrue2 = true;
            } else {
                res.json({
                    code: 1,
                    msg: 'บัญชีมีอยุ่แล้วในระบบ'
                })
            }
        } else {
            isTrue2 = false;
            res.json({
                code: 1,
                msg: 'ไม่พบบัญชีธนาคาร'
            })
        }
        if (isTrue && isTrue2) {
            res.json({
                code: 0,
                msg: 'บัญชีนี้สามารถใช้งานได้'
            })
        }


    }
}

const checkAllBank = (bankList) => {
    return new Promise((resolve, reject) => {
        if (Object.keys(bankList).length > 0) {
            connection.query(
                "SELECT bank_number FROM t_member_bank WHERE  bank_number = ? AND bank_code = ?", [bankList.bank_number, bankList.bank_code],
                (error, resultCheck) => {
                    if (resultCheck.length == 0) {
                        resolve(true);
                    } else {
                        resolve(null);
                    }
                }
            );
        } else {
            resolve(null);
        }
    });
};


PAC.Resetpassword_game = async(req, res) => {
    if (!req.user && req.body.password == "") return res.json({ code: 1, msg: 'PARAMETER NOT FLOUND !!' })
    let payload = {
        playername: encodeURI(req.user.full_name),
        playertelno: req.user.bank_number,
        playerdescription: 'SLOTXE88TH',
        playerpassword: req.body.password,
        username: req.user.username
    }




    console.log(payload)
    axios
        .get(serverAPI + "/setpasswd?playername=" + payload.playername + "&playertelno=" + payload.playertelno + "&playerdescription=" + payload.playerdescription + "&playerpassword=" + payload.playerpassword + "&username=" + payload.username)
        .then((response) => {
            if (response.data.returncode == 0) {
                res.json({
                    code: 0,
                    msg: "สำเร็จ"
                })
            } else {
                res.json({
                    code: 1,
                    msg: "เกิดข้อผิดพลาด"
                })
            }
        }).catch(err => {
            res.json({
                code: 1,
                msg: "เกิดข้อผิดพลาด กรุณาลองใหม่ภายหลัง"
            })
        });
};





module.exports = PAC;