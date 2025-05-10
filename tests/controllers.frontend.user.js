const app = require('../index');
const {assert} = require('chai');
const request = require('supertest');

describe('controllers/api/v1/frontend/user', () => {
    it('should return hello world', async() => {
        const response = await request(app)
        .get('/api/v1/frontend/user')
        .expect(200);

        assert.equal(response.body.message, 'Hello World');
        
    })
})