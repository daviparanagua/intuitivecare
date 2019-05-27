const express = require('express');
const cors = require('cors')
const fs = require('fs')
const app = express();
const runScript = require('./helpers/run-script');
const https = require('https')
require('dotenv').config()

app.use(cors());

const truePort = 3000;

// SSL

const privateKey = fs.readFileSync(process.env.SSL_PRIVATE_KEY, 'utf8')
const certificate = fs.readFileSync(process.env.SSL_CERTIFICATE, 'utf8')
const ca = fs.readFileSync(process.env.SSL_CA, 'utf8')

credentials = {
    key: privateKey,
    cert: certificate,
    ca: ca
}

// CONEXÃO

const mySQL_host = process.env.mySQL_host;
const mySQL_user = process.env.mySQL_user;
const mySQL_pass = process.env.mySQL_pass;
const mySQL_database = process.env.mySQL_database;

const pool = require('./helpers/database').connect(mySQL_host, mySQL_user, mySQL_pass, mySQL_database);

// Home
app.get('/', function(req, res) {
  res.send('Bem-vindo!');
});


// Script q31 - TODO: Unificar rota de scripts
app.post('/q31', function(req, res) {
    pool.getConnection(function(err, connection) {
        runScript(connection, 'quadro31').then( (pid) => {
            res.json({ pid, script:'quadro31', status: 'OK'});
            connection.release();
        });
    });
});

// Script s31 - TODO: Unificar rota de scripts
app.post('/s31', function(req, res) {
    pool.getConnection(function(err, connection) {
        runScript(connection, 'sabotar31').then( (pid) => {
            res.json({ pid, script: 'sabotar31', status: 'OK'});
            connection.release();
        });
    });
});

// Obtém dados da tabela
app.get('/q31', function(req, res) {
    pool.getConnection(function(err, connection) {
        connection.query('SELECT * FROM quadro31', function (error, results, fields) {
            res.json(results);
        });
        connection.release();
    });
});

// Obtém logs
app.get('/logs', function(req, res) {
    pool.getConnection(function(err, connection) {
        connection.query('SELECT * FROM runs ORDER BY started DESC LIMIT 100', function (error, results, fields) {
            res.json(results);
        });
        connection.release();
    });
});

// Obtém status
app.get('/status', function(req, res) {
    pool.getConnection(function(err, connection) {
        connection.query('SELECT "OK" as status', function (error, results, fields) {
            res.send({
                server: 'OK',
                database: results[0].status
            });
        } );
        connection.release();
    });
});

// Start true server
const trueServer = https.createServer(credentials, app);

trueServer.listen(truePort, () => {
  console.log(`App Server running on port ${truePort}`)
})