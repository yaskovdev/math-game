const http = require('http');
const WebSocketServer = require('websocket').server;
const uuid = require('uuid/v1');

const server = http.createServer((request, response) => {
    response.writeHead(200);
    response.end('Welcome to Math Game!');
});

const CHALLENGE_RESULT = {
    CORRECT_FIRST_ANSWER: 'CORRECT_FIRST_ANSWER',
    CORRECT_LATE_ANSWER: 'CORRECT_LATE_ANSWER',
    WRONG_ANSWER: 'WRONG_ANSWER',
    NO_ANSWER: 'NO_ANSWER'
};

const webSocketServer = new WebSocketServer({httpServer: server});

let challenge = null;

const users = {};

const generateName = () => {
    const adjectives = ['Acid', 'Blue', 'Chilly', 'Dramatic', 'Elegant', 'Fancy', 'Graceful', 'Heavy', 'Illegal',
        'Jolly', 'Kind', 'Lucky', 'Macho', 'Naughty', 'Oval', 'Puffy', 'Quarrelsome', 'Rapid', 'Slow', 'Toxic',
        'Useful', 'Vulgar', 'Wise'];
    const nouns = ['Dog', 'Cat', 'Cow', 'Sheep', 'Rabbit', 'Duck', 'Hen', 'Horse', 'Pig', 'Turkey', 'Chicken', 'Donkey',
        'Goat', 'Zebra', 'Lama', 'Squirrel', 'Snail', 'Mouse', 'Chameleon', 'Deer', 'Raccoon', 'Beaver', 'Mole'];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return adjective + ' ' + noun;
};

webSocketServer.on('request', request => {
    const connection = request.accept(null, request.origin);
    const id = uuid();

    const user = {connection, score: 0, answer: null, timeOfAnswer: null};
    users[id] = user;

    connection.sendUTF(JSON.stringify({
        type: 'WELCOME',
        user: {id, name: generateName()}
    }));

    connection.on('message', message => {
        if (message.type === 'utf8') {
            console.log('Message received', message);
            const {utf8Data} = message;
            user.answer = utf8Data.trim() === 'true';
            user.timeOfAnswer = Date.now();
        }
    });

    connection.on('close', () => {
        delete users[id];
        console.log('User ' + id + " disconnected");
    });
});

const challengeResult = (userGaveAnswer, userWasRight) => {
    if (userGaveAnswer) {
        return userWasRight ? CHALLENGE_RESULT.CORRECT_FIRST_ANSWER : CHALLENGE_RESULT.WRONG_ANSWER;
    } else {
        return CHALLENGE_RESULT.NO_ANSWER;
    }
};

setInterval(() => {
    if (challenge) {
        Object.keys(users).forEach(id => {
            const {connection, score, answer, timeOfAnswer} = users[id];
            const userGaveAnswer = answer !== null;
            const userWasRight = answer === (challenge.answer === challenge.correctAnswer);
            if (userGaveAnswer) {
                users[id].score = userWasRight ? score + 1 : score - 1;
            }
            users[id].answer = null;
            users[id].timeOfAnswer = null;
            connection.sendUTF(JSON.stringify({
                type: 'END_ROUND',
                score: users[id].score,
                result: challengeResult(userGaveAnswer, userWasRight)
            }));
        });
        challenge = null;
    } else {
        const a = Math.floor(Math.random() * 10);
        const b = Math.floor(Math.random() * 10);
        challenge = {question: `${a} + ${b}`, answer: a + b, correctAnswer: a + b};
        Object.keys(users).forEach(id => {
            const {connection, score} = users[id];
            connection.sendUTF(JSON.stringify({
                type: 'START_ROUND',
                challenge: {question: challenge.question, answer: challenge.answer},
                numberOfUsers: Object.keys(users).length
            }));
        });
    }
}, 5000);

server.listen(8080);

console.log('Server started');
