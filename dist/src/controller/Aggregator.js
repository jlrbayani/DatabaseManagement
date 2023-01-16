"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Aggregator = void 0;
const decimal_js_1 = __importDefault(require("decimal.js"));
class Aggregator {
    constructor(validatedQuery) {
        this.query = validatedQuery;
        this.columnsAggregated = [];
        this.group = this.query.group;
        this.applyCols = [];
        this.applyObj = [];
        this.query.apply.forEach((applyIndex) => {
            let currentApply = Object.keys(applyIndex)[0];
            this.applyCols.push(currentApply);
            this.applyObj.push(applyIndex);
        });
        this.group.forEach((col) => {
            this.columnsAggregated.push(col);
        });
        this.applyCols.forEach((col) => {
            this.columnsAggregated.push(col);
        });
    }
    aggregateDataList(dataList) {
        let mapAggregate = this.mapGroupsTogether(dataList);
        let newDataList = [];
        for (const entry of mapAggregate.entries()) {
            let result = {};
            let currList = entry[1];
            for (let field of this.group) {
                result[field] = currList[0][field];
            }
            for (const currApply of this.applyObj) {
                let resultFromFunc = 0;
                let name = Object.keys(currApply)[0];
                if (Object.keys(currApply).length !== 1) {
                    throw new Error("Apply Functions must have 1 key only");
                }
                let func = Object.keys(currApply[name])[0];
                let key = Object.values(currApply[name])[0];
                if (currList.length !== 0) {
                    resultFromFunc = this.handleApplyFunc(currList, func, key);
                }
                result[name] = resultFromFunc;
            }
            newDataList.push(result);
        }
        return newDataList;
    }
    mapGroupsTogether(dataList) {
        let mapAggregate = new Map();
        for (const data of dataList) {
            let currGroup = "data -->  ";
            for (const key of this.group) {
                currGroup += "key: ";
                currGroup += data[key];
            }
            let mapList = mapAggregate.get(currGroup);
            if (mapList === undefined) {
                mapList = [];
                mapList.push(data);
                mapAggregate.set(currGroup, mapList);
            }
            else {
                mapList.push(data);
            }
        }
        return mapAggregate;
    }
    handleApplyFunc(dataList, func, key) {
        if (func === "COUNT") {
            return this.handleCount(dataList, key);
        }
        if (typeof dataList[0][key] !== "number") {
            throw new Error("Should have a number value for field when using MAX, MIN, SUM, AVG apply functions!");
        }
        switch (func) {
            case "MAX": {
                return this.handleMax(dataList, key);
            }
            case "MIN": {
                return this.handleMin(dataList, key);
            }
            case "SUM": {
                return this.handleSum(dataList, key);
            }
            case "AVG": {
                return this.handleAverage(dataList, key);
            }
            default: {
                throw new Error("Unavailable apply function: " + func);
            }
        }
    }
    handleMax(dataList, key) {
        let maxVal = Number.NEGATIVE_INFINITY;
        for (const data of dataList) {
            if (data[key] > maxVal) {
                maxVal = data[key];
            }
        }
        return maxVal;
    }
    handleMin(dataList, key) {
        let minVal = Number.POSITIVE_INFINITY;
        for (const data of dataList) {
            if (data[key] < minVal) {
                minVal = data[key];
            }
        }
        return minVal;
    }
    handleSum(dataList, key) {
        let sum = 0;
        for (const data of dataList) {
            sum += data[key];
        }
        sum = Number(sum.toFixed(2));
        return sum;
    }
    handleCount(dataList, key) {
        let setCount = new Set();
        for (const data of dataList) {
            setCount.add(data[key]);
        }
        return setCount.size;
    }
    handleAverage(dataList, key) {
        let total = new decimal_js_1.default(0);
        let numRows = dataList.length;
        for (const data of dataList) {
            let currNum = new decimal_js_1.default(data[key]);
            total = total.add(currNum);
        }
        let avg = total.toNumber() / numRows;
        let res = Number(avg.toFixed(2));
        return res;
    }
}
exports.Aggregator = Aggregator;
//# sourceMappingURL=Aggregator.js.map