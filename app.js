const express = require("express");
const app = express();
var logger = require("morgan");
app.use(logger("dev"));
const bodyParser = require("body-parser");
app.use(bodyParser.json({ limit: "500mb" }));
const cors = require("cors");
app.use(cors());
app.use(
    bodyParser.urlencoded({
        limit: "500mb",
        extended: true,
        parameterLimit: 50000,
    })
);
require("./route")(app);
const moment = require("moment");
const Func = require("./services/function");
var cron = require('node-cron');
// cron.schedule('0 0 * * *', function() {
//     if ((moment().format("dddd").toString() == "Wednesday" && moment(new Date()).day() == 3) || (moment().format("dddd").toString() == "Saturday" && moment(new Date()).day() == 6)) {
//         Func.addRanking_game();
//         Func.addRanking_deposit();
//         console.log("PROCRESS ----------------------------> SUCCESS")
//     }
// });

app.listen(3900, "0.0.0.0", () => {
    console.log("Server is running");
});