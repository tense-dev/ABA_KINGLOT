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
const connection = require("../Config/db");

const GAME = function(entity) {};

GAME.listgame = async(req, res) => {
    let result = [];
    await axios.get(serverAPI + "/getList").then((response) => {
        result = response;
        //var result = data.filter((x) => x.type === "ar");
        //  console.log(result)
    });
    res.json(result.data);
};



GAME.game_balance = async(req, res) => {
    if (req.query && req.query.player_id) {
        let chkamount = await validatedeposit(req.query.player_id);
        let minutes = await validate(req.query.player_id);
        if (chkamount) {
            if (!minutes) {
                let resultUser = await Func.exeSQL("SELECT * FROM t_member_account WHERE username = ? ", [req.query.player_id]);
                if (resultUser.length > 0) {
                    res.json({
                        code: 0,
                        msg: "ดึงข้อมูลสำเร็จ",
                        player_id: req.query.player_id,
                        balance: 1 //resultUser[0].point
                    })
                } else {
                    res.json({
                        code: 2,
                        msg: "NOT_FOUND_USER"
                    })
                }
            } else {
                res.json({
                    code: 1,
                    msg: "ต้องรออีก " + minutes + " นาที ถึงจะหมุนได้อีกครั้ง",
                    minute: minute,
                    endtime: moment().add(minutes, "minute").format('YYYY-MM-DD HH:mm:ss')
                })
            }
        } else {
            res.json({
                code: 2,
                msg: "คุณต้องมียอดฝาก 500 บาทขึ้นไป",
                minute: 360,
                endtime: moment().add(360, "minute").format('YYYY-MM-DD HH:mm:ss')
            })
        }
    } else {
        res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER"
        })
    }

};



GAME.callback_wheel = async(req, res) => {
    if (Object.keys(req.query).length > 0) {
        try {
            let userAuth = await new Promise((resolve, reject) => {
                connection.query("SELECT username,point,phone_number FROM t_member_account WHERE username = ?", [req.query.player_id], (err, resultUser) => {
                    if (err) {
                        reject("ไม่สามารถรายการได้ในขณะนี้ กรุณาลองใหม่ภายหลัง!");
                    } else if (resultUser.length > 0) {
                        if (resultUser[0].point >= req.query.bet) {
                            resolve(resultUser[0]);
                        } else {
                            reject("ไม่สามารถทำการตัดแต้มได้ เกิดข้อผิดพลาด!");
                        }
                    } else {
                        reject("ไม่พบสมาชิกดังกล่าว!");
                    }
                });
            });
            let wheel_wallet = await createWallet(userAuth.username, userAuth.phone_number);

            if (parseFloat(wheel_wallet.wheel_wallet) + parseFloat(req.query.reward) > 1000) {
                return res.json({
                    code: 1,
                    msg: "เงินในกระเป๋ากงล้อมีมากกว่า 1000 เครดิต กรุณาถอนออกก่อน",
                });
            }
            await new Promise((resolve, reject) => {
                let payload = {
                    datetime: momentjs().format("YYYY-MM-DD HH:mm:ss"),
                    username: userAuth.username,
                    transaction_id: req.query.transaction_id,
                    befor_point: parseFloat(userAuth.point),
                    after_point: parseFloat(userAuth.point) - parseFloat(req.query.bet),
                    bet: req.query.bet,
                    reward: req.query.reward,
                    reward_type: req.query.reward_type,
                    reward_desp: req.query.reward_desp,
                    winlose: req.query.winlose,
                    hash: sha1(
                        parseFloat(userAuth.point) +
                        (parseFloat(userAuth.point) - parseFloat(req.query.bet)) +
                        momentjs().format("YYYY-MM-DD HH:mm") +
                        userAuth.username
                    ),
                    session_key: req.query.session_key,
                    withdraw_fix: req.query.turn_over,
                };
                connection.query("INSERT INTO t_log_wheel_new SET ? ", payload, (error, resultInsert) => {
                    if (error) {
                        console.log(error);
                        reject("ไม่สามารถเพิ่มรายการทำงานได้ในขณะนี้!");
                    } else {
                        resolve("เพิ่มรายการสำเร็จ");
                    }
                });
            });

            await new Promise((resolve, reject) => {
                connection.query(
                    "UPDATE t_member_account SET point = point - ? WHERE username = ?", [req.query.bet, userAuth.username],
                    (error, resultUpdate) => {
                        if (error) {
                            reject("ไม่สามารถทำรายการอัพเดทได้ในขณะนี้!");
                        } else {
                            resolve("อัพเดทข้อมูล Point สำเร็จ");
                        }
                    }
                );
            });

            let payloadWheel = {
                datetime: momentjs().format("YYYY-MM-DD HH:mm:ss"),
                username: userAuth.username,
                amount: req.query.reward,
                before_credit: parseFloat(wheel_wallet.wheel_wallet),
                after_credit: parseFloat(wheel_wallet.wheel_wallet) + parseFloat(req.query.reward),
                type: "DEPOSIT",
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

            await new Promise((resolve, reject) => {
                connection.query(
                    "UPDATE t_member_wallet SET wheel_wallet = wheel_wallet + ? WHERE username = ? AND phone_number=  ?", [parseFloat(req.query.reward), userAuth.username, userAuth.phone_number],
                    (error, resultUpdate) => {
                        if (error) {
                            reject("ไม่สามารถอัพเดทกระเป๋าตังกงล้อได้ในขณะนี้!");
                        } else {
                            resolve(true);
                        }
                    }
                );
            });

            res.json({
                code: 0,
                msg: "อัพเดทสำเร็จ!",
                balance: parseFloat(userAuth.point) - parseFloat(req.query.bet),
            });
        } catch (err) {
            console.log(err);
            res.json({
                code: 1,
                msg: err.length > 0 ? err : "เกิดข้อผิดพลาดไม่ทราบสาเหตุ!",
            });
        }
    } else {
        res.json({
            code: 1,
            msg: "INVALID_PARAMETER",
        });
    }
};




GAME.callback_wheel_NO = async(req, res) => {
    if (Object.keys(req.query).length > 0) {
        let minutes = await validate(req.query.player_id);
        if (!minutes) {
            let userAuth = await Func.exeSQL("SELECT * FROM t_member_account WHERE username = ?", [req.query.player_id]);
            if (userAuth.length > 0) {
                userAuth = userAuth[0]
                let payload = {
                    datetime: moment().format("YYYY-MM-DD HH:mm:ss"),
                    username: userAuth.username,
                    transaction_id: req.query.transaction_id,
                    befor_point: 0,
                    after_point: 0,
                    bet: req.query.bet,
                    reward: req.query.reward,
                    reward_type: req.query.reward_type,
                    reward_desp: req.query.reward_desp,
                    winlose: req.query.winlose,
                    hash: req.query.hash,
                    session_key: req.query.session_key,
                    withdraw_fix: req.query.turn_over
                }
                await Func.exeSQL("INSERT INTO t_log_wheel_new SET ? ", [payload]);

                let diamond = (parseFloat(userAuth.diamond) + parseFloat(req.query.reward));
                await Func.exeSQL("UPDATE t_member_account SET diamond = ? WHERE username = ? ", [diamond, userAuth.username])
                res.json({
                    code: 0,
                    msg: "อัพเดทสำเร็จ!",
                    balance: 0
                })
            } else {
                res.json({
                    code: 1,
                    msg: "ไม่พบสมาชิกดังกล่าว!"
                })
            }

        } else {
            res.json({
                code: 1,
                msg: "ต้องรออีก " + minutes + " นาที ถึงจะหมุนได้อีกครั้ง",
                minute: minutes,
                endtime: moment().add(minutes, "minutes").format('YYYY-MM-DD HH:mm:ss')
            })
        }
    } else {
        res.json({
            code: 1,
            msg: "INVALID_PARAMETER"
        })
    }
};

GAME.playgame_spin = async(req, res) => {
    let username = req.user.username;
    let session_key = req.user.session_id;
    let minute = await validate(username);
    let chkamount = await validatedeposit(username);
    if (chkamount) {
        if (!minute) {
            await axios
                .get("http://wheel.api-node.com/login/SLOTXE88TH?balance=0&player_id=" + username + "&session_key=" + session_key)
                .then((response) => {
                    result = response.data;
                });
            res.json({
                code: 0,
                payload: result
            });
        } else {
            res.json({
                code: 1,
                msg: "ต้องรออีก " + minute + " นาที ถึงจะหมุนได้อีกครั้ง",
                minute: minute,
                endtime: moment().add(minute, "minutes").format('YYYY-MM-DD HH:mm:ss')
            })
        }
    } else {
        res.json({
            code: 2,
            msg: "คุณต้องมียอดฝาก 500 บาทขึ้นไป",
            minute: 360,
            endtime: moment().add(360, "minute").format('YYYY-MM-DD HH:mm:ss')
        })
    }
}




const validate = async(username) => {
    let last_date = await Func.exeSQL("SELECT datetime FROM t_log_wheel_new WHERE username = ? ORDER BY datetime DESC limit 1", [username])
    let _last_date = last_date.length > 0 ? moment(last_date[0].datetime).format('YYYY-MM-DD') : 0;

    if (last_date[0] && _last_date == moment().format('YYYY-MM-DD')) {
        let startDate = last_date[0].datetime;
        let endDate = new Date();
        let msDifference = endDate - startDate;
        let minutes = Math.floor(msDifference / 1000 / 60);
        if (minutes >= 360) {
            return false;
        } else {
            return 360 - minutes;
        }
    } else {
        return false;
    }
}

const validatedeposit = async(username) => {
    let amount = await Func.exeSQL("SELECT SUM(amount) as amount FROM t_deposit_statement WHERE account = ? AND date = ?", [username, moment(new Date()).format("YYYY-MM-DD")])
    console.log(amount);
    if (amount.length > 0) {
        amount = amount[0].amount;
        if (amount >= 500) {
            return true;
        } else {
            return true;
        }
    }
}



module.exports = GAME;