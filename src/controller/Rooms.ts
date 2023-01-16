import * as http from "http";
import {builtinModules} from "module";

const {parse} = require("parse5");

const geolocationWebService = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team646/";

export class Building {
	constructor(fullName: string, shortName: string, address: string, href: string) {
		this.fullname = fullName;
		this.shortname = shortName;
		this.address = address;
		this.href = href;
		this.addrForGeo = this.address.replaceAll(" ", "%20");
	}

	public fullname: string;
	public shortname: string;
	public address: string;
	public href: string;
	public lat?: number;
	public lon?: number;
	public addrForGeo: string;
}
export class RoomClass extends Building {
	constructor(building: Building) {
		super(building.fullname, building.shortname, building.address, building.href);
	}

	public updateRoomName() {
		this.name = this.shortname + "_" + this.number;
	}

	/**
	 * updateLagLon
	 */
	public updateLagLon(latLon: number[]) {
		if (latLon.length === 2) {
			this.lat = latLon[0];
			this.lon = latLon[1];
		}
	}

	public number = "";
	public name = this.shortname + "_" + this.number;
	public seats = 0;
	public type = "";
	public furniture = "";
}

export function parseRoomFileToRooms(building: Building, roomFile: string): RoomClass[] {
	let listOfRooms: RoomClass[] = [];
	let parsedRoomFile = parse(roomFile);
	let listOfTables = findAndReturnTables(parsedRoomFile);
	for (const table of listOfTables) {
		let rows = extractRowAndReturnIt(table.childNodes);
		for (const row of rows) {
			try {
				listOfRooms.push(extractARoomFromARow(row.childNodes, building));
			} catch (errorCreatingARoom) {
				// Catch the error for invalid room.
			}
		}
	}
	return listOfRooms;
}

function extractARoomFromARow(row: any, building: Building): RoomClass {
	let room: RoomClass = new RoomClass(building);
	let number!: string;
	let seat!: string;
	let type!: string;
	let furniture!: string;
	for (const rowElement of row) {
		if (rowElement.nodeName === "td") {
			if (rowElement.attrs[0].value === "views-field views-field-field-room-number") {
				number = rowElement.childNodes[1].childNodes[0].value;
				room.number = number.trim();
				room.updateRoomName();
			}
			if (rowElement.attrs[0].value === "views-field views-field-field-room-capacity") {
				seat = rowElement.childNodes[0].value;
				seat = seat.trim();
				room.seats = Number(seat);
			}
			if (rowElement.attrs[0].value === "views-field views-field-field-room-furniture") {
				furniture = rowElement.childNodes[0].value;
				room.furniture = furniture.trim();
			}
			if (rowElement.attrs[0].value === "views-field views-field-field-room-type") {
				type = rowElement.childNodes[0].value;
				room.type = type.trim();
			}
			if (rowElement.attrs[0].value === "views-field views-field-nothing") {
				room.href = rowElement.childNodes[1].attrs[0].value;
			}
		}
	}
	return room;
}

function extractRowAndReturnIt(tableBody: any) {
	let rows: any[] = [];
	for (const tableElement of tableBody) {
		if (tableElement.nodeName === "tr") {
			rows.push(tableElement);
		}
	}
	return rows;
}

function findAndReturnTables(node: any): any[] {
	let tables: any[] = [];
	if (node.nodeName === "table") {
		for (const tableElement of node.childNodes) {
			if (tableElement.nodeName === "tbody") {
				return [tableElement];
			}
		}
	}
	let children = node.childNodes;
	if (typeof children !== "undefined") {
		for (const child of children) {
			let childTables = findAndReturnTables(child);
			tables = tables.concat(childTables);
		}
	}
	return tables;
}

export function parseHTMLToListOfBuildings(indexHTML: string): Building[] {
	let listOFBuildings: Building[] = [];
	let parsedIndexData = parse(indexHTML);
	let listOfTables = findAndReturnTables(parsedIndexData);
	for (const table of listOfTables) {
		let rows = extractRowAndReturnIt(table.childNodes);
		for (const row of rows) {
			try {
				listOFBuildings.push(extractABuildingFromARow(row.childNodes));
			} catch (errorCreatingABuilding) {
				// Catche the error for invalid building.
			}
		}
	}
	return listOFBuildings;
}

function extractABuildingFromARow(row: any): Building {
	let building: Building;
	let code!: string;
	let name!: string;
	let addr!: string;
	let href!: string;
	for (const rowElement of row) {
		if (rowElement.nodeName === "td") {
			if (rowElement.attrs[0].value === "views-field views-field-field-building-code") {
				code = rowElement.childNodes[0].value;
				code = code.trim();
			}
			if (rowElement.attrs[0].value === "views-field views-field-field-building-address") {
				addr = rowElement.childNodes[0].value;
				addr = addr.trim();
			}
			if (rowElement.attrs[0].value === "views-field views-field-title") {
				name = rowElement.childNodes[1].childNodes[0].value;
			}
			if (rowElement.attrs[0].value === "views-field views-field-nothing") {
				href = rowElement.childNodes[1].attrs[0].value;
			}
		}
	}
	building = new Building(name, code, addr, href);
	return building;
}

export function listOfListOfRoomsToListOfRooms(listOfLists: any, buildings: any[]): RoomClass[] {
	let listOf: RoomClass[] = [];
	for (let i = 0; i < buildings.length; i++) {
		for (const room of listOfLists[i]) {
			room.updateLagLon(buildings[i]);
		}
		listOf = listOf.concat(listOfLists[i]);
	}
	return listOf;
}

// From https://nodejs.org/api/http.html#httpgeturl-options-callback as pointed by the courses website
function geoLocation(address: string) {
	return new Promise(function (resolve, reject) {
		http.get(geolocationWebService + address, (res) => {
			const {statusCode} = res;
			const contentType = res.headers["content-type"];
			let error;
			// Any 2xx status code signals a successful response but
			// here we're only checking for 200.
			if (statusCode !== 200) {
				error = new Error("Request Failed.\n" + `Status Code: ${statusCode}`);
			}
			if (error) {
				console.error(error.message);
				// Consume response data to free up memory
				res.resume();
				reject(error);
			}

			res.setEncoding("utf8");
			let rawData = "";
			res.on("data", (chunk) => {
				rawData += chunk;
			});
			res.on("end", () => {
				try {
					const parsedData = JSON.parse(rawData);
					// console.log(parsedData);
					resolve(parsedData);
				} catch (e: any) {
					// console.error(e.message);
					reject(e);
				}
			});
		}).on("error", (e) => {
			console.error(`Got error: ${e.message}`);
			reject(e);
		});
	});
}

export function findGeoLocationOfBuldings(buildings: Building[]) {
	let promisesOfLocations = buildings.map(async (building) => {
		let location = geoLocation(building.addrForGeo);
		let latLon = [0];
		return location.then((result: any) => {
			if (typeof result.error === "undefined") {
				latLon = [result.lat, result.lon];
			}
			return latLon;
		});
	});
	return Promise.all(promisesOfLocations);
}
