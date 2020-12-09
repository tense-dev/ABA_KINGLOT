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

const DEPOSIT = function(entity) {};

DEPOSIT.gen_deposit = async(req, res) => {
    if (req.user.bank_code && req.user.username && req.body.amount) {
        let phone_number = req.user.phone_number;
        let username = req.user.username;
        let result_user = await Func.exeSQL("SELECT * FROM t_member_account WHERE phone_number = ? AND username = ?", [phone_number, username]);

        if (result_user.length > 0) {
            result_user = result_user[0];
            let username = result_user.username;
            let bank_code = result_user.bank_code;
            let amount = req.body.amount;


            let result_data = await Func.exeSQL("SELECT * FROM t_generate_statement WHERE username = ? AND status = 0 AND start_date = ? ORDER BY id DESC limit 1", [username, moment().format("YYYY-MM-DD")])

            if (result_data[0] == undefined || result_data.length == 0) {
                let result = await Func.gen_deposit(amount, bank_code, username);
                console.log('result', result)
                if (result != 0) {
                    return res.json({
                        code: 0,
                        msg: result,
                    });
                } else {
                    res.json({
                        code: 1,
                        msg: "ไม่พบข้อมูลธนาคาร",
                    });
                }
            } else {
                if (result_data[0].end_date < moment().format("YYYY-MM-DD HH:mm:ss")) {
                    await Func.exeSQL("UPDATE t_generate_statement SET WHERE status = 0 or id = ? or start_date >= ? or start_date >= ? ", [result_data[0].id, moment()
                        .add(-2, "minutes")
                        .format("YYYY-MM-DD HH:mm:ss"),
                        moment()
                        .add(-1, "days")
                        .format("YYYY-MM-DD HH:mm:ss")
                    ]);
                    let result = await Func.gen_deposit(amount, bank_code, username);
                    console.log('resultss', result)
                    if (result != 0) {
                        return res.json({
                            code: 0,
                            msg: {
                                start_date: moment(result.start_date)
                                    .add(7, "hours")
                                    .format("YYYY-MM-DD HH:mm:ss"),
                                end_date: moment(result.end_date)
                                    .add(7, "hours")
                                    .format("YYYY-MM-DD HH:mm:ss"),
                                amount: result.amount,
                                bank_name: result.bank_name,
                                name: result.name,
                                number: result.number,
                            },
                        });
                    } else {
                        res.json({
                            code: 1,
                            msg: "ไม่พบข้อมูลธนาคาร",
                        });
                    }
                } else {
                    await Func.exeSQL("UPDATE t_generate_statement SET status = 4 WHERE id = ?", [result_data[0].id])
                    let result = await Func.gen_deposit(amount, bank_code, username);
                    console.log('resultssssadasd', result)
                    if (result != 0) {
                        return res.json({
                            code: 0,
                            msg: {
                                start_date: moment(result.start_date)
                                    .add(7, "hours")
                                    .format("YYYY-MM-DD HH:mm:ss"),
                                end_date: moment(result.end_date)
                                    .add(7, "hours")
                                    .format("YYYY-MM-DD HH:mm:ss"),
                                amount: result.amount,
                                bank_name: result.bank_name,
                                name: result.name,
                                number: result.number,
                            },
                        });
                    } else {
                        res.json({
                            code: 1,
                            msg: "ไม่พบข้อมูลธนาคาร",
                        });
                    }
                }
            }
        } else {
            res.json({
                code: 1,
                msg: "ไม่พบข้อมูลผู้ใช้งาน!!!",
            });
        }
    } else {
        res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

DEPOSIT.rewarddeposit = async() => {
    let payload = {
        date: moment("2020-11-12").format("YYYY-MM-DD"),
        amount: 500,
        username: "TEST"
    };
    await Func.insert_rewarddeposit(payload);
    console.log("test");
}





module.exports = DEPOSIT