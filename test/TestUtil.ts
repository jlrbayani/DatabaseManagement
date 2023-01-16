import * as fs from "fs-extra";

const persistDir = "./data";

function getContentFromArchives(name: string): string {
	return fs.readFileSync(`test/resources/archives/${name}`).toString("base64");
}

function getContentFromArchivesRaw(name: string): Buffer {
	console.log(name);
	return fs.readFileSync(`test/resources/archives/${name}`);
}

function clearDisk() {
	fs.removeSync(persistDir);
}

export {getContentFromArchives, getContentFromArchivesRaw, persistDir, clearDisk};
