const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const prompt = "Type stop to shutdown the server: ";

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));

if (process.argv.length != 3) {
    process.stdout.write("Usage server.js portNumber");
    process.exit(1);
}

let portNumber = process.argv[2];

app.get("/", (req, res) => {
    res.render("index", {});
});

app.listen(portNumber);
console.log(`Web server started and running at http://localhost:${portNumber}`);

process.stdout.write(prompt);
process.stdin.setEncoding("utf8");
process.stdin.on('readable', () => {
    let dataInput = process.stdin.read();
    if (dataInput !== null) {
        let command = dataInput.trim();
        if (command == "stop") {
            console.log("Shutting down the server");
            process.exit(0);
        }
    }
});