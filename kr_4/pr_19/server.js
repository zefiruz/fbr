const { Pool } = require('pg');
const express = require('express');
const app = express();
const { Sequelize, DataTypes } = require('sequelize');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'fbrdb',
    password: '12345678',
    port: '5434',
})

const sequelize = new Sequelize('fbrdb', 'postgres', '12345678', {
    host: 'localhost',
    port: 5434,
    dialect: 'postgres'
});

// модель юзер
const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    first_name: { type: DataTypes.STRING },
    last_name: { type: DataTypes.STRING },
    age: { type: DataTypes.INTEGER }
});

app.use(express.json());

app.post('/api/users', async (req, res) => {
    try {
        const user = await User.create(req.body);
        res.status(201).send(user);
    } catch (err) {
        res.status(400).send(err.message);
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await User.findAll();
        res.send(users);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        res.send(user);
    } catch (err) {
        res.status(400).send(err.message);
    }
});

app.patch('/api/users/:id', async (req, res) => {
    try {
        const user = await User.update(req.body, {
            where: { id: req.params.id },
            returning: true,
        });
        res.send(user);
    } catch (err) {
        res.status(400).send(err.message);
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await User.destroy({ where: { id: req.params.id } });
        res.send({ message: 'User deleted' });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

sequelize.authenticate()
    .then(() => console.log('Успешно подключен к бд'))
    .then(sequelize.sync())
    .then(() => {
        app.listen(3000, () => {
            console.log('server is running on http://localhost:3000');
        });
    })
    .catch(err => console.error('Ошибка подключения бд', err));