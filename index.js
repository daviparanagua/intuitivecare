const express = require('express');
const app = express();
const runScript = require('./helpers/run-script');

// CONEXÃO - TODO: MOVER CREDENCIAIS DO ARQUIVO PARA .env

const mySQL_host = 'daviparanagua.com.br';
const mySQL_user = 'intuitive';
const mySQL_pass = 'LEM3hi2ij3Y4';
const mySQL_database = 'intuitive';

const pool = require('./helpers/database').connect(mySQL_host, mySQL_user, mySQL_pass, mySQL_database);

// respond with "hello world" when a GET request is made to the homepage
app.get('/', function(req, res) {
  res.send('Servidor está ativo');
});

app.get('/q31', function(req, res) {
    pool.getConnection(function(err, connection) {
        runScript(connection, 'quadro31').then( () => res.send('Dados Enviados'));
    });
});

app.listen(3000, function () {
    console.log('Aberto na porta 3000');
});
