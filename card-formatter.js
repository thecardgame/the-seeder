#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const process = require('process');

const progress = require('progress');
const chalk = require('chalk');

const cardDir = './cah-sets';
const cardOutDir = './cah-sets/formatted';

const whiteCardEnumValue = 0;
const blackCardEnumValue = 1;

const cardSetOutputFormat = {
  whiteCards: [],
  blackCards: [],
  title: '',
  description: '',
  rating: null
};

const cardOutputFormat = {
  cardType: null,
  rating: null,
  text: ''
};

if(fs.existsSync(cardOutDir)) {
  console.log('Emptying Output Directory.');
  fs.readdirSync(cardOutDir).forEach((file) => {
    fs.unlinkSync(path.join(cardOutDir, file));
  });
} else {
  console.log('Creating Output Directory.');
  fs.mkdirSync(cardOutDir);
}

fs.readdir(cardDir, (err, files) => {
  if(err) {
    console.error("Error reading directory.", err);
    process.exit(1);
  }

  files.forEach((file) => {
    if(fs.lstatSync(path.join(cardDir, file)).isDirectory()) {
      return;
    }

    const fileName = file;
    const fileContents = fs.readFileSync(path.join(cardDir, file), 'utf-8');
    const jsonFileContents = JSON.parse(fileContents);

    const cardsetName = determineHumanReadableCardsetName(jsonFileContents.order[0]);
    console.log('Creating Set:', cardsetName, 'from file:', path.join(cardDir, file));

    const cardSet = Object.assign({}, cardSetOutputFormat, {title: cardsetName});

    jsonFileContents.whiteCards.forEach((card) => {
      cardSet.whiteCards.push(parseAndCreateCard(card, whiteCardEnumValue));
    });
    jsonFileContents.blackCards.forEach((card) => {
      cardSet.blackCards.push(parseAndCreateCard(card, blackCardEnumValue));
    });

    fs.writeFileSync(path.join(cardOutDir, fileName), JSON.stringify(cardSet));

  });

});

function parseAndCreateCard(inputObj, cardType) {
  if(cardType === 'undefined' || cardType.length < 0 || cardType === null) {
    console.error("Missing Card Type.");
    process.exit(1);
  }

  let card = Object.assign({}, cardOutputFormat);

  card.cardType = cardType;
  card.text = typeof inputObj === 'string' ? inputObj : inputObj.text;

  if(cardType === 1) {
    card.pick = inputObj.pick;
  }

  return card;
}

function determineHumanReadableCardsetName(cardsetName) {

  switch(cardsetName) {
    case 'Base':
      return 'Base Set';
    case 'CAHe4':
      return 'Blue Box - Set 1';
    case 'CAHe5':
      return 'Blue Box - Set 2';
    case 'CAHe6':
      return 'Blue Box - Set 3';
    case 'greenbox':
      return 'Green Box';
    case 'CAHe1':
      return 'Red Box - Set 1';
    case 'CAHe2':
      return 'Red Box - Set 2';
    case 'CAHe3':
      return 'Red Box - Set 3';
    default:
      console.error("Error determining cardset name - dont forget to add it to the switch case.", cardsetName);
      process.exit(1);
      break;
  }

}

