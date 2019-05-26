const express = require('express');
var cors = require('cors')
const app = express();
const runScript = require('./helpers/run-script');

app.use(cors());

// CONEXÃO - TODO: MOVER CREDENCIAIS DO ARQUIVO PARA .env

const mySQL_host = 'daviparanagua.com.br';
const mySQL_user = 'intuitive';
const mySQL_pass = 'LEM3hi2ij3Y4';
const mySQL_database = 'intuitive';

const pool = require('./helpers/database').connect(mySQL_host, mySQL_user, mySQL_pass, mySQL_database);

// respond with "hello world" when a GET request is made to the homepage
app.get('/', function(req, res) {
  res.send('Bem-vindo!');
});

app.get('/q31', function(req, res) {
    pool.getConnection(function(err, connection) {
        runScript(connection, 'quadro31').then( (pid) => {
            res.json({ pid, status: 'OK'});
            connection.release();
        });
    });
});

app.get('/logs', function(req, res) {
    pool.getConnection(function(err, connection) {
        connection.query('SELECT * FROM runs ORDER BY started DESC LIMIT 100', function (error, results, fields) {
            res.json(results);
        });
        connection.release();
    });
});

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

app.listen(3000, function () {
    console.log('Aberto na porta 3000');
});
