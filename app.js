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
app.listen(3900, "0.0.0.0", () => {
    console.log("Server is running");
});