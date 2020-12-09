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
const connection = require("../Config/db");
var axios = require("axios");

const WALLET = function(entity) {};

WALLET.wallet = async(req, res) => {
    if (req.user) {
        let username = req.user.username;
        let listWallet = await Func.exeSQL(
            "SELECT date,amount FROM t_wallet_statement2 WHERE username = ? ORDER BY id DESC LIMIT 20", [username]
        );

        let sumWallet = await Func.exeSQL(
            "SELECT SUM(amount) as walletAff FROM t_wallet_statement2 WHERE username = ? AND is_check = 1", [username]
        );

        if (listWallet.length > 0 && sumWallet.length > 0) {
            res.json({
                code: 0,
                msg: "ดึงข้อมูล Wallet สำเร็จ!",
                payload: listWallet,
                walletSum: sumWallet[0].sumWallet ? sumWallet[0].sumWallet : 0,
            });
        } else {
            res.json({
                code: 1,
                msg: "ไม่พบข้อมูล Wallet",
                walletSum: 0,
            });
        }
    } else {
        res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

WALLET.walletToCredit = async(req, res) => {
    if (req.user) {
        let username = req.user.username;
        let bank_number = req.user.bank_number;
        let full_name = req.user.full_name;
        let bank_code = req.user.bank_code;

        let sumWallet = await Func.exeSQL(
            "SELECT SUM(amount) as walletAff FROM t_wallet_statement2 WHERE username = ? AND is_check = 1", [username]
        );
        let oldAmount = await Func.selectCredit(username, serverAPI);
        if (sumWallet.length > 0) {
            sumWallet = sumWallet[0].walletAff;
            let resultUpdatewallet = await Func.exeSQL(
                "UPDATE t_wallet_statement2 SET is_check = 0 WHERE username = ?", [username]
            );
            if (resultUpdatewallet.changedRows > 0) {
                let payloadWallet = {
                    transaction_id: moment(new Date()).format("YYYY-MM-DD HH:mm:ss") + username,
                    date: moment(new Date()).format("YYYY-MM-DD"),
                    time: moment(new Date()).format("HH:mm:ss"),
                    username: username,
                    amount: -sumWallet,
                    status: 1,
                    is_check: 0,
                    action: "withdraw",
                    before_dividend: null,
                    after_dividend: null,
                    before_amount: sumWallet,
                    after_amount: 0,
                    bank: 1,
                    bank_number: bank_number,
                    bank_name: full_name,
                    bank_code: bank_code,
                };
                let resultInsertwallet = await Func.exeSQL(
                    "INSERT INTO t_wallet_statement2 SET ?", [payloadWallet]
                );
                if (resultInsertwallet) {
                    let payloadDeposit = {
                        date: moment(new Date()).format("YYYY-MM-DD"),
                        time: moment(new Date()).format("HH:mm:ss"),
                        amount: 0,
                        bank: "115",
                        account: username,
                        bonus: parseInt(sumWallet),
                        point: 0,
                        fix_multiple: 0,
                        channel: "Affiliate",
                        detail: "",
                        tx_hash: moment(new Date()).format("YYYY-MM-DD HH:mm:ss") +
                            "Affiliate" +
                            username,
                        status: 2,
                        is_bonus: 1,
                        use_bonus: "115", // EDIT
                        withdraw_fix: 0,
                        is_check: 1,
                        befor_credit: 0,
                        after_credit: 0,
                    };
                    let resultInsertdeposit = await Func.exeSQL(
                        "INSERT INTO t_deposit_statement SET ?", [payloadDeposit]
                    );

                    if (resultInsertdeposit) {
                        let resultAddcredit = await Func.addCreditUser(
                            username,
                            sumWallet,
                            serverAPI
                        );
                        if (resultAddcredit != null) {
                            let newAmount = await Func.selectCredit(username, serverAPI);
                            let resultUpdate = await Func.exeSQL(
                                "UPDATE `t_deposit_statement` SET status=1, is_check = 1 ,befor_credit = '" +
                                oldAmount +
                                "', after_credit = '" +
                                newAmount +
                                "' WHERE id= '" +
                                idStatement +
                                "'"
                            );

                            if (resultUpdate.changedRows > 0) {
                                res.json({
                                    code: 0,
                                    msg: "เติมเงินสำเร็จ จำนวน " + parseInt(sumWallet) + " บาท!",
                                });
                            } else {
                                res.json({
                                    code: 1,
                                    msg: "ไม่สามารถแอดเครดิตได้ในขณะนี้!",
                                });
                            }
                        } else {
                            res.json({
                                code: 1,
                                msg: "ไม่สามารถแอดเครดิตได้ในขณะนี้!",
                            });
                        }
                    } else {
                        res.json({
                            code: 1,
                            msg: "ไม่สามารถเพิ่มรายการถอนได้ ในขณะนี้!",
                        });
                    }
                } else {
                    res.json({
                        code: 1,
                        msg: "ไม่สามารถเพิ่มรายการถอนใน Wallet ได้ในขณะนี้!",
                    });
                }
            } else {
                res.json({
                    code: 1,
                    msg: "ไม่สามารถอัพเดทสเตทเม้น Wallet ได้ในขณะนี้!",
                });
            }
        } else {
            res.json({
                code: 1,
                msg: "ไม่พบข้อมูล Wallet ในบัญชีนี้!",
            });
        }
    } else {
        res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

WALLET.walletWithdraw = async(req, res) => {
    if (req.user) {
        let username = req.user.username;
        let bank_number = req.user.bank_number;
        let full_name = req.user.full_name;
        let bank_code = req.user.bank_code;

        let sumWallet = await Func.exeSQL(
            "SELECT SUM(amount) as walletAff FROM t_wallet_statement2 WHERE username = ? AND is_check = 1", [username]
        );
        sumWallet = sumWallet[0].walletAff

        if (sumWallet && sumWallet > 0) {
            let resultUpdatewallet = await Func.exeSQL(
                "UPDATE t_wallet_statement2 SET is_check = 0 WHERE username = ?", [username]
            );
            if (resultUpdatewallet.changedRows > 0) {
                let payloadWallet = {
                    transaction_id: moment(new Date()) + username,
                    date: moment(new Date()).format("YYYY-MM-DD"),
                    time: moment(new Date()).format("HH:mm:ss"),
                    username: username,
                    amount: -sumWallet,
                    status: 1,
                    is_check: 0,
                    action: "withdraw",
                    before_dividend: null,
                    after_dividend: null,
                    before_amount: sumWallet,
                    after_amount: 0,
                    bank: 1,
                    bank_number: bank_number,
                    bank_name: full_name,
                    bank_code: bank_code,
                };

                let resultInsertwallet = await Func.exeSQL(
                    "INSERT INTO t_wallet_statement2 SET ? ", [payloadWallet]
                );

                if (resultInsertwallet) {
                    let payloadWithdraw = {
                        date: moment(new Date()).format("YYYY-MM-DD"),
                        time: moment(new Date()).format("HH:mm:ss"),
                        amount: sumWallet,
                        account: username,
                        befor_credit: sumWallet,
                        hash: sha1(
                            moment().format("YYYY-MM-DD HH:mm") + username + sumWallet + "0"
                        ),
                        after_credit: 0,
                        bank: 1,
                        status: 3,
                        bank_number: bank_number,
                        bank_name: full_name,
                        bank_code: bank_code,
                        withdraw_from: "affiliate",
                    };

                    let resultInsertwithdraw = await Func.exeSQL(
                        "INSERT INTO t_withdraw_statement SET ? ", [payloadWithdraw]
                    );
                    if (resultInsertwithdraw) {
                        res.json({
                            code: 0,
                            msg: "ถอนเงินจากกระเป๋าสำเร็จเรียบร้อย! " + sumWallet + " บาท",
                        });
                    } else {
                        res.json({
                            code: 1,
                            msg: "ไม่สามารถเพิ่มรายการถอนได้ ในขณะนี้!",
                        });
                    }
                } else {
                    res.json({
                        code: 1,
                        msg: "ไม่สามารถเพิ่มรายการถอนใน Wallet ได้ในขณะนี้!",
                    });
                }
            } else {
                res.json({
                    code: 1,
                    msg: "ไม่สามารถอัพเดทสเตทเม้น Wallet ได้ในขณะนี้!",
                });
            }
        } else {
            res.json({
                code: 1,
                msg: "ไม่พบข้อมูล Wallet ในบัญชีนี้!",
            });
        }
    } else {
        res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

WALLET.walletDeposit = async(req, res) => {
    if (req.user) {
        let username = req.user.username;
        // let dividend = await db["affiliated"]
        //     .findAll({
        //         attributes: ["dividend"],
        //         where: { username: username },
        //     })
        //     .catch(function(err) {
        //         Func.Error_log(err, req.path, req.method), (res.err = err);
        //     });
        let dividend = await Func.exeSQL(
            "SELECT dividend FROM affiliated WHERE username = ?", [username]
        );
        if (dividend[0]) {
            if (parseInt(dividend[0].dividend) > 0) {
                // let sumWallet = await db["t_wallet_statement2"]
                //     .sum("amount", {
                //         where: { username: username, is_check: 1 },
                //     })
                //     .catch(function(err) {
                //         Func.Error_log(err, req.path, req.method), (res.err = err);
                //     });

                let sumWallet = await Func.exeSQL(
                    "SELECT SUM(amount) as walletAff FROM t_wallet_statement2 WHERE username = ? AND is_check = 1", [username]
                );

                let payload = {
                    transaction_id: username + dividend[0].dividend,
                    date: moment(new Date()).format("YYYY-MM-DD"),
                    time: moment(new Date()).format("HH:mm:ss"),
                    username: username,
                    before_dividend: dividend[0].dividend,
                    after_dividend: 0,
                    amount: dividend[0].dividend,
                    before_amount: sumWallet[0].walletAff,
                    after_amount: sumWallet[0].walletAff + dividend[0].dividend,
                    status: 1,
                    is_check: 1,
                    action: "deposit",
                };

                let resultUpdatedividend = await Func.exeSQL(
                    "UPDATE affiliated SET dividend = 0 WHERE username = ? ", [username]
                );

                if (resultUpdatedividend.changedRows > 0) {
                    let resultInsertwallet = await Func.exeSQL(
                        "INSERT INTO t_wallet_statement2 SET ?", [payload]
                    );
                    if (resultInsertwallet) {
                        res.json({
                            code: 0,
                            msg: "ทำการเพิ่มเงินในกระเป๋าตังสำเร็จ! จำนวน " +
                                (sumWallet + dividend[0].dividend) +
                                " บาท",
                        });
                    } else {
                        res.json({
                            code: 1,
                            msg: "ไม่สามารถถอนเงินจาก Affiliate ได้ในขณะนี้!",
                        });
                    }
                } else {
                    res.json({
                        code: 1,
                        msg: "ไม่สามารถเพิ่มรายการ Wallet ได้ในขณะนี้!",
                    });
                }
            } else {
                res.json({
                    code: 1,
                    msg: "ไม่พบข้อมูลยอดเสีย!",
                });
            }
        } else {
            res.json({
                code: 1,
                msg: "เกิดข้อผิดพลาด กรุณาลองใหม่!!!",
            });
        }
    } else {
        res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

WALLET.depositTruewallet = async(req, res, next) => {
    if (req.user && req.body) {
        let username = req.user.username;
        let self_phone = req.user.phone_number;
        let phone_number = req.body.phone_number;
        let bankID = req.body.bank_id != undefined ? req.body.bank_id : "1";
        let amount = req.body.amount;
        let checkPhone = await Func.exeSQL(
            "SELECT phone_number FROM t_member_account WHERE phone_number = ? ", [phone_number]
        );
        if (checkPhone[0]) {
            let bankTruewallet = await Func.exeSQL(
                "SELECT * FROM t_deposit_rule WHERE id = ? AND status = 1 ", [bankID]
            );
            if (bankTruewallet) {
                const table = bankTruewallet[0].table;
                let statementTruewallet = await Func.exeSQL(
                    "SELECT * FROM  `" +
                    bankTruewallet[0].table +
                    "` WHERE BankNo = ? AND Deposit = ? AND Status != '1' && Date >= Date(CURRENT_DATE - INTERVAL 2 DAY) LIMIT 1", [phone_number, amount]
                );
                if (statementTruewallet.length > 0) {
                    const table = bankTruewallet[0].table;
                    let updateStatement = await Func.exeSQL(
                        "UPDATE `" +
                        table +
                        "` SET BankNo = ? , Detail = ?,Status = 0 WHERE Hash = ? ", [
                            self_phone,
                            statementTruewallet[0].BankNo,
                            statementTruewallet[0].Hash,
                        ]
                    );
                    if (updateStatement.changedRows > 0) {
                        if (updateStatement) {
                            res.json({
                                code: 0,
                                msg: "เติมเงินสำเร็จ <br>ให้กับยูสเซอร์เนม " +
                                    username +
                                    "<br> จำนวน " +
                                    parseInt(amount) +
                                    " บาท <br> กรุณารอยอดเงินเข้าภายใน 1-5 นาที!<br> ",
                            });
                        } else {
                            res.json({
                                code: 1,
                                msg: "ไม่สามารถตรวจสอบข้อมูลรายการฝาก ได้ในขณะนี้!",
                            });
                        }
                    } else {
                        res.json({
                            code: 1,
                            msg: "ไม่สามารถอัพเดทรายการสเตทเม้นได้ ในขณะนี้! ",
                        });
                    }
                } else {
                    res.json({
                        code: 1,
                        msg: "ไม่พบรายการฝากดังกล่าว! ",
                    });
                }
            } else {
                res.json({
                    code: 1,
                    msg: "ไม่พบบัญชีทรูวอลเลต! ",
                });
            }
        } else {
            res.json({
                code: 1,
                msg: "ไม่สามารถยืนยันยอดได้เนื่องจากเบอร์ " +
                    phone_number +
                    "<br> หมายเลขโทรศัพท์นี้เป็นสมาชิกในระบบแล้ว! ",
            });
        }
    } else {
        res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETERS",
        });
    }
};


WALLET.wheel_wallet = async(req, res) => {
    let username = req.user.username;
    if (username != '') {
        let result = await Func.exeSQL(
            "SELECT SUM(amount) as amount FROM t_wheel_statement WHERE username = ?", [username]
        );
        res.json({
            code: 0,
            wheel_wallet: result.length > 0 ? result[0].amount || 0 : 0,
        });
    } else {
        res.json({
            code: 1,
            payload: "!PARAMETER NO FLOUND",
        });
    }
};


WALLET.walletWithdraw_NEW = async(req, res, next) => {
    const selectSumwallet = (username) => {
        return new Promise((resolve, reject) => {
            connection.query(
                "SELECT sum(amount) walletAff FROM t_wallet_statement2 WHERE username = ? AND is_check = '1' ", [username],
                (error, sumWallet) => {
                    if (error) {
                        resolve(null);
                    }
                    if (sumWallet.length > 0) {
                        resolve(sumWallet);
                    } else {
                        resolve(null);
                    }
                }
            );
        });
    };

    const updateWallet = (username) => {
        return new Promise((resolve, reject) => {
            connection.query("UPDATE t_wallet_statement2 SET is_check = 0 WHERE username =  ? ", [username], (error, updateWallet) => {
                if (error) {
                    resolve(null);
                }
                if (updateWallet.changedRows > 0) {
                    resolve(true);
                } else {
                    resolve(null);
                }
            });
        });
    };

    const insertWalletstatement = (payload) => {
        return new Promise((resolve, reject) => {
            connection.query("INSERT INTO t_wallet_statement2 SET ?", payload, (error, resultInsert) => {
                if (error) {
                    resolve(null);
                } else {
                    resolve(true);
                }
            });
        });
    };

    const insertWithdrawstatement = (payload) => {
        return new Promise((resolve, reject) => {
            connection.query("INSERT INTO t_withdraw_statement SET ?", payload, (error, resultInsertwithdraw) => {
                if (error) {
                    resolve(error);
                } else {
                    axios.get("http://topupoffice.com/withdraw/withdrawWallet?service=" + service + "&id=" + resultInsertwithdraw.insertId, {
                        timeout: 30000,
                    });
                    resolve(true);
                }
            });
        });
    };
    if (req.user) {
        if (!req.body || !req.body.amount) {
            return res.json({
                code: 1,
                msg: "NOT_FOUND_PARAMETER",
            });
        }
        let amount = parseFloat(req.body.amount);
        if (parseFloat(amount) <= 0) {
            return res.json({
                code: 1,
                msg: "กรุณาระบุยอดเงินให้ถูกต้อง!",
            });
        }
        if (parseFloat(amount) < 10) {
            return res.json({
                code: 1,
                msg: "ถอนขั้นต่ำ 10 บาท!",
            });
        }
        if (typeof amount != "number") {
            return res.json({
                code: 1,
                msg: "ชนิดข้อมูลไม่ถูกต้อง!",
            });
        }
        let username = req.user.username.toString();
        let bank_number = req.user.bank_number.toString();
        let full_name = req.user.full_name.toString();
        let bank_code = req.user.bank_code.toString();
        let sumWallet = await selectSumwallet(username);
        if (parseFloat(sumWallet[0].walletAff) < parseFloat(amount)) {
            return res.json({
                code: 1,
                msg: "ยอดเงินของท่านไม่เพียงพอ กรุณาลองใหม่ภายหลัง!",
            });
        }
        if (sumWallet && sumWallet[0].walletAff > 0) {
            let balance = parseFloat(sumWallet[0].walletAff) - parseFloat(amount);
            let resultUpdatewallet = await updateWallet(username);
            if (resultUpdatewallet) {
                let resultInsertwallet = await insertWalletstatement({
                    transaction_id: Date.now() + username,
                    date: new Date(),
                    time: new Date(),
                    username: username,
                    amount: -amount,
                    status: 1,
                    is_check: 0,
                    action: "withdraw",
                    before_dividend: null,
                    after_dividend: null,
                    before_amount: sumWallet[0].walletAff,
                    after_amount: parseFloat(sumWallet[0].walletAff) - parseFloat(amount),
                    bank: 1,
                    bank_number: bank_number,
                    bank_name: full_name,
                    bank_code: bank_code,
                });
                if (resultInsertwallet) {
                    let addWallet = true;
                    if (balance > 0) {
                        addWallet = await insertWalletstatement({
                            transaction_id: Date.now() + username,
                            date: new Date(),
                            time: new Date(),
                            username: username,
                            amount: balance,
                            status: 1,
                            is_check: 1,
                            action: "deposit",
                            before_dividend: null,
                            after_dividend: null,
                            before_amount: sumWallet[0].walletAff,
                            after_amount: balance,
                            bank: 1,
                            bank_number: bank_number,
                            bank_name: full_name,
                            bank_code: bank_code,
                        });
                    }

                    if (!addWallet) {
                        return res.json({
                            code: 1,
                            msg: "ไม่สามารถเพิ่มรายการวอลเลตได้!",
                        });
                    }
                    let payloadWithdraw = {
                        date: new Date(),
                        time: new Date(),
                        amount: amount,
                        account: username,
                        befor_credit: sumWallet[0].walletAff,
                        hash: sha1(momentjs().format("YYYY-MM-DD HH:mm") + username + amount + balance),
                        after_credit: balance,
                        bank: 1,
                        status: 3,
                        bank_number: bank_number,
                        bank_name: full_name,
                        bank_code: bank_code,
                        withdraw_from: "affiliate",
                    };
                    let resultInsertwithdraw = await insertWithdrawstatement(payloadWithdraw);
                    if (resultInsertwithdraw) {
                        res.json({
                            code: 0,
                            msg: "ถอนเงินจากกระเป๋าสำเร็จเรียบร้อย! " + amount + " บาท",
                        });
                    } else {
                        res.json({
                            code: 1,
                            msg: "ไม่สามารถเพิ่มรายการถอนได้ ในขณะนี้!",
                        });
                    }
                } else {
                    res.json({
                        code: 1,
                        msg: "ไม่สามารถเพิ่มรายการถอนใน Wallet ได้ในขณะนี้!",
                    });
                }
            } else {
                res.json({
                    code: 1,
                    msg: "ไม่สามารถอัพเดทสเตทเม้น Wallet ได้ในขณะนี้!",
                });
            }
        } else {
            res.json({
                code: 1,
                msg: "ไม่พบข้อมูล Wallet ในบัญชีนี้!",
            });
        }
    } else {
        res.json({
            code: 1,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};


WALLET.walletToCredit_NEW = async(req, res) => {
    const selectSumwallet = (username) => {
        return new Promise((resolve, reject) => {
            connection.query(
                "SELECT sum(amount) walletAff FROM t_wallet_statement2 WHERE username = ? AND is_check = '1' ", [username],
                (error, sumWallet) => {
                    if (error) {
                        resolve(null);
                    }
                    if (sumWallet.length > 0) {
                        resolve(sumWallet);
                    } else {
                        resolve(null);
                    }
                }
            );
        });
    };

    const updateWallet = (username) => {
        return new Promise((resolve, reject) => {
            connection.query("UPDATE t_wallet_statement2 SET is_check = 0 WHERE username =  ? ", [username], (error, updateWallet) => {
                if (error) {
                    resolve(null);
                }
                if (updateWallet.changedRows > 0) {
                    resolve(true);
                } else {
                    resolve(null);
                }
            });
        });
    };

    const insertWalletstatement = (payload) => {
        return new Promise((resolve, reject) => {
            connection.query("INSERT INTO t_wallet_statement2 SET ?", payload, (error, resultInsert) => {
                if (error) {
                    resolve(null);
                } else {
                    resolve(true);
                }
            });
        });
    };

    const insertDepositstatement = (payload) => {
        return new Promise((resolve, reject) => {
            connection.query("INSERT INTO t_deposit_statement SET ?", payload, (error, resultInsertwithdraw) => {
                if (error) {
                    resolve(error);
                } else {
                    // axios.get("http://topupoffice.com/withdraw/withdrawWallet?service=" + service + "&id=" + resultInsertwithdraw.insertId, {
                    //   timeout: 30000,
                    // });
                    resolve(resultInsertwithdraw.insertId);
                }
            });
        });
    };

    const addCreditUser = (username, sumWallet, serverAPI) => {
        return new Promise((resolve, reject) => {
            console.log("PROCESS ADDCREDIT");
            console.log("ADD TO : " + username);
            console.log("MONEY : " + sumWallet);
            console.log("CURRENT API : " + serverAPI);
            axios
                .get(serverAPI + "/deposit?key=" + username + "&point=" + sumWallet)
                .then((response) => {
                    if (response.data.currentBalance > 0) {
                        console.log("ADD SUCCESS");
                        resolve(response.data);
                    } else {
                        console.log(response.data);
                        resolve(null);
                    }
                })
                .catch((err) => {
                    console.log(err);
                    resolve(null);
                });
        });
    };

    const updateStatement = (oldAmount, newAmount, idStatement) => {
        return new Promise((resolve, reject) => {
            console.log("UPDATE STATEMENT AFTER ADDCREDIT");
            connection.query(
                "UPDATE `t_deposit_statement` SET status=1, is_check = -1 ,befor_credit = '" +
                oldAmount +
                "', after_credit = '" +
                newAmount +
                "' WHERE id= '" +
                idStatement +
                "'",
                (error, resultUpdate) => {
                    if (error) {
                        resolve(null);
                    } else {
                        resolve(true);
                    }
                }
            );
        });
    };
    const selectCredit = (username, serverAPI) => {
        return new Promise((resolve, reject) => {
            console.log("PROCESS SELECTCREDIT");
            axios
                .get(serverAPI + "/userinfo?key=" + username)
                .then((response) => {
                    if (response.data.currentCredit >= 0) {
                        resolve(response.data.currentCredit);
                    } else {
                        resolve(null);
                    }
                })
                .catch((err) => {
                    resolve(null);
                });
        });
    };
    if (req.user) {
        if (!req.body || !req.body.amount) {
            return res.json({
                code: 1,
                msg: "NOT_FOUND_PARAMETER",
            });
        }
        let amount = parseFloat(req.body.amount);
        if (parseFloat(amount) <= 0) {
            return res.json({
                code: 1,
                msg: "กรุณาระบุยอดเงินให้ถูกต้อง!",
            });
        }
        if (parseFloat(amount) < 10) {
            return res.json({
                code: 1,
                msg: "ถอนขั้นต่ำ 10 บาท!",
            });
        }
        let username = req.user.username.toString();
        let creditNow = await new Promise((resolve, reject) => {
            console.log("PROCESS SELECTCREDIT");
            axios
                .get(serverAPI + "/userinfo?key=" + username)
                .then((response) => {
                    if (response.data.currentCredit >= 0) {
                        resolve(response.data.currentCredit);
                    } else {
                        reject("เกิดข้อผิดพลาดกรุณาลองใหม่ภายหลัง!");
                    }
                })
                .catch((err) => {
                    reject("เกิดข้อผิดพลาดกรุณาลองใหม่ภายหลัง!");
                });
        });

        if (creditNow > 10) {
            return res.json({
                code: 1,
                msg: "ยอดเงินในเกมของท่านต้องเหลือน้อยกว่า 10 บาท ถึงจะสามารถถอนได้!",
            });
        }
        let bank_number = req.user.bank_number.toString();
        let full_name = req.user.full_name.toString();
        let bank_code = req.user.bank_code.toString();
        let sumWallet = await selectSumwallet(username);
        if (parseFloat(sumWallet[0].walletAff) < parseFloat(amount)) {
            return res.json({
                code: 1,
                msg: "ยอดเงินของท่านไม่เพียงพอ กรุณาลองใหม่ภายหลัง!",
            });
        }

        if (sumWallet && sumWallet[0].walletAff > 0) {
            let balance = parseFloat(sumWallet[0].walletAff) - parseFloat(amount);
            let resultUpdatewallet = await updateWallet(username);

            if (resultUpdatewallet) {
                let resultInsertwallet = await insertWalletstatement({
                    transaction_id: amount + balance + "Affiliate" + username + momentjs("YYYY-MM-DD HH") + "withdraw",
                    date: new Date(),
                    time: new Date(),
                    username: username,
                    amount: -amount,
                    status: 1,
                    is_check: 0,
                    action: "withdraw",
                    before_dividend: null,
                    after_dividend: null,
                    before_amount: sumWallet[0].walletAff,
                    after_amount: balance,
                    bank: 1,
                    bank_number: bank_number,
                    bank_name: full_name,
                    bank_code: bank_code,
                });
                if (resultInsertwallet) {
                    let addWallet = true;
                    if (balance > 0) {
                        addWallet = await insertWalletstatement({
                            transaction_id: amount + balance + "Affiliate" + username + momentjs("YYYY-MM-DD HH") + "deposit",
                            date: new Date(),
                            time: new Date(),
                            username: username,
                            amount: balance,
                            status: 1,
                            is_check: 1,
                            action: "deposit",
                            before_dividend: null,
                            after_dividend: null,
                            before_amount: sumWallet[0].walletAff,
                            after_amount: balance,
                            bank: 1,
                            bank_number: bank_number,
                            bank_name: full_name,
                            bank_code: bank_code,
                        });
                    }

                    if (!addWallet) {
                        return res.json({
                            code: 1,
                            msg: "ไม่สามารถเพิ่มรายการวอลเลตได้!",
                        });
                    }

                    let payloadDeposit = {
                        date: new Date(),
                        time: new Date(),
                        amount: 0,
                        bank: "115",
                        account: username,
                        bonus: parseInt(amount),
                        point: 0,
                        fix_multiple: 0,
                        channel: "Affiliate",
                        detail: "",
                        tx_hash: amount + balance + "Affiliate" + username + momentjs("YYYY-MM-DD HH"),
                        status: 2,
                        is_bonus: 1,
                        use_bonus: "115", // EDIT
                        withdraw_fix: 0,
                        is_check: 1,
                        befor_credit: 0,
                        after_credit: 0,
                    };
                    let resultInsertdeposit = await insertDepositstatement(payloadDeposit);
                    if (resultInsertdeposit) {
                        let oldAmount = await selectCredit(username, serverAPI);
                        let resultAddcredit = await addCreditUser(username, amount, serverAPI);

                        if (resultAddcredit != null) {
                            if (parseFloat(resultAddcredit.previousDownlineGiven) <= 10) {
                                await new Promise((resolve, reject) => {
                                    connection.query(
                                        "UPDATE `t_deposit_statement` SET is_check = '-1' WHERE account= ? AND is_check = '1' AND id != ? ", [req.user.username, resultInsertdeposit],
                                        (error, result) => {
                                            resolve();
                                        }
                                    );
                                });
                            }
                            let newAmount = await selectCredit(username, serverAPI);
                            let resultUpdate = await updateStatement(oldAmount, newAmount, resultInsertdeposit);
                            if (resultUpdate) {
                                return res.json({
                                    code: 0,
                                    msg: "เติมเงินสำเร็จ จำนวน " + parseInt(amount) + " บาท!",
                                });
                            } else {
                                return res.json({
                                    code: 1,
                                    msg: "ไม่สามารถแอดเครดิตได้ในขณะนี้!",
                                });
                            }
                        } else {
                            return res.json({
                                code: 1,
                                msg: "ไม่สามารถแอดเครดิตได้ในขณะนี้!",
                            });
                        }

                        // res.json({
                        //   code: 0,
                        //   msg: "ถอนเงินจากกระเป๋าสำเร็จเรียบร้อย! " + sumWallet[0].walletAff + " บาท",
                        // });
                    } else {
                        res.json({
                            code: 1,
                            msg: "ไม่สามารถเพิ่มรายการถอนได้ ในขณะนี้!",
                        });
                    }
                } else {
                    res.json({
                        code: 1,
                        msg: "ไม่สามารถเพิ่มรายการถอนใน Wallet ได้ในขณะนี้!",
                    });
                }
            } else {
                res.json({
                    code: 1,
                    msg: "ไม่สามารถอัพเดทสเตทเม้น Wallet ได้ในขณะนี้!",
                });
            }
        } else {
            res.json({
                code: 1,
                msg: "ไม่พบข้อมูล Wallet ในบัญชีนี้!",
            });
        }
    } else {
        res.json({
            code: 1,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};



WALLET.wheelAddcredit = async(req, res) => {
    try {
        if (!req.user || !req.body) {
            return res.json({
                code: 1,
                msg: "NOT_FOUND_PARAMETER",
            });
        }

        let amount = req.body.amount;
        let username = req.user.username;

        if (parseFloat(amount) <= 0) {
            return res.json({
                code: 1,
                msg: "กรุณาระบุยอดเงินให้ถูกต้อง!",
            });
        }
        if (parseFloat(amount) > 1000) {
            return res.json({
                code: 1,
                msg: "ถอนได้สูงสุดไม่เกิน 1000 บาท!",
            });
        }

        let creditNow = await new Promise((resolve, reject) => {
            console.log("PROCESS SELECTCREDIT");
            axios
                .get(serverAPI + "/userinfo?key=" + username)
                .then((response) => {
                    if (response.data.currentCredit >= 0) {
                        resolve(response.data.currentCredit);
                    } else {
                        reject("เกิดข้อผิดพลาดกรุณาลองใหม่ภายหลัง!");
                    }
                })
                .catch((err) => {
                    reject("เกิดข้อผิดพลาดกรุณาลองใหม่ภายหลัง!");
                });
        });

        if (creditNow > 10) {
            return res.json({
                code: 1,
                msg: "ยอดเงินในเกมของท่านต้องเหลือน้อยกว่า 10 บาท ถึงจะสามารถถอนได้!",
            });
        }
        let selectSumwallet = await new Promise((resolve, reject) => {
            connection.query(
                "SELECT wheel_wallet FROM t_member_wallet WHERE username = ? AND phone_number = ?  ", [username, req.user.phone_number],
                (error, sumWallet) => {
                    if (error) {
                        reject("ไม่สามารถดึงข้อมูลกงล้อได้ในขณะนี้!");
                    } else if (sumWallet.length > 0) {
                        if (sumWallet[0].wheel_wallet < 10) {
                            reject("ยอดเงินไม่เพียงพอสำหรับการถอน ขั้นต่ำ 10 เครดิตกงล้อ!");
                        }
                        if (sumWallet[0].wheel_wallet < amount) {
                            reject("ยอดเงินของท่านไม่เพียงพอ กรุณาลองใหม่ภายหลัง!");
                        }
                        resolve(parseFloat(sumWallet[0].wheel_wallet));
                    } else {
                        reject("ไม่พบกระเป๋าตังกงล้อ!");
                    }
                }
            );
        });
        let payloadWheel = {
            datetime: momentjs().format("YYYY-MM-DD HH:mm:ss"),
            username: username,
            amount: -amount,
            before_credit: parseFloat(selectSumwallet),
            after_credit: parseFloat(selectSumwallet) - parseFloat(amount),
            type: "WITHDRAW",
        };

        await new Promise((resolve, reject) => {
            connection.query("INSERT INTO t_wheel_statement SET ?", payloadWheel, (error, resultInsert) => {
                if (error) {
                    reject("ไม่สามารถเพิ่มรายการสเตทเม้นกงล้อได้ในขณะนี้!");
                } else {
                    resolve(true);
                }
            });
        });
        let payloadDeposit = {
            date: momentjs().format("YYYY-MM-DD"),
            time: momentjs().format("HH:mm:ss"),
            amount: 0,
            bank: "999",
            account: username,
            bonus: parseFloat(amount),
            point: 0,
            fix_multiple: 0,
            channel: "WHEEL",
            detail: "",
            tx_hash: sha1(amount + "WHEEL" + username + momentjs().format("YYYY-MM-DD HH:mm")),
            status: 2,
            is_bonus: 1,
            use_bonus: "999", // EDIT
            withdraw_fix: amount * 6,
            is_check: 1,
            befor_credit: 0,
            after_credit: 0,
        };

        let resultInsert = await new Promise((resolve, reject) => {
            connection.query("INSERT INTO t_deposit_statement SET ?", payloadDeposit, (error, resultInsertwithdraw) => {
                if (error) {
                    reject("ไม่สามารถทำรายการถอนเงินได้ในขณะนี้!");
                } else {
                    resolve(resultInsertwithdraw.insertId);
                }
            });
        });

        await new Promise((resolve, reject) => {
            connection.query(
                "UPDATE t_member_wallet SET wheel_wallet = wheel_wallet - ?  WHERE username =  ? AND phone_number = ? ", [parseFloat(amount), username, req.user.phone_number],
                (error, updateWallet) => {
                    if (error) {
                        reject("ระบบเกิดข้อผิดพลาด กรุณาลองใหม่ภายหลัง!");
                    }
                    if (updateWallet.changedRows > 0) {
                        resolve(true);
                    } else {
                        reject("ไม่สามารถอัพเดทได้ในขณะนี้!");
                    }
                }
            );
        });
        let resultAddcredit = await new Promise((resolve, reject) => {
            axios
                .get(serverAPI + "/deposit?key=" + username + "&point=" + amount)
                .then((response) => {
                    if (response.data.currentBalance > 0) {
                        console.log("ADD SUCCESS");
                        resolve(response.data);
                    } else {
                        reject("ไม่สามารถเติมเงินได้ในขณะนี้!");
                    }
                })
                .catch((err) => {
                    reject("ไม่สามารถเติมเงินได้ในขณะนี้!!!");
                });
        });
        if (parseFloat(resultAddcredit.previousDownlineGiven) <= 10) {
            await new Promise((resolve, reject) => {
                connection.query(
                    "UPDATE `t_deposit_statement` SET is_check = '-1' WHERE account= ? AND id != ?", [req.user.username, resultInsert],
                    (error, result) => {
                        resolve();
                    }
                );
            });
        }

        await new Promise((resolve, reject) => {
            console.log("UPDATE STATEMENT AFTER ADDCREDIT");
            connection.query(
                "UPDATE `t_deposit_statement` SET status=1, is_check = 1 ,befor_credit = ?, after_credit = ? WHERE id= ?", [resultAddcredit.previousDownlineGiven, resultAddcredit.currentBalance, resultInsert],
                (error, resultUpdate) => {
                    if (error) {
                        resolve(null);
                    } else {
                        resolve(true);
                    }
                }
            );
        });

        return res.json({
            code: 0,
            msg: "เติมเงินสำเร็จ จำนวน " + parseInt(amount) + " บาท!",
        });
    } catch (error) {
        return res.json({
            code: 1,
            msg: error,
        });
    }
};


module.exports = WALLET;