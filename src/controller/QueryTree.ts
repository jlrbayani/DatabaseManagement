import {ValidatedQuery} from "./ValidatedQuery";
import {CourseSectionClass} from "./Course";
import {InsightDatasetKind, InsightResult} from "./IInsightFacade";
import {Building, RoomClass} from "./Rooms";

type DataType = CourseSectionClass | RoomClass;

export class QueryTree {
	public query: ValidatedQuery;
	public id: string;
	public kind: InsightDatasetKind;

	constructor(validatedQuery: ValidatedQuery, dataKind: InsightDatasetKind) {
		this.query = validatedQuery;
		this.id = validatedQuery.id;
		this.kind = dataKind;
	}

	public beginFilter(dataList: any): InsightResult[] {
		let results: InsightResult[] = [];
		let filterTree: any = null;
		if (Object.keys(this.query.body).length !== 0) {
			filterTree = this.filter(this.query.body);
			for (let data of dataList) {
				if (filterTree(data)) {
					results.push(this.createResultFromData(data));
				}
			}
		} else {
			for (let data of dataList) {
				results.push(this.createResultFromData(data));
			}
		}

		return results;
	}

	// where InsightResults are built
	private createResultFromData(data: DataType): InsightResult {
		let result: InsightResult = {};
		for (const [key, val] of Object.entries(data)) {
			let field = this.id + "_" + key;
			if (key === "uuid") {
				result[field] = val.toString();
			} else if (key === "year") {
				result[field] = parseInt(val, 10);
			} else {
				result[field] = val;
			}
		}
		return result;
	}

	// filter builds the boolean tree stack which is used to perform/compare the queries with the values
	private filter(bodyTree: any): any {
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

	// handle negation of functions in bodyTree
	private handleNot(nodeValue: any): any {
		// negate whatever the function inside nodeValue produces
		let negatedVal: any = this.filter(nodeValue);
		return (data: any) => {
			return !negatedVal(data);
		};
	}

	// handling logic comparison of OR and AND
	private handleLogicComparison(currentNode: any, nodeValue: any): any {
		let filterStack: any[] = [];
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
				return (data: any) => {
					let andBool: boolean = true;
					for (let nodeFunc of filterStack) {
						let andFilter: boolean = nodeFunc(data);
						andBool = andBool && andFilter;
					}
					return andBool;
				};
			case "OR":
				return (data: any) => {
					let orBool: boolean = false;
					for (let nodeFunc of filterStack) {
						let orFilter: boolean = nodeFunc(data);
						orBool = orBool || orFilter;
					}
					return orBool;
				};
		}
	}

	// handles MCOMPARISON and SCOMPARISON
	private handleBaseComparisons(currentNode: any, nodeValue: any): any {
		let paramLen = Object.keys(nodeValue).length;
		if (paramLen !== 1) {
			throw new Error("LT/GT/EQ/IS must only have one key!");
		}
		let field = Object.keys(nodeValue)[0];
		let value = nodeValue[field];
		if (!field.includes("_")) {
			throw new Error("Invalid Key --> Missing _!");
		}
		let currID: string = field.split("_")[0];
		if (currID !== this.id) {
			throw new Error("Cannot have more than one dataset in query stack!");
		}
		let key: string = field.split("_")[1];
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

	// In comparison cases, check if values are LT, GT, EQ, or EQ to current section course
	private comparisonHelper(currentNode: any, key: any, value: any) {
		return (data: DataType) => {
			let currData: string | number | (() => void) | Building | undefined | ((any: any) => void); // I added this because update of geo for room has a parameter now.
			if (this.kind === "courses" && data instanceof CourseSectionClass) {
				currData = data[key as keyof CourseSectionClass];
			} else if (this.kind === "rooms" && data instanceof RoomClass) {
				currData = data[key as keyof RoomClass];
			} else {
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
				} else {
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
					return this.handleIS(data, key, value as string);
			}
		};
	}

	// handling IS essentially checks if one of the four possible configurations given in C1 spec occurs for value
	private handleIS(data: DataType, key: any, value: string): boolean {
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
		let fieldValue: string;

		if (this.kind === "courses" && data instanceof CourseSectionClass) {
			fieldValue = data[key as keyof CourseSectionClass] as string;
		} else if (this.kind === "rooms" && data instanceof RoomClass) {
			fieldValue = data[key as keyof RoomClass] as string;
		} else {
			throw new Error("Unknown Kind!");
		}

		if (first && last) {
			return fieldValue.includes(value.substring(1, value.length - 1));
		} else if (first) {
			return fieldValue.endsWith(value.substring(1));
		} else if (last) {
			return fieldValue.startsWith(value.substring(0, value.length - 1));
		} else {
			return fieldValue === value;
		}
	}
}
