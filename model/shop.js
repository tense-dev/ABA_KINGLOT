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
const uploadPath = "https://evoplay66.hammerstone.xyz/api/uploads";
const SHOP = function(entity) {};

SHOP.list_shop = async(req, res) => {
    let list_shop = await Func.exeSQL(
        "SELECT * FROM t_shop_config WHERE category_id = 1 AND is_show = 1 ORDER BY id asc"
    );
    let point = await Func.exeSQL(
        "SELECT diamond as point FROM t_member_account WHERE username = ?", [req.user.username]
    );
    point = point.length > 0 ? point[0].point : 0;
    if (list_shop.length > 0) {
        let result = [];
        for (const item of list_shop) {
            let path = uploadPath + "?file=" + item.url_image;
            result.push({
                id: item.id,
                title: item.title,
                coin: item.coin,
                amount: item.value,
                category_id: item.category_id,
                category_name: item.category_name,
                imagepath: path,
            });
        }
        res.json({
            code: 0,
            title: "คุณมี " + point + " เพชร",
            payload: result,
        });
    } else {
        res.json({
            code: 1,
            msg: "NO DATA",
        });
    }
};

SHOP.receive_shop = async(req, res) => {
    let id = req.body.id;
    let username = req.user.username;
    let point = 0;
    if (id > 0 && username) {
        let user = await Func.exeSQL(
            "SELECT diamond as point FROM t_member_account WHERE username = ?", [req.user.username]
        );
        point = user.length > 0 ? user[0].point : 0;
        let product = await Func.exeSQL(
            "SELECT * FROM t_shop_config WHERE id = ?", [id]
        );

        if (product.length > 0) {
            if (point >= product[0].coin) {
                let hash =
                    moment(new Date()).format("Y-MM-DD") +
                    moment(new Date()).format("HH:mm:ss") +
                    product[0].id +
                    req.user.username;
                let payload = {
                    id: null,
                    date: moment(new Date()).format("Y-MM-DD"),
                    time: moment(new Date()).format("HH:mm:ss"),
                    amount: 0,
                    bank: product[0].id,
                    account: req.user.username,
                    bonus: parseFloat(product[0].value).toFixed(2),
                    point: point,
                    fix_multiple: product[0].fix_multiple,
                    channel: "Exchange coins",
                    detail: product[0].title,
                    tx_hash: sha1(hash), //bonus[0].hesh,
                    status: 0,
                    is_bonus: 1,
                    use_bonus: product[0].id,
                    withdraw_fix: parseFloat(parseFloat(product[0].value) * parseFloat(product[0].fix_multiple)), //ต้องทำเทินเท่าไหร่
                    is_check: 0,
                    befor_credit: 0,
                    after_credit: 0,
                    fix_withdraw: 0, //อันถอน
                    comment: product[0].title,
                };
                insertExchangeDeposit = await Func.exeSQL(
                    "INSERT INTO t_deposit_statement SET ? ", [payload]
                );
                if (insertExchangeDeposit) {
                    let bonus = [{ bonus: parseFloat(product[0].value) }];
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
                        UpdateDepositStatement = await Func.exeSQL(
                            "UPDATE t_deposit_statement SET is_check = 1 , status = 1 , befor_credit = ? ,after_credit = ? WHERE id = ?", [
                                resultAddcredit.previousDownlineGiven.toFixed(2),
                                resultAddcredit.currentBalance.toFixed(2),
                                insertExchangeDeposit.insertId,
                            ]
                        );
                        let resultCoin = point - product[0].coin;
                        let shop_statement = {
                            username: req.user.username,
                            shop_id: product[0].id,
                            befor_credit: resultAddcredit.previousDownlineGiven.toFixed(2),
                            after_credit: resultAddcredit.currentBalance.toFixed(2),
                            befor_coin: point,
                            after_coin: resultCoin,
                            status: 1,
                            comment: "แลกเหรียญ " + point + "รับ " + product[0].value + " เครดิต",
                        };
                        insertExchangeLog = await Func.exeSQL(
                            "INSERT INTO t_shop_statement SET ? ", [shop_statement]
                        );
                        await Func.exeSQL(
                            "UPDATE t_member_account SET diamond = ? where username = ?", [resultCoin, username]
                        );
                        if (UpdateDepositStatement) {
                            res.json({
                                code: 0,
                                msg: "แลกเหรียญสำเร็จ",
                            });
                        } else {
                            res.json({
                                code: 1,
                                msg: "แลกเหรียญไม่สำเร็จ กรุณาติดต่อพนักงาน!",
                            });
                        }
                    } else {
                        res.json({
                            code: 1,
                            msg: "แลกเหรียญไม่สำเร็จ กรุณาติดต่อพนักงาน!",
                        });
                    }
                } else {
                    res.json({
                        code: 1,
                        msg: "แลกเหรียญไม่สำเร็จ กรุณาติดต่อพนักงาน!",
                    });
                }
            } else {
                res.json({
                    code: 1,
                    msg: "เหรียญของคุณไม่พอ",
                });
            }
        } else {
            res.json({
                code: 1,
                msg: "ไม่พบรายการนี้ในระบบ",
            });
        }
    } else {
        res.json({
            code: 1,
            msg: "PARAMETER NOT FOUND",
        });
    }
};

module.exports = SHOP;