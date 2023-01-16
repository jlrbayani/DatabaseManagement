import Server from "../../src/rest/Server";
import InsightFacade from "../../src/controller/InsightFacade";
import {expect, use, request} from "chai";
import chaiHttp from "chai-http";

import {clearDisk, getContentFromArchivesRaw} from "../TestUtil";

describe("Facade C3", function () {
	let facade: InsightFacade;
	let server: Server;

	const SERVER_URL: string = "http://localhost:4321";
	let ENDPOINT_URL: string;
	let ZIP_FILE_DATA: Buffer;

	use(chaiHttp);

	before(function () {
		ZIP_FILE_DATA = getContentFromArchivesRaw("courses.zip");
		facade = new InsightFacade();
		server = new Server(4321);
		// TODO: start server here once and handle errors properly
		return server.start().then(() => {
			console.info("App::initServer() - started");
		}).catch((err: Error) => {
			console.error(`App::initServer() - ERROR: ${err.message}`);
		});
	});

	after(function () {
		// TODO: stop server here once!
		return server.stop().then(() => {
			console.info("App::stopServer() - stopped");
		}).catch((err: Error) => {
			console.error(`App::stopServer() - ERROR: ${err.message}`);
		});
	});

	beforeEach(function () {
		// might want to add some process logging here to keep track of what"s going on
	});

	afterEach(function () {
		// might want to add some process logging here to keep track of what"s going on
	});

	// Sample on how to format PUT requests
	it("PUT test for courses dataset", function () {
		let datasetID = "course";
		ENDPOINT_URL = "/dataset/" + datasetID + "/courses";
		try {
			return request(SERVER_URL)
				.put(ENDPOINT_URL)
				.send(ZIP_FILE_DATA)
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: ChaiHttp.Response) {
					// some logging here please!
					console.log("In the then", res.status, res.body);
					expect(res.status).to.be.equal(200);
					expect(res.body.result).to.be.deep.equal([datasetID]);
				})
				.catch(function (err) {
					// some logging here please!
					console.log("In the catch", err);
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
			console.log("Error for request", err);
		}
	});

	it("PUT test for courses dataset, add dataset id twice", function () {
		ENDPOINT_URL = "/dataset/course/courses";
		try {
			return request(SERVER_URL)
				.put(ENDPOINT_URL)
				.send(ZIP_FILE_DATA)
				.set("Content-Type", "application/x-zip-compressed")
				.then(() => {
					return request(SERVER_URL)
						.put(ENDPOINT_URL)
						.send(ZIP_FILE_DATA)
						.set("Content-Type", "application/x-zip-compressed")
						.then(function (res: ChaiHttp.Response) {
							// some logging here please!
							console.log("In the then", res.status, res.body);
							expect(res.status).to.be.equal(400);
						})
						.catch(function (err) {
							// some logging here please!
							console.log("In the catch", err);
							expect.fail();
						});
				});
		} catch (err) {
			// and some more logging here!
			console.log("Error for request", err);
		}
	});

	// The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation

	it("Test echo", function () {
		ENDPOINT_URL = "/echo/";
		let msg = "CPSC";
		try {
			return request(SERVER_URL)
				.get(ENDPOINT_URL + msg)
				.then(function (res: ChaiHttp.Response) {
					// some logging here please!
					expect(res.status).to.be.equal(200);
					expect(res.body.result).to.be.equal(msg + "..." + msg);
				})
				.catch(function (err) {
					// some logging here please!
					console.log("In the catch", err);
					expect.fail();
				});
		} catch (err) {
			// and some more logging here!
			console.log("Error for request", err);
		}
	});
});
