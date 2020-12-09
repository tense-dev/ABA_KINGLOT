const Func = require("./function");
const serverAPI = process.env.SERVICE_API;
const moment = require("moment");
const { exeSQL } = require("./function");

const resultwithdraw = async(userdata, amount, done) => {
    let username = userdata.username;
    if (username && amount) {
        amount = parseFloat(amount);
        let apiNew = serverAPI;
        let checkWithdraw = await Func.selectCheckwithdraw(username); //เช็ครายการถอน
        if (checkWithdraw) {
            let allCredit = await Func.selectCredit(username, apiNew); //เช็คเครดิต
            let countCheckbonus = await Func.selectCountcheckbonus(username); //เช็คการรับโบนัส
            let lastBonus = await Func.selectLastbonus(username); //โบนัสถอนล่าสุด
            // let countShop = await Fx
            if (lastBonus) {
                let withdrawFix = await Func.selectWithdrawfix(
                    username,
                    lastBonus,
                    countCheckbonus,
                    allCredit.currentCredit
                );
                //เทิร์นทั้งหมด
                //แล้วแต่ กฏเว็บว่าตองถอนตาม withdraw fix
                if (amount >= withdrawFix) {
                    let fix_withdraw = await Func.selectFixwithdraw(username); //ถอนสูงสุด
                    if (amount >= 1) {
                        console.log("checkwithdraw : " + checkWithdraw);
                        console.log("withdrawFix : " + withdrawFix);
                        console.log("fix_withdraw : " + fix_withdraw);
                        if (checkWithdraw && withdrawFix != null) {
                            if (
                                parseFloat(allCredit.currentCredit) >= parseFloat(amount) &&
                                parseFloat(allCredit.currentCredit) >= parseFloat(withdrawFix)
                            ) {
                                if (parseInt(fix_withdraw) > 0) {
                                    let deleteCredit =
                                        parseFloat(allCredit.currentCredit) -
                                        parseFloat(fix_withdraw);
                                    let creditUser =
                                        amount > parseFloat(fix_withdraw) ?
                                        parseFloat(fix_withdraw) :
                                        amount;

                                    let resultApidelete = await Func.insertApideleteRepeat(
                                        apiNew,
                                        deleteCredit,
                                        username
                                    );

                                    if (resultApidelete == null) {
                                        let checkAllcredit = await Func.selectCredit(
                                            username,
                                            apiNew
                                        );
                                        resultApidelete = await Func.insertApideleteRepeat(
                                            apiNew,
                                            deleteCredit,
                                            username,
                                            checkAllcredit.currentCredit,
                                            allCredit.currentCredit
                                        );
                                    }
                                    if (resultApidelete != null) {
                                        let checkAllcredit = resultApidelete.currentBalance;
                                        let resultDelete = await Func.insertDeletecredit(
                                            deleteCredit,
                                            username,
                                            checkAllcredit,
                                            allCredit.currentCredit,
                                            fix_withdraw
                                        );

                                        if (resultDelete) {
                                            let resultWorkinglog = await Func.insertWorkinglog({
                                                operator: "ระบบตัดเครดิตอัตโนมัติ",
                                                title: "ลบเครดิต",
                                                username: username,
                                                change: deleteCredit,
                                                date: moment(new Date()).format("Y-MM-DD"),
                                                time: moment(new Date()).format("HH:mm:ss"),
                                                detail: "ลบเครดิตจำนวน " +
                                                    deleteCredit +
                                                    " บาท สาเหตุ " +
                                                    "ลบเครดิตจากกิจกรรมเนื่องจากถอนได้สูงสุด " +
                                                    fix_withdraw +
                                                    " บาท",
                                            });
                                            if (resultWorkinglog) {
                                                let realCredit = await Func.insertApideleteRepeat(
                                                    apiNew,
                                                    creditUser,
                                                    username
                                                );
                                                if (realCredit == null) {
                                                    let realCheckallcredit = await Func.selectCredit(
                                                        username,
                                                        apiNew
                                                    );
                                                    realCredit = await Func.insertApideleteRepeat(
                                                        apiNew,
                                                        creditUser,
                                                        username,
                                                        realCheckallcredit.currentCredit,
                                                        checkAllcredit
                                                    );
                                                }
                                                if (realCredit != null) {
                                                    let afterDeleterealcredit = realCredit.currentBalance;
                                                    let resultinsertWithdraw = await Func.insertWithdrawstatement(
                                                        creditUser,
                                                        userdata,
                                                        afterDeleterealcredit,
                                                        checkAllcredit,
                                                        lastBonus
                                                    );
                                                    if (resultinsertWithdraw) {
                                                        let resultUpdate = await exeSQL(
                                                            "UPDATE t_deposit_statement SET is_check = -1 WHERE fix_withdraw > 0 AND account = ? AND is_check = 1", [username]
                                                        );
                                                        if (resultUpdate.changedRows > 0) {
                                                            done(null, {
                                                                code: 0,
                                                                amount: afterDeleterealcredit,
                                                                msg: "เพิ่มข้อมูลในรายการถอนสำเร็จ",
                                                            });
                                                        } else {
                                                            done(null, {
                                                                code: 1,
                                                                msg: "ไม่สามารถถอนเงินได้ใน ขณะนี้! (001)",
                                                            });
                                                        }
                                                    } else {
                                                        done(null, {
                                                            code: 1,
                                                            msg: "ไม่สามารถถอนเงินได้ใน ขณะนี้! (002)",
                                                        });
                                                    }
                                                } else {
                                                    done(null, {
                                                        code: 1,
                                                        msg: "ไม่สามารถถอนเงินได้ใน ขณะนี้! (003)",
                                                    });
                                                }
                                            } else {
                                                done(null, {
                                                    code: 1,
                                                    msg: "ไม่สามารถถอนเงินได้ใน ขณะนี้! (004)",
                                                });
                                            }
                                        } else {
                                            done(null, {
                                                code: 1,
                                                msg: "ไม่สามารถถอนเงินได้ใน ขณะนี้! (005)",
                                            });
                                        }
                                    } else {
                                        done(null, {
                                            code: 1,
                                            msg: "ไม่สามารถถอนเงินได้ใน ขณะนี้! (006)",
                                        });
                                    }
                                } else {
                                    let realCredit = await Func.insertApideleteRepeat(
                                        apiNew,
                                        amount,
                                        username
                                    );
                                    if (realCredit == null) {
                                        let realCheckallcredit = await Func.selectCredit(
                                            username,
                                            apiNew
                                        );
                                        realCredit = await Func.insertApideleteRepeat(
                                            apiNew,
                                            amount,
                                            username,
                                            realCheckallcredit.currentCredit,
                                            allCredit.currentCredit
                                        );
                                    }

                                    if (realCredit != null) {
                                        let afterDeleterealcredit = realCredit.currentBalance;
                                        let resultinsertWithdraw = await Func.insertWithdrawstatement(
                                            amount,
                                            userdata,
                                            afterDeleterealcredit,
                                            allCredit.currentCredit,
                                            lastBonus
                                        );
                                        if (resultinsertWithdraw) {
                                            done(null, {
                                                code: 0,
                                                amount: afterDeleterealcredit,
                                                msg: "เพิ่มข้อมูลในรายการถอนสำเร็จ",
                                            });
                                        } else {
                                            done(null, {
                                                code: 1,
                                                msg: "ไม่สามารถถอนเงินได้ใน ขณะนี้! (007)",
                                            });
                                        }
                                    } else {
                                        done(null, {
                                            code: 1,
                                            msg: "ไม่สามารถถอนเงินได้ใน ขณะนี้! (008)",
                                        });
                                    }
                                }
                            } else {
                                done(null, {
                                    code: 1,
                                    msg: "ไม่สามารถถอนเงินได้ ยอดเงินไม่เพียงพอ!",
                                });
                            }
                        } else {
                            done(null, {
                                code: 1,
                                msg: "ไม่สามารถทำรายการถอนได้ มีรายการถอนค้างอยู่ในขณะนี้!",
                            });
                        }
                    } else {
                        done(null, {
                            code: 1,
                            msg: "ถอนขั้นต่ำ 100 บาท!",
                        });
                    }
                } else {
                    done(null, {
                        code: 1,
                        msg: "กรุณาระบุจำนวนเงิน มากกว่าหรือเท่ากับยอดเทิร์น",
                    });
                }
            } else {
                done(null, {
                    code: 1,
                    msg: "เกิดข้อผิดพลาด ไม่พบรายการฝากล่าสุด!",
                });
            }
        } else {
            done(null, {
                code: 1,
                msg: "มีรายการถอนค้างอยู่ในขณะนี้!",
            });
        }
    } else {
        done(null, {
            code: 1,
            msg: "NOT_FOUND_PARAMETER",
        });
    }
};

module.exports = resultwithdraw;