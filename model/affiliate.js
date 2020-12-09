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
const axios = require("axios");
const AFF = function(entity) {};

AFF.affiliateRegister = async(req, res) => {
    if (req.user && req.body) {
        let username = req.user.username.toString();
        let checkAffiliate = await Func.exeSQL(
            "SELECT * FROM affiliated WHERE username  = ?", [username]
        );
        if (checkAffiliate.length == 0) {
            let join_user = req.body.join ? req.body.join : undefined;
            var digits =
                "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
            let token = "";
            for (let i = 0; i < 16; i++) {
                token += digits[Math.floor(Math.random() * 62)];
            }
            let payload = {
                username: username,
                join: join_user,
                token: token,
                join_date: moment(new Date()).format("Y-MM-DD HH:mm:ss"),
                service: service,
            };
            let resultRegister = await Func.exeSQL("INSERT INTO affiliated SET ?", [
                payload,
            ]);

            if (resultRegister) {
                return res.json({
                    code: 0,
                    msg: "สมัคร Affiliate สำเร็จ!",
                });
            } else {
                return res.json({
                    code: 1,
                    msg: "ไม่สามารถสมัคร Affiliate ได้ในขณะนี้!",
                });
            }
        } else {
            return res.json({
                code: 1,
                msg: "ยูสเซอร์นี้อยู่ในระบบ Affiliate อยู่แล้ว!",
            });
        }
    } else {
        return res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

AFF.affiliateLog = async(req, res) => {
    if (req.user && req.body) {
        let username = req.user.username;
        let selectDate = req.body.date;
        let logToday = await Func.exeSQL(
            "SELECT id,date,dividend,winloss,point,data stat FROM log_today WHERE username = ? AND date = ?", [username, selectDate]
        );
        if (logToday) {
            res.json({
                code: 0,
                msg: "ดึงข้อมูลสำเร็จ",
                payload: logToday,
            });
        } else {
            res.json({
                code: 1,
                msg: "ERROR_LOG_TO",
            });
        }
    } else {
        res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

AFF.affiliateAddwallet = async(req, res) => {
    if (req.user) {
        let username = req.user.username;
        let updatedWallet = await Func.exeSQL(
            "UPDATE affiliated SET dividend = 0 WHERE username = ? ", [username]
        );
        if (updatedWallet) {
            res.json({
                code: 0,
                msg: "อัพเดทยอดเงินสำเร็จ",
            });
        } else {
            res.json({
                code: 1,
                msg: "ERROR_UPDATE_DIVIDEND",
            });
        }

    } else {
        res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

AFF.affiliateWallet = async(req, res) => {
    if (req.user) {
        let username = req.user.username;

        let affWallet = await Func.exeSQL(
            "SELECT dividend FROM affiliated WHERE username = ? ", [username]
        );
        if (affWallet.length > 0) {
            res.json({
                code: 0,
                msg: "ดึงข้อมูลสำเร็จ",
                payload: affWallet[0].dividend,
            });
        } else {
            res.json({
                code: 1,
                msg: "ไม่พบข้อมูล Dividend",
                payload: "0",
            });
        }
    } else {
        res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

AFF.affiliateToken = async(req, res) => {
    if (req.user) {
        let username = req.user.username;
        let token = await Func.exeSQL(
            "SELECT token,share_traffic share,web_traffic web,click_traffic click,join_date joinDate,`join` FROM affiliated WHERE username = ? ", [username]
        );
        if (token.length > 0) {
            res.json({
                code: 0,
                msg: "ดึงข้อมูลสำเร็จ",
                payload: token[0],
            });
        } else {
            res.json({
                code: 1,
                msg: "ไม่พบข้อมูลสมาชิก",
            });
        }
    } else {
        res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

AFF.calAffiliate_OLD = async(req, res) => {
    if (req.user) {
        let username = req.user.username;
        let userAffiliate = await Func.exeSQL(
            "SELECT * FROM affiliated WHERE username = ?", [username]
        );
        let checkAmount = await Func.selectCredit(username, serverAPI);
        if (userAffiliate && userAffiliate.length > 0) {
            if (checkAmount) {
                let updatePoint = await Func.updatePointAff(
                    userAffiliate,
                    checkAmount.currentCredit
                );
                if (updatePoint) {
                    let updateDividend = await Func.updateDividendAff(userAffiliate);
                    if (updateDividend) {
                        res.json({
                            code: 0,
                            msg: "คำนวณอัพเดท Affiliate เสร็จเรียบร้อย",
                        });
                    } else {
                        res.json({
                            code: 1,
                            msg: "ไม่สามารถอัพเดท Affiliate ได้ในขณะนี้!",
                        });
                    }
                } else {
                    res.json({
                        code: 1,
                        msg: "ไม่สามารถอัพเดท Affiliate ได้ในขณะนี้!",
                    });
                }
            } else {
                res.json({
                    code: 1,
                    msg: "ไม่สามารถอัพเดท Affiliate ได้ในขณะนี้!",
                });
            }
        } else {
            res.json({
                code: 1,
                msg: "ไม่พบบัญชี Affiliate สำหรับยูสเซอร์นี้!",
            });
        }
    } else {
        res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

AFF.affiliateUpdate = async(req, res) => {
    if (req.user) {
        try {
            let username = req.user.username;

            let percent = await Func.exeSQL("SELECT persen FROM affiliated_agent");

            let accountAffiliate = await Func.selectAffiliate(username);

            let allMember = await Func.exeSQL(
                "SELECT * FROM affiliated WHERE join = ? AND current > 0 ", [accountAffiliate]
            );
            if (allMember.length <= 0) {
                allMember = "ไม่มีการแนะนำเพื่อน สำหรับยูสเซอร์นี้!";
            }

            let log_today = await Func.selectLogtoday(
                username,
                accountAffiliate,
                percent[0].persen
            );

            let dividendTotal = parseFloat(log_today[0].dividend);
            let dataLogtoday = JSON.parse(log_today[0].data);
            let currentDividend = 0;

            for (const eachMember of allMember) {
                if (eachMember.current > 0) {
                    let currentCredit = await Func.selectCredit(
                        eachMember.username,
                        serverAPI
                    );
                    if (parseFloat(currentCredit.currentCredit) >= 0) {
                        if (eachMember.current > currentCredit.currentCredit) {
                            let calCurrent = eachMember.current - currentCredit.currentCredit;
                            currentDividend =
                                currentDividend + calCurrent * percent[0].persen;
                            dividendTotal =
                                dividendTotal + parseFloat(calCurrent * percent[0].persen);
                            if (
                                dataLogtoday.filter(
                                    (val) => val.username == eachMember.username
                                )[0] == undefined
                            ) {
                                dataLogtoday.push({
                                    username: eachMember.username,
                                    winloss: calCurrent * percent[0].persen,
                                    current: calCurrent,
                                    point: null,
                                });
                            } else {
                                let indexData = dataLogtoday.findIndex(
                                    (x) => x.username == eachMember.username
                                );
                                dataLogtoday[indexData].winloss =
                                    dataLogtoday[indexData].winloss +
                                    calCurrent * percent[0].persen;

                                dataLogtoday[indexData].current =
                                    dataLogtoday[indexData].current + calCurrent;
                            }
                            await Func.exeSQL(
                                "UPDATE affiliated SET current = current - ? WHERE username = ?", [calCurrent, eachMember.username]
                            );
                        }
                    }
                }
            }
            if (currentDividend > 0) {
                await db["log_today"]
                    .update({ dividend: dividendTotal, data: JSON.stringify(dataLogtoday) }, { where: { id: log_today[0].id } })
                    .catch(function(err) {
                        Func.Error_log(err, req.path, req.method), (res.err = err);
                    });

                await exeSQL(
                    "UPDATE affiliated SET dividend = dividend + ? WHERE username = ? ", [currentDividend, username]
                );
                await exeSQL(
                    "UPDATE log_today SET dividend = ? , data = ? WHERE id = ?", [dividendTotal, JSON.stringify(dataLogtoday), log_today[0].id]
                );
            }

            res.json({
                code: 0,
                msg: currentDividend > 0 ? "อัพเดทข้อมูลสำเร็จ" : "ไม่มีการคำนวณเกิดขึ้น!",
            });
        } catch (err) {
            console.log(err);
            res.json({
                code: 1,
                msg: err.length > 0 ? err : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ!",
            });
        }
    } else {
        res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

AFF.affiliateDeposit = (req, res) => {
    if (req.user) {
        let username = req.user.username.toString();
        let current = parseFloat(req.body.current);
        axios
            .get(
                serverAPIAff +
                "?member=" +
                username +
                "&service=" +
                service +
                "&current=" +
                current
            )
            .then((response) => {
                res.json({
                    code: 0,
                    msg: "SUCCESS",
                });
            })
            .catch((error) => {
                res.json({
                    code: 2,
                    msg: "ขาดการเชื่อมต่อจากเซิร์ฟเวอร์",
                });
            });
    } else {
        res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

AFF.affiliateWithdraw = (req, res, next) => {
    if (req.user) {
        let username = req.user.username.toString();
        let current = parseFloat(req.body.current);
        axios
            .get(
                serverAPIAff +
                "?member=" +
                username +
                "&service=" +
                service +
                "&current=-" +
                current
            )
            .then((response) => {
                res.json({
                    code: 0,
                    msg: "SUCCESS",
                });
            })
            .catch((error) => {
                res.json({
                    code: 2,
                    msg: "ขาดการเชื่อมต่อจากเซิร์ฟเวอร์",
                });
            });
    } else {
        res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

AFF.AffrefDE = (req, res, next) => {
    if (req.body) {
        let join_user = req.body.join;

        jwt.verify(join_user, process.env.SECRETKEY_BODY, async(err, payload) => {
            if (err) {
                console.log(err);
                return res.json({
                    code: 2,
                    msg: "NO_DATA_ON_TOKEN",
                });
            }
            if (payload) {
                res.json({
                    code: 0,
                    msg: "ถอดโทเค็นสำเร็จ",
                    payload: {
                        token: payload.token,
                    },
                });
            } else {
                return res.json({
                    code: 2,
                    msg: "NO_DATA_ON_TOKEN",
                });
            }
        });
    } else {
        return res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

AFF.affiliateSystem = async(req, res, next) => {
    let join_token = req.query.join;
    if (join_token != undefined) {
        let result = await Func.exeSQL(
            "SELECT * FROM affiliated WHERE token = ? LIMIT 1", [join_token]
        );
        if (result.length > 0) {
            await Func.exeSQL(
                "UPDATE affiliated SET click_traffic = ?,share_traffic = ?,web_traffic = ?  WHERE token = ?", [
                    result[0].click_traffic + 1,
                    result[0].share_traffic + 1,
                    esult[0].web_traffic + 1,
                ]
            );

            jwt.sign({
                    id: result[0].id,
                    username: result[0].username,
                    token: result[0].token,
                    join: result[0].join,
                    join_date: result[0].join_date,
                    current: result[0].current,
                    winloss: result[0].winloss,
                    dividend: result[0].dividend,
                    service: result[0].service,
                    web_traffic: result[0].web_traffic,
                    share_traffic: result[0].share_traffic,
                    click_traffic: result[0].click_traffic,
                    user_type: result[0].user_type,
                    status: result[0].status,
                    update_time: result[0].update_time,
                    point: result[0].point,
                    price: result[0].price,
                },
                process.env.SECRETKEY_BODY,
                (err, token) => {
                    res.writeHead(302, {
                        Location: registerLink + "?ref=" + token,
                    });
                    res.end();
                }
            );
        } else {
            res.writeHead(302, {
                Location: registerLink,
            });
            res.end();
        }
    } else {
        res.writeHead(302, {
            Location: registerLink,
        });
        res.end();
    }
};

AFF.affiliateMember = async(req, res) => {
    let join_token = req.query.join;
    if (join_token != undefined) {

        let memberSource = await Func.exeSQL("SELECT * FROM affiliated WHERE token = ? LIMIT 1", [join_token])

        if (memberSource.length > 0) {
            memberSource = memberSource[0];
            await Func.exeSQL("UPDATE affiliated SET click_traffic=click_traffic + 1,share_traffic = share_traffic + 1, web_traffic = web_traffic+ 1 WHERE token = ?", [join_token])
            res.writeHead(302, {
                Location: registerLink + "?ref=" + join_token,
            });
            res.end();
        } else {
            res.writeHead(302, {
                Location: registerLink,
            });
            res.end();
        }
    } else {
        res.writeHead(302, {
            Location: registerLink,
            //add other headers here...
        });
        res.end();
    }
};


AFF.credit_system = async(req, res) => {
    const createAccount = (username) => {
        return new Promise(async(resolve, reject) => {
            resultAffiliated = await Func.exeSQL("SELECT * FROM affiliated WHERE username = ? ", [username]);
            if (resultAffiliated.length > 0) {
                let payload = {
                    datetime: new Date(),
                    username: username,
                    token: resultAffiliated[0].token,
                    join_token: resultAffiliated[0].join,
                    credit: 0,
                    max_member: 3,
                    active_credit: 0,
                };
                let resssss = await Func.exeSQL("INSERT INTO f_member_account SET ?", [payload]);
                resolve(true);
            } else {
                resolve(null);
            }
        });
    };
    const selectCountstatement = (username) => {
        return new Promise((resolve, reject) => {
            let statement = [];
            statement[0] = {
                count: 5,
            };
            resolve(statement);
        });
    };

    if (req.user) {
        let username = req.user.username.toString();
        let max_member = 0;
        let creditfree_account = await Func.exeSQL("SELECT * FROM f_member_account WHERE username = ? ", [username])
        if (creditfree_account.length > 0) {
            if (creditfree_account[0].max_member != 50) {
                let resultCheckstatement = await selectCountstatement(username);;
                if (resultCheckstatement) {
                    if (resultCheckstatement[0].count >= 5) {
                        max_member = 50;
                    } else if (resultCheckstatement[0].count >= 4) {
                        max_member = 43;
                    } else if (resultCheckstatement[0].count >= 3) {
                        max_member = 33;
                    } else if (resultCheckstatement[0].count >= 2) {
                        max_member = 23;
                    } else if (resultCheckstatement[0].count >= 1) {
                        max_member = 13;
                    } else {
                        max_member = 3;
                    }
                    if (creditfree_account[0].max_member == max_member) {
                        return res.json({
                            code: "1",
                            msg: "ดึงข้อมูลสำเร็จ",
                            payload: creditfree_account[0],
                        });
                    } else {
                        let updateMaxmember = await Func.exeSQL("UPDATE `f_member_account` SET max_member = ? WHERE username = ?", [max_member, username])

                        if (updateMaxmember) {
                            creditfree_account[0].max_member = max_member;
                            return res.json({
                                code: "0",
                                msg: "ดึงข้อมูลสำเร็จ",
                                payload: creditfree_account[0],
                            });
                        } else {
                            return res.json({
                                code: "1",
                                msg: "ไม่สามารถอัพเดทข้อมูลเครดิตฟรีได้ ในขณะนี้!",
                                payload: creditfree_account[0],
                            });
                        }
                    }
                } else {
                    return res.json({
                        code: "1",
                        msg: "ไม่ผ่านเงื่อนไขการรับเครดิตฟรี!",
                        payload: creditfree_account[0],
                    });
                }
            } else {
                return res.json({
                    code: "0",
                    msg: "ดึงข้อมูลสำเร็จ",
                    payload: creditfree_account[0],
                });
            }
        } else {
            await createAccount(username);
            return res.json({
                code: "1",
                msg: "ไม่พบบัญชีสำหรับการรับ กิจกรรมเครดิตฟรี!",
                payload: [],
            });
        }
    } else {
        return res.json({
            code: "1",
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};


const filterAPI = (dateRegister) => {
    return new Promise((resolve, reject) => {
        let api = serverAPI;
        resolve(api);
    });
};
const connection = require("../Config/db");

AFF.receive_credit = async(req, res) => {
    let apiNew = [];
    apiNew[req.user.username] = await filterAPI(req.user.date_regis);
    // db.once("value", (snap) => {
    //     if (snap.val() == 1) {
    //         error.set(0);
    let sqlStatement =
        "SELECT * FROM t_deposit_statement WHERE account = ? ORDER BY id DESC LIMIT 1";
    connection.query(
        sqlStatement, [req.user.username],
        (error, count_bonus) => {
            axios
                .get(
                    apiNew[req.user.username] + "/userinfo?key=" + req.user.username
                )
                .then((response) => {
                    if (
                        parseFloat(response.data.currentCredit) <= 10 ||
                        count_bonus.length == 0 ||
                        count_bonus[0].use_bonus == "201"
                    ) {
                        let sqlMember =
                            "SELECT * FROM f_member_account WHERE username = ? AND active_credit = 0 AND active_topup = 1";
                        connection.query(
                            sqlMember, [req.body.username],
                            async(error, results, fields) => {
                                // connection.query("SELECT active,date_regis,totaldeposit FROM t_member_account WHERE username = ? ", [req.body.username], (error, activeuser, fields) => {
                                //   if (activeuser.length > 0 && activeuser[0].totaldeposit > 0) {

                                let activeuser = await Func.exeSQL("SELECT active,date_regis,total_deposit FROM t_member_account WHERE username = ?", [req.body.username])
                                if (activeuser.length > 0 && activeuser[0].total_deposit >= 100) {
                                    if (results.length > 0 || activeuser[0].total_deposit >= 100) {
                                        connection.query(
                                            "SELECT * FROM t_bonus_config WHERE bonus_id = '201'",
                                            (error, bonusData) => {
                                                let payload = {
                                                    date: new Date(),
                                                    time: moment(new Date()).format("HH:mm:ss"),
                                                    amount: 0,
                                                    bank: bonusData[0].bonus_id,
                                                    account: req.user.username,
                                                    bonus: bonusData[0].fix_deposit,
                                                    point: 0,
                                                    fix_multiple: bonusData[0].fix_multiple,
                                                    channel: "CREDIT_FREE_SYSTEM",
                                                    detail: req.body.username,
                                                    tx_hash: bonusData[0].bonus_id +
                                                        "" +
                                                        req.body.username +
                                                        bonusData[0].fix_deposit +
                                                        bonusData[0].fix_multiple,
                                                    status: 2,
                                                    is_bonus: 1,
                                                    use_bonus: bonusData[0].bonus_id,
                                                    withdraw_fix: bonusData[0].fix_deposit *
                                                        bonusData[0].fix_multiple,
                                                    is_check: 0,
                                                    updated_at: new Date(),
                                                    befor_credit: 0,
                                                    after_credit: 0,
                                                    fix_withdraw: bonusData[0].fix_deposit *
                                                        bonusData[0].fix_withdraw,
                                                };

                                                connection.query(
                                                    "INSERT INTO `t_deposit_statement` SET ?",
                                                    payload,
                                                    (error, result, fields) => {
                                                        if (error)
                                                            return res.json({
                                                                code: 1,
                                                                msg: "รับเครดิตของเพื่อนคนนี้ไปแล้ว",
                                                            });
                                                        let sqlUpdateMember =
                                                            "UPDATE `f_member_account` SET active_credit = 1 WHERE username = ? ";
                                                        connection.query(sqlUpdateMember, [
                                                            req.body.username,
                                                        ]);
                                                        connection.query(
                                                            "UPDATE `f_member_account` SET credit= credit+" +
                                                            bonusData[0].fix_deposit +
                                                            " WHERE username= '" +
                                                            req.user.username +
                                                            "'"
                                                        );
                                                        let point = bonusData[0].fix_deposit;
                                                        axios
                                                            .get(
                                                                apiNew[req.user.username] +
                                                                "/deposit?key=" +
                                                                req.user.username +
                                                                "&point=" +
                                                                point
                                                            )
                                                            .then((response) => {
                                                                delete apiNew;
                                                                if (response.data.currentBalance > 0) {
                                                                    if (
                                                                        parseFloat(
                                                                            response.data.previousDownlineGiven
                                                                        ) <= 10
                                                                    ) {
                                                                        let sqlUpdateStatement =
                                                                            "UPDATE `t_deposit_statement` SET is_check = '-1' WHERE account= ?";
                                                                        connection.query(sqlUpdateStatement, [
                                                                            req.user.username,
                                                                        ]);
                                                                        connection.query(
                                                                            "UPDATE `t_deposit_statement` SET status=1, is_check = 1 ,befor_credit = '" +
                                                                            response.data.previousDownlineGiven +
                                                                            "', after_credit = '" +
                                                                            response.data.currentBalance +
                                                                            "' WHERE id= '" +
                                                                            result.insertId +
                                                                            "'"
                                                                        );
                                                                        return res.json({
                                                                            code: "0",
                                                                            msg: "รับเครดิตฟรีจำนวน " +
                                                                                bonusData[0].fix_deposit +
                                                                                " บาท ต้องทำเทิร์น " +
                                                                                bonusData[0].fix_deposit *
                                                                                bonusData[0].fix_multiple +
                                                                                " บาท เรียบร้อยแล้ว",
                                                                        });
                                                                    } else {
                                                                        connection.query(
                                                                            "UPDATE `t_deposit_statement` SET status=1, is_check = 1 ,befor_credit = '" +
                                                                            response.data.previousDownlineGiven +
                                                                            "', after_credit = '" +
                                                                            response.data.currentBalance +
                                                                            "' WHERE id= '" +
                                                                            result.insertId +
                                                                            "'"
                                                                        );
                                                                        return res.json({
                                                                            code: "0",
                                                                            msg: "รับเครดิตฟรีจำนวน " +
                                                                                bonusData[0].fix_deposit +
                                                                                " บาท ต้องทำเทิร์น " +
                                                                                bonusData[0].fix_deposit *
                                                                                bonusData[0].fix_multiple +
                                                                                " บาท เรียบร้อยแล้ว",
                                                                        });
                                                                    }
                                                                } else {
                                                                    connection.query(
                                                                        "UPDATE `t_deposit_statement` SET status=0 WHERE id= '" +
                                                                        result.insertId +
                                                                        "'"
                                                                    );
                                                                    return res.json({
                                                                        code: 1,
                                                                        msg: "SERVER_DOWN",
                                                                    });
                                                                }
                                                            })
                                                            .catch((err) => {
                                                                connection.query(
                                                                    "UPDATE `t_deposit_statement` SET status=0 WHERE id= '" +
                                                                    result.insertId +
                                                                    "'"
                                                                );
                                                                return res.json({
                                                                    code: 1,
                                                                    msg: "SERVER_DOWN",
                                                                });
                                                            });
                                                    }
                                                );
                                            }
                                        );
                                    } else {
                                        return res.json({
                                            code: 1,
                                            msg: "รับเครดิตของเพื่อนคนนี้ไปแล้ว หรือยังไม่มีการเติมเงินสำหรับยูสนี้!",
                                        });
                                    }
                                } else {
                                    return res.json({
                                        code: 1,
                                        msg: "ยังไม่มีการเติมเงินสำหรับยูสนี้!",
                                    });
                                }
                                //  });
                            }
                        );
                    } else {
                        return res.json({
                            code: 1,
                            msg: "จำนวนเงินต้องมีน้อยกว่า 10 บาทจึงจะสามารถรับเครดิตฟรีได้",
                        });
                    }
                })
                .catch((err) => {
                    delete apiNew;
                    return res.json({
                        code: 1,
                        msg: "SERVER_DOWN",
                    });
                });
        }
    );
    // } else {
    //     return res.json({
    //         code: 1,
    //         msg: "SERVER ปิดปรับปรุงกรุณารอสักครู่",
    //     });
    // }
    //});
};




AFF.credit_system_join = async(req, res) => {
    if (req.user) {
        let sqlMember = "SELECT * FROM f_member_account WHERE username = ?";
        connection.query(
            sqlMember, [req.user.username],
            (error, results, fields) => {
                if (error)
                    return res.json({
                        code: "1",
                        msg: "ERROR_DATABASE",
                    });
                else if (results.length > 0) {
                    let sqlJoinToken =
                        "SELECT id,datetime,token, active_credit ,active_topup ,username FROM f_member_account WHERE join_token = ? ORDER BY  datetime  DESC  LIMIT 50";
                    connection.query(
                        sqlJoinToken, [results[0].token, results[0].max_member],
                        (error, member, fields) => {
                            if (member.length == 0) {
                                return res.json({
                                    code: "0",
                                    payload: [],
                                });
                            } else {
                                let payload = [];
                                let count = 0;
                                console.log("HERE");
                                // member.forEach(async(val) => {
                                for (const val of member) {
                                    console.log('member', val)
                                    connection.query(
                                        "SELECT active,date_regis,total_deposit FROM t_member_account WHERE username = ? ", [val.username],
                                        async(error, resultresult, fields) => {
                                            // console.log(error)
                                            let username = resultresult;
                                            console.log('username', username)
                                            if (val.active_credit == 1) {
                                                count++;
                                                payload.push({
                                                    datetime: val.datetime,
                                                    username: val.username,
                                                    token: val.token,
                                                    active_credit: val.active_credit,
                                                    active: 1,
                                                    active_topup: username[0].total_deposit >= 100 ? 1 : 0 //val.active_topup,
                                                });
                                            } else if (
                                                username.length > 0 &&
                                                moment(username[0].date_regis).format("YYYY-MM-DD") <=
                                                "2020-06-06"
                                            ) {
                                                console.log("DATE_REGIS <= 2020-06-06");
                                                connection.query(
                                                    "UPDATE f_member_account SET datetime = ? WHERE username = ? ", [username[0].date_regis, val.username]
                                                );
                                                console.log("UPDATED");
                                                count++;
                                            } else if (username.length == 1) {
                                                count++;

                                                // let sumdeposit = await Func.exeSQL("SELECT SUM(amount) from t_deposit_statement where account = ? ", [val.username])
                                                payload.push({
                                                    datetime: val.datetime,
                                                    username: val.username,
                                                    token: val.token,
                                                    active_credit: val.active_credit,
                                                    active: username[0].active,
                                                    active_topup: username[0].total_deposit >= 100 ? 1 : 0 //val.active_topup,
                                                });
                                            } else {
                                                console.log("DELETED");
                                                count++;
                                                connection.query(
                                                    "SELECT * FROM f_member_account WHERE username = '" +
                                                    val.username +
                                                    "'",
                                                    (error, checkUserf) => {
                                                        if (checkUserf.length > 0) {
                                                            connection.query(
                                                                "DELETE FROM f_member_account WHERE username = '" +
                                                                val.username +
                                                                "'"
                                                            );
                                                        }
                                                    }
                                                );
                                                connection.query(
                                                    "SELECT * FROM affiliated WHERE username = '" +
                                                    val.username +
                                                    "'",
                                                    (error, checkAffeach) => {
                                                        if (checkAffeach.length > 0) {
                                                            connection.query(
                                                                "DELETE FROM affiliated WHERE username = '" +
                                                                val.username +
                                                                "'"
                                                            );
                                                        }
                                                    }
                                                );
                                            }

                                            if (count == member.length) {
                                                return res.json({
                                                    code: "0",
                                                    payload: payload,
                                                });
                                            }
                                        }
                                    );
                                };
                            }
                        }
                    );
                } else {
                    return res.json({
                        code: "0",
                        payload: [],
                    });
                }
            }
        );
    } else {
        res.setHeader("Content-Type", "application/json");
        res.writeHead(400);
        return res.json({
            code: "1",
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};



module.exports = AFF;