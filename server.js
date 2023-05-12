// General require statements and constants for node application
const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const prompt = "Type stop to shutdown the server: ";
const portNumber = 4000;
let currUser;

// Setup for MongoDB connection
require("dotenv").config({ path: path.resolve("./.env") });
const { MongoClient, ServerApiVersion } = require('mongodb');

const username = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const db = process.env.MONGO_DB_NAME;
const collection = process.env.MONGO_COLLECTION;
const uri = `mongodb+srv://${username}:${password}@cluster0.dkcbcm0.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

/* *************** MongoDB Functions *************** */
async function register(client, database, collection, name, username, password) {
    let newUser = {
        name: name,
        username: username,
        password: password,
        favoriteTeams: [],
        favoritePlayers: []
    };

    await client.db(database).collection(collection).insertOne(newUser);
}

async function getUser(client, database, collection, username, password) {
    let filter = {
        username: username,
        password: password
    };

    const result = await client.db(database).collection(collection).findOne(filter);
    return result;
}

async function getCurrUser(client, database, collection, username) {
    let filter = { username: username };
    const result = await client.db(database).collection(collection).findOne(filter);
    return result;
}

async function updateFavPlayers(client, database, collection, username, playerFirst, playerLast) {
    let filter = { username: username };
    let newPlayer = {
        firstName: playerFirst,
        lastName: playerLast
    };
    let update = { $push: { favoritePlayers: newPlayer } };
    await client.db(database).collection(collection).updateOne(filter, update);
}
/* ************************************************* */

/* *************** Express & EJS Views *************** */
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:false}));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("login", {});
});

app.post("/", (req, res) => {
    res.render("login", {});
});

app.get("/register", (req, res) => {
    res.render("register", {});
});

app.post("/home", async (req, res) => {
    let name = req.body.name
    let username = req.body.username;
    let password = req.body.password;
    let pFirst = req.body.playerFirstName;
    let pLast = req.body.playerLastName;
    currUser = username ?? currUser;

    if (name) {
        await register(client, db, collection, name, username, password);
        const vars = {
            user: req.body.name,
            favPlayers: JSON.stringify({})
        };

        res.render("home", vars);
    } else if (username && password) {
        const usr = await getUser(client, db, collection, username, password);
        const vars = {
            user: usr.name,
            favPlayers: JSON.stringify(usr.favoritePlayers)
        };

        res.render("home", vars);
    } else if (pFirst && pLast) {
        await updateFavPlayers(client, db, collection, currUser, pFirst, pLast);
        const usr = await getCurrUser(client, db, collection, currUser);
        const vars = {
            user: usr.name,
            favPlayers: JSON.stringify(usr.favoritePlayers)
        };

        res.render("home", vars);
    }
});

app.get("/today_games", (req, res) => {
    // TODO: USE API TO GET GAMES
    res.render("games", {});
});

app.get("/search_player", (req, res) => {
    res.render("playerSearch", {});
});

app.post("/player_result", async (req, res) => {
    const playerURL = `https://www.balldontlie.io/api/v1/players?search=${req.body.playerFirstName}_${req.body.playerLastName}`;
    let result = await fetch(playerURL);
    let json = await result.json();
    const player = json.data[0];

    const statsURL =  `https://www.balldontlie.io/api/v1/season_averages?player_ids[]=${player.id}`;
    result = await fetch(statsURL);
    json = await result.json();
    const avgs = json.data[0];

    let statsTable = getSeasonAverages(avgs);

    const vars = {
        playerName: player.first_name + " " + player.last_name,
        team: player.team.full_name,
        seasonStats: statsTable
    };

    res.render("playerResult", vars);
});
/* *************************************************** */

/* *************** Express CLI *************** */
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
/* ******************************************* */

/* *************** Utils *************** */
function getSeasonAverages(apiAvgs) {
    let formattedStats = {
        Points: apiAvgs.pts,
        Assists: apiAvgs.ast,
        Rebounds: apiAvgs.reb,
        Steals: apiAvgs.stl,
        Blocks: apiAvgs.blk
    };
    let statsTable = "<table border=\'1\'><tr><th>Stat</th><th>Season Average</th></tr>";
    Object.keys(formattedStats).forEach(k => {
        statsTable += `<tr><td>${k}</td><td>${formattedStats[k]}</td></tr>`;
    });
    statsTable += "</table>";
    return statsTable;
}
/* ************************************* */