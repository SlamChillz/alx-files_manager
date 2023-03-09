import chai from 'chai';
import chaiHttp from 'chai-http';

chai.use(chaiHttp);

describe('GET /status', () => {
    it('GET /status exists', (done) => {
        chai.request('http://localhost:5000')
            .get('/status')
            .end((err, res) => {
                chai.expect(err).to.be.null;
                chai.expect(res).to.have.status(200);
                const bodyJson = res.body;
                chai.expect(bodyJson.redis).to.be.true;
                chai.expect(bodyJson.db).to.be.true;
                done();
            });
    }).timeout(30000);
});