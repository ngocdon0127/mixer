## Prerequisites

- [NodeJS 6.x](https://nodejs.org/en/download/)

- [MongoDB Community](https://www.mongodb.com/download-center#community)

## Config

### 1. From the root of source code, run these commands:

	$ cp config/config.js.example config/config.js
	$ cp config/index.js.example config/index.js
	$ npm install

 
### 2. Config database

##### Start MongoDB
	$ mongod --dbpath="path\to\mongodb\storage\directory"

##### Change line 7 in file config/config.js from url: ``'mongodb://user:pwd@127.0.0.1:27017/mixer'`` to the real user and password

### 3. Install pm2
	$ npm install -g pm2

## Run

### From the root of source code:

	$ npm install
	$ pm2 start bin/www --name mixer

## Use

Open [http://localhost:9999](http://localhost:9999) or [http://127.0.0.1:9999](http://127.0.0.1:9999) in browser (Chrome, Firefox, ...)

## Stop
	$ pm2 delete mixer