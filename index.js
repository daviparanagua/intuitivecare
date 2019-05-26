const express = require('express');
const app = express();

// respond with "hello world" when a GET request is made to the homepage
app.get('/', function(req, res) {
  res.send('Servidor está ativo');
});

app.get('/q31', function(req, res) {
    require('./quadro31')(() => {
        res.send('Dados enviados');
    });
});

app.listen(3000, function () {
    console.log('Aberto na porta 3000');
});
