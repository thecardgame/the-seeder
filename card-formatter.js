#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const process = require('process');

const progress = require('progress');
const chalk = require('chalk');
const Table = require('tty-table');
const ora = require('ora');
const now = require('performance-now');

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

const tableHeader = [
  {
    value: '',
    width: 30
  },
  {
    value: 'White Cards'
  },
  {
    value: 'Black Cards'
  },
  {
    value: 'Total Cards'
  }
];
const tableRows = [];

const taskStartTimer = now();

const spinner = ora('Processing files').start();

if(fs.existsSync(cardOutDir)) {
  spinner.text = 'Emptying output directory';
  fs.readdirSync(cardOutDir).forEach((file) => {
    fs.unlinkSync(path.join(cardOutDir, file));
  });
} else {
  spinner.text = 'Creating output directory';
  fs.mkdirSync(cardOutDir);
}

fs.readdir(cardDir, (err, files) => {
  if(err) {
    spinner.fail('Error reading directory.', err);
    process.exit(1);
  }

  let totalWhiteCardsSum = 0;
  let totalBlackCardsSum = 0;
  let totalDecksSum = 0;

  files.forEach((file) => {
    if(fs.lstatSync(path.join(cardDir, file)).isDirectory()) {
      return;
    }

    const fileName = file;
    const fileContents = fs.readFileSync(path.join(cardDir, file), 'utf-8');
    const jsonFileContents = JSON.parse(fileContents);
    
    const cardsetName = determineHumanReadableCardsetName(jsonFileContents.order[0]);

    const cardSet = Object.assign({}, cardSetOutputFormat, {title: cardsetName});

    totalBlackCardsSum += cardSet.blackCards.length;
    totalWhiteCardsSum += cardSet.whiteCards.length;
    totalDecksSum++;

    jsonFileContents.whiteCards.forEach((card) => {
      cardSet.whiteCards.push(parseAndCreateCard(card, whiteCardEnumValue));
    });
    jsonFileContents.blackCards.forEach((card) => {
      cardSet.blackCards.push(parseAndCreateCard(card, blackCardEnumValue));
    });

    fs.writeFileSync(path.join(cardOutDir, fileName), JSON.stringify(cardSet));
    
    tableRows.push([cardSet.title, cardSet.whiteCards.length, cardSet.blackCards.length, (cardSet.whiteCards.length + cardSet.blackCards.length)]);

  });
  
  spinner.stop();
  
  const taskEndTimer = now();
  
  tableRows.push(['Total Cards', totalWhiteCardsSum, totalBlackCardsSum, (totalWhiteCardsSum + totalBlackCardsSum)]);
  
  const outputTable = Table(tableHeader, tableRows, {
    borderStyle : 1,
    align: 'right',
    headerAlign: 'right',
    paddingLeft: 1,
    paddingRight: 1,
    
  });
  console.log(outputTable.render());
  
  spinner.succeed(chalk.green(` Finished formatting files after ${(taskEndTimer - taskStartTimer).toFixed(3)}ms\n   Created ${totalDecksSum} new decks\n`));

});

function parseAndCreateCard(inputObj, cardType) {
  if(cardType === 'undefined' || cardType.length < 0 || cardType === null) {
    console.error("Missing Card Type.");
    process.exit(1);
  }

  let card = Object.assign({}, cardOutputFormat);

  card.cardType = cardType;

  const cardText = typeof inputObj === 'string' ? inputObj : inputObj.text;

  card.text = cardText.escapeSpecialChars();

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

String.prototype.escapeSpecialChars = function() {
	return this.replace(/\"/g, '\\"')
};