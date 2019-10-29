const express = require("express");
const path = require("path");
const axios = require("axios");
const app = express();
const server = app.listen(8000);
const io = require("socket.io")(server);

app.use(express.json());

app.use(express.static( __dirname + '/public/dist/public' ));

app.all("*", (req,res,next) => {
    res.sendFile(path.resolve("./public/dist/public/index.html"))
});

// socket

var rooms = {};
var questions = {};
var countDowns = {};

io.on("connection", function(socket) {
    socket.emit("greeting", `you are connected, your id is ${socket.id}`);
    
    socket.on("createRoom", data => {
        if (data.roomName in rooms) {
            socket.emit("createdRoom", { created: false, message: "this room name is already used"});
        }
        else {
            const owner = {};
            owner["socketId"] = socket.id;
            owner["userName"] = data.userName;
            owner["score"] = 0;
            owner["turns"] = 0;
            rooms[data.roomName] = [owner];
            questions[data.roomName] = [];
            countDowns[data.roomName] = {
                countDown: 120000,
                timeInterval: null
            };
            socket.join(data.roomName);
            socket.emit("createdRoom", { created: true, message: "you have created the room" });
        }
    });

    socket.on("ownerNameQuery", data => {
        if (rooms[data]) {
            var ownerName = rooms[data][0]["userName"];
        }
        socket.emit("ownerName", ownerName);
    });

    socket.on("joinRoom", data => {
        if (data.roomName in rooms) {
            if (rooms[data.roomName].length < 2) {
                const challenger = {};
                challenger["socketId"] = socket.id;
                challenger["userName"] = data.userName;
                challenger["score"] = 0;
                rooms[data.roomName].push(challenger);
                socket.join(data.roomName);
                socket.emit("joinedRoom", { joined: true, message: "you have joined the room" });
                io.to(data.roomName).emit("challengerJoined", data.userName);
            }
            else {
                socket.emit("joinedRoom", { joined: false, message: "The room is filled" })
            }
        }
        else {
            socket.emit("joinedRoom", { joined: false, message: "this room does not exist" });
        }
    });

    socket.on("ready", roomName => {
        socket.to(roomName).emit("opponentReady", "wait for you to get ready");
    });

    socket.on("gameStart", roomName => {
        questions[roomName] = [];
        io.in(roomName).emit("selectCategories", "waiting for players to select");
    });

    socket.on("selectCategory", data => {
        const roomName = data.roomName;

        for (let i = 0; i < rooms[roomName].length; i++) {
            if (rooms[roomName][i].socketId == socket.id) {
                if (i == 0) {
                    //server pick questions
                    const randomCat = Math.floor((Math.random() * 24) + 9);

                    const easyUrl = `https://opentdb.com/api.php?amount=1&category=${randomCat}&difficulty=easy&type=multiple`;
                    const mediumUrl = `https://opentdb.com/api.php?amount=1&category=${randomCat}&difficulty=medium&type=multiple`;
                    const hardUrl = `https://opentdb.com/api.php?amount=1&category=${randomCat}&difficulty=hard&type=multiple`;

                    axios.get(easyUrl)
                        .then(result => {
                            const question = result.data.results[0];
                            questions[roomName].push(question);
                        })
                        .catch(err => {
                            console.log(err);
                        });
                    
                    axios.get(mediumUrl)
                        .then(result => {
                            const question = result.data.results[0];
                            questions[roomName].push(question);
                        })
                        .catch(err => {
                            console.log(err);
                        });
                    
                    axios.get(hardUrl)
                        .then(result => {
                            const question = result.data.results[0];
                            questions[roomName].push(question);
                        })
                        .catch(err => {
                            console.log(err);
                        });
                    
                    //server pick questions end
                }
            }
        }

        const easyUrl = `https://opentdb.com/api.php?amount=1&category=${data.category}&difficulty=easy&type=multiple`;
        const mediumUrl = `https://opentdb.com/api.php?amount=1&category=${data.category}&difficulty=medium&type=multiple`;
        const hardUrl = `https://opentdb.com/api.php?amount=1&category=${data.category}&difficulty=hard&type=multiple`;

        axios.get(easyUrl)
            .then(result => {
                const question = result.data.results[0];
                questions[roomName].push(question);
            })
            .catch(err => {
                console.log(err);
            });
        
        axios.get(mediumUrl)
            .then(result => {
                const question = result.data.results[0];
                questions[roomName].push(question);
            })
            .catch(err => {
                console.log(err);
            });
        
        axios.get(hardUrl)
            .then(result => {
                const question = result.data.results[0];
                questions[roomName].push(question);
                setTimeout(() => {
                    socket.to(data.roomName).emit("opponentSelected", "wait for you to select");
                }, 300);
            })
            .catch(err => {
                console.log(err);
            });

    });

    socket.on("gameOn", roomName => {
        rooms[roomName][0].turns = 0;

        io.in(roomName).emit("loadGame", "game loading");
        
        setTimeout(() => {
        
            for (let question of questions[roomName]) {
                question.flipped = false;
            }

            let cards = [];
            // for (let question of questions[roomName]) {
            //     let options = question.incorrect_answers;
            //     options.push(question.correct_answer);
            //     cards.push(
            //         {
            //             question: question.question,
            //             difficulty: question.difficulty,
            //             options: options
            //         }
            //     )
            // }

            for (let i = 0; i < questions[roomName].length; i++) {
                let question = questions[roomName][i];
                let options = question.incorrect_answers;
                options.push(question.correct_answer);
                cards.push({
                    question: question.question,
                    difficulty: question.difficulty,
                    options: options,
                    index: i,
                    hide: false,
                    flip: false
                })
            }
            
            io.in(roomName).emit("cards", cards);

            countDowns[roomName].countDown = 120000;
            countDowns[roomName].timeInterval = setInterval(() => {
                countDowns[roomName].countDown -= 1000;
                if (countDowns[roomName].countDown <= 0) {
                    clearInterval(countDowns[roomName].timeInterval);
                    if (rooms[roomName][0].score > rooms[roomName][1].score) {
                        console.log("owner won")
                        io.in(roomName).emit("timeOut", 0)
                    }
                    else if (rooms[roomName][0].score < rooms[roomName][1].score) {
                        console.log("challenger won");
                        io.in(roomName).emit("timeOut", 1)
                    }
                    else {
                        console.log("draw");
                        io.in(roomName).emit("timeOut", 2)
                    }
                }
                else {
                    let outputTime = msToMins(countDowns[roomName].countDown);
                    io.in(roomName).emit("countDown", outputTime);
                }
            }, 1000);
        }, 3000);
            

            
    });

    socket.on("flipCard", data => {
        const questionIndex = data.cardInfo.index;
        if (!questions[data.roomName][questionIndex].flipped){
            questions[data.roomName][questionIndex].flipped = true;
            socket.to(data.roomName).emit("hideCard", data.cardInfo);
            socket.emit("confirmFlip", questionIndex);
        }
    });

    socket.on("checkAnswer", data => {

        const selectedAnswer = data.answer;
        const correctAnswer = questions[data.roomName][data.questionInfo.index].correct_answer;
        const scoreMap = {
            easy: 100,
            medium: 200,
            hard: 300
        }
        const reward = scoreMap[data.questionInfo.difficulty];
        if (selectedAnswer == correctAnswer) {

            for (let i = 0; i < rooms[data.roomName].length; i++) {
                const user = rooms[data.roomName][i];
                if (user.socketId == socket.id) {
                    user.score += reward;
                    io.in(data.roomName).emit("updateScore", {
                        score: user.score,
                        user: i
                    });
                }
            }
        }
        else {

            for (let i = 0; i < rooms[data.roomName].length; i++) {
                const user = rooms[data.roomName][i];
                if (user.socketId == socket.id) {
                    user.score -= reward;
                    io.in(data.roomName).emit("updateScore", {
                        score: user.score,
                        user: i
                    });
                }
            }
        }

        socket.emit("hideAnsweredCard", data.questionInfo.index);

        rooms[data.roomName][0].turns += 1;
        if (rooms[data.roomName][0].turns >= 9) {
            clearInterval(countDowns[data.roomName].timeInterval);
            if (rooms[data.roomName][0].score > rooms[data.roomName][1].score) {
                io.in(data.roomName).emit("gameOver", 0)
            }
            else if (rooms[data.roomName][0].score < rooms[data.roomName][1].score) {
                io.in(data.roomName).emit("gameOver", 1)
            }
            else {
                io.in(data.roomName).emit("gameOver", 2)
            }
            
        }

    })

    socket.on("rematch", roomName => {
        clearInterval(countDowns[roomName].timeInterval);
        questions[roomName] = [];
        rooms[roomName][0].score = 0;
        rooms[roomName][1].score = 0;
        io.in(roomName).emit("newGame", "a rematch is happening");
    })

    socket.on("leaveRoom", roomName => {
        for (var i = 0; i < rooms[roomName].length; i ++) {
            if (rooms[roomName][i]["socketId"] == socket.id) {
                if (i === 0) {
                    clearInterval(countDowns[roomName].timeInterval);
                    socket.to(roomName).emit("closeRoom", "room is closing");
                    socket.leave(roomName);
                    setTimeout(() => {
                        delete rooms[roomName];
                        delete questions[roomName];
                        delete countDowns[roomName];
                    }, 3000);
                }
                else {
                    clearInterval(countDowns[roomName].timeInterval);
                    io.to(roomName).emit("challengerLeft", "challenger left");
                    rooms[roomName].pop();
                    socket.leave(roomName);
                    questions[roomName] = [];
                    rooms[roomName][0].score = 0;
                }
            }
        }
    })

    socket.on("roomCloseReason", () => {
        socket.emit("kickOutReason", "Your room was closed because the owner left");
    })

    socket.on("disconnect", () => {
        for (let roomName in rooms) {
            for (var i = 0; i < rooms[roomName].length; i ++) {
                if (rooms[roomName][i]["socketId"] == socket.id) {
                    if (i === 0) {
                        clearInterval(countDowns[roomName].timeInterval);
                        socket.to(roomName).emit("closeRoom", "room is closing");
                        socket.leave(roomName);
                        setTimeout(() => {
                            delete rooms[roomName];
                            delete questions[roomName];
                            delete countDowns[roomName];
                        }, 3000);
                    }
                    else {
                        clearInterval(countDowns[roomName].timeInterval);
                        io.to(roomName).emit("challengerLeft", "challenger left");
                        rooms[roomName].pop();
                        socket.leave(roomName);
                        questions[roomName] = [];
                        rooms[roomName][0].score = 0;
                    }
                }
            }
        }
    })

    socket.on("checkIdentity", msg => {
        let result = false;
        for (let roomName in rooms) {
            for (var i = 0; i < rooms[roomName].length; i ++) {
                if (rooms[roomName][i]["socketId"] == socket.id) {
                    result = true;
                }
            }
        }
        if (!result) {
            socket.emit("sendHome", "you were accidentally disconnected");
        }
    })

    socket.on("sendHomeReason", msg => {
        socket.emit("sendHomeAnswer", "you were accidentally disconnected");
    })

})

// socket end

// utility functions

function msToMins(ms) {
    var minutes = Math.floor(ms / 60000);
    var seconds = ((ms % 60000) / 1000).toFixed(0);
    return (seconds == 60 ? (minutes+1) + ":00" : minutes + ":" + (seconds < 10 ? "0" : "") + seconds);
}

