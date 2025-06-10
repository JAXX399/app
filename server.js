const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let waitingPlayer = null;

io.on("connection", (socket) => {
    socket.on("disconnect", () => {
        if (waitingPlayer === socket) waitingPlayer = null;
    });

    if (waitingPlayer) {
        // Pair with waiting player
        const room = `room-${waitingPlayer.id}-${socket.id}`;
        socket.join(room);
        waitingPlayer.join(room);

        // Assign X and O
        waitingPlayer.emit("gameStart", { symbol: "X", room });
        socket.emit("gameStart", { symbol: "O", room });

        // Set room for both sockets
        socket.data.room = room;
        waitingPlayer.data.room = room;

        waitingPlayer = null;
    } else {
        waitingPlayer = socket;
        socket.emit("waiting");
    }

    // Listen for moves from any socket
    socket.on("move", (data) => {
        // Broadcast move to the other player in the room
        socket.to(data.room).emit("move", data);
    });
});

server.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});

let socket = io("http://localhost:3000"); // Use your server URL in production
let mySymbol = null;
let myTurn = false;
let room = null;

socket.on("waiting", () => {
    document.getElementById("turn-label").textContent = "Waiting for opponent...";
});

socket.on("gameStart", (data) => {
    mySymbol = data.symbol;
    room = data.room;
    myTurn = mySymbol === "X";
    updateTurnLabel();
    resetBoard();
});

socket.on("move", (data) => {
    // Apply opponent's move
    board = data.board;
    playerMoves = data.playerMoves;
    renderBoard();
    myTurn = true;
    updateTurnLabel();
    // Blinking logic if needed
});

// Modify onCellClick:
function onCellClick(row, col) {
    if (!myTurn || board[row][col] !== "") return;
    // ...existing code to update board/playerMoves locally...
    socket.emit("move", { board, playerMoves, room });
    myTurn = false;
    updateTurnLabel();
}