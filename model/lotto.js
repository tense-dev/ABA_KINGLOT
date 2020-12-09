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
const parser = xmlToJson({ attributeMode: false });
var axios = require("axios");
const { exeSQL } = require("../services/function");
const LOTTO = function(entity) {};
let lotto_api = 'http://lotto.sunnygreen.online/api';
//getLottoConfig select RATE ราคา
getconfiglotto = async() => {
    return new Promise((resolve, reject) => {
        axios({
            method: 'GET',
            url: lotto_api + '/getLottoConfig',
            data: {}
        }).then(result => {
            resolve(result);
        });
    });
}

Update_receive_Lotto = async(id, username) => {
    let group = 'OTHER';
    let service = 'SLOTXE88TH';
    return new Promise((resolve, reject) => {
        axios({
            method: 'POST',
            url: lotto_api + '/receive_lottoByID/lotto',
            data: {
                group: group,
                service: service,
                username: username,
                id: id
            }
        }).then(result => {
            resolve(result.data);
        });
    });
}


LOTTO.getLottoConfig = async(req, res) => {
    let result = await getconfiglotto();
    res.json({ code: 0, payload: result.data.payload })
}

deleteCredit = async(username, amount) => {
    return new Promise((resolve, reject) => {
        console.log("DELETE CREDIT", username, amount);
        axios
            .get(serverAPI + "/withdraw?key=" + username + "&point=" + amount, {
                timeout: 17000,
            })
            .then((response) => {
                console.log(response.data);
                if (parseInt(response.data.currentBalance) >= 0) {
                    console.log("DELETE CREDIT SUCCESS");
                    resolve(response.data);
                } else {
                    reject("ไม่สามารถทำรายการได้ในขณะนี้!!");
                }
            })
            .catch((err) => {
                reject("ไม่สามารถทำรายการได้ในขณะนี้!");
            });
    });
}

LOTTO.createLottoByUser = async(req, res) => {
    if (req.body && req.body.amount > 0) {

        if (req.body.amount > 1000) {
            res.json({ code: 1, msg: 'สมาชิกสามารถเล่นได้สูงสุด 1000 บาท เท่านั้น' });
            return;
        }
        let type = 'lotto'
        let config = await getconfiglotto();
        config_result = config.data.payload;
        let group = 'OTHER';
        let service = 'SLOTXE88TH';
        let username = req.user.username;
        let number = req.body.number;
        let rate = config_result.rate;
        let amount = req.body.amount;
        let rate_win = parseFloat(config_result.rate) * parseFloat(amount);
        let creditTotal = await Func.selectCredit(req.user.username, serverAPI);
        creditTotal = parseFloat(creditTotal.currentCredit);
        let startDate = moment().format('YYYY-MM-DD');
        let bonus_id = type == "lucky" ? "5556" : "5555";
        let check_lotto = await exeSQL("SELECT * FROM t_deposit_statement WHERE use_bonus = ? AND account = ? AND date >= ? AND date <= ?", [bonus_id, req.user.username, startDate, config_result.roundDate])
        if (check_lotto.length > 0) {
            res.json({
                code: 1,
                msg: 'งวดนี้ท่านได้แทงหวยไปแล้ว จะแทงได้ใหม่งวดหน้า!'
            })
            return;
        }
        if (creditTotal < amount && type == "lotto") {
            res.json({
                code: 1,
                msg: "ไม่สามารถแทงได้ เนื่องจากจำนวนเงินมากกว่ายอดคงเหลือ!",
            });
            return;
        }
        let res_delete = await deleteCredit(username, amount);
        console.log('res_delete', res_delete)
        if (res_delete.code == 0) {
            await axios({
                method: 'POST',
                url: lotto_api + '/createLottoByUser/' + type,
                data: {
                    group: group,
                    service: service,
                    username: username,
                    number: number,
                    rate: rate,
                    amount: amount,
                    rate_win: rate_win,
                    type: 'lotto'
                }
            }).then(async result => {
                let payloadDeposit = {
                    date: new Date(),
                    time: new Date(),
                    amount: 0,
                    bank: bonus_id,
                    account: req.user.username,
                    bonus: -parseInt(amount),
                    point: 0,
                    fix_multiple: 0,
                    channel: "LOTTO",
                    detail: "",
                    tx_hash: sha1(config_result.roundDate + "Lotto" + req.user.username + amount + number),
                    status: 1,
                    is_bonus: 1,
                    use_bonus: bonus_id, // EDIT
                    withdraw_fix: 0,
                    is_check: -1,
                    befor_credit: 0,
                    after_credit: 0,
                    fix_withdraw: 0,
                };
                let deposit = await Func.exeSQL("INSERT INTO t_deposit_statement SET ? ", [payloadDeposit]).catch(err => {
                    res.json({
                        code: 1,
                        msg: "ไม่สามารถแทงได้ เนื่องจากจำนวนเงินมากกว่ายอดคงเหลือ!",
                    });
                    return;
                });

                if (result && deposit) {
                    if (amount > 0) {
                        res.json({
                            code: 0,
                            msg: "ทำรายการสำเร็จ!",
                        });
                    }
                } else {
                    res.json({
                        code: 1,
                        msg: "เกิดข้อผิดพลาด",
                    });
                }
            });
        } else {
            res.json({
                code: 1,
                msg: "AGENT เกิดข้อผิดพลาด",
            });
        }
    } else {
        res.json({
            code: 1,
            msg: "โปรดระบุจำนวนเงินการเล่นให้ถูกต้อง"
        })
    }
}


LOTTO.getListAllByUser = async(req, res) => {
    await axios({
        method: 'POST',
        url: lotto_api + '/getLottoAllResultListByUser/lotto',
        data: {
            group: "OTHER",
            service: "SLOTXE88TH",
            username: req.user.username
        }
    }).then(result => {
        //    console.log(result.data.code)
        let jsonresult = [];
        if (result.data.code == 0) {
            if (result.data.payload.length > 0) {
                for (const item of result.data.payload) {
                    let statusText = "รอผล";
                    let status = 0;
                    if (item.isWin == 1) {
                        statusText = "ถูกรางวัล"
                        status = 1
                    } else if (item.isWin != null) {
                        statusText = "ไม่ถูก"
                        status = 2
                    }
                    if (item.IsReceive == 1) {
                        statusText = "รับแล้ว"
                        status = 3
                    }
                    jsonresult.push({
                        data: moment(item.lotto_date).format('YYYY-MM-DD'),
                        number: item.number,
                        amount: item.amount,
                        rate_win: item.rate_win,
                        status: status,
                        statusText: statusText,
                        id: item.id
                    })
                    res.json({ code: 0, payload: jsonresult })
                }
            } else {
                res.json({
                    code: 1,
                    msg: "ไม่พบประวัติการเล่น"
                })
            }
        } else {
            res.json({
                code: 1,
                msg: "เกิดข้อผิดพลาด ไม่สามารถดึงข้อมูลได้ในขณะนี้"
            })
        }
    });
}


LOTTO.receive_lottoByID = async(req, res) => {
    let group = "OTHER";
    let service = "SLOTXE88TH";
    let username = req.user.username;
    let id = req.body.id;
    if (req.user) {
        let username = req.user.username;
        let bank_number = req.user.bank_number;
        let full_name = req.user.full_name;
        let bank_code = req.user.bank_code;
        let result_lotto = await Update_receive_Lotto(id, username);
        let sumWallet = 0;
        if (result_lotto && result_lotto.rate_win > 0) {
            sumWallet = result_lotto.rate_win;
        }
        if (result_lotto.code == 1) {
            res.json({
                code: 1,
                msg: result_lotto.msg,
            });
            return;
        }
        if (sumWallet && sumWallet > 0) {
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
                withdraw_from: "LOTTO",
                comment: "รับรางวัล จากการเล่นหวย ถูกหวย",
                use_bonus: 5555
            };
            let resultInsertwithdraw = await Func.exeSQL(
                "INSERT INTO t_withdraw_statement SET ? ", [payloadWithdraw]
            );
            if (resultInsertwithdraw) {
                res.json({
                    code: 0,
                    msg: "SUCCESS",
                });
            }
        } else {
            res.json({
                code: 1,
                msg: "เกิดข้อผิดพลาดไม่สามารถรับของรางวัลได้",
            });
        }
    } else {
        res.json({
            code: 2,
            msg: "NOT_FOUND_PARAMETER",
        });
    }


}




module.exports = LOTTO;