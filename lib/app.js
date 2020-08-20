const express = require('express');
const cors = require('cors');
const client = require('./client.js');
const app = express();
const request = require('superagent');
const ensureAuth = require('./auth/ensure-auth');
const createAuthRoutes = require('./auth/create-auth-routes');
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const authRoutes = createAuthRoutes();

// setup authentication routes to give user an auth token
// creates a /auth/signin and a /auth/signup POST route. 
// each requires a POST body with a .email and a .password
app.use('/auth', authRoutes);

// everything that starts with "/api" below here requires an auth token!
app.use('/api', ensureAuth);

// and now every request that has a token in the Authorization header will have a `req.userId` property for us to see who's talking
app.get('/api/test', (req, res) => {
  res.json({
    message: `in this proctected route, we get the user's id like so: ${req.userId}`
  });
});

app.get('/search', async(req, res) => {
  const charactersData = await request.get(`https://hey-arnold-api.herokuapp.com/api/v1/characters?name=${req.query.searchQuery}`);

  res.json(charactersData.body);
});

app.post('/api/favorites', async(req, res) => {
  // insert the new favorite into the favorites table
  try {
    const data = await client.query(`
      INSERT INTO favorites(name, image, user_id)
      VALUES($1, $2, $3)
      RETURNING *
    `, [req.body.name, req.body.image, req.userId]);
  
    // respond with the new favorite
    res.json(data.rows[0]);
  } catch(e) {
    res.status(500).json({ error: e.message });    
  }
});

app.get('/api/favorites', async(req, res) => {
  // get the favorites from the favorites table for THIS USER
  try {
    const data = await client.query(`
      SELECT * FROM favorites
      WHERE favorites.user_id = $1
      `, [req.userId]);
  
    // respond with all favorites
    res.json(data.rows);
  } catch(e) {
    res.status(500).json({ error: e.message });    
  }
});


app.delete('/api/favorites/:id', async(req, res) => {
  const favoriteToDelete = req.params.id;
  // get the favorites from the favorites table for THIS USER

  try {
    await client.query(`
      DELETE FROM favorites
      WHERE favorites.id=$1
    `, [favoriteToDelete]);
  
    // respond with all favorites
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: e.message });    
  }
});

app.use(require('./middleware/error'));

module.exports = app;
