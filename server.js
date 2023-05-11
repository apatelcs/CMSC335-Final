const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const prompt = "Type stop to shutdown the server: ";
const portNumber = 4000;
let currRoomCode;
let currPlayer;

require("dotenv").config({ path: path.resolve("./.env") });
const { MongoClient, ServerApiVersion } = require("mongodb");

const username = process.env.MONGO_DB_USERNAME;
const password = process.env.MONGO_DB_PASSWORD;
const db = process.env.MONGO_DB_NAME;
const collection = process.env.MONGO_COLLECTION;
const uri = `mongodb+srv://${username}:${password}@cluster0.dkcbcm0.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function newLobby(client, db, collection, roomCode, playerName) {
    let lobby = {
        room_code: roomCode,
        players: [playerName],
    };

    await client.db(db).collection(collection).insertOne(lobby);
}

async function joinLobby(client, db, collection, roomCode, playerName) {
    let filter = { room_code: roomCode };
    let update = { $push: { players: playerName } };

    await client.db(db).collection(collection).updateOne(filter, update);
}

async function getPlayerList(client, db, collection, roomCode) {
    let filter = { room_code: roomCode };
    
    const result = await client.db(db).collection(collection).findOne(filter);
    return result.players;
}

function makePlayersTable(players) {
    let outHTML = "<table border=\'1\'><tr><th>Player</th></tr>";
    players.forEach(player => {
        outHTML += `<tr><td>${player}</td></tr>`;
    });
    outHTML += "</table>";
    return outHTML;
}

app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));

app.get("/", (req, res) => {
    res.render("index", {});
});

app.get("/join_lobby", (req, res) => {
    res.render("joinLobby", {});
}); 

app.get("/create_lobby", (req, res) => {
    res.render("createLobby", {});
});

app.post("/waiting_room_new", async (req, res) => {
    const newRoomCode = new Date().getTime().toString();
    currRoomCode = newRoomCode;
    currPlayer = req.body.playerName;
    
    try {
        await client.connect();
        await newLobby(client, db, collection, newRoomCode, req.body.playerName);

        const vars = {
            playerName: req.body.playerName,
            roomCode: newRoomCode,
            players: makePlayersTable([req.body.playerName])
        };
        res.render("waitingRoom", vars);
    } catch(e) {
        console.error(e);
    } finally {
        await client.close();
    }
});

app.post("/waiting_room_existing", async (req, res) => {
    try {
        await client.connect();
        await joinLobby(client, db, collection, req.body.roomCode, req.body.playerName);
        let players = await getPlayerList(client, db, collection, req.body.roomCode);
        currRoomCode = req.body.roomCode;
        currPlayer = req.body.playerName;

        const vars = {
            playerName: req.body.playerName,
            roomCode: req.body.roomCode,
            players: makePlayersTable(players)
        };
        res.render("waitingRoom", vars);
    } catch(e) {
        console.error(e);
    } finally {
        await client.close();
    }
});

app.get("/waiting_room", async (req, res) => {
    try {
        await client.connect();
        let players = await getPlayerList(client, db, collection, currRoomCode);

        const vars = {
            playerName: currPlayer,
            roomCode: currRoomCode,
            players: makePlayersTable(players)
        };
        res.render("waitingRoom", vars);
    } catch(e) {
        console.error(e);
    } finally {
        await client.close();
    }
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