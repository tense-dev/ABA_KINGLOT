module.exports = (app) => {
    //require model
    const game = require("./model/game");
    const pac = require("./model/pac");
    const money = require("./model/money");
    const bonus = require("./model/bonus");
    const bank = require("./model/bank");
    const history = require("./model/history");
    const aff = require("./model/affiliate");
    const shop = require("./model/shop");
    const wallet = require("./model/wallet");
    const withdraw = require("./model/withdraw");
    const cashback = require("./model/cashback");
    const verifyToken = require("./middleware/auth.js");
    const verifyBody = require("./middleware/auth2.js");
    const reward = require("./model/reward");
    const axios = require("axios");
    const lotto = require("./model/lotto");
    const deposit = require("./model/depositdec");
    //route
    //PAC
    app.post("/api/login", verifyBody, pac.login); //
    app.get("/api/is_login", verifyToken, pac.is_login); //
    app.get("/api/LoginAccessToken", verifyToken, pac.LoginAccessToken);
    app.post("/api/forgetPasswordWeb", verifyBody, pac.forgetPasswordWeb); //
    app.post("/api/Resetpassword_game", verifyToken, pac.Resetpassword_game); //
    app.post("/api/validateRegister/:type", verifyBody, pac.validateRegister); //
    app.post("/api/otp", verifyToken, pac.otp); //
    app.post("/api/verify_OTP", verifyBody, pac.verify_OTP); //
    app.post("/api/verify_phone", verifyBody, pac.verify_phone); //
    app.post("/api/register_NEW", verifyBody, pac.register_NEW); //
    app.post("/api/resetpassword_web", verifyToken, pac.resetpassword_web); //

    //AFF
    app.post("/api/affiliateRegister", verifyToken, aff.affiliateRegister);
    app.post("/api/affiliateLog", verifyToken, aff.affiliateLog);
    app.get("/api/affiliateAddwallet", verifyToken, aff.affiliateAddwallet);
    app.get("/api/affiliateWallet", verifyToken, aff.affiliateWallet);
    app.get("/api/affiliateToken", verifyToken, aff.affiliateToken);
    app.post("/api/affiliateUpdate", verifyToken, aff.affiliateUpdate);
    app.post("/api/affiliateDeposit", verifyToken, aff.affiliateDeposit);
    app.post("/api/affiliateWithdraw", verifyToken, aff.affiliateWithdraw);
    app.post("/api/AffrefDE", verifyBody, aff.AffrefDE);
    app.get("/api/affiliateSystem", verifyToken, aff.affiliateSystem);
    app.post("/api/affiliateWithdraw", verifyToken, aff.affiliateWithdraw);
    app.get("/affiliateMember", aff.affiliateMember);
    app.get("/api/credit_system", verifyToken, aff.credit_system);
    app.post("/api/receive_credit", verifyToken, aff.receive_credit);
    app.get("/api/credit_system_join", verifyToken, aff.credit_system_join);
    //MONEY
    app.get("/api/amount", verifyToken, money.amount); //
    app.get("/api/turnTotal", verifyToken, money.turnTotal); //
    //BUNUS
    app.get("/api/freebonus", verifyToken, bonus.freebonus);
    app.post("/api/getFreebonus", verifyToken, bonus.getFreebonus);
    app.post("/api/is_bonus", verifyToken, bonus.is_bonus);
    app.get("/api/bonus", verifyToken, bonus.bonus);
    //BANK
    app.get("/api/showBank", verifyToken, bank.showBank); //
    app.post("/api/add_member_bank", verifyToken, bank.add_member_bank); //
    app.post("/api/del_member_bank", verifyToken, bank.del_member_bank); //
    app.get("/api/list_member_bank", verifyToken, bank.list_member_bank); //
    app.post("/api/changebank", verifyToken, bank.changebank); //
    app.post("/api/verify_bank", verifyToken, bank.verify_bank); //
    //HISTORY
    app.get("/api/history/:type", verifyToken, history.history); //
    app.get("/api/credit_system", verifyToken, history.credit_system); //
    app.get("/api/deposit_history/:limit", verifyToken, history.deposit_history);
    app.get("/api/deposit_history2/:limit", history.deposit_history);
    app.get("/api/wheel_history", verifyToken, history.wheel_history); //
    app.get("/api/bonusbyAff_history", verifyToken, history.bonusbyAff_history); //
    //GAME

    app.get("/api/callback_wheel", game.callback_wheel);
    app.get("/api/playgame_spin", verifyToken, game.playgame_spin);
    app.get("/api/game_balance", game.game_balance);

    //WALLET
    app.get("/api/wallet", verifyToken, wallet.wallet);
    app.get("/api/wheel_wallet", verifyToken, wallet.wheel_wallet);
    app.get("/api/walletToCredit", verifyToken, wallet.walletToCredit);
    app.post("/api/walletWithdraw", verifyToken, wallet.walletWithdraw);
    app.post("/api/walletDeposit", verifyToken, wallet.walletDeposit);
    app.post("/api/depositTruewallet", verifyToken, wallet.depositTruewallet);

    app.post("/api/walletWithdraw_NEW", verifyToken, wallet.walletWithdraw_NEW);
    app.post("/api/walletToCredit_NEW", verifyToken, wallet.walletToCredit_NEW);
    app.post("/api/wheelAddcredit", verifyToken, wallet.wheelAddcredit);

    //WITHDRAW
    app.post("/api/withdraw", verifyToken, withdraw.withdraw);
    //CASHBACK
    app.get("/api/cashback", verifyToken, cashback.cashback);
    app.post("/api/receive_cashback", verifyToken, cashback.receive_cashback);
    app.get("/api/getCashback/:type", verifyToken, cashback.receive_cashback);
    //SHOP
    app.get("/api/list_shop", verifyToken, shop.list_shop);
    app.post("/api/receive_shop", verifyToken, shop.receive_shop);
    //REWARD
    app.post("/api/mission_day", verifyToken, reward.mission_day);
    app.post("/api/receive_mission_day", verifyToken, reward.receive_mission_day);
    //ฝากทศนิยม
    app.post("/api/gen_deposit", verifyToken, deposit.gen_deposit);
    //LOTTO
    app.get("/api/getLottoConfig", verifyToken, lotto.getLottoConfig);
    app.post("/api/lotto", verifyToken, lotto.createLottoByUser);
    app.post("/api/receive_lottoByID", verifyToken, lotto.receive_lottoByID);
    app.get("/api/getListAllByUser", verifyToken, lotto.getListAllByUser);

};