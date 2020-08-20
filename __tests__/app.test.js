require('dotenv').config();

const { execSync } = require('child_process');

const fakeRequest = require('supertest');
const app = require('../lib/app');
const client = require('../lib/client');

describe('app routes', () => {
  const helga = {
    name: 'Helga G. Pataki',
    image: 'https://vignette.wikia.nocookie.net/heyarnold/images/e/e5/Helga_Pataki.png/revision/latest/scale-to-width-down/266?cb=20190816021807'
  };

  let token;

  beforeAll(async done => {
    execSync('npm run setup-db');

    client.connect();

    const signInData = await fakeRequest(app)
      .post('/auth/signup')
      .send({
        email: 'jon@user.com',
        password: '1234'
      });
    
    token = signInData.body.token;

    return done();
  });

  afterAll(done => {
    return client.end(done);
  });

  test('returns search results from hey arnold api', async(done) => {
    const expectation = [
      {
        '_id': '5da237699734fdcb7bef8f63',
        'name': 'Helga G. Pataki',
        'image': 'https://vignette.wikia.nocookie.net/heyarnold/images/e/e5/Helga_Pataki.png/revision/latest/scale-to-width-down/266?cb=20190816021807'
      },
      {
        '_id': '5da237699734fdcb7bef8f8b',
        'name': 'Shelley',
        'image': 'https://vignette.wikia.nocookie.net/heyarnold/images/c/cb/Shelley.jpg/revision/latest/scale-to-width-down/310?cb=20120527025256'
      },
      {
        '_id': '5da237699734fdcb7bef902e',
        'name': 'Helga\'s Parrot (bird)',
        'image': 'https://vignette.wikia.nocookie.net/heyarnold/images/f/f1/Helga%27s_parrot%2C_bird.jpg/revision/latest/scale-to-width-down/310?cb=20100307071524'
      },
      {
        '_id': '5da237699734fdcb7bef8fb8',
        'name': 'Shelley',
        'image': 'https://vignette.wikia.nocookie.net/heyarnold/images/c/cb/Shelley.jpg/revision/latest/scale-to-width-down/310?cb=20120527025256'
      }
    ];

    const data = await fakeRequest(app)
      .get('/search?searchQuery=hel')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(data.body).toEqual(expectation);

    done();
  });


  test('creates a new favorite on POST', async(done) => {
    const expectation = {
      ...helga,
      id: 4,
      user_id: 2
    };

    const data = await fakeRequest(app)
      .post('/api/favorites')
      .set('Authorization', token)
      .send(helga)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(data.body).toEqual(expectation);

    done();
  });

  test('gets all favorites for a user on GET', async(done) => {
    const expectation = [{
      ...helga,
      id: 4,
      user_id: 2
    }];

    const data = await fakeRequest(app)
      .get('/api/favorites')
      .set('Authorization', token)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(data.body).toEqual(expectation);

    done();
  });

  test('deletes a favorite on DELETE', async(done) => {
    const expectation = [];

    await fakeRequest(app)
      .delete('/api/favorites/4')
      .set('Authorization', token)
      .expect('Content-Type', /json/)
      .expect(200);

    const data = await fakeRequest(app)
      .get('/api/favorites')
      .set('Authorization', token)
      .expect('Content-Type', /json/)
      .expect(200);

    // when i fetch all favorites for this user, i expect it now to be empty
    expect(data.body).toEqual(expectation);

    done();
  });
});
