const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors')
require('dotenv').config();
const mongoose = require('mongoose');
const { Schema, UUID } = mongoose;

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
});
const exerciseSchema = new Schema({
  username: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: false }
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(cors());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static('public'));

app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url} - ${req.ip}`);
  next();
})

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users', async (req, res) => {
  const users = await User.where({});
  res.json(users);
})

app.post('/api/users', async (req, res) => {
  console.log(req.body);
  if(req.body.username === '') return res.json({error: 'You can\'t use empty username'});

  const user = new User({ username: req.body.username });
  await user.save();
  res.json(user);
});

app.get('/api/users/:id/logs', async (req, res) => {
  try {
    const from = req.query.from;
    const to = req.query.to;
    const limit = req.query.limit;

    const user = await User.findOne({ _id: req.params.id });
  
    let exercises = Exercise.where({ username: user.username }).select('description duration date -_id');
    if(from !== undefined) exercises = exercises.where({date: { $gte: from}});
    if(to !== undefined) exercises = exercises.where({date: { $lte: to}});
    if(limit !== undefined) exercises = exercises.limit(limit);
    exercises = await exercises.exec();
    const exercisesList = [];
    exercises.forEach((exercise) => {
      exercisesList.push({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString()
      });
    });
  
    res.json({_id: user._id, username: user.username, count: exercises.length, log: exercisesList});
  } catch (error) {
    console.error(error);
    res.json({error: error});
  }
});

app.post('/api/users/:id/exercises', async (req, res) => {
  try {
    console.log(req.body);
    // res.json({body: req.body});
    const user = await User.findOne({ _id: req.params.id });
    let date = Date.parse(req.body.date);
    if (isNaN(date)) date = Date.now();
    const exercise = Exercise({username: user.username, description: req.body.description, duration: req.body.duration, date: date});
    await exercise.save();
    res.json({
      _id: req.params.id,
      username: user.username,
      date: new Date(date).toDateString(),
      duration: exercise.duration,
      description: exercise.description
    });
  } catch (error) {
    res.json({error: error});
  }
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
