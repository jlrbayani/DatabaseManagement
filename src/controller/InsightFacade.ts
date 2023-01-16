import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";

import {CourseSectionClass, parseCourseFile, listOfListOfSectionsToListOfSections} from "./Course";
import {
	RoomClass,
	Building,
	parseRoomFileToRooms,
	parseHTMLToListOfBuildings,
	listOfListOfRoomsToListOfRooms,
	findGeoLocationOfBuldings,
} from "./Rooms";
import JSZip = require("jszip");
import {ValidatedQuery} from "./ValidatedQuery";
const fs = require("fs-extra");

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

const dir = "data/";
let datasetArray: InsightDataset[];
// needs to rename it
let mapDatasets: Map<string, CourseSectionClass[] | RoomClass[]>;

export default class InsightFacade implements IInsightFacade {
	constructor() {
		console.log("InsightFacadeImpl::init()");
		datasetArray = [];
		mapDatasets = new Map<string, CourseSectionClass[] | RoomClass[]>([]);
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (!this.idCheck(id)) {
			return Promise.reject(new InsightError("Invalid ID!"));
		}
		if (kind === InsightDatasetKind.Rooms) {
			return this.addRoomForAddDataset(id, content);
		}
		return this.addCourseForAddDataset(id, content);
	}

	private addRoomForAddDataset(id: string, content: string): Promise<string[]> {
		let geoPromise: Promise<number[][]>;
		let zip = new JSZip();
		let buildingList = zip.loadAsync(content, {base64: true, checkCRC32: true}).then(async function (zipFile) {
			for (const fileName of Object.keys(zipFile.files)) {
				if (fileName.indexOf("rooms/") !== 0) {
					return Promise.reject(new InsightError("Filename doesn't start with rooms/"));
				}
			}
			const indexHTMLData = zip.files["rooms/index.htm"].async("string");
			let listOFBuildings = parseHTMLToListOfBuildings(await indexHTMLData);
			geoPromise = findGeoLocationOfBuldings(listOFBuildings);
			return listOFBuildings;
		});
		let RoomListPromise = buildingList
			.then((buildings) => {
				const buildingsToRoomsList = buildings.map(async (building) => {
					const roomFile = zip.files["rooms" + building.href.replace(".", "")].async("string");
					return parseRoomFileToRooms(building, await roomFile);
				});
				return Promise.all(buildingsToRoomsList);
			})
			.then((listOFListOfRooms) => {
				return geoPromise.then((latLon) => {
					let roomList = listOfListOfRoomsToListOfRooms(listOFListOfRooms, latLon);
					if (roomList.length === 0) {
						return Promise.reject(new InsightError("Empty room file, room list length is 0."));
					}
					return this.writeRoomToDisk(id, roomList);
				});
			});
		return RoomListPromise.then((roomList) => {
			mapDatasets.set(id, roomList);
			return this.updateDataset(id, InsightDatasetKind.Rooms, roomList.length);
		}).catch((err) => {
			return Promise.reject(new InsightError(err));
		});
	}

	private writeRoomToDisk(id: string, roomList: RoomClass[]): RoomClass[] {
		// console.log(roomList); // uncomment to print rooms
		let writePromise = fs.ensureDir("data").then(() => {
			return fs.writeJson(dir + id + ".json", {id: id, rooms: roomList});
		});
		return writePromise
			.then(() => {
				return roomList;
			})
			.catch((err: string) => {
				return Promise.reject(new InsightError("Error: creating data dir OR writing the JSON:" + err));
			});
	}

	private updateDataset(id: string, kind: InsightDatasetKind, numRows: number): string[] {
		const myDataset: InsightDataset = {id: id, kind: kind, numRows: numRows};
		datasetArray.push(myDataset);
		let idArray: string[] = [];
		for (let data of datasetArray) {
			idArray.push(data.id);
		}
		return idArray;
	}

	private addCourseForAddDataset(id: string, content: string): Promise<string[]> {
		let zip = new JSZip();
		let courseSections = zip
			.loadAsync(content, {base64: true, checkCRC32: true})
			.then(function (zipFile) {
				const sectionPromises = Object.keys(zipFile.files).map(async function (fileName) {
					if (fileName.indexOf("courses/") !== 0) {
						return Promise.reject(new InsightError("Filename doesn't start with courses/"));
					}
					const fileData = zip.files[fileName].async("string");
					return parseCourseFile(await fileData);
				});
				return Promise.all(sectionPromises);
			})
			.then((listOfSectionLists) => {
				return listOfListOfSectionsToListOfSections(listOfSectionLists);
			})
			.then((sectionList) => {
				if (sectionList.length === 0) {
					return Promise.reject(new InsightError("Empty zip, contains no valid courses."));
				}
				return fs
					.ensureDir("data")
					.then(() => {
						return sectionList;
					})
					.catch((err: string) => {
						return Promise.reject(new InsightError("Error: creating data dir: " + err));
					});
			})
			.then((sectionList) => {
				return fs
					.writeJson(dir + id + ".json", {id: id, sections: sectionList})
					.then(() => {
						mapDatasets.set(id, sectionList);
						return sectionList;
					})
					.catch((errWrite: string) => {
						return Promise.reject(new InsightError("Error: writing the JSON: " + errWrite));
					});
			})
			.catch((err) => {
				return Promise.reject(new InsightError(err));
			});
		return courseSections.then((sectionList) => {
			let idArray2 = this.updateDataset(id, InsightDatasetKind.Courses, sectionList.length);
			return idArray2;
		});
	}

	public removeDataset(id: string): Promise<string> {
		if (!/\S/.test(id) || id.includes("_")) {
			return Promise.reject(new InsightError("Error: Invalid ID."));
		}
		const file = dir + id + ".json";
		return fs
			.pathExists(file)
			.then((exists: boolean) => {
				if (!exists) {
					return Promise.reject(new NotFoundError("ID did not exist in the data directory!"));
				} else {
					return fs.remove(file);
				}
			})
			.then(() => {
				const idx = datasetArray.findIndex((element) => element.id === id);
				if (idx === -1) {
					return Promise.reject(new InsightError("ID was not in datasetArray!!"));
				} else {
					let kind = datasetArray[idx].kind;
					datasetArray.splice(idx, 1);
					let checkRemovedFromMap: boolean;
					if (kind === InsightDatasetKind.Courses || kind === InsightDatasetKind.Rooms) {
						checkRemovedFromMap = mapDatasets.delete(id);
					} else {
						checkRemovedFromMap = false;
					}
					if (checkRemovedFromMap) {
						return Promise.resolve(id);
					} else {
						return Promise.reject(new InsightError("ID did not exist in the map"));
					}
				}
			})
			.catch((err: InsightError | NotFoundError) => {
				return Promise.reject(err);
			});
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		if (datasetArray === null || datasetArray.length === 0) {
			return Promise.reject(new InsightError("No datasets have been added yet!"));
		}

		let validQuery: ValidatedQuery;
		try {
			validQuery = new ValidatedQuery(query as any);
		} catch (error) {
			return Promise.reject(new InsightError("Query Does not Conform to EBNF: " + error));
		}

		if (!validQuery.checkIfIDExists(datasetArray)) {
			return Promise.reject(new InsightError("Dataset has not been added yet!"));
		}

		let data = mapDatasets.get(validQuery.id);
		let dataKind = this.getDataKind(validQuery.id);
		if (dataKind === undefined) {
			return Promise.reject(new InsightError("ID does not exist in datasetArray"));
		}
		let results: InsightResult[];

		try {
			results = validQuery.performQuery(data, dataKind);
		} catch (error) {
			return Promise.reject(new InsightError("Query Does fails EBNF during filtering due to: " + error));
		}

		if (results.length > 5000) {
			return Promise.reject(new ResultTooLargeError("Max Limit on Results > 5000!"));
		}

		return Promise.resolve(results);
	}

	public getDataKind(dataID: string): InsightDatasetKind | undefined {
		for (let dataset of datasetArray) {
			if (dataset["id"] === dataID) {
				return dataset["kind"];
			}
		}

		return undefined;
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve(datasetArray);
	}

	private idCheck(id: string): boolean {
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
