"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryTree = void 0;
const Course_1 = require("./Course");
const Rooms_1 = require("./Rooms");
class QueryTree {
    constructor(validatedQuery, dataKind) {
        this.query = validatedQuery;
        this.id = validatedQuery.id;
        this.kind = dataKind;
    }
    beginFilter(dataList) {
        let results = [];
        let filterTree = null;
        if (Object.keys(this.query.body).length !== 0) {
            filterTree = this.filter(this.query.body);
            for (let data of dataList) {
                if (filterTree(data)) {
                    results.push(this.createResultFromData(data));
                }
            }
        }
        else {
            for (let data of dataList) {
                results.push(this.createResultFromData(data));
            }
        }
        return results;
    }
    createResultFromData(data) {
        let result = {};
        for (const [key, val] of Object.entries(data)) {
            let field = this.id + "_" + key;
            if (key === "uuid") {
                result[field] = val.toString();
            }
            else if (key === "year") {
                result[field] = parseInt(val, 10);
            }
            else {
                result[field] = val;
            }
        }
        return result;
    }
    filter(bodyTree) {
        let numNodes = Object.keys(bodyTree).length;
        if (numNodes !== 1) {
            throw new Error("Filter must currently only have node in this iteration!");
        }
        let currentNode = Object.keys(bodyTree)[0];
        let nodeValue = bodyTree[currentNode];
        switch (currentNode) {
            case "AND": {
                return this.handleLogicComparison(currentNode, nodeValue);
            }
            case "OR": {
                return this.handleLogicComparison(currentNode, nodeValue);
            }
            case "LT": {
                return this.handleBaseComparisons(currentNode, nodeValue);
            }
            case "GT": {
                return this.handleBaseComparisons(currentNode, nodeValue);
            }
            case "EQ": {
                return this.handleBaseComparisons(currentNode, nodeValue);
            }
            case "IS": {
                return this.handleBaseComparisons(currentNode, nodeValue);
            }
            case "NOT": {
                return this.handleNot(nodeValue);
            }
            default: {
                throw new Error("Node in Query is Invalid: " + currentNode);
            }
        }
    }
    handleNot(nodeValue) {
        let negatedVal = this.filter(nodeValue);
        return (data) => {
            return !negatedVal(data);
        };
    }
    handleLogicComparison(currentNode, nodeValue) {
        let filterStack = [];
        if (!Array.isArray(nodeValue)) {
            throw new Error("nodeValue must be Array since OR/AND must take in 2 child nodes!");
        }
        if (nodeValue.length === 0) {
            throw new Error("nodeValue must have at least one piece of data!");
        }
        for (let node of nodeValue) {
            filterStack.push(this.filter(node));
        }
        switch (currentNode) {
            case "AND":
                return (data) => {
                    let andBool = true;
                    for (let nodeFunc of filterStack) {
                        let andFilter = nodeFunc(data);
                        andBool = andBool && andFilter;
                    }
                    return andBool;
                };
            case "OR":
                return (data) => {
                    let orBool = false;
                    for (let nodeFunc of filterStack) {
                        let orFilter = nodeFunc(data);
                        orBool = orBool || orFilter;
                    }
                    return orBool;
                };
        }
    }
    handleBaseComparisons(currentNode, nodeValue) {
        let paramLen = Object.keys(nodeValue).length;
        if (paramLen !== 1) {
            throw new Error("LT/GT/EQ/IS must only have one key!");
        }
        let field = Object.keys(nodeValue)[0];
        let value = nodeValue[field];
        if (!field.includes("_")) {
            throw new Error("Invalid Key --> Missing _!");
        }
        let currID = field.split("_")[0];
        if (currID !== this.id) {
            throw new Error("Cannot have more than one dataset in query stack!");
        }
        let key = field.split("_")[1];
        switch (currentNode) {
            case "GT":
            case "LT":
            case "EQ": {
                if (typeof value !== "number") {
                    throw new Error("LT/GT/EQ must have number values!");
                }
                break;
            }
            case "IS": {
                if (typeof value !== "string") {
                    throw new Error("IS must have a string value!");
                }
                break;
            }
        }
        return this.comparisonHelper(currentNode, key, value);
    }
    comparisonHelper(currentNode, key, value) {
        return (data) => {
            let currData;
            if (this.kind === "courses" && data instanceof Course_1.CourseSectionClass) {
                currData = data[key];
            }
            else if (this.kind === "rooms" && data instanceof Rooms_1.RoomClass) {
                currData = data[key];
            }
            else {
                throw new Error("Unknown Kind!");
            }
            if (currData === undefined) {
                throw new Error("Key is not valid --> " + key);
            }
            if (typeof currData !== typeof value) {
                if (typeof currData === "string") {
                    currData = Number.parseInt(currData, 10);
                    if (isNaN(currData)) {
                        throw new Error("Types of query and value do not match: " + (currData) + " " + (value));
                    }
                }
                else {
                    throw new Error("Types of query and value do not match: " + (currData) + " " + (value));
                }
            }
            switch (currentNode) {
                case "LT":
                    return currData < value;
                case "GT":
                    return currData > value;
                case "EQ":
                    return currData === value;
                case "IS":
                    return this.handleIS(data, key, value);
            }
        };
    }
    handleIS(data, key, value) {
        if (value === "*" || value === "**") {
            return true;
        }
        if (value.length > 2) {
            let substringVal = value.substring(1, value.length - 1);
            if (substringVal.includes("*")) {
                throw new Error("Asterisks can only be the first or last characters of a string!");
            }
        }
        let first = value.startsWith("*");
        let last = value.endsWith("*");
        let fieldValue;
        if (this.kind === "courses" && data instanceof Course_1.CourseSectionClass) {
            fieldValue = data[key];
        }
        else if (this.kind === "rooms" && data instanceof Rooms_1.RoomClass) {
            fieldValue = data[key];
        }
        else {
            throw new Error("Unknown Kind!");
        }
        if (first && last) {
            return fieldValue.includes(value.substring(1, value.length - 1));
        }
        else if (first) {
            return fieldValue.endsWith(value.substring(1));
        }
        else if (last) {
            return fieldValue.startsWith(value.substring(0, value.length - 1));
        }
        else {
            return fieldValue === value;
        }
    }
}
exports.QueryTree = QueryTree;
//# sourceMappingURL=QueryTree.js.map