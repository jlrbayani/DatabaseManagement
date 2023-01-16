"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IInsightFacade_1 = require("./IInsightFacade");
const Course_1 = require("./Course");
const Rooms_1 = require("./Rooms");
const JSZip = require("jszip");
const ValidatedQuery_1 = require("./ValidatedQuery");
const fs = require("fs-extra");
const dir = "data/";
let datasetArray;
let mapDatasets;
class InsightFacade {
    constructor() {
        console.log("InsightFacadeImpl::init()");
        datasetArray = [];
        mapDatasets = new Map([]);
    }
    addDataset(id, content, kind) {
        if (!this.idCheck(id)) {
            return Promise.reject(new IInsightFacade_1.InsightError("Invalid ID!"));
        }
        if (kind === IInsightFacade_1.InsightDatasetKind.Rooms) {
            return this.addRoomForAddDataset(id, content);
        }
        return this.addCourseForAddDataset(id, content);
    }
    addRoomForAddDataset(id, content) {
        let geoPromise;
        let zip = new JSZip();
        let buildingList = zip.loadAsync(content, { base64: true, checkCRC32: true }).then(async function (zipFile) {
            for (const fileName of Object.keys(zipFile.files)) {
                if (fileName.indexOf("rooms/") !== 0) {
                    return Promise.reject(new IInsightFacade_1.InsightError("Filename doesn't start with rooms/"));
                }
            }
            const indexHTMLData = zip.files["rooms/index.htm"].async("string");
            let listOFBuildings = (0, Rooms_1.parseHTMLToListOfBuildings)(await indexHTMLData);
            geoPromise = (0, Rooms_1.findGeoLocationOfBuldings)(listOFBuildings);
            return listOFBuildings;
        });
        let RoomListPromise = buildingList
            .then((buildings) => {
            const buildingsToRoomsList = buildings.map(async (building) => {
                const roomFile = zip.files["rooms" + building.href.replace(".", "")].async("string");
                return (0, Rooms_1.parseRoomFileToRooms)(building, await roomFile);
            });
            return Promise.all(buildingsToRoomsList);
        })
            .then((listOFListOfRooms) => {
            return geoPromise.then((latLon) => {
                let roomList = (0, Rooms_1.listOfListOfRoomsToListOfRooms)(listOFListOfRooms, latLon);
                if (roomList.length === 0) {
                    return Promise.reject(new IInsightFacade_1.InsightError("Empty room file, room list length is 0."));
                }
                return this.writeRoomToDisk(id, roomList);
            });
        });
        return RoomListPromise.then((roomList) => {
            mapDatasets.set(id, roomList);
            return this.updateDataset(id, IInsightFacade_1.InsightDatasetKind.Rooms, roomList.length);
        }).catch((err) => {
            return Promise.reject(new IInsightFacade_1.InsightError(err));
        });
    }
    writeRoomToDisk(id, roomList) {
        let writePromise = fs.ensureDir("data").then(() => {
            return fs.writeJson(dir + id + ".json", { id: id, rooms: roomList });
        });
        return writePromise
            .then(() => {
            return roomList;
        })
            .catch((err) => {
            return Promise.reject(new IInsightFacade_1.InsightError("Error: creating data dir OR writing the JSON:" + err));
        });
    }
    updateDataset(id, kind, numRows) {
        const myDataset = { id: id, kind: kind, numRows: numRows };
        datasetArray.push(myDataset);
        let idArray = [];
        for (let data of datasetArray) {
            idArray.push(data.id);
        }
        return idArray;
    }
    addCourseForAddDataset(id, content) {
        let zip = new JSZip();
        let courseSections = zip
            .loadAsync(content, { base64: true, checkCRC32: true })
            .then(function (zipFile) {
            const sectionPromises = Object.keys(zipFile.files).map(async function (fileName) {
                if (fileName.indexOf("courses/") !== 0) {
                    return Promise.reject(new IInsightFacade_1.InsightError("Filename doesn't start with courses/"));
                }
                const fileData = zip.files[fileName].async("string");
                return (0, Course_1.parseCourseFile)(await fileData);
            });
            return Promise.all(sectionPromises);
        })
            .then((listOfSectionLists) => {
            return (0, Course_1.listOfListOfSectionsToListOfSections)(listOfSectionLists);
        })
            .then((sectionList) => {
            if (sectionList.length === 0) {
                return Promise.reject(new IInsightFacade_1.InsightError("Empty zip, contains no valid courses."));
            }
            return fs
                .ensureDir("data")
                .then(() => {
                return sectionList;
            })
                .catch((err) => {
                return Promise.reject(new IInsightFacade_1.InsightError("Error: creating data dir: " + err));
            });
        })
            .then((sectionList) => {
            return fs
                .writeJson(dir + id + ".json", { id: id, sections: sectionList })
                .then(() => {
                mapDatasets.set(id, sectionList);
                return sectionList;
            })
                .catch((errWrite) => {
                return Promise.reject(new IInsightFacade_1.InsightError("Error: writing the JSON: " + errWrite));
            });
        })
            .catch((err) => {
            return Promise.reject(new IInsightFacade_1.InsightError(err));
        });
        return courseSections.then((sectionList) => {
            let idArray2 = this.updateDataset(id, IInsightFacade_1.InsightDatasetKind.Courses, sectionList.length);
            return idArray2;
        });
    }
    removeDataset(id) {
        if (!/\S/.test(id) || id.includes("_")) {
            return Promise.reject(new IInsightFacade_1.InsightError("Error: Invalid ID."));
        }
        const file = dir + id + ".json";
        return fs
            .pathExists(file)
            .then((exists) => {
            if (!exists) {
                return Promise.reject(new IInsightFacade_1.NotFoundError("ID did not exist in the data directory!"));
            }
            else {
                return fs.remove(file);
            }
        })
            .then(() => {
            const idx = datasetArray.findIndex((element) => element.id === id);
            if (idx === -1) {
                return Promise.reject(new IInsightFacade_1.InsightError("ID was not in datasetArray!!"));
            }
            else {
                let kind = datasetArray[idx].kind;
                datasetArray.splice(idx, 1);
                let checkRemovedFromMap;
                if (kind === IInsightFacade_1.InsightDatasetKind.Courses || kind === IInsightFacade_1.InsightDatasetKind.Rooms) {
                    checkRemovedFromMap = mapDatasets.delete(id);
                }
                else {
                    checkRemovedFromMap = false;
                }
                if (checkRemovedFromMap) {
                    return Promise.resolve(id);
                }
                else {
                    return Promise.reject(new IInsightFacade_1.InsightError("ID did not exist in the map"));
                }
            }
        })
            .catch((err) => {
            return Promise.reject(err);
        });
    }
    performQuery(query) {
        if (datasetArray === null || datasetArray.length === 0) {
            return Promise.reject(new IInsightFacade_1.InsightError("No datasets have been added yet!"));
        }
        let validQuery;
        try {
            validQuery = new ValidatedQuery_1.ValidatedQuery(query);
        }
        catch (error) {
            return Promise.reject(new IInsightFacade_1.InsightError("Query Does not Conform to EBNF: " + error));
        }
        if (!validQuery.checkIfIDExists(datasetArray)) {
            return Promise.reject(new IInsightFacade_1.InsightError("Dataset has not been added yet!"));
        }
        let data = mapDatasets.get(validQuery.id);
        let dataKind = this.getDataKind(validQuery.id);
        if (dataKind === undefined) {
            return Promise.reject(new IInsightFacade_1.InsightError("ID does not exist in datasetArray"));
        }
        let results;
        try {
            results = validQuery.performQuery(data, dataKind);
        }
        catch (error) {
            return Promise.reject(new IInsightFacade_1.InsightError("Query Does fails EBNF during filtering due to: " + error));
        }
        if (results.length > 5000) {
            return Promise.reject(new IInsightFacade_1.ResultTooLargeError("Max Limit on Results > 5000!"));
        }
        return Promise.resolve(results);
    }
    getDataKind(dataID) {
        for (let dataset of datasetArray) {
            if (dataset["id"] === dataID) {
                return dataset["kind"];
            }
        }
        return undefined;
    }
    listDatasets() {
        return Promise.resolve(datasetArray);
    }
    idCheck(id) {
        if (!/\S/.test(id) || id.includes("_")) {
            return false;
        }
        for (let data of datasetArray) {
            if (data.id === id) {
                return false;
            }
        }
        return true;
    }
}
exports.default = InsightFacade;
//# sourceMappingURL=InsightFacade.js.map