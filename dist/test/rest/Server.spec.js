"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Server_1 = __importDefault(require("../../src/rest/Server"));
const InsightFacade_1 = __importDefault(require("../../src/controller/InsightFacade"));
const chai_1 = require("chai");
const chai_http_1 = __importDefault(require("chai-http"));
const TestUtil_1 = require("../TestUtil");
describe("Facade C3", function () {
    let facade;
    let server;
    const SERVER_URL = "http://localhost:4321";
    let ENDPOINT_URL;
    let ZIP_FILE_DATA;
    (0, chai_1.use)(chai_http_1.default);
    before(function () {
        ZIP_FILE_DATA = (0, TestUtil_1.getContentFromArchivesRaw)("courses.zip");
        facade = new InsightFacade_1.default();
        server = new Server_1.default(4321);
        return server.start().then(() => {
            console.info("App::initServer() - started");
        }).catch((err) => {
            console.error(`App::initServer() - ERROR: ${err.message}`);
        });
    });
    after(function () {
        return server.stop().then(() => {
            console.info("App::stopServer() - stopped");
        }).catch((err) => {
            console.error(`App::stopServer() - ERROR: ${err.message}`);
        });
    });
    beforeEach(function () {
    });
    afterEach(function () {
    });
    it("PUT test for courses dataset", function () {
        let datasetID = "course";
        ENDPOINT_URL = "/dataset/" + datasetID + "/courses";
        try {
            return (0, chai_1.request)(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(function (res) {
                console.log("In the then", res.status, res.body);
                (0, chai_1.expect)(res.status).to.be.equal(200);
                (0, chai_1.expect)(res.body.result).to.be.deep.equal([datasetID]);
            })
                .catch(function (err) {
                console.log("In the catch", err);
                chai_1.expect.fail();
            });
        }
        catch (err) {
            console.log("Error for request", err);
        }
    });
    it("PUT test for courses dataset, add dataset id twice", function () {
        ENDPOINT_URL = "/dataset/course/courses";
        try {
            return (0, chai_1.request)(SERVER_URL)
                .put(ENDPOINT_URL)
                .send(ZIP_FILE_DATA)
                .set("Content-Type", "application/x-zip-compressed")
                .then(() => {
                return (0, chai_1.request)(SERVER_URL)
                    .put(ENDPOINT_URL)
                    .send(ZIP_FILE_DATA)
                    .set("Content-Type", "application/x-zip-compressed")
                    .then(function (res) {
                    console.log("In the then", res.status, res.body);
                    (0, chai_1.expect)(res.status).to.be.equal(400);
                })
                    .catch(function (err) {
                    console.log("In the catch", err);
                    chai_1.expect.fail();
                });
            });
        }
        catch (err) {
            console.log("Error for request", err);
        }
    });
    it("Test echo", function () {
        ENDPOINT_URL = "/echo/";
        let msg = "CPSC";
        try {
            return (0, chai_1.request)(SERVER_URL)
                .get(ENDPOINT_URL + msg)
                .then(function (res) {
                (0, chai_1.expect)(res.status).to.be.equal(200);
                (0, chai_1.expect)(res.body.result).to.be.equal(msg + "..." + msg);
            })
                .catch(function (err) {
                console.log("In the catch", err);
                chai_1.expect.fail();
            });
        }
        catch (err) {
            console.log("Error for request", err);
        }
    });
});
//# sourceMappingURL=Server.spec.js.map