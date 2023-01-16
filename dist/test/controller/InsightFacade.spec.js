"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const IInsightFacade_1 = require("../../src/controller/IInsightFacade");
const InsightFacade_1 = __importDefault(require("../../src/controller/InsightFacade"));
const chai_1 = require("chai");
const chai_as_promised_1 = __importDefault(require("chai-as-promised"));
const TestUtil_1 = require("../TestUtil");
const fs = __importStar(require("fs-extra"));
const folder_test_1 = require("@ubccpsc310/folder-test");
const mocha_1 = require("mocha");
(0, chai_1.use)(chai_as_promised_1.default);
(0, mocha_1.describe)("InsightFacade", function () {
    let insightFacade;
    const persistDir = "./data";
    const datasetContents = new Map();
    const datasetsToLoad = {
        courses: "./test/resources/archives/courses.zip",
        rooms: "./test/resources/archives/rooms.zip",
    };
    before(function () {
        for (const key of Object.keys(datasetsToLoad)) {
            const content = fs.readFileSync(datasetsToLoad[key]).toString("base64");
            datasetContents.set(key, content);
        }
        fs.removeSync(persistDir);
    });
    (0, mocha_1.describe)("Add/Remove/List Dataset", function () {
        before(function () {
            console.info(`Before: ${this.test?.parent?.title}`);
        });
        beforeEach(function () {
            console.info(`BeforeTest: ${this.currentTest?.title}`);
            insightFacade = new InsightFacade_1.default();
        });
        after(function () {
            console.info(`After: ${this.test?.parent?.title}`);
        });
        afterEach(function () {
            console.info(`AfterTest: ${this.currentTest?.title}`);
            fs.removeSync(persistDir);
        });
        (0, mocha_1.it)("Should add a valid dataset", function () {
            const id = "courses";
            const content = datasetContents.get("courses") ?? "";
            const expected = [id];
            return insightFacade.addDataset(id, content, IInsightFacade_1.InsightDatasetKind.Courses).then((result) => {
                (0, chai_1.expect)(result).to.deep.equal(expected);
            });
        });
    });
    (0, mocha_1.describe)("PerformQuery", () => {
        before(function () {
            console.info(`Before: ${this.test?.parent?.title}`);
            insightFacade = new InsightFacade_1.default();
            const loadDatasetPromises = [
                insightFacade.addDataset("courses", datasetContents.get("courses") ?? "", IInsightFacade_1.InsightDatasetKind.Courses),
                insightFacade.addDataset("rooms", datasetContents.get("rooms") ?? "", IInsightFacade_1.InsightDatasetKind.Rooms),
            ];
            return Promise.all(loadDatasetPromises);
        });
        after(function () {
            console.info(`After: ${this.test?.parent?.title}`);
            fs.removeSync(persistDir);
        });
        (0, folder_test_1.folderTest)("Dynamic InsightFacade PerformQuery tests", (input) => insightFacade.performQuery(input), "./test/resources/queries", {
            assertOnResult: (actual, expected) => {
                (0, chai_1.expect)(actual).to.deep.members(expected);
            },
            errorValidator: (error) => error === "ResultTooLargeError" || error === "InsightError",
            assertOnError(actual, expected) {
                if (expected === "ResultTooLargeError") {
                    (0, chai_1.expect)(actual).to.be.instanceof(IInsightFacade_1.ResultTooLargeError);
                }
                else {
                    (0, chai_1.expect)(actual).to.be.instanceof(IInsightFacade_1.InsightError);
                }
            },
        });
    });
});
(0, mocha_1.describe)("InsightFacadeTestsSh", function () {
    let courses;
    let rooms;
    let test;
    before(function () {
        courses = (0, TestUtil_1.getContentFromArchives)("courses.zip");
        test = (0, TestUtil_1.getContentFromArchives)("courses.zip");
        rooms = (0, TestUtil_1.getContentFromArchives)("rooms.zip");
        (0, TestUtil_1.clearDisk)();
    });
    (0, mocha_1.describe)("List Datasets", function () {
        let facade;
        beforeEach(function () {
            (0, TestUtil_1.clearDisk)();
            facade = new InsightFacade_1.default();
        });
        (0, mocha_1.it)("Should list no datasets", function () {
            return facade.listDatasets().then((insightDatasets) => {
                (0, chai_1.expect)(insightDatasets).to.deep.equal([]);
            });
        });
        (0, mocha_1.it)("Should list one datasets", async function () {
            await facade.addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Courses);
            const insightDatasets = await facade.listDatasets();
            (0, chai_1.expect)(insightDatasets).to.deep.equal([
                {
                    id: "courses",
                    kind: IInsightFacade_1.InsightDatasetKind.Courses,
                    numRows: 64612,
                },
            ]);
            (0, chai_1.expect)(insightDatasets).to.be.an.instanceof(Array);
            (0, chai_1.expect)(insightDatasets).to.have.length(1);
        });
        (0, mocha_1.it)("Should list multiple datasets", function () {
            return facade
                .addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Courses)
                .then(() => {
                return facade.addDataset("courses1", courses, IInsightFacade_1.InsightDatasetKind.Courses);
            })
                .then(() => {
                return facade.listDatasets();
            })
                .then((insightDatasets) => {
                const expectedCourses = [
                    {
                        id: "courses",
                        kind: IInsightFacade_1.InsightDatasetKind.Courses,
                        numRows: 64612,
                    },
                    {
                        id: "courses1",
                        kind: IInsightFacade_1.InsightDatasetKind.Courses,
                        numRows: 64612,
                    },
                ];
                (0, chai_1.expect)(insightDatasets).to.have.deep.members(expectedCourses);
                (0, chai_1.expect)(insightDatasets).to.be.an.instanceof(Array);
                (0, chai_1.expect)(insightDatasets).to.have.length(2);
            });
        });
        (0, mocha_1.it)("Should list multiple datasets with rooms", function () {
            return facade
                .addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Courses)
                .then(() => {
                return facade.addDataset("courses1", courses, IInsightFacade_1.InsightDatasetKind.Courses);
            })
                .then(() => {
                return facade.addDataset("rooms", rooms, IInsightFacade_1.InsightDatasetKind.Rooms);
            })
                .then(() => {
                return facade.listDatasets();
            })
                .then((insightDatasets) => {
                const expectedCourses = [
                    {
                        id: "courses",
                        kind: IInsightFacade_1.InsightDatasetKind.Courses,
                        numRows: 64612,
                    },
                    {
                        id: "courses1",
                        kind: IInsightFacade_1.InsightDatasetKind.Courses,
                        numRows: 64612,
                    },
                    {
                        id: "rooms",
                        kind: IInsightFacade_1.InsightDatasetKind.Rooms,
                        numRows: 364,
                    },
                ];
                (0, chai_1.expect)(insightDatasets).to.have.deep.members(expectedCourses);
                (0, chai_1.expect)(insightDatasets).to.be.an.instanceof(Array);
                (0, chai_1.expect)(insightDatasets).to.have.length(3);
            });
        });
    });
    (0, mocha_1.describe)("Add dataset", function () {
        let facade;
        beforeEach(function () {
            (0, TestUtil_1.clearDisk)();
            facade = new InsightFacade_1.default();
        });
        (0, mocha_1.it)("Should add the small data set", async function () {
            let smallCourses = (0, TestUtil_1.getContentFromArchives)("courses3.zip");
            const result = await facade.addDataset("courses3", smallCourses, IInsightFacade_1.InsightDatasetKind.Courses);
            (0, chai_1.expect)(result).to.deep.equal(["courses3"]);
        });
        (0, mocha_1.it)("Should add the data set and return and string of added IDs", async function () {
            const result = await facade.addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Courses);
            (0, chai_1.expect)(result).to.deep.equal(["courses"]);
        });
        (0, mocha_1.it)("Should add two data set and return and string of added IDs", async function () {
            const result = await facade.addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Courses);
            const result1 = await facade.addDataset("courses2", courses, IInsightFacade_1.InsightDatasetKind.Courses);
            (0, chai_1.expect)(result1).to.deep.equal(["courses", "courses2"]);
        });
        (0, mocha_1.it)("Should add two data set and return and string of added IDs without await", function () {
            const result = facade.addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Courses).then(() => {
                return facade.addDataset("courses2", courses, IInsightFacade_1.InsightDatasetKind.Courses);
            });
            return (0, chai_1.expect)(result).eventually.to.deep.equal(["courses", "courses2"]);
        });
        (0, mocha_1.it)("Should not add data set with invalid content", function () {
            const err = facade.addDataset("courses", "invalidContent", IInsightFacade_1.InsightDatasetKind.Courses);
            return (0, chai_1.expect)(err).to.eventually.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        (0, mocha_1.it)("Should not add the same data twice", function () {
            return facade.addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Courses).then(() => {
                const err = facade.addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Courses);
                return (0, chai_1.expect)(err).to.eventually.be.rejectedWith(IInsightFacade_1.InsightError);
            });
        });
        (0, mocha_1.it)("Should not add with invalid ID for underscore", function () {
            const err = facade.addDataset("courses_invalid", courses, IInsightFacade_1.InsightDatasetKind.Courses);
            return (0, chai_1.expect)(err).to.eventually.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        (0, mocha_1.it)("Should not add with invalid ID for space", function () {
            const err = facade.addDataset("  ", courses, IInsightFacade_1.InsightDatasetKind.Courses);
            return (0, chai_1.expect)(err).to.eventually.be.rejectedWith(IInsightFacade_1.InsightError);
        });
    });
    (0, mocha_1.describe)("Add dataset, adding room", function () {
        let facade;
        beforeEach(function () {
            (0, TestUtil_1.clearDisk)();
            facade = new InsightFacade_1.default();
        });
        (0, mocha_1.it)("Should add the small data set for course", async function () {
            let smallCourses = (0, TestUtil_1.getContentFromArchives)("courses3.zip");
            const result = await facade.addDataset("courses3", smallCourses, IInsightFacade_1.InsightDatasetKind.Courses);
            return (0, chai_1.expect)(result).to.deep.equal(["courses3"]);
        });
        (0, mocha_1.it)("Should add the room data set", function () {
            let result = facade.addDataset("rooms", rooms, IInsightFacade_1.InsightDatasetKind.Rooms);
            return (0, chai_1.expect)(result).eventually.to.deep.equal(["rooms"]);
        });
        (0, mocha_1.it)("Should add two course data set and a room and return and string of added IDs", function () {
            const result = facade
                .addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Courses)
                .then(() => {
                return facade.addDataset("rooms", rooms, IInsightFacade_1.InsightDatasetKind.Rooms);
            })
                .then(() => {
                return facade.addDataset("courses2", courses, IInsightFacade_1.InsightDatasetKind.Courses);
            });
            return result.then((res) => {
                return (0, chai_1.expect)(res).to.deep.equal(["courses", "rooms", "courses2"]);
            });
        });
    });
    (0, mocha_1.describe)("Remove dataset", function () {
        let facade;
        beforeEach(function () {
            (0, TestUtil_1.clearDisk)();
            facade = new InsightFacade_1.default();
        });
        (0, mocha_1.it)("Should remove the added dataset correctly", function () {
            let result = facade
                .addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Courses)
                .then(() => {
                return facade.removeDataset("courses");
            })
                .then(() => {
                return facade.listDatasets();
            });
            return result.then((insightDatasets) => {
                (0, chai_1.expect)(insightDatasets).to.deep.equal([]);
            });
        });
        (0, mocha_1.it)("Should remove the added dataset correctly without async", function () {
            let removedID = facade.addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Courses).then((result) => {
                return facade.removeDataset("courses");
            });
            return removedID.then(() => {
                facade.listDatasets().then((insightDatasets) => {
                    (0, chai_1.expect)(insightDatasets).to.deep.equal([]);
                });
            });
        });
        (0, mocha_1.it)("Should remove one of the added datasets correctly, assert by removed ID", function () {
            return facade
                .addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Courses)
                .then((result) => {
                return facade.addDataset("courses2", courses, IInsightFacade_1.InsightDatasetKind.Courses);
            })
                .then((result2) => {
                return facade.removeDataset("courses");
            })
                .then((removedID) => {
                return (0, chai_1.expect)(removedID).equal("courses");
            });
        });
        (0, mocha_1.it)("Should remove one of the added datasets correctly, assert by listing", function () {
            return facade
                .addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Courses)
                .then((result) => {
                return facade.addDataset("courses2", courses, IInsightFacade_1.InsightDatasetKind.Courses);
            })
                .then((result2) => {
                return facade.removeDataset("courses");
            })
                .then((removedID) => {
                return facade.listDatasets().then((insightDatasets) => {
                    (0, chai_1.expect)(insightDatasets).to.deep.equal([
                        {
                            id: "courses2",
                            kind: IInsightFacade_1.InsightDatasetKind.Courses,
                            numRows: 64612,
                        },
                    ]);
                });
            });
        });
        (0, mocha_1.it)("Should remove room dataset of the added datasets correctly, assert by removed ID", function () {
            return facade
                .addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Courses)
                .then((result) => {
                return facade.addDataset("rooms", rooms, IInsightFacade_1.InsightDatasetKind.Rooms);
            })
                .then((result2) => {
                return facade.removeDataset("rooms");
            })
                .then((removedID) => {
                return (0, chai_1.expect)(removedID).equal("rooms");
            });
        });
        (0, mocha_1.it)("Should remove room dataset of the added datasets correctly, assert by listing", function () {
            return facade
                .addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Courses)
                .then((result) => {
                return facade.addDataset("rooms", rooms, IInsightFacade_1.InsightDatasetKind.Rooms);
            })
                .then((result2) => {
                return facade.removeDataset("rooms");
            })
                .then((removedID) => {
                return facade.listDatasets().then((insightDatasets) => {
                    (0, chai_1.expect)(insightDatasets).to.deep.equal([
                        {
                            id: "courses",
                            kind: IInsightFacade_1.InsightDatasetKind.Courses,
                            numRows: 64612,
                        },
                    ]);
                });
            });
        });
        (0, mocha_1.it)("Should reject remove with not found error", function () {
            const err = facade.removeDataset("courses");
            return (0, chai_1.expect)(err).to.eventually.be.rejectedWith(IInsightFacade_1.NotFoundError);
        });
        (0, mocha_1.it)("Should reject remove with invalid id for underscore", function () {
            const err = facade.removeDataset("courses_invalid");
            return (0, chai_1.expect)(err).to.eventually.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        (0, mocha_1.it)("Should reject remove with invalid id for space", function () {
            const err = facade.removeDataset("  ");
            return (0, chai_1.expect)(err).to.eventually.be.rejectedWith(IInsightFacade_1.InsightError);
        });
    });
    (0, mocha_1.describe)("Perform Query folder tests", function () {
        let facade;
        before(function () {
            (0, TestUtil_1.clearDisk)();
            facade = new InsightFacade_1.default();
            return facade
                .addDataset("rooms", rooms, IInsightFacade_1.InsightDatasetKind.Rooms)
                .then(() => {
                return facade.addDataset("test", test, IInsightFacade_1.InsightDatasetKind.Courses);
            })
                .then(() => {
                return facade.addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Courses);
            })
                .catch(() => chai_1.expect.fail("UNEXPECTED ERROR"));
        });
        (0, folder_test_1.folderTest)("Perform Query", (input) => {
            return facade.performQuery(input);
        }, "./test/resources/queries", {
            assertOnResult: (actual, expected) => {
                (0, chai_1.expect)(actual).to.deep.members(expected);
            },
            errorValidator: (error) => error === "InsightError" || error === "ResultTooLargeError",
            assertOnError: (actual, expected) => {
                if (expected === "ResultTooLargeError") {
                    (0, chai_1.expect)(actual).to.be.instanceof(IInsightFacade_1.ResultTooLargeError);
                }
                else if (expected === "InsightError") {
                    (0, chai_1.expect)(actual).to.be.instanceof(IInsightFacade_1.InsightError);
                }
                else {
                    chai_1.expect.fail("UNEXPECTED ERROR");
                }
            },
        });
    });
});
//# sourceMappingURL=InsightFacade.spec.js.map