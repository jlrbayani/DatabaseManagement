import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import {expect, use} from "chai";
import chaiAsPromised from "chai-as-promised";
import {clearDisk, getContentFromArchives} from "../TestUtil";
import * as fs from "fs-extra";

import {folderTest} from "@ubccpsc310/folder-test";
import {describe, it} from "mocha";
import common from "mocha/lib/interfaces/common";

use(chaiAsPromised);

describe("InsightFacade", function () {
	let insightFacade: InsightFacade;

	const persistDir = "./data";
	const datasetContents = new Map<string, string>();

	// Reference any datasets you've added to test/resources/archives here and they will
	// automatically be loaded in the 'before' hook.
	const datasetsToLoad: {[key: string]: string} = {
		courses: "./test/resources/archives/courses.zip",
		rooms: "./test/resources/archives/rooms.zip",
	};

	before(function () {
		// This section runs once and loads all datasets specified in the datasetsToLoad object
		for (const key of Object.keys(datasetsToLoad)) {
			const content = fs.readFileSync(datasetsToLoad[key]).toString("base64");
			datasetContents.set(key, content);
		}
		// Just in case there is anything hanging around from a previous run
		fs.removeSync(persistDir);
	});

	describe("Add/Remove/List Dataset", function () {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);
		});

		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			console.info(`BeforeTest: ${this.currentTest?.title}`);
			insightFacade = new InsightFacade();
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
		});

		afterEach(function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent from the previous one
			console.info(`AfterTest: ${this.currentTest?.title}`);
			fs.removeSync(persistDir);
		});

		// This is a unit test. You should create more like this!
		it("Should add a valid dataset", function () {
			const id: string = "courses";
			const content: string = datasetContents.get("courses") ?? "";
			const expected: string[] = [id];
			return insightFacade.addDataset(id, content, InsightDatasetKind.Courses).then((result: string[]) => {
				expect(result).to.deep.equal(expected);
			});
		});
	});

	/*
	 * This test suite dynamically generates tests from the JSON files in test/queries.
	 * You should not need to modify it; instead, add additional files to the queries directory.
	 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
	 */
	describe("PerformQuery", () => {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);

			insightFacade = new InsightFacade();

			// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises = [
				insightFacade.addDataset("courses", datasetContents.get("courses") ?? "", InsightDatasetKind.Courses),
				insightFacade.addDataset("rooms", datasetContents.get("rooms") ?? "", InsightDatasetKind.Rooms),
			];

			return Promise.all(loadDatasetPromises);
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
			fs.removeSync(persistDir);
		});

		type PQErrorKind = "ResultTooLargeError" | "InsightError";

		folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
			"Dynamic InsightFacade PerformQuery tests",
			(input) => insightFacade.performQuery(input),
			"./test/resources/queries",
			{
				assertOnResult: (actual: any, expected: InsightResult[]) => {
					expect(actual).to.deep.members(expected);
				},
				errorValidator: (error): error is PQErrorKind =>
					error === "ResultTooLargeError" || error === "InsightError",
				assertOnError(actual, expected) {
					if (expected === "ResultTooLargeError") {
						expect(actual).to.be.instanceof(ResultTooLargeError);
					} else {
						expect(actual).to.be.instanceof(InsightError);
					}
				},
			}
		);
	});
});

describe("InsightFacadeTestsSh", function () {
	let courses: string;
	let rooms: string;
	let test: string;

	before(function () {
		courses = getContentFromArchives("courses.zip");
		test = getContentFromArchives("courses.zip");
		rooms = getContentFromArchives("rooms.zip");
		clearDisk();
	});

	describe("List Datasets", function () {
		let facade: IInsightFacade;

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it("Should list no datasets", function () {
			return facade.listDatasets().then((insightDatasets) => {
				expect(insightDatasets).to.deep.equal([]);
			});
		});

		it("Should list one datasets", async function () {
			await facade.addDataset("courses", courses, InsightDatasetKind.Courses);
			const insightDatasets = await facade.listDatasets();
			expect(insightDatasets).to.deep.equal([
				{
					id: "courses",
					kind: InsightDatasetKind.Courses,
					numRows: 64612,
				},
			]);
			expect(insightDatasets).to.be.an.instanceof(Array);
			expect(insightDatasets).to.have.length(1);
		});

		it("Should list multiple datasets", function () {
			return facade
				.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then(() => {
					return facade.addDataset("courses1", courses, InsightDatasetKind.Courses);
				})
				.then(() => {
					return facade.listDatasets();
				})
				.then((insightDatasets) => {
					const expectedCourses: InsightDataset[] = [
						{
							id: "courses",
							kind: InsightDatasetKind.Courses,
							numRows: 64612,
						},
						{
							id: "courses1",
							kind: InsightDatasetKind.Courses,
							numRows: 64612,
						},
					];
					expect(insightDatasets).to.have.deep.members(expectedCourses);
					expect(insightDatasets).to.be.an.instanceof(Array);
					expect(insightDatasets).to.have.length(2);
				});
		});

		it("Should list multiple datasets with rooms", function () {
			return facade
				.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then(() => {
					return facade.addDataset("courses1", courses, InsightDatasetKind.Courses);
				})
				.then(() => {
					return facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
				})
				.then(() => {
					return facade.listDatasets();
				})
				.then((insightDatasets) => {
					const expectedCourses: InsightDataset[] = [
						{
							id: "courses",
							kind: InsightDatasetKind.Courses,
							numRows: 64612,
						},
						{
							id: "courses1",
							kind: InsightDatasetKind.Courses,
							numRows: 64612,
						},
						{
							id: "rooms",
							kind: InsightDatasetKind.Rooms,
							numRows: 364,
						},
					];
					expect(insightDatasets).to.have.deep.members(expectedCourses);
					expect(insightDatasets).to.be.an.instanceof(Array);
					expect(insightDatasets).to.have.length(3);
				});
		});
	});

	describe("Add dataset", function () {
		let facade: IInsightFacade;

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it("Should add the small data set", async function () {
			let smallCourses = getContentFromArchives("courses3.zip");
			const result = await facade.addDataset("courses3", smallCourses, InsightDatasetKind.Courses);
			expect(result).to.deep.equal(["courses3"]);
		});

		it("Should add the data set and return and string of added IDs", async function () {
			const result = await facade.addDataset("courses", courses, InsightDatasetKind.Courses);
			expect(result).to.deep.equal(["courses"]);
		});

		it("Should add two data set and return and string of added IDs", async function () {
			const result = await facade.addDataset("courses", courses, InsightDatasetKind.Courses);
			const result1 = await facade.addDataset("courses2", courses, InsightDatasetKind.Courses);
			expect(result1).to.deep.equal(["courses", "courses2"]);
		});

		// This test might have a problem.
		it("Should add two data set and return and string of added IDs without await", function () {
			const result = facade.addDataset("courses", courses, InsightDatasetKind.Courses).then(() => {
				return facade.addDataset("courses2", courses, InsightDatasetKind.Courses);
			});
			return expect(result).eventually.to.deep.equal(["courses", "courses2"]);
		});

		// This test might have a problem. (probably not)
		it("Should not add data set with invalid content", function () {
			// const result = facade.addDataset("courses1", courses, InsightDatasetKind.Courses);
			const err = facade.addDataset("courses", "invalidContent", InsightDatasetKind.Courses);
			return expect(err).to.eventually.be.rejectedWith(InsightError);
		});

		it("Should not add the same data twice", function () {
			return facade.addDataset("courses", courses, InsightDatasetKind.Courses).then(() => {
				const err = facade.addDataset("courses", courses, InsightDatasetKind.Courses);
				return expect(err).to.eventually.be.rejectedWith(InsightError);
			});
		});

		it("Should not add with invalid ID for underscore", function () {
			const err = facade.addDataset("courses_invalid", courses, InsightDatasetKind.Courses);
			return expect(err).to.eventually.be.rejectedWith(InsightError);
		});

		it("Should not add with invalid ID for space", function () {
			const err = facade.addDataset("  ", courses, InsightDatasetKind.Courses);
			return expect(err).to.eventually.be.rejectedWith(InsightError);
		});
	});

	describe("Add dataset, adding room", function () {
		let facade: IInsightFacade;

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it("Should add the small data set for course", async function () {
			let smallCourses = getContentFromArchives("courses3.zip");
			const result = await facade.addDataset("courses3", smallCourses, InsightDatasetKind.Courses);
			return expect(result).to.deep.equal(["courses3"]);
		});

		it("Should add the room data set", function () {
			let result = facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
			return expect(result).eventually.to.deep.equal(["rooms"]);
		});

		// This test might have a problem
		it("Should add two course data set and a room and return and string of added IDs", function () {
			const result = facade
				.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then(() => {
					return facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
				})
				.then(() => {
					return facade.addDataset("courses2", courses, InsightDatasetKind.Courses);
				});
			return result.then((res) => {
				return expect(res).to.deep.equal(["courses", "rooms", "courses2"]);
			});
		});
	});

	describe("Remove dataset", function () {
		let facade: IInsightFacade;

		beforeEach(function () {
			clearDisk();
			facade = new InsightFacade();
		});

		it("Should remove the added dataset correctly", function () {
			let result = facade
				.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then(() => {
					return facade.removeDataset("courses");
				})
				.then(() => {
					return facade.listDatasets();
				});
			return result.then((insightDatasets) => {
				expect(insightDatasets).to.deep.equal([]);
			});
		});

		it("Should remove the added dataset correctly without async", function () {
			let removedID = facade.addDataset("courses", courses, InsightDatasetKind.Courses).then((result) => {
				return facade.removeDataset("courses");
			});
			return removedID.then(() => {
				facade.listDatasets().then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal([]);
				});
			});
		});

		it("Should remove one of the added datasets correctly, assert by removed ID", function () {
			return facade
				.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then((result) => {
					return facade.addDataset("courses2", courses, InsightDatasetKind.Courses);
				})
				.then((result2) => {
					return facade.removeDataset("courses");
				})
				.then((removedID) => {
					return expect(removedID).equal("courses");
				});
		});

		it("Should remove one of the added datasets correctly, assert by listing", function () {
			return facade
				.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then((result) => {
					return facade.addDataset("courses2", courses, InsightDatasetKind.Courses);
				})
				.then((result2) => {
					return facade.removeDataset("courses");
				})
				.then((removedID) => {
					return facade.listDatasets().then((insightDatasets) => {
						expect(insightDatasets).to.deep.equal([
							{
								id: "courses2",
								kind: InsightDatasetKind.Courses,
								numRows: 64612,
							},
						]);
					});
				});
		});

		it("Should remove room dataset of the added datasets correctly, assert by removed ID", function () {
			return facade
				.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then((result) => {
					return facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
				})
				.then((result2) => {
					return facade.removeDataset("rooms");
				})
				.then((removedID) => {
					return expect(removedID).equal("rooms");
				});
		});

		it("Should remove room dataset of the added datasets correctly, assert by listing", function () {
			return facade
				.addDataset("courses", courses, InsightDatasetKind.Courses)
				.then((result) => {
					return facade.addDataset("rooms", rooms, InsightDatasetKind.Rooms);
				})
				.then((result2) => {
					return facade.removeDataset("rooms");
				})
				.then((removedID) => {
					return facade.listDatasets().then((insightDatasets) => {
						expect(insightDatasets).to.deep.equal([
							{
								id: "courses",
								kind: InsightDatasetKind.Courses,
								numRows: 64612,
							},
						]);
					});
				});
		});

		it("Should reject remove with not found error", function () {
			const err = facade.removeDataset("courses");
			return expect(err).to.eventually.be.rejectedWith(NotFoundError);
		});

		it("Should reject remove with invalid id for underscore", function () {
			const err = facade.removeDataset("courses_invalid");
			return expect(err).to.eventually.be.rejectedWith(InsightError);
		});

		it("Should reject remove with invalid id for space", function () {
			const err = facade.removeDataset("  ");
			return expect(err).to.eventually.be.rejectedWith(InsightError);
		});
	});

	type Input = unknown;
	type Output = Promise<InsightResult[]>;
	type Error = "ResultTooLargeError" | "InsightError";

	describe("Perform Query folder tests", function () {
		let facade: IInsightFacade;

		before(function () {
			clearDisk();
			facade = new InsightFacade();
			return facade
				.addDataset("rooms", rooms, InsightDatasetKind.Rooms)
				.then(() => {
					return facade.addDataset("test", test, InsightDatasetKind.Courses);
				})
				.then(() => {
					return facade.addDataset("courses", courses, InsightDatasetKind.Courses);
				})
				.catch(() => expect.fail("UNEXPECTED ERROR"));
		});

		folderTest<Input, Output, Error>(
			"Perform Query",
			(input: Input): Output => {
				return facade.performQuery(input);
			},
			"./test/resources/queries",
			{
				assertOnResult: (actual: any, expected: InsightResult[]) => {
					expect(actual).to.deep.members(expected);
				},
				errorValidator: (error): error is Error => error === "InsightError" || error === "ResultTooLargeError",
				assertOnError: (actual, expected) => {
					if (expected === "ResultTooLargeError") {
						expect(actual).to.be.instanceof(ResultTooLargeError);
					} else if (expected === "InsightError") {
						expect(actual).to.be.instanceof(InsightError);
					} else {
						expect.fail("UNEXPECTED ERROR");
					}
				},
			}
		);
	});
});
