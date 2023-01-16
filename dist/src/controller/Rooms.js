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
Object.defineProperty(exports, "__esModule", { value: true });
exports.findGeoLocationOfBuldings = exports.listOfListOfRoomsToListOfRooms = exports.parseHTMLToListOfBuildings = exports.parseRoomFileToRooms = exports.RoomClass = exports.Building = void 0;
const http = __importStar(require("http"));
const { parse } = require("parse5");
const geolocationWebService = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team646/";
class Building {
    constructor(fullName, shortName, address, href) {
        this.fullname = fullName;
        this.shortname = shortName;
        this.address = address;
        this.href = href;
        this.addrForGeo = this.address.replaceAll(" ", "%20");
    }
}
exports.Building = Building;
class RoomClass extends Building {
    constructor(building) {
        super(building.fullname, building.shortname, building.address, building.href);
        this.number = "";
        this.name = this.shortname + "_" + this.number;
        this.seats = 0;
        this.type = "";
        this.furniture = "";
    }
    updateRoomName() {
        this.name = this.shortname + "_" + this.number;
    }
    updateLagLon(latLon) {
        if (latLon.length === 2) {
            this.lat = latLon[0];
            this.lon = latLon[1];
        }
    }
}
exports.RoomClass = RoomClass;
function parseRoomFileToRooms(building, roomFile) {
    let listOfRooms = [];
    let parsedRoomFile = parse(roomFile);
    let listOfTables = findAndReturnTables(parsedRoomFile);
    for (const table of listOfTables) {
        let rows = extractRowAndReturnIt(table.childNodes);
        for (const row of rows) {
            try {
                listOfRooms.push(extractARoomFromARow(row.childNodes, building));
            }
            catch (errorCreatingARoom) {
            }
        }
    }
    return listOfRooms;
}
exports.parseRoomFileToRooms = parseRoomFileToRooms;
function extractARoomFromARow(row, building) {
    let room = new RoomClass(building);
    let number;
    let seat;
    let type;
    let furniture;
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
function extractRowAndReturnIt(tableBody) {
    let rows = [];
    for (const tableElement of tableBody) {
        if (tableElement.nodeName === "tr") {
            rows.push(tableElement);
        }
    }
    return rows;
}
function findAndReturnTables(node) {
    let tables = [];
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
function parseHTMLToListOfBuildings(indexHTML) {
    let listOFBuildings = [];
    let parsedIndexData = parse(indexHTML);
    let listOfTables = findAndReturnTables(parsedIndexData);
    for (const table of listOfTables) {
        let rows = extractRowAndReturnIt(table.childNodes);
        for (const row of rows) {
            try {
                listOFBuildings.push(extractABuildingFromARow(row.childNodes));
            }
            catch (errorCreatingABuilding) {
            }
        }
    }
    return listOFBuildings;
}
exports.parseHTMLToListOfBuildings = parseHTMLToListOfBuildings;
function extractABuildingFromARow(row) {
    let building;
    let code;
    let name;
    let addr;
    let href;
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
function listOfListOfRoomsToListOfRooms(listOfLists, buildings) {
    let listOf = [];
    for (let i = 0; i < buildings.length; i++) {
        for (const room of listOfLists[i]) {
            room.updateLagLon(buildings[i]);
        }
        listOf = listOf.concat(listOfLists[i]);
    }
    return listOf;
}
exports.listOfListOfRoomsToListOfRooms = listOfListOfRoomsToListOfRooms;
function geoLocation(address) {
    return new Promise(function (resolve, reject) {
        http.get(geolocationWebService + address, (res) => {
            const { statusCode } = res;
            const contentType = res.headers["content-type"];
            let error;
            if (statusCode !== 200) {
                error = new Error("Request Failed.\n" + `Status Code: ${statusCode}`);
            }
            if (error) {
                console.error(error.message);
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
                    resolve(parsedData);
                }
                catch (e) {
                    reject(e);
                }
            });
        }).on("error", (e) => {
            console.error(`Got error: ${e.message}`);
            reject(e);
        });
    });
}
function findGeoLocationOfBuldings(buildings) {
    let promisesOfLocations = buildings.map(async (building) => {
        let location = geoLocation(building.addrForGeo);
        let latLon = [0];
        return location.then((result) => {
            if (typeof result.error === "undefined") {
                latLon = [result.lat, result.lon];
            }
            return latLon;
        });
    });
    return Promise.all(promisesOfLocations);
}
exports.findGeoLocationOfBuldings = findGeoLocationOfBuldings;
//# sourceMappingURL=Rooms.js.map