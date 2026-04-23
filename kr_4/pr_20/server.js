const mongoose = require('mongoose');
const express = require('express');
const app = express();

app.use(express.json());

const mongoURI = 'mongodb://Admin:1234@localhost:27017/databaseforfibr?authSource=admin';
mongoose.connect(mongoURI)
    .then(() => console.log('Успешно подключен к бд'))
    .catch(err => console.error('Ошибка подключения:', err));

// схема и модель для пользователей
const userSchema = new mongoose.Schema({
    id: { type: Number, unique: true, required: true },
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    age: { type: Number },

    created_at: { type: Number, default: () => Math.floor(Date.now() / 1000) },
    updated_at: { type: Number, default: () => Math.floor(Date.now() / 1000) }
});

const User = mongoose.model('User', userSchema);

app.post('/api/users', async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).send(user);
    } catch (err) {
        res.status(400).send(err.message);
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find();
        res.send(users);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.get('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findOne({ id: req.params.id });
        if (!user) return res.status(404).send('User not found');
        res.send(user);
    } catch (err) {
        res.status(400).send(err.message);
    }
});

app.patch('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findOneAndUpdate(
            { id: req.params.id }, 
            { ...req.body, updated_at: Math.floor(Date.now() / 1000) }, 
            { new: true }
        );
        if (!user) return res.status(404).send('User not found');
        res.send(user);
    } catch (err) {
        res.status(400).send(err.message);
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const user = await User.findOneAndDelete({ id: req.params.id });
        if (!user) return res.status(404).send('User not found');
        res.send({ message: 'User deleted', user });
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});