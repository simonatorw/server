const http = require('http');
const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');

const host = '127.0.0.1';
const port = 8124;

function allowCrossDomain(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
}

function sendResponse(name, dir, res) {
	let filePath;
	console.log(`./app/resource/${dir}/${name}Data.json`);
	if (dir) {
		filePath = path.join(__dirname, `./app/resource/${name}/${dir}Data.json`);
	} else {
		filePath = path.join(__dirname, `./app/resource/${name}Data.json`);
	}

	if (fs.existsSync(filePath)) {
		//res.header('Cache-Control', 'public, max-age=31536000');
		res.header('Cache-Control', 'public, max-age=0');
		res.header('Last-Modified', 'Mon, 03 Jan 2011 17:45:57 GMT');

		const readable = fs.createReadStream(filePath);

		readable.pipe(res);
	} else {
		console.log('No such file!');
	}
}

class LiveData {
	constructor(res, timeout, config) {
		this.res = res;
		this.config = config;
		this.old = {};
		this.setInstances(config);
		this.writeHeaders();
		this.simulateLiveData();
		setInterval(() => { this.simulateLiveData() }, timeout);
	}

	writeHeaders() {
		this.res.header('Content-Type', 'text/event-stream');
		this.res.header('Cache-Control', 'no-cache');
		this.res.header('Connection', 'keep-alive');			
	}
	
	setInstances(config) {
		for (let i = 0; i < config.length; i++) {
			this.old[config[i].row];
		}
	}
	
	simulateLiveData() {
		const val = {};
		const configMax = this.config.length;

		for (let i = 0; i < this.config.length; i++) {
			val[this.config[i].row] = this.old[this.config[i].row];
		}
		
		let max;
		
		if (val[this.config[0].row] !== undefined) {
			max = Math.floor(Math.random() * configMax) + 1;
		} else {
			max = configMax;
		}
	
		const keys = Object.keys(val);
		
		for (let i = 0; i < max; i++) {
			const indx = val[this.config[i].row] !== undefined ? Math.floor(Math.random() * configMax) : i;
		
			val[keys[indx]] = this.config[indx].formula();
		}
		//console.log(max, val.pnl, val.varVal, val.ret, val.beta, val.alpha);
		
		const tick = {};
		
		for (let i = 0; i < this.config.length; i++) {		
			tick[this.config[i].row] = val[this.config[i].row] !== undefined ? (val[this.config[i].row] > this.old[this.config[i].row] ? 'up' : val[this.config[i].row] < this.old[this.config[i].row] ? 'down': 'none') : 'none';
		}
		
		let responseStr = `data: [`;
		
		for (let i = 0; i < this.config.length; i++) {
			const comma = i === this.config.length - 1 ? `` : `,`;
			
			let dataTpl = this.config[i].tpl;
			
			dataTpl = dataTpl.replace('[val]', val[this.config[i].row]);
			dataTpl = dataTpl.replace('[tick]', tick[this.config[i].row]);
			responseStr = `${responseStr}${dataTpl}${comma}`;
		}
		responseStr = `${responseStr}]\n\n`;
		
		this.res.write(responseStr);
		this.res.flushHeaders();
		
		for (let i = 0; i < this.config.length; i++) {
			this.old[this.config[i].row] = val[this.config[i].row];
		}
	}
}

class LiveNews {
	constructor(res, timeout) {
		this.res = res;
		this.writeHeaders();
		this.simulateLiveData();
		setInterval(() => { this.simulateLiveData() }, timeout);
	}

	writeHeaders() {
		this.res.header('Content-Type', 'text/event-stream');
		this.res.header('Cache-Control', 'no-cache');
		this.res.header('Connection', 'keep-alive');			
	}

	getDateTime() {
		const d = new Date();
		const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
		
		return `${monthNames[d.getMonth()]} ${d.getDate()} ${d.getHours()}:${d.getMinutes()}`;
	}
	
	simulateLiveData() {
		const responseStr = `data: { "headline": { "text": "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa.", "url": "https://www.yahoo.com/news/", "tick": "up" }, "published": { "value": "${this.getDateTime()}", "tick": "up" }}\n\n`;
		
		this.res.write(responseStr);
		this.res.flushHeaders();
	}
}

function pushResponse(name, res) {
	const serviceName = name.toLowerCase();
	
	switch(serviceName) {
		case 'dailyperformancert':
			new LiveData(res, 3000, [
				{ row: 'pnl', formula: () => Math.floor(Math.random() * 60) + 10, tpl: `{ "value": "$[val]M", "tick": "[tick]" }` },
				{ row: 'varVal', formula: () => Math.round(((Math.random() * 3 + 1) * (Math.floor(Math.random()*2) === 1 ? 1 : -1)) * 100) /100, tpl: `{ "value": "[val]%", "tick": "[tick]" }` },
				{ row: 'ret', formula: () => Math.round(((Math.random() * 3 + 1) * (Math.floor(Math.random()*2) === 1 ? 1 : -1)) * 100) /100, tpl: `{ "value": "[val]%", "tick": "[tick]" }` },
				{ row: 'beta', formula: () => Math.round(((Math.random() * 3 + 1) * (Math.floor(Math.random()*2) === 1 ? 1 : -1)) * 100) /100, tpl: `{ "value": "[val]%", "tick": "[tick]" }` },
				{ row: 'alpha', formula: () => Math.round(((Math.random() * 3 + 1) * (Math.floor(Math.random()*2) === 1 ? 1 : -1)) * 100) /100, tpl: `{ "value": "[val]%", "tick": "[tick]" }` }			
			]);
			break;
		case 'equitypositionsrt':
			const config = [];
			for (let i = 0; i < 10; i++) {
				config.push({ row: 'ep_' + i, formula: () => Math.round(((Math.random() * 3 + 1) * (Math.floor(Math.random()*2) === 1 ? 1 : -1)) * 10) /10, tpl: `{ "value": "[val]%", "tick": "[tick]" }` });
			}		
			new LiveData(res, 4500, config);
			break;
		case 'marketheadlinesrt':
			new LiveNews(res, 60000);
			break;
	}
}

app.use(allowCrossDomain);

const server = require('http').createServer(app);

server.listen(port, host);
console.log(`Server running at http://${host}:${port}`);

app.get('*', function(req, res) {
	console.log(req.url);
	sendResponse(req.url.split('/')[1], req.url.split('/')[2], res);
	pushResponse(req.url.split('/')[1], res);
});

