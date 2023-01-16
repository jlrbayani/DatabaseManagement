import express, {Application, Request, Response} from "express";
import * as http from "http";
import cors from "cors";

import InsightFacade from "../../src/controller/InsightFacade";
import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";

export default class Server {
	private readonly port: number;
	private express: Application;
	private server: http.Server | undefined;

	public static facade: InsightFacade = new InsightFacade();

	constructor(port: number) {
		console.info(`Server::<init>( ${port} )`);
		this.port = port;
		this.express = express();

		this.registerMiddleware();
		this.registerRoutes();

		// NOTE: you can serve static frontend files in from your express server
		// by uncommenting the line below. This makes files in ./frontend/public
		// accessible at http://localhost:<port>/
		this.express.use(express.static("./frontend/public"));
	}

	/**
	 * Starts the server. Returns a promise that resolves if success. Promises are used
	 * here because starting the server takes some time and we want to know when it
	 * is done (and if it worked).
	 *
	 * @returns {Promise<void>}
	 */
	public start(): Promise<void> {
		return new Promise((resolve, reject) => {
			console.info("Server::start() - start");
			if (this.server !== undefined) {
				console.error("Server::start() - server already listening");
				reject();
			} else {
				this.server = this.express
					.listen(this.port, () => {
						console.info(`Server::start() - server listening on port: ${this.port}`);
						console.log("Address: http://localhost:4321");
						resolve();
					})
					.on("error", (err: Error) => {
						// catches errors in server start
						console.error(`Server::start() - server ERROR: ${err.message}`);
						reject(err);
					});
			}
		});
	}

	/**
	 * Stops the server. Again returns a promise so we know when the connections have
	 * actually been fully closed and the port has been released.
	 *
	 * @returns {Promise<void>}
	 */
	public stop(): Promise<void> {
		console.info("Server::stop()");
		return new Promise((resolve, reject) => {
			if (this.server === undefined) {
				console.error("Server::stop() - ERROR: server not started");
				reject();
			} else {
				this.server.close(() => {
					console.info("Server::stop() - server closed");
					resolve();
				});
			}
		});
	}

	// Registers middleware to parse request before passing them to request handlers
	private registerMiddleware() {
		// JSON parser must be place before raw parser because of wildcard matching done by raw parser below
		this.express.use(express.json());
		this.express.use(express.raw({type: "application/*", limit: "10mb"}));

		// enable cors in request headers to allow cross-origin HTTP requests
		this.express.use(cors());
	}

	// Registers all request handlers to routes
	private registerRoutes() {
		// This is an example endpoint this you can invoke by accessing this URL in your browser:
		// http://localhost:4321/echo/hello
		this.express.get("/echo/:msg", Server.echo);

		// TODO: your other endpoints should go here

		this.express.get("/datasets", Server.get);
		this.express.put("/dataset/:id/:kind", Server.put);
		this.express.delete("/dataset/:id", Server.delete);
		this.express.post("/query", Server.post);
	}

	private static get(req: Request, res: Response) {
		console.log("Server::list(..)");
		const response = Server.facade.listDatasets();
		response.then((list: InsightDataset[]) => {
			// console.log("List", list);
			res.status(200).json({result: list});
			// res.contentType("application/json"); // Not sure if needed
		})
			.catch((err) => {
				res.status(400).json({error: "Should not have given error for list dataset" + err.toString()});
			});
	}

	private static post(req: Request, res: Response) {
		try {
			console.log("Server::post(..)");
			const response = Server.facade.performQuery(req.body);
			response
				.then((list: InsightResult[]) => {
					// console.log("Results: ", list);
					res.status(200).json({result: list});
					// res.contentType("application/json"); // Not sure if needed
				})
				.catch((err) => {
					// console.log("Error: " + err);
					res.status(400).json({error: err.toString()});
				});
		} catch (err: any) {
			// console.log("Error: " + err);
			// console.log("body: " + JSON.stringify(req.body));
			res.status(400).json({error: err.toString()});
		}
	}

	private static delete(req: Request, res: Response) {
		try {
			console.log(`Server::delete(..) - params: ${JSON.stringify(req.params)}`);
			let id = req.params.id;
			const response = Server.facade.removeDataset(id);
			response
				.then((idRemoved: string) => {
					// console.log("Removed id: " + idRemoved);
					res.status(200).json({result: idRemoved});
				})
				.catch((err) => {
					if (err instanceof InsightError) {
						res.status(400).json({error: err.toString()});
					} else if (err instanceof NotFoundError) {
						res.status(404).json({error: err.toString()});
					} else {
						res.status(400).json({error: err.toString() + "Not an instance of InsightError!"});
					}
				});
			// res.contentType("application/json"); // Not sure if needed
		} catch (err: any) {
			if (err instanceof InsightError) {
				res.status(400).json({error: err.toString()});
			} else if (err instanceof NotFoundError) {
				res.status(404).json({error: err.toString()});
			} else {
				res.status(400).json({error: "Not an InsightError: " + err.toString()});
			}
		}
	}

	private static put(req: Request, res: Response) {
		try {
			console.log(`Server::put(..) - params: ${JSON.stringify(req.params)}`);
			let id = req.params.id;
			let kindString = req.params.kind;
			let response: Promise<string[]>;
			let content = req.body.toString("base64");
			if (kindString === "courses") {
				response = Server.facade.addDataset(id, content, InsightDatasetKind.Courses);
			} else if (kindString === "rooms") {
				response = Server.facade.addDataset(id, content, InsightDatasetKind.Rooms);
			} else {
				response = Promise.reject(new InsightError("Invalid Kind"));
			}

			response
				.then((idList: string[]) => {
					res.status(200).json({result: idList});
					// console.log("newIdList: " + idList);
				})
				.catch((err) => {
					res.status(400).json({error: err.toString()});
					// console.log(err);
				});
		} catch (err: any) {
			res.status(400).json({error: err.toString()});
			// console.log(err);
		}
	}

	// The next two methods handle the echo service.
	// These are almost certainly not the best place to put these, but are here for your reference.
	// By updating the Server.echo function pointer above, these methods can be easily moved.
	private static echo(req: Request, res: Response) {
		try {
			console.log(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
			const response = Server.performEcho(req.params.msg);
			res.status(200).json({result: response});
		} catch (err) {
			res.status(400).json({error: err});
		}
	}

	private static performEcho(msg: string): string {
		if (typeof msg !== "undefined" && msg !== null) {
			return `${msg}...${msg}`;
		} else {
			return "Message not provided";
		}
	}
}
