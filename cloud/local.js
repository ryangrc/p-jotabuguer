require('dotenv').config();
const express=require('express'),path=require('node:path');
const {createApp}=require('./app');
require('../scripts/build');
const app=createApp();
app.use(express.static(path.join(__dirname,'../public'),{dotfiles:'deny',index:'index.html'}));
app.use((_req,res)=>res.status(404).send('Página não encontrada.'));
app.listen(Number(process.env.PORT || 8080),'127.0.0.1',()=>console.log('PJ Burguer: http://localhost:8080'));
