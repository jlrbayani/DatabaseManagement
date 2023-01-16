import {InsightDataset, InsightDatasetKind, InsightResult} from "./IInsightFacade";
import {QueryTree} from "./QueryTree";
import {Aggregator} from "./Aggregator";

// validate json query with EBNF
export class ValidatedQuery {
	public id: string;
	public body: any;
	public options: any;
	public colArray: any;
	public transformations: any;
	public group: any;
	public apply: any;
	public aggregator: Aggregator | undefined;

	constructor(queryV: any) {
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
			this.aggregator = new Aggregator(this);
		}

		let colID = this.extractID(this.colArray);
		this.id = colID;
	}

	public checkIfIDExists(datasetArray: InsightDataset[]): boolean {
		let doesExist: boolean = false;
		datasetArray.forEach((dataset: InsightDataset) => {
			if (dataset.id === this.id) {
				doesExist = true;
				return;
			}
		});

		return doesExist;
	}

	// entry point to start querying values from dataList
	public performQuery(dataList: any, dataKind: InsightDatasetKind): InsightResult[] {
		let results: InsightResult[];
		let queryTree: QueryTree = new QueryTree(this, dataKind);

		results = queryTree.beginFilter(dataList);

		if (this.aggregator !== undefined) {
			results = this.aggregator.aggregateDataList(results);
		}

		results = JSON.parse(JSON.stringify(results, this.colArray));

		this.handleOrder(results);

		return results;
	}

	private handleOrder(results: InsightResult[]): InsightResult[] {
		if (this.options.ORDER !== undefined) {
			if (typeof this.options.ORDER === "string") {
				let orderKey: string[] = [];
				orderKey.push(this.options.ORDER);

				if (orderKey[0] === undefined) {
					return results;
				}

				this.checkKeyInclusion(orderKey[0]);

				results.sort(this.dynamicOrder(orderKey, 1, 0));
			} else if (typeof this.options.ORDER === "object") {
				let dir: string = this.options.ORDER.dir;
				let keys: string[] = this.options.ORDER.keys;

				for (let orderKey of keys) {
					this.checkKeyInclusion(orderKey);
				}

				if (dir === "UP") {
					results.sort(this.dynamicOrder(keys, 1, 0));
				} else if (dir === "DOWN") {
					results.sort(this.dynamicOrder(keys, -1, 0));
				} else {
					throw new Error("The dir should either be UP or DOWN instead got: " + dir);
				}
			} else {
				throw new Error("Type of Order should be a string or object!");
			}
		}

		return results;
	}

	private checkKeyInclusion(orderKey: string) {
		let columns: string[] = this.colArray;
		if (this.aggregator === undefined) {
			if (!columns.includes(orderKey)) {
				throw new Error("Sorting Key must be in Column Array!");
			}
		} else {
			if (!columns.includes(orderKey) && !this.aggregator.columnsAggregated.includes(orderKey)) {
				throw new Error("Sorting Key must be in Column Array or Aggregated Columns!");
			}
		}
	}

	// referred to answers in stackoverflow link: https://stackoverflow.com/questions/1129216/sort-array-of-objects-by-string-property-value
	private dynamicOrder(keys: string[], dir: number, index: number) {
		return (a: InsightResult, b: InsightResult): number => {
			let aVal: string | number = a[keys[index]];
			let bVal: string | number = b[keys[index]];
			let aType = typeof aVal;
			let bType = typeof bVal;
			if ((aType === "string" && bType === "string") || (aType === "number" && bType === "number")) {
				if (aVal < bVal) {
					return -1 * dir;
				} else if (aVal > bVal) {
					return dir;
				} else if (keys.length - 1 === index && aVal === bVal) {
					return 0;
				}
				let nextKeyComparison = this.dynamicOrder(keys, dir, index + 1);
				return nextKeyComparison(a, b);
			}

			throw new Error("Comparison of Values in Order have invalid or unequal types: aValType");
		};
	}

	private extractID(arr: string[]): string {
		let id: string = arr[0].split("_")[0];
		arr.forEach((currIndex: string) => {
			if (currIndex.includes("_")) {
				let currID = currIndex.split("_")[0];
				if (currID !== id) {
					throw new Error("Cannot have more than one dataset!");
				}
				id = currID;
			} else if (this.aggregator !== undefined && this.aggregator.columnsAggregated.includes(currIndex)) {
				console.log("New Apply Column!");
			} else {
				throw new Error("Invalid Query Key --> " + currIndex);
			}
		});
		return id;
	}
}
