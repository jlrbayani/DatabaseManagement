import {ValidatedQuery} from "./ValidatedQuery";
import {InsightResult} from "./IInsightFacade";
import Decimal from "decimal.js";

export class Aggregator {
	public query: ValidatedQuery;
	public columnsAggregated: string[];
	public group: string[];
	public applyCols: string[];
	public applyObj: any[];

	constructor(validatedQuery: ValidatedQuery) {
		this.query = validatedQuery;
		this.columnsAggregated = [];
		this.group = this.query.group;
		this.applyCols = [];
		this.applyObj = [];

		this.query.apply.forEach((applyIndex: any[]) => {
			let currentApply: string = Object.keys(applyIndex)[0];
			this.applyCols.push(currentApply);
			this.applyObj.push(applyIndex);
		});
		this.group.forEach((col: string) => {
			this.columnsAggregated.push(col);
		});
		this.applyCols.forEach((col: string) => {
			this.columnsAggregated.push(col);
		});
	}

	public aggregateDataList(dataList: InsightResult[]): InsightResult[] {
		let mapAggregate = this.mapGroupsTogether(dataList);
		let newDataList: InsightResult[] = [];

		for (const entry of mapAggregate.entries()) {
			let result: InsightResult = {};
			let currList: InsightResult[] = entry[1];

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
				let key = Object.values(currApply[name])[0] as string;
				if (currList.length !== 0) {
					resultFromFunc = this.handleApplyFunc(currList, func, key);
				}
				result[name] = resultFromFunc;
			}
			newDataList.push(result);
		}

		return newDataList;
	}

	// used idea of creating a string as a key from array values from discussion: https://stackoverflow.com/questions/31950880/how-javascript-compare-key-of-map
	private mapGroupsTogether(dataList: InsightResult[]): Map<string, InsightResult[]> {
		let mapAggregate = new Map<string, InsightResult[]>();

		for (const data of dataList) {
			let currGroup: string = "data -->  ";
			for (const key of this.group) {
				currGroup += "key: ";
				currGroup += data[key];
			}
			let mapList: InsightResult[] | undefined = mapAggregate.get(currGroup);
			if (mapList === undefined) {
				mapList = [] as InsightResult[];
				mapList.push(data);
				mapAggregate.set(currGroup, mapList);
			} else {
				mapList.push(data);
			}
		}

		return mapAggregate;
	}

	private handleApplyFunc(dataList: InsightResult[], func: string, key: string): number {
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

	private handleMax(dataList: InsightResult[], key: string): number {
		let maxVal = Number.NEGATIVE_INFINITY;
		for (const data of dataList) {
			if (data[key] > maxVal) {
				maxVal = data[key] as number;
			}
		}
		return maxVal;
	}

	private handleMin(dataList: InsightResult[], key: string): number {
		let minVal = Number.POSITIVE_INFINITY;
		for (const data of dataList) {
			if (data[key] < minVal) {
				minVal = data[key] as number;
			}
		}
		return minVal;
	}

	private handleSum(dataList: InsightResult[], key: string): number {
		let sum = 0;
		for (const data of dataList) {
			sum += data[key] as number;
		}
		sum = Number(sum.toFixed(2));
		return sum;
	}

	private handleCount(dataList: InsightResult[], key: string): number {
		let setCount = new Set();

		for (const data of dataList) {
			setCount.add(data[key]);
		}

		return setCount.size;
	}

	private handleAverage(dataList: InsightResult[], key: string): number {
		let total = new Decimal(0);
		let numRows = dataList.length;
		for (const data of dataList) {
			let currNum = new Decimal(data[key]);
			total = total.add(currNum);
		}
		let avg = total.toNumber() / numRows;
		let res = Number(avg.toFixed(2));
		return res;
	}
}
