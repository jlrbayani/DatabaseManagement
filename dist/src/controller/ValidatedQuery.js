"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidatedQuery = void 0;
const QueryTree_1 = require("./QueryTree");
const Aggregator_1 = require("./Aggregator");
class ValidatedQuery {
    constructor(queryV) {
        if (queryV === undefined || Object.keys(queryV).length === 0) {
            throw new Error("Query undefined!");
        }
        this.body = queryV.WHERE;
        if (this.body === undefined) {
            throw new Error("Query missing WHERE clause!");
        }
        this.options = queryV.OPTIONS;
        if (this.options === undefined) {
            throw new Error("Query missing OPTIONS clause!");
        }
        this.colArray = this.options.COLUMNS;
        if (this.colArray === undefined) {
            throw new Error("Query missing COLUMNS clause in OPTIONS!");
        }
        if (this.colArray.length === 0) {
            throw new Error("No columns given. Must have at least one!");
        }
        this.aggregator = undefined;
        this.transformations = queryV.TRANSFORMATIONS;
        if (this.transformations !== undefined) {
            if (this.transformations.length === 0) {
                throw new Error("Transformations must have nodes!");
            }
            this.group = this.transformations.GROUP;
            if (this.group === undefined || !(this.group instanceof Array)) {
                throw new Error("Transformations missing GROUP!");
            }
            this.apply = this.transformations.APPLY;
            if (this.apply === undefined || !(this.apply instanceof Array)) {
                throw new Error("Transformations missing APPLY!");
            }
            this.aggregator = new Aggregator_1.Aggregator(this);
        }
        let colID = this.extractID(this.colArray);
        this.id = colID;
    }
    checkIfIDExists(datasetArray) {
        let doesExist = false;
        datasetArray.forEach((dataset) => {
            if (dataset.id === this.id) {
                doesExist = true;
                return;
            }
        });
        return doesExist;
    }
    performQuery(dataList, dataKind) {
        let results;
        let queryTree = new QueryTree_1.QueryTree(this, dataKind);
        results = queryTree.beginFilter(dataList);
        if (this.aggregator !== undefined) {
            results = this.aggregator.aggregateDataList(results);
        }
        results = JSON.parse(JSON.stringify(results, this.colArray));
        this.handleOrder(results);
        return results;
    }
    handleOrder(results) {
        if (this.options.ORDER !== undefined) {
            if (typeof this.options.ORDER === "string") {
                let orderKey = [];
                orderKey.push(this.options.ORDER);
                if (orderKey[0] === undefined) {
                    return results;
                }
                this.checkKeyInclusion(orderKey[0]);
                results.sort(this.dynamicOrder(orderKey, 1, 0));
            }
            else if (typeof this.options.ORDER === "object") {
                let dir = this.options.ORDER.dir;
                let keys = this.options.ORDER.keys;
                for (let orderKey of keys) {
                    this.checkKeyInclusion(orderKey);
                }
                if (dir === "UP") {
                    results.sort(this.dynamicOrder(keys, 1, 0));
                }
                else if (dir === "DOWN") {
                    results.sort(this.dynamicOrder(keys, -1, 0));
                }
                else {
                    throw new Error("The dir should either be UP or DOWN instead got: " + dir);
                }
            }
            else {
                throw new Error("Type of Order should be a string or object!");
            }
        }
        return results;
    }
    checkKeyInclusion(orderKey) {
        let columns = this.colArray;
        if (this.aggregator === undefined) {
            if (!columns.includes(orderKey)) {
                throw new Error("Sorting Key must be in Column Array!");
            }
        }
        else {
            if (!columns.includes(orderKey) && !this.aggregator.columnsAggregated.includes(orderKey)) {
                throw new Error("Sorting Key must be in Column Array or Aggregated Columns!");
            }
        }
    }
    dynamicOrder(keys, dir, index) {
        return (a, b) => {
            let aVal = a[keys[index]];
            let bVal = b[keys[index]];
            let aType = typeof aVal;
            let bType = typeof bVal;
            if ((aType === "string" && bType === "string") || (aType === "number" && bType === "number")) {
                if (aVal < bVal) {
                    return -1 * dir;
                }
                else if (aVal > bVal) {
                    return dir;
                }
                else if (keys.length - 1 === index && aVal === bVal) {
                    return 0;
                }
                let nextKeyComparison = this.dynamicOrder(keys, dir, index + 1);
                return nextKeyComparison(a, b);
            }
            throw new Error("Comparison of Values in Order have invalid or unequal types: aValType");
        };
    }
    extractID(arr) {
        let id = arr[0].split("_")[0];
        arr.forEach((currIndex) => {
            if (currIndex.includes("_")) {
                let currID = currIndex.split("_")[0];
                if (currID !== id) {
                    throw new Error("Cannot have more than one dataset!");
                }
                id = currID;
            }
            else if (this.aggregator !== undefined && this.aggregator.columnsAggregated.includes(currIndex)) {
                console.log("New Apply Column!");
            }
            else {
                throw new Error("Invalid Query Key --> " + currIndex);
            }
        });
        return id;
    }
}
exports.ValidatedQuery = ValidatedQuery;
//# sourceMappingURL=ValidatedQuery.js.map