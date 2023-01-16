"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const InsightFacade_1 = __importDefault(require("../../src/controller/InsightFacade"));
const IInsightFacade_1 = require("../../src/controller/IInsightFacade");
class Server {
    constructor(port) {
        console.info(`Server::<init>( ${port} )`);
        this.port = port;
        this.express = (0, express_1.default)();
        this.registerMiddleware();
        this.registerRoutes();
        this.express.use(express_1.default.static("./frontend/public"));
    }
    start() {
        return new Promise((resolve, reject) => {
            console.info("Server::start() - start");
            if (this.server !== undefined) {
                console.error("Server::start() - server already listening");
                reject();
            }
            else {
                this.server = this.express
                    .listen(this.port, () => {
                    console.info(`Server::start() - server listening on port: ${this.port}`);
                    console.log("Address: http://localhost:4321");
                    resolve();
                })
                    .on("error", (err) => {
                    console.error(`Server::start() - server ERROR: ${err.message}`);
                    reject(err);
                });
            }
        });
    }
    stop() {
        console.info("Server::stop()");
        return new Promise((resolve, reject) => {
            if (this.server === undefined) {
                console.error("Server::stop() - ERROR: server not started");
                reject();
            }
            else {
                this.server.close(() => {
                    console.info("Server::stop() - server closed");
                    resolve();
                });
            }
        });
    }
    registerMiddleware() {
        this.express.use(express_1.default.json());
        this.express.use(express_1.default.raw({ type: "application/*", limit: "10mb" }));
        this.express.use((0, cors_1.default)());
    }
    registerRoutes() {
        this.express.get("/echo/:msg", Server.echo);
        this.express.get("/datasets", Server.get);
        this.express.put("/dataset/:id/:kind", Server.put);
        this.express.delete("/dataset/:id", Server.delete);
        this.express.post("/query", Server.post);
    }
    static get(req, res) {
        console.log("Server::list(..)");
        const response = Server.facade.listDatasets();
        response.then((list) => {
            res.status(200).json({ result: list });
        })
            .catch((err) => {
            res.status(400).json({ error: "Should not have given error for list dataset" + err.toString() });
        });
    }
    static post(req, res) {
        try {
            console.log("Server::post(..)");
            const response = Server.facade.performQuery(req.body);
            response
                .then((list) => {
                res.status(200).json({ result: list });
            })
                .catch((err) => {
                res.status(400).json({ error: err.toString() });
            });
        }
        catch (err) {
            res.status(400).json({ error: err.toString() });
        }
    }
    static delete(req, res) {
        try {
            console.log(`Server::delete(..) - params: ${JSON.stringify(req.params)}`);
            let id = req.params.id;
            const response = Server.facade.removeDataset(id);
            response
                .then((idRemoved) => {
                res.status(200).json({ result: idRemoved });
            })
                .catch((err) => {
                if (err instanceof IInsightFacade_1.InsightError) {
                    res.status(400).json({ error: err.toString() });
                }
                else if (err instanceof IInsightFacade_1.NotFoundError) {
                    res.status(404).json({ error: err.toString() });
                }
                else {
                    res.status(400).json({ error: err.toString() + "Not an instance of InsightError!" });
                }
            });
        }
        catch (err) {
            if (err instanceof IInsightFacade_1.InsightError) {
                res.status(400).json({ error: err.toString() });
            }
            else if (err instanceof IInsightFacade_1.NotFoundError) {
                res.status(404).json({ error: err.toString() });
            }
            else {
                res.status(400).json({ error: "Not an InsightError: " + err.toString() });
            }
        }
    }
    static put(req, res) {
        try {
            console.log(`Server::put(..) - params: ${JSON.stringify(req.params)}`);
            let id = req.params.id;
            let kindString = req.params.kind;
            let response;
            let content = req.body.toString("base64");
            if (kindString === "courses") {
                response = Server.facade.addDataset(id, content, IInsightFacade_1.InsightDatasetKind.Courses);
            }
            else if (kindString === "rooms") {
                response = Server.facade.addDataset(id, content, IInsightFacade_1.InsightDatasetKind.Rooms);
            }
            else {
                response = Promise.reject(new IInsightFacade_1.InsightError("Invalid Kind"));
            }
            response
                .then((idList) => {
                res.status(200).json({ result: idList });
            })
                .catch((err) => {
                res.status(400).json({ error: err.toString() });
            });
        }
        catch (err) {
            res.status(400).json({ error: err.toString() });
        }
    }
    static echo(req, res) {
        try {
            console.log(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
            const response = Server.performEcho(req.params.msg);
            res.status(200).json({ result: response });
        }
        catch (err) {
            res.status(400).json({ error: err });
        }
    }
    static performEcho(msg) {
        if (typeof msg !== "undefined" && msg !== null) {
            return `${msg}...${msg}`;
        }
        else {
            return "Message not provided";
        }
    }
}
exports.default = Server;
Server.facade = new InsightFacade_1.default();
//# sourceMappingURL=Server.js.map