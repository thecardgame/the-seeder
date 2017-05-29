#!/usr/bin/env node
'use strict';

const _ = require('lodash');

const fs = require('fs');
const path = require('path');
const process = require('process');

const {Lokka} = require('lokka');
const {Transport} = require('lokka-transport-http');
const Q = require('q');

const cardDir = './cah-sets/formatted';

const headers = {
	Authorization: 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE0OTU0MDI0NzQsImNsaWVudElkIjoiY2l1dXhlOGNvMHMzNzAxNTFpdzVkdmYyeSIsInByb2plY3RJZCI6ImNqMno1c3M3NTN6cGMwMTc2MG5nNmhqanIiLCJwZXJtYW5lbnRBdXRoVG9rZW5JZCI6ImNqMno4MHU2MTR1OWQwMTkweGo5dG5pZHIifQ.4Xi5v-QjzThlPkeYPaivcqvvnFlboaI8PWMflkOak58'
};

const client = new Lokka({
	transport: new Transport('https://api.graph.cool/simple/v1/cj2z5ss753zpc01760ng6hjjr', {headers})
});

/*
	Utility Helpers
 */
const readDirAsync = Q.denodeify(fs.readdir);
const readFileAsync = Q.denodeify(fs.readFile);

/*
 	Create Card Set
 */
const createCardSet = (cardSet) => {

	return client.mutate(`
	{
		cardSet: createCardSet(
	      	title: "${cardSet.title}"
		) {id}
	}
	`);

};

/*
 	Create White Cards
 */
const createWhiteCard = (whiteCard) => {
	if(!whiteCard) {return}

	return client.mutate(`
	{
		whiteCard: createWhiteCard(
			text: "${whiteCard.text}",
			cardType: ${whiteCard.cardType}
		) {id}
	}
	`);
};
const createWhiteCardFactory = (whiteCard) => {
	return function() {
		return createWhiteCard(whiteCard)
			.then((result) => result.whiteCard.id)
	}
};
const createWhiteCards = (whiteCards) => {

	const deferred = Q.defer();
	const whiteCardIds = [];

	let chain = Q.when();

	whiteCards.forEach((whiteCard) => {
		chain = chain.then(createWhiteCardFactory(whiteCard)).then((id) => whiteCardIds.push(id));
	});

	chain.then(() => deferred.resolve(whiteCardIds));

	return deferred.promise;

};

/*
 	Create Black Cards
 */
const createBlackCard = (blackCard) => {
	if(!blackCard) {return}

	return client.mutate(`
	{
		blackCard: createBlackCard(
			text: "${blackCard.text}",
			cardType: ${blackCard.cardType},
			pick: ${blackCard.pick}
		) {id}
	}
	`);
};
const createBlackCardFactory = (blackCard) => {
	return function() {
		return createBlackCard(blackCard)
			.then((result) => result.blackCard.id)
	}
};
const createBlackCards = (blackCards) => {

	const deferred = Q.defer();
	const blackCardIds = [];

	let chain = Q.when();

	blackCards.forEach((blackCard) => {
		chain = chain.then(createBlackCardFactory(blackCard)).then((id) => blackCardIds.push(id));
	});

	chain.then(() => deferred.resolve(blackCardIds));

	return deferred.promise;

};

/*
 	Connect White Cards
 */
const connectWhiteCardAndCardSet = (whiteCardId, cardSetId) => {
	if(!whiteCardId || !cardSetId) {return}

	return client.mutate(`
		{
			addToWhiteCards(whiteCardsWhiteCardId: "${whiteCardId}", cardSetCardSetId: "${cardSetId}") {whiteCardsWhiteCard {id}}
		}
	`)
};
const connectWhiteCardAndCardSetFactory = (whiteCardId, cardSetId) => {
	return function() {
		return connectWhiteCardAndCardSet(whiteCardId, cardSetId);
	}
};
const connectWhiteCardsAndCardSet = (whiteCardIds, cardSetId) => {

	const deferred = Q.defer();

	let chain = Q.when();

	whiteCardIds.forEach((whiteCardId) => {
		chain = chain.then(connectWhiteCardAndCardSetFactory(whiteCardId, cardSetId));
	});

	chain.then(() => deferred.resolve('connected whites'));

	return deferred.promise;

};

/*
 	Connect Black Cards
 */
const connectBlackCardAndCardSet = (blackCardId, cardSetId) => {
	if(!blackCardId || !cardSetId) {return}

	return client.mutate(`
		{
			addToBlackCards(blackCardsBlackCardId: "${blackCardId}", cardSetCardSetId: "${cardSetId}") {blackCardsBlackCard {id}}
		}
	`);
};
const connectBlackCardAndCardSetFactory = (blackCardId, cardSetId) => {
	return function() {
		return connectBlackCardAndCardSet(blackCardId, cardSetId);
	}
};
const connectBlackCardsAndCardSet = (blackCardIds, cardSetId) => {

	const deferred = Q.defer();

	let chain = Q.when();

	blackCardIds.forEach((blackCardId) => {
		chain = chain.then(connectBlackCardAndCardSetFactory(blackCardId, cardSetId));
	});

	chain.then(() => deferred.resolve('connected whites'));

	return deferred.promise;

};

/*
	Handle Files
 */
const handleFile  = (filePath) => {

	const deferred = Q.defer();

	// Card Set
	let cs;

	let whiteCardIds, blackCardIds, cardSetId;

	readFileAsync(filePath, 'utf8')
		.then((fileContent) => {
			console.log('read file');
			cs = JSON.parse(fileContent);
			return cs;
		})
		.then((cardSet) => {
			console.log('parsed file');
			return createWhiteCards(cs.whiteCards);
		})
		.then((whiteIds) => {
			console.log('created white cards');
			whiteCardIds = whiteIds;
			return createBlackCards(cs.blackCards);
		})
		.then((blackIds) => {
			console.log('created black cards');
			blackCardIds = blackIds;
			return createCardSet(cs);
		})
		.then((result) => {
			console.log('created card set');
			cardSetId = result.cardSet.id;
			return Q.resolve;
		})
		.then(() => {
			return connectWhiteCardsAndCardSet(whiteCardIds, cardSetId);
		})
		.then(() => {
			console.log('connected white cards');
			return connectBlackCardsAndCardSet(blackCardIds, cardSetId);
		})
		.then(() => {
			console.log('connected black cards');
			deferred.resolve();
		});

	return deferred.promise;
	
};
const handleFileFactory = (file) => {
	return function() {
		return handleFile(file);
	}
};
const handleFiles = readDirAsync(cardDir).then((files) => {

	const deferred = Q.defer();

	let chain = Q.when();

	files.forEach((file) => {
		chain = chain.then(handleFileFactory(path.join(cardDir, file)));
	});

	chain.then(() => deferred.resolve('numse'));

	return deferred.promise;

});

handleFiles
	.then(() => {
		console.log('')
	})
	.catch((why) => console.log(why));