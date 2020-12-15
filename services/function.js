const connection = require("../Config/db");
//exeSQL = (sql, param) => {
const serverAPI = process.env.SERVICE_API;
var axios = require("axios");
const moment = require("moment");
const request = require("request");
const sha1 = require("sha1");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const service = process.env.SERVICE;

const exeSQL = (sql, param) => {
    return new Promise((resovle, reject) => {
        connection.query(sql, param, (error, result) => {
            if (error) {
                reject(error);
            } else {
                resovle(result);
            }
        });
    });
};

const checkBank = (bank_code, bank_number) => {
    var timestart = moment(new Date());
    return new Promise((resolve, reject) => {
        axios
            .get(
                "http://topupoffice.com/check?bank=" +
                bank_code +
                "&number=" +
                bank_number, { timeout: 60000 }
            )
            .then((response) => {
                timeout_api("/checkbank", timestart, moment(new Date()));
                if (Object.keys(response.data).length == 3) {
                    resolve(response.data);
                } else {
                    resolve(null);
                }
            })
            .catch((err) => {
                timeout_api("/checkbank", timestart, moment(new Date()));
                resolve(null);
            });
    });
};
const registerAPI = (username, password, firstname, lastame, refKey) => {
    var timestart = moment(new Date());
    return new Promise((resolve, reject) => {
        axios
            .get(serverAPI + "/add_member?username=" + username + "&password=" + password + "&first_name=" + encodeURI(firstname) + "&last_name=" + encodeURI(lastame) + "&refKey=" + encodeURI(refKey))
            .then((response) => {
                timeout_api("/add_member", timestart, moment(new Date()));
                console.log(response.data);
                console.log("REGISTER API SUCCESS");
                resolve(response);
            })
            .catch((err) => {
                console.log(err);
                timeout_api("/add_member", timestart, moment(new Date()));
                resolve(null);
            });
    });
};

const affiliateRegister = async(user, user_join) => {
    let errer;
    return new Promise(async(resolve, reject) => {
        var digits =
            "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let token = "";
        for (let i = 0; i < 16; i++) {
            token += digits[Math.floor(Math.random() * 62)];
        }
        let payload = {
            username: user,
            join: user_join,
            token: token,
            join_date: moment().format("YYYY-MM-DD HH:mm:ss"),
            service: process.env.SERVICE,
        };
        let resultInsert = await exeSQL("INSERT INTO affiliated SET ? ", [payload]);
        if (resultInsert) {
            let payload = {
                datetime: new Date(),
                username: user,
                token: token,
                join_token: user_join,
                credit: 0,
                max_member: 0,
                active_credit: 0,
            };
            await connection.query("INSERT INTO f_member_account SET ?", payload, (error, insertCreditfree) => {
                if (error) {
                    console.log("ERROR CREDIT_FREE");
                } else {
                    console.log("INSERTED CREDIT_FREE");
                }
            });
            console.log("INSERTED AFFILIATE");
            resolve(token);
        } else if (errer) {
            resolve(null);
        } else {
            resolve(null);
        }
    });
};

const selectCredit = async(username, apiNew) => {
    var timestart = moment(new Date());
    return new Promise(async(resolve, reject) => {
        axios
            .get(apiNew + "/userinfo?key=" + username)
            .then((response) => {
                timeout_api("/userinfo", timestart, moment(new Date()));
                console.log(response.data)
                if (response.data.currentCredit >= 0) {
                    resolve(response.data);
                } else {
                    resolve(null);
                }
            })
            .catch((err) => {
                resolve(null);
            });
    });
};

const addCreditFreeUser = async(username, amount, apiNew) => {
    var timestart = moment(new Date());
    return new Promise(async(resolve, reject) => {
        axios
            .get(apiNew + "/deposit?key=" + username + "&point=" + amount[0].bonus)
            .then((response) => {
                if (response.data.currentBalance > 0) {
                    console.log("ADD SUCCESS");
                    timeout_api("/deposit", timestart, moment(new Date()));
                    resolve(response.data);
                } else {
                    timeout_api("/deposit", timestart, moment(new Date()));
                    console.log(response.data);
                    resolve(null);
                }
            })
            .catch((err) => {
                timeout_api("/deposit", timestart, moment(new Date()));
                console.log(err);
                resolve(null);
            });
    });
};

async function selectBonus(type, bonus) {
    let selectBonus = bonus.filter(function(e) {
        return (val) => val.type == type;
    });
    return selectBonus[0];
}

async function selectBonusALL(user, amount) {
    let username = user.username;
    let ranking = [
        "301",
        "302",
        "303",
        "304",
        "305",
        "306",
        "307",
        "308",
        "309",
        "310",
        "311",
    ];
    let rankID = ranking[parseInt(user.rank) - 1];
    let NOTcurrentRank = ranking.filter((val) => val != rankID);

    const bonusALL = await exeSQL(
        "SELECT * FROM t_bonus_config WHERE is_show = 1 AND bonus_id not in(?) AND bonus_start_date <= ? AND bonus_end_date >= ? AND bonus_start_time <= ? AND bonus_end_time >= ? AND fix_deposit <= ? ORDER BY bonus_type DESC", [
            NOTcurrentRank,
            moment(new Date()).format("YYYY-MM-DD"),
            moment(new Date()).format("YYYY-MM-DD"),
            moment(new Date()).format("HH:mm:ss"),
            moment(new Date()).format("HH:mm:ss"),
            amount,
        ]
    );
    //console.log(bonusALL)
    if (bonusALL.length > 0) {
        const count = await Func.exeSQL(
            "SELECT * FROM t_deposit_statement WHERE account = ? AND date = ?", [username, moment(new Date()).format("YYYY-MM-DD")]
        );
        if (user.is_bonus == 1) {
            if (
                user.topup_status == 0 &&
                selectBonus("onetime_user", bonusALL) != undefined
            ) {
                return selectBonus("onetime_user", bonusALL);
            } else if (
                user.is_promotion == 0 &&
                bonusALL.filter((val) => val.use_bonus == 401)[0] != undefined
            ) {
                let databonus = bonusALL.filter((val) => val.use_bonus == 401)[0];
                return databonus;
                // callback(null, bonusALL.filter((val) => val.use_bonus == "401")[0]);
            } else if (
                (count == null || count == "") &&
                selectBonus("onetime_day", bonusALL) != undefined
            ) {
                //console.log("onetime_day");
                return selectBonus("onetime_day", bonusALL);
                // callback(null, selectBonus("onetime_day", bonusALL));
            } else if (selectBonus("unlimit", bonusALL) != undefined) {
                // console.log("onetime_unlimit");
                return selectBonus("unlimit", bonusALL);
                // callback(null, selectBonus("unlimit", bonusALL));
            } else {
                let databonus = bonusALL.filter((val) => val.use_bonus == 104)[0];
                return databonus;
                // callback(null, bonusALL.filter((val) => val.use_bonus == "104")[0]);
            }
        } else {
            let databonus = bonusALL.filter((val) => val.bonus_id == 104)[0];
            return databonus;
        }
    } else {
        return "NO BONUS";
    }
}

const selectCountcheckbonus = (username) => {
    return new Promise((resolve, reject) => {
        connection.query(
            "SELECT COUNT(use_bonus) count, use_bonus FROM t_deposit_statement WHERE account = ? AND is_check = 1 AND use_bonus NOT IN(104,105,106) GROUP BY use_bonus", [username],
            (error, countCheckbonus) => {
                if (error) {
                    resolve(null);
                }
                resolve(countCheckbonus);
            }
        );
    });
};

const updatePointAff = (username, credit) => {
    return new Promise((resolve, reject) => {
        axios
            .get(
                serverAPIAff +
                "?token=" +
                username[0].token +
                "&service=" +
                service +
                "&point=" +
                credit, {
                    timeout: 30000,
                }
            )
            .then((response) => {
                resolve(true);
            })
            .catch((err) => {
                resolve(null);
            });
    });
};

const updateDividendAff = (username) => {
    var timestart = moment(new Date());
    return new Promise((resolve, reject) => {
        axios
            .get(
                serverAPIAff + "?view=" + username[0].token + "&service=" + service, { timeout: 30000 }
            )
            .then((response) => {
                resolve(true);
            })
            .catch((err) => {
                resolve(null);
            });
        timeout_api("/Affiliateview", timestart, moment(new Date()));
        resolve(true);
    });
};

const selectAffiliate = async(username) => {
    return new Promise(async(resolve, reject) => {
        let resultSelect = await exeSQL(
            "SELECT token,last_update FROM affiliated WHERE username = ?", [username]
        );
        if (resultSelect.length > 0) {
            if (
                moment(new Date()).format("YYYY-MM-DD HH:mm:ss") >=
                moment(resultSelect[0].last_update)
                .add(2, "minutes")
                .format("YYYY-MM-DD HH:mm:ss")
            ) {
                await exeSQL(
                    "UPDATE affiliated SET last_update = ? WHERE username = ?", [moment(new Date()).format("YYYY-MM-DD HH:mm:ss"), username]
                );
                resolve(resultSelect[0].token);
            } else {
                reject("ไม่สามารถอัพเดทได้ เนื่องจากยังไม่ครบ 2 นาที!");
            }
        } else {
            reject("ไม่พบข้อมูล Affiliate สำหรับยูสเซอร์นี้!");
        }
    });
};

const selectLogtoday = async(username, token, persent) => {
    return new Promise(async(resolve, reject) => {
        let resultLog = await Func.exeSQL(
            "SELECT * FROM log_today WHERE username = ? AND date = ? ", [moment(new Date()).format("YYYY-MM-DD"), username]
        );

        if (resultLog.length > 0) {
            resolve(resultLog);
        } else {
            let payload = {
                date: moment(new Date()).format("YYYY-MM-DD"),
                username: username,
                service: service,
                dividend: 0,
                token: token,
                winloss: 0,
                point: 0,
                persen: persent,
                hash: sha1(
                    username +
                    service +
                    moment(new Date()).format("YYYY-MM-DD HH-mm-ss") +
                    token
                ),
                data: "[]",
            };

            let resultInsert = await exeSQL("INSERT INTO log_today SET ?", payload);
            if (resultInsert) {
                payload.id = resultInsert.insertId;
            } else {
                reject("ไม่สามารถเพิ่มรายการคำนวณได้ในขณะนี้!");
            }
            resolve(payload);
        }
    });
};

const addCreditUser = async(
    username,
    amount,
    apiNew,
    oldCredit,
    newCheckcredit
) => {
    if (oldCredit != undefined && newCheckcredit != undefined) {
        var timestart = moment(new Date());
        return new Promise(async(resolve, reject) => {
            console.log("INSERT CREDIT REPEAT");
            if (newCheckcredit) {
                if (newCheckcredit == oldCredit) {
                    axios
                        .get(
                            serverAPI +
                            "/deposit?point=" +
                            parseInt(amount) +
                            "&key=" +
                            username, {
                                timeout: 30000,
                            }
                        )
                        .then((response) => {
                            if (response.data.currentBalance > 0) {
                                resolve(response.data);
                            } else {
                                resolve(null);
                            }
                        })
                        .catch((err) => {
                            resolve(null);
                        });
                    timeout_api("/deposit", timestart, moment(new Date()));
                } else {
                    resolve(true);
                }
            } else {
                resolve(null);
            }
        });
    } else {
        var timestart = moment(new Date());
        return new Promise(async(resolve, reject) => {
            axios
                .get(apiNew + "/deposit?key=" + username + "&point=" + amount)
                .then((response) => {
                    if (response.data.currentBalance > 0) {
                        console.log("ADD SUCCESS");
                        timeout_api("/deposit", timestart, moment(new Date()));
                        resolve(response.data);
                    } else {
                        timeout_api("/deposit", timestart, moment(new Date()));
                        console.log(response.data);
                        resolve(null);
                    }
                })
                .catch((err) => {
                    timeout_api("/deposit", timestart, moment(new Date()));
                    console.log(err);
                    resolve(null);
                });
        });
    }
};

const selectCheckwithdraw = async(username) => {
    return new Promise(async(resolve, reject) => {
        let resultCheckwithdraw = await exeSQL(
            "SELECT * FROM t_withdraw_statement WHERE `status` = 3 AND account = ? and date >= ?", [username, moment().subtract(1, "days").toDate()]
        );
        if (resultCheckwithdraw.length == 0) {
            resolve(true);
        } else {
            resolve(null);
        }
    });
};

const selectLastbonus = async(username) => {
    return new Promise(async(resolve, reject) => {
        let last_bonus = await exeSQL(
            "SELECT * FROM t_deposit_statement WHERE account = ? AND use_bonus != 106 ORDER BY id DESC LIMIT 1", [username]
        );
        if (last_bonus.length > 0) {
            resolve(last_bonus);
        } else {
            resolve(null);
        }
    });
};

const selectFixwithdraw = async(username) => {
    return new Promise(async(resolve, reject) => {
        let resultFixwithdraw = await Func.exeSQL(
            "SELECT SUM(fix_withdraw) as fix_withdraw  FROM t_deposit_statement WHERE is_check = 1 AND account = ?", [username]
        );
        if (resultFixwithdraw) {
            resolve(resultFixwithdraw[0].fix_withdraw);
        } else {
            resolve(null);
        }
    });
};

const selectWithdrawfix = async(
    username,
    lastBonus,
    countCheckbonus,
    allCredit
) => {
    return new Promise(async(resolve, reject) => {
        if (
            countCheckbonus.length == 0 &&
            parseFloat(allCredit) != parseFloat(lastBonus[0].after_credit)
        ) {
            resolve(0);
        } else {
            let withdrawfixTotal = await exeSQL(
                "SELECT SUM(withdraw_fix) withdrawfix_all FROM t_deposit_statement WHERE account = ? AND is_check = '1'", [username]
            );
            if (withdrawfixTotal.length > 0) {
                resolve(withdrawfixTotal[0].withdrawfix_all);
            } else {
                resolve(null);
            }
        }
    });
};

async function timeout_api(Endpoint, timestart, timeend) {
    var time = moment.utc(moment(timeend).diff(moment(timestart))).format("SSSS");
    var data = {
        Date: moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
        Endpoint: Endpoint,
        Timeout: parseInt(time) + " ms",
    };
    // var text = fs.readFileSync("./public/log_API.txt", "utf8");
    // text = text + "\n" + JSON.stringify(data).toString();
    // fs.writeFile("./public/log_API.txt", text, "utf8", function(err) {
    //     if (err) return console.log(err);
    // });
}

const insertApideleteRepeat = async(
    apiNew,
    deleteCredit,
    username,
    checkAllcredit,
    allCredit
) => {
    if (checkAllcredit != undefined && allCredit != undefined) {
        return new Promise(async(resolve, reject) => {
            console.log("TRY TO DELETE AGAIN");
            if (checkAllcredit != null) {
                if (checkAllcredit == allCredit) {
                    var timestart = moment(new Date());
                    axios
                        .get(
                            apiNew + "/withdraw?key=" + username + "&point=" + deleteCredit
                        )
                        .then((response) => {
                            timeout_api("/withdraw", timestart, moment(new Date()));
                            if (parseInt(response.data.currentBalance) >= 0) {
                                console.log("DELETE CREDIT AGAIN SUCCESS");
                                resolve(response.data);
                            } else {
                                resolve(null);
                            }
                        })
                        .catch((err) => {
                            resolve(null);
                        });
                } else {
                    resolve(true);
                }
            } else {
                resolve(null);
            }
        });
    } else {
        return new Promise(async(resolve, reject) => {
            console.log("DELETE CREDIT");
            var timestart = moment(new Date());
            axios
                .get(apiNew + "/withdraw?key=" + username + "&point=" + deleteCredit)
                .then((response) => {
                    timeout_api("/withdraw", timestart, moment(new Date()));
                    if (parseInt(response.data.currentBalance) >= 0) {
                        console.log("DELETE CREDIT SUCCESS");
                        resolve(response.data);
                    } else {
                        resolve(null);
                    }
                })
                .catch((err) => {
                    resolve(null);
                });
        });
    }
};

const insertDeletecredit = async(
    deleteCredit,
    username,
    checkAllcredit,
    allCredit,
    fix_withdraw
) => {
    return new Promise(async(resolve, reject) => {
        if (checkAllcredit != allCredit) {
            let payload = {
                date: moment(new Date()).format("Y-MM-DD"),
                time: moment(new Date()).format("HH:mm:ss"),
                amount: 0,
                bank: 111,
                account: username,
                bonus: -deleteCredit,
                befor_credit: allCredit,
                after_credit: parseFloat(allCredit) - parseFloat(deleteCredit),
                point: 0,
                fix_multiple: 1,
                channel: "DELETE_CREDIT",
                detail: "DELETE_CREDIT",
                tx_hash: "DELETE_CREDIT-FIXWITHDRAW" + Date.now() + username,
                status: 1,
                is_bonus: 1,
                use_bonus: 111,
                withdraw_fix: 0,
                is_check: 1,
                comment: "ลบเครดิตจากกิจกรรมเนื่องจากถอนได้สูงสุด " + fix_withdraw + " บาท",
            };

            // let insertCreditfree = await db["t_deposit_statement"]
            //     .create(payload)
            //     .catch(function(err) {
            //         Error_log(err, "insertDeletecredit", "Function");
            //     });
            let insertCreditfree = await exeSQL(
                "INSERT INTO t_deposit_statement SET ? ",
                payload
            );
            if (insertCreditfree) {
                resolve(true);
            } else {
                resolve(null);
            }
        } else {
            resolve(null);
        }
    });
};

const insertWorkinglog = async(payload) => {
    return new Promise(async(resolve, reject) => {
        // let insertCreditfree = await db["t_working_log"]
        //     .create(payload)
        //     .catch(function(err) {
        //         Error_log(err, "insertWorkinglog", "Function");
        //     });
        let insertCreditfree = await exeSQL("INSERT INTO t_working_log SET ? ", [
            payload,
        ]);
        if (insertCreditfree) {
            resolve(true);
        } else {
            resolve(null);
        }
    });
};

const insertWithdrawstatement = async(
    amount,
    username,
    afterDeleterealcredit,
    before_credit,
    lastBonus
) => {
    return new Promise(async(resolve, reject) => {
        if (parseInt(before_credit) != parseInt(afterDeleterealcredit)) {
            let updatewitdraw = await exeSQL(
                "UPDATE t_member_account SET last_withdraw = ? WHERE username = ? ", [moment(new Date()).format("Y-MM-DD HH:mm:ss"), username.username]
            );
            if (updatewitdraw) {
                let payload = {
                    date: moment(new Date()).format("Y-MM-DD"),
                    time: moment(new Date()).format("HH:mm:ss"),
                    amount: amount,
                    account: username.username,
                    befor_credit: before_credit,
                    after_credit: parseFloat(before_credit) - parseFloat(amount),
                    hash: sha1(
                        moment().format("YYYY-MM-DD HH:mm") +
                        username.username +
                        before_credit +
                        (parseFloat(before_credit) - parseFloat(amount)) +
                        amount
                    ),
                    bank: 0,
                    status: 3,
                    bank_number: username.bank_number,
                    bank_name: username.full_name,
                    bank_code: username.bank_code,
                    usertype: username.usertype,
                    use_bonus: lastBonus[0].use_bonus
                };
                let insertCreditfree = await exeSQL(
                    "INSERT INTO t_withdraw_statement SET ?", [payload]
                );
                if (insertCreditfree) {
                    var timestart = moment(new Date());
                    await axios
                        .get(
                            "http://topupoffice.com/withdraw/withdrawWallet?service=" +
                            service +
                            "&id=" +
                            insertCreditfree.insertId, {
                                timeout: 30000,
                            }
                        )
                        .catch((err) => {
                            console.log("NO SERVICE EVOPLAY666");
                        });
                    timeout_api("/withdrawWallet", timestart, moment(new Date()));
                    resolve(true);
                } else {
                    resolve(null);
                }
            } else {
                resolve(null);
            }
        } else {
            resolve(null);
        }
    });
};

async function checkbank_type(bank_code) {
    return new Promise(async(resolve, reject) => {
        let bank_name = [{
                KBANK: "กสิกรไทย",
            },
            {
                SCB: "ไทยพาณิชย์",
            },
            {
                KTB: "กรุงไทย",
            },
            {
                BAY: "กรุงศรีอยุธยา",
            },
            {
                GSB: "ออมสิน",
            },
            {
                UOB: "ยูโอบี",
            },
            {
                BBL: "กรุงเทพ",
            },
            {
                TMB: "ทหารไทย",
            },
            {
                CI: "ซิตี้แบ้งค์",
            },
            {
                LNH: "แลนด์ แอนด์ เฮ้าส์",
            },
            {
                TBANK: "ธนชาต",
            },
            {
                BAAC: "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร",
            },
            {
                OSK: "อาคารสงเคราะห์ ",
            },
            {
                KNK: "เกียรตินาคิน",
            },
            {
                JPK: "เจพีมอร์แกน เชส สาขากรุงเทพฯ",
            },
            {
                CIMB: "ซีไอเอ็มบี ไทย",
            },
            {
                DOIB: "ดอยซ์แบงค์",
            },
            {
                TISGO: "ทิสโก้",
            },
            {
                TCREDIT: "ไทยเครดิต เพื่อรายย่อย",
            },
            {
                BNP: "ธนาคารบีเอ็นพี พารีบาส์",
            },
            {
                MSU: "มิซูโฮ คอร์ปอเรต จำกัด",
            },
            {
                MEGA: "เมกะ สากลพาณิชย์",
            },
            {
                SNT: "สแตนดาร์ดชาร์เตอร์ด",
            },
            {
                CN: "ธนาคารแห่งประเทศจีน",
            },
            {
                USA: "แห่งอเมริกาฯ",
            },
            {
                ASL: "ธนาคารอิสลามแห่งประเทศไทย",
            },
            {
                IZBS: "ไอซีบีซี",
            },
        ];
        bank_name.forEach((element) => {
            if (Object.keys(element).toString() === bank_code) {
                resolve(Object.values(element).toString());
            }
        });
    });
}


async function gen_deposit(amount, bank_code, username) {
    return new Promise(async(resolve, reject) => {
        amount = parseInt(amount);
        var precision = 100;
        var randomamount =
            Math.floor(
                Math.random() * (10 * precision - 1 * precision) + 1 * precision
            ) /
            (1 * precision);

        var decimal = randomamount.toString().split(".")[1];

        if (decimal.length == 1) {
            decimal = decimal + "0";
        }
        randomamount = amount + "." + decimal;



        let result = await Func.exeSQL("SELECT * FROM t_generate_statement WHERE amount = ? AND status = 0 AND start_date = ?", [randomamount, moment().add(-2, "minutes").format("YYYY-MM-DD HH:mm:ss")])
        if (result[0] == null) {

            let bankdeposit = await Func.exeSQL("SELECT * FROM t_deposit_rule WHERE scope = 'KBANK' ORDER BY rand() limit 1");
            if (bankdeposit.length == 0) {
                resolve("ไม่พบข้อมูลธนาคาร");
            }
            if (bankdeposit.length > 0) {
                let end_date = moment().add(2, "minutes").format("YYYY-MM-DD HH:mm:ss");
                let payload = {
                    start_date: moment()
                        .add(7, "hours")
                        .format("YYYY-MM-DD HH:mm:ss"),
                    username: username,
                    amount: randomamount,
                    status: 0,
                    bank_name: bankdeposit[0].bank_name,
                    bank_number: bankdeposit[0].number,
                    name: bankdeposit[0].name,
                    bank_code: bankdeposit[0].code,
                    bank_id: bankdeposit[0].Id,
                    end_date: moment(end_date)
                        .add(7, "hours")
                        .format("YYYY-MM-DD HH:mm:ss")
                };
                let createdata = await Func.exeSQL("INSERT INTO t_generate_statement SET ? ", [payload])
                if (createdata) {
                    resolve({
                        start_date: payload.start_date,
                        end_date: payload.end_date,
                        amount: randomamount,
                        bank_name: bankdeposit[0].bank_name,
                        bank_code: bankdeposit[0].code,
                        name: bankdeposit[0].name,
                        number: bankdeposit[0].number,
                    });
                }
            } else {
                resolve(0);
            }
        } else {
            await gen_deposit(amount + 1, bank_code, username);
        }
    });
}





const insert_rewarddeposit = async(payload) => {
    let username = payload.username;
    let amount = payload.amount;
    let date = payload.date;
    // console.log(username)
    if (username && amount && date) {
        let deposit = await Func.exeSQL("SELECT status, (amount + ?) as sumamount FROM t_reward_deposit WHERE username = ? AND deposit_date = ? ", [parseFloat(amount), username, date]);
        if (deposit.length > 0) {


            let status = 0;
            if (deposit[0].sumamount >= 300 && deposit[0].status < 2) {
                status = 1;
            } else if (deposit[0].sumamount >= 300 && deposit[0].status == 2) {
                status = 2;
            }
            let update = await Func.exeSQL("UPDATE t_reward_deposit SET amount = ? , `status` = ? ,`count` = `count` + 1 WHERE username = ? AND deposit_date = ? ", [deposit[0].sumamount, status, username, date])
            if (update.affectedRows > 0) {
                console.log("UPDATE SUCCESSSSSSSSS")
            } else {

                console.log("UPDATE ERROR")
            }
        } else {
            let last_row = await Func.exeSQL("SELECT * FROM t_reward_deposit WHERE username = ? ORDER BY deposit_date desc LIMIT 1", [username]);
            let running = 1;
            if (last_row.length > 0) {
                let _last_row = last_row[0];
                let _last_date = moment(_last_row.deposit_date).format('YYYY-MM-DD')
                if (_last_row.status < 1) {
                    running = 1;
                } else if (_last_date != moment(date).add(-1, 'day').format('YYYY-MM-DD')) {
                    running = 1;
                } else {
                    running = _last_row.running + 1;
                }
                console.log(_last_date, moment(date).add(-1, 'day').format('YYYY-MM-DD'))
            }
            let datainsert = {
                username: username,
                amount: amount,
                deposit_date: date,
                count: 1,
                status: amount >= 300 ? 1 : 0,
                running: running
            }
            let insert = await Func.exeSQL("INSERT INTO t_reward_deposit SET ? ", [datainsert])
            console.log(insert)
            if (insert.insertId > 0) {
                console.log("INSERT SUCCESSSSSSSSS")
            } else {

                console.log("INSERT ERROR")
            }

        }
    }
}


const addDiamond_Ranking = async(data, index, type) => {
    return new Promise(async(resovle, reject) => {
        try {
            let username = type == 'GAME' ? data._id : data.account;
            let members = await exeSQL("SELECT * FROM t_member_account WHERE username = ?", [username]);
            if (members.length > 0) {
                let member = members[0];

                let condition = [150, 100, 60, 40, 30, 30, 25, 25, 20, 20];

                let reulst_update = await Func.exeSQL(
                    "UPDATE t_member_account SET diamond = ? where username = ?", [condition[index], username]
                );
                if (reulst_update) {
                    let payload = {
                        date: moment().format("YYYY-MM-DD"),
                        time: moment().format("HH:mm:ss"),
                        amount: 0,
                        bank: 145,
                        account: username,
                        bonus: 0,
                        point: condition[index],
                        fix_multiple: 0,
                        channel: "RANKING " + type,
                        detail: type == 'GAME' ? "ของรางวัลจากยอดเล่นเกมสูงสุด" : "ของรางวัลจากยอดฝากสูงสุด",
                        tx_hash: sha1("RANKING_" + type + moment().format("YYYY-MM-DD HH:mm") + username),
                        status: 1,
                        is_bonus: 1,
                        use_bonus: "145",
                        withdraw_fix: 0,
                        is_check: -1,
                        updated_at: moment().format("YYYY-MM-DD HH:mm:ss"),
                        befor_credit: member.diamond,
                        after_credit: parseInt(member.diamond) + parseInt(condition[index]),
                        fix_withdraw: 0,
                        comment: type == 'GAME' ? "ของรางวัลจากยอดเล่นเกมสูงสุด จำนวน " + condition[index] + " เพชร" : "ของรางวัลจากยอดฝากสูงสุด จำนวน " + condition[index] + " เพชร",
                    }
                    let INSERT = await Func.exeSQL(
                        "INSERT INTO t_deposit_statement SET ?", [payload]
                    ).catch(err => {
                        console.log("DUPPICATE KEY t_DEPOSIT_SATEMNT DIAMOND MIDNIGTH SUCCESS")
                        resovle("NO")
                    });
                    if (INSERT) {
                        console.log('\x1b[32m', "INSERT DIAMOND MIDNIGTH SUCCESS")
                        resovle("OK")
                    } else {
                        console.log("INSERT DIAMOND MIDNIGTH NOT SUCCESS")
                        resovle("NO")
                    }
                } else {
                    console.log('UPDATE DIAMOND NOT SUCCESS')
                    resovle("NO")
                }
            } else {
                console.log('ADD RANKING -------------------------> ไม่พบสมาชิกนี้ในระบบ')
                resovle("NO")
            }
        } catch (error) {
            resovle("NO")
        };
    });
}



const addRanking_game = async() => {
    await axios
        .get("https://evoplay66-seamless.api-node.com/action/historytop_player?game_id=5452")
        .then(async response => {
            result = response.data;
            json_data = JSON.parse(result.result.data);
            let index = 0;
            if (json_data.length > 0) {
                for (const item of json_data) {
                    await addDiamond_Ranking(item, index, 'GAME');
                    index++;
                }
            } else {
                console.log("NO----------------- RANKING GAME")
            }
        })
        .catch(error => {
            console.log(error)
            console.log("NO----------------- RANKING GAME")
        });
};



const addRanking_deposit = async(req, res) => {
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
    const limit = 10;
    let result = await exeSQL(
        "SELECT SUM(amount) as amount ,account ,'' as imagepath FROM `t_deposit_statement` WHERE date >= ?  GROUP BY account ORDER BY SUM(amount) desc LIMIT ?", [date_start, parseInt(limit)]
    );
    if (result.length > 0) {
        let index = 0;
        for (const item of result) {
            let rr = await addDiamond_Ranking(item, index, 'DEPOSIT');
            console.log(rr)
            index++;
        }
    } else {
        console.log("NO----------------- RANKING DEPOSIT")
    }
};


const getMemberData = async(username) => {
    return new Promise((resolve, reject) => {
        axios
            .get(serverAPI + "/getMemberData?username=" + username)
            .then((response) => {
                console.log("REGISTER API SUCCESS");
                resolve(response);
            })
            .catch((err) => {
                resolve(null);
            });
    });
}


const Func = {
    exeSQL,
    checkBank,
    registerAPI,
    getMemberData,
    addRanking_game,
    addRanking_deposit,
    addDiamond_Ranking,
    affiliateRegister,
    selectCredit,
    addCreditFreeUser,
    selectBonusALL,
    selectCountcheckbonus,
    updatePointAff,
    updateDividendAff,
    selectAffiliate,
    selectLogtoday,
    addCreditUser,
    selectCheckwithdraw,
    selectLastbonus,
    selectWithdrawfix,
    selectFixwithdraw,
    insertApideleteRepeat,
    timeout_api,
    insertDeletecredit,
    insertWorkinglog,
    insertWithdrawstatement,
    checkbank_type,
    gen_deposit,
    insert_rewarddeposit

};

module.exports = Func;