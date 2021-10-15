// Require Modules
const path = require('path');
const express = require('express');
const axios = require('axios');

// Getting the database model
const Snapshot = require('./db/Models.js')[0]
const sequelize = require('./db/Models.js')[1]

//********** [Expressjs App] **********\\

const app = express();

// A) Using express middleware to parse json
app.use(express.json())

// B) Using express middleware to serve static files from the directory
app.use(express.static(__dirname))

// C)Setting the view engine (for /list)
app.set('view engine', 'pug');

// D) Setting some variables to be used in different routes
let fullInfo;
let fullUnitedText;

const googleAPIKey = process.env.GOOGLE_API_KEY
const wordAPIKey = process.env.WORD_API_KEY


// E) Starting the database
async function synchronizeDb() {
    await Snapshot.sync();
}
synchronizeDb()

//********** ROUTES

// C) Response to GET request at root 
app.get('/', (req, res) => {

	// Send the "index.html" main HTML file
    res.sendFile(path.join(__dirname+'/index.html'))
})

// D) Response to POST request at /posted ("MAIN APP")
app.post('/posted', (req, res) => { 
	console.log('POSTED') // <- CAN BE REMOVED
	
	// a) Get text from the Editor and clean it to ready it for the API's -->

		// 1) Get the json "text blocks" from editorjs into the "fullText" string
		
		let fullText = '';
		for (i=0; i<req.body.blocks.length; i++) {
			fullText += req.body.blocks[i].data.text + ' '
		}

		fullUnitedText = fullText

		// 2) Replace all tags in the "fullText" string
		fullText = fullText.replace(/<(.*?)>/gm, ' ')

		// 3) !!!End the program if there is less than 20 words!!!
		if (!fullText || fullText.match(/(\w|\’)+/g).length < 20) {
			res.status(400).send('Bad Request')
			return
		}

		// 4) Remove all punctuation signs
		fullText = fullText.replace(/,|\.|:|;|&|%|@|\[|\]|{|}|\(|\)|\/|\\|\*|–|—|_|\?|¿|!|¡|"|“|”|‘|’|'|=|\+|÷|\.\.\.|≈|/gm, '')
		

//********** API'S

	//********** [I -> Google NLP] **********\\

	// b) New Promise that resolves when the whole text is sent back
	new Promise((rs, rj) => {

		// 1) Settings for the request
		const options = {
			method: 'POST',
			url: `https://language.googleapis.com/v1beta2/documents:annotateText?key=${googleAPIKey}`,
			data: {
				"document": {
					"type": "PLAIN_TEXT",
					"language": "",
					"content": fullText
				  },
					"features": {
					  "extractSyntax": true,
					  "extractEntities": true,
					  "extractDocumentSentiment": false,
					  "extractEntitySentiment": false,
					  "classifyText": true
				  },
					"encodingType": "UTF8"
			}
		}

		// 2) The request itself done via axios
		axios.request(options)

		// 3) When the data gets here without any errors resolve with a new object
		.then((response) => {
			rs({
				wordsInfo: response.data.tokens,
				entities: response.data.entities
			})
		})

		// 4) If there's an error
		.catch((error) => {
			if (error.code == 'ENOTFOUND') {
				res.status(404).send({ error: "Bad request" })
			} else {
				res.status(500).send({ error: "The Google NLP isn't working" })
				rj(`Google NLP request failed: ${error}`)
			}
		})


	// c) Formatting the info when the request is resolved
	}).then((googleNLP) => {

		// 1) Setting variables to simplify the code
		const entities = googleNLP.entities
		let wordsInfo = googleNLP.wordsInfo
		
		// 2) Variables to store wikipedia information and the location of Proper nouns
		let wikiInformation = []
		let entitiesLocations = []

		// 3) Looping over GNLP entities to find wikipedia information and the location of all Proper nouns
		for (i=0; i<entities.length; i++) {
				
				// Getting the name and wikipedia links
				if (entities[i].metadata && entities[i].metadata.wikipedia_url) {
					wikiInformation.push({
						concept: entities[i].name,
						url: entities[i].metadata.wikipedia_url
					})
				}

			// Getting the location of any proper noun even if there's no wikipedia link
			for (n=0; n<entities[i].mentions.length; n++) {
				if (entities[i].mentions[n].type == "PROPER") {
					entitiesLocations.push([entities[i].mentions[n].text.beginOffset, entities[i].mentions[n].text.content])
				}
			}
		}
 
		// 4) Removing any proper noun word from the word list
		wordsInfo.forEach((element, index) => {
			for (i=0; i<entitiesLocations.length; i++) {
				if (element.text.beginOffset == entitiesLocations[i][0] && element.text.content == entitiesLocations[i][1]) {
					wordsInfo.splice(index, 1)
				}
			}
		});		
		
		// 5) Removing repetitive words (even if they're in different cases (lowercase))
		wordsInfo = wordsInfo.filter((item, position) => {
			var firstPosition = wordsInfo.findIndex((e) => e.lemma.toLowerCase() == item.lemma.toLowerCase())
			return firstPosition == position;
		})

		// 6) Package all the GNLP info with the separated wikipedia info
		var wikiAndWords = {
			wordsInfo: wordsInfo,
			wikiInformation: wikiInformation
		}
		
		// 7) Return the googleNLP
		return wikiAndWords
		
	// d) Calling wordApi (for word frequency) and the wikipedia API
	}).then((wikiAndWords) => {

		// 1) Variables to simplify the code
		let wordsInfo = wikiAndWords.wordsInfo
		let wikiInformation = wikiAndWords.wikiInformation
		
		//********** [II -> WORD API] **********\\

		// 2) Array to put all the promises of the requests made to the wordApi
		let wordsPromises = [];

		// 3) Send all words in the GNLP list of words to the wordApi
		for (i=0; i<wordsInfo.length; i++) {
			wordsPromises[i] = new Promise((rs, rj) => {

				// 3a) Variables for the words themselves and their partOfSpeech
				const word = wordsInfo[i].lemma
				// .text.content
				const partOfSpeech = wordsInfo[i].partOfSpeech.tag

				// 3b) Settings for the request
				const options = {
					method: 'GET',
					url: `https://wordsapiv1.p.rapidapi.com/words/${word}/frequency`,
					headers: {
						'x-rapidapi-key': `${wordAPIKey}`,
						'x-rapidapi-host': 'wordsapiv1.p.rapidapi.com'
					},
					
					// Extra information to send (word and part of speech) so that the resolved promise contains it
					'wordinfo': {
						'word': word,
						'pos': partOfSpeech
					}
				};

				// 3c) The request itself
				axios.request(options)
				.then((response) => {

					// If there is no error resolved the promise with the frequency information
					rs({
						word: options.wordinfo.word,
						frequency: response.data.frequency,
						pos: options.wordinfo.pos
					})
				})

				// 	If there was an error in the wordApi reject
				.catch((error) => {
					if (error.response) {
						rj(`Word: '${error.config.wordinfo.word}'. there was an error when requesting this word to the wordAPI`)
					} else {
						rj(error.code)
					}
				})
			})
		}


		//********** [III -> WIKIPEDIA API] **********\\

		// 3) Array to put all the promises of the requests made to the wiki API
		let wikiInfoPromises = [];

		// 4) Regex to get the title of wikipedia pages from the wikipedia info object url's
		const regex = new RegExp("wiki/(.+)");

		// 5) Send all concepts in from the wikipedia info object to the wiki API
		for (i=0; i<wikiInformation.length; i++) {
			wikiInfoPromises[i] = new Promise((rs, rj) => {

				// 5a) Variables for the names and url's of the wiki articles
				const wikiTopic = wikiInformation[i].url.match(regex)[1]
				const wikiUrl = wikiInformation[i].url

				// 5b) The request settings
				const options = {
					method: 'GET',
					url: 'https://en.wikipedia.org/w/api.php?exintro&explaintext',
					params: {
						format: 'json',
						action: 'query',
						prop: 'extracts',
						titles: `${wikiTopic}`
					},
					wikiUrl: wikiUrl
				}

				// 5c) The request itself
				axios.request(options)
				.then((response) => {

					// If there's no errors resolve the promise with 1) An extract from the page 2) ... 3) The url
					rs({
						content: response.data.query.pages[Object.keys(response.data.query.pages)[0]],
						title: options.params.titles,
						wikiUrl: options.wikiUrl
					})
				})

				//If there was an error in the wikiAPI reject
				.catch((error) => {
					if (error.code == 'ENOTFOUND') {
						rj(error.code)
					} else {
						rj(`Topic: '${error.config.wordinfo.word}'. there was an error when requesting this Topic to the wikiAPI`)
					}
				})
			})
		}
		

		// e) Calling the dictionary API and getting the wikipedia thumbnail picture
		
		// 1) Check if all the previous promises where fullfilled
		const allPromises = [wordsPromises, wikiInfoPromises]
		Promise.all(allPromises.map((array) => {return Promise.allSettled(array)}))
		.then(wikiAndWords => {

			// 2) Getting the different responses into different variables
			let wordsInfo = wikiAndWords[0]
			const wikiInfo = wikiAndWords[1]


			//********** [IV -> DICTIONARY API] **********\\

			// 3) Array to put all the promises of the requests made to the dictionary API
			let wordsPromises = []

			// 4) Checking if the promise was rejected or if there's no frequency result
			wordsInfo = wordsInfo.filter(word => word.status != 'rejected')
			wordsInfo = wordsInfo.filter(word => word.value.frequency != null)

			// 5) Sort the words by their frequency.diversity
			wordsInfo = sortWords(wordsInfo)
			
			// 6) Send remaining words to the dictionary API
			for (i=0; i<wordsInfo.length; i++) {
				wordsPromises[i] = new Promise((rs, rj) => {

					// 6a) Variables for the word and it's info
					const word = wordsInfo[i].value.word
					const wordInfo = wordsInfo[i].value
			
					// 6b) Request settings
					const options = {
						method: 'GET',
						url: `https://api.dictionaryapi.dev/api/v2/entries/en_US/${word}`,
						'wordInfo': wordInfo
					}

					// 6c) The request itself
					axios.request(options)
					.then(function (response) {

						// If there's no errors resolve the promise sending word info and dictionary definition
						rs({
							wordInfo: options.wordInfo,
							dictionary: response.data
						})
					})

					// Error
					.catch(function (error) {

						// If there's an error reject the promise sending "Undefined"
						rj(undefined)
					});
				})
			}


			//********** [III B -> WIKIPEDIA API] **********\\

			// 7) Array to put all the promises of the requests made to wikipedia API
			let wikiInfoPromises = [];

			// 8) Make requests to get all thumbnail pictures
			for (i=0; i<wikiInfo.length; i++) {
				wikiInfoPromises[i] = new Promise((rs, rj) => {

					// 8a) Variables for the title and to send the extract and url too
					const wikiEntity = wikiInfo[i].value.title
					const wikiExtract = wikiInfo[i].value.content.extract
					const wikiUrl = wikiInfo[i].value.wikiUrl

					// 7b) Request settings
					const options = {
						method: 'GET',
						url: 'https://en.wikipedia.org/w/api.php?',
						params: {
							format: 'json',
							action: 'query',
							prop: 'pageimages',
							titles: wikiEntity,
							pithumbsize: 300
						},
						wikiExtract: wikiExtract,
						wikiUrl: wikiUrl
					}

					// 7c) The request itself
					axios.request(options)
					.then((response) => {

					// If there are no errors resolve the promise and send all the wiki information
						rs({
							topicInfo: response.data.query.pages[Object.keys(response.data.query.pages)[0]],
							extract: options.wikiExtract,
							wikiUrl: options.wikiUrl
						})
					})

					// Error
					.catch((error) => {

						// If there are errors reject by sending "undefined"
						rj(undefined)
					})
				})
			}


			// f) Getting the right dictionary definition, , sending back all that

			// 1) Check if all the previous promises where fullfilled
			const allPromises = [wordsPromises, wikiInfoPromises]
			Promise.all(allPromises.map((array) => {return Promise.allSettled(array)}))
			.then(wikiAndWords => {

				// 2) Getting the different responses into different variables
				let wordsInfo = wikiAndWords[0]
				let wikiInfo = wikiAndWords[1]
				
				// 3) Setting the array for all the words
				let words = []

				// 4) Removing words that couldn't get a dictionary definition
				wordsInfo = wordsInfo.filter((word) => word.status != 'rejected')
				
				// 5) Removing words that couldn't get a wikipedia definition
				wikiInfo = wikiInfo.filter((topic) => topic.status != 'rejected')

				// 6) Removing Entries that are missing something in their wiki info
				wikiInfo = wikiInfo.filter((topic) => topic.value.extract !== undefined && topic.value.extract != "")
				wikiInfo = wikiInfo.filter((topic) => topic.value.wikiUrl !== undefined && topic.value.wikiUrl != "")
				wikiInfo = wikiInfo.filter((topic) => {
					if (topic.value.topicInfo === undefined || topic.value.topicInfo == "") {
						return false
					} else if (topic.value.topicInfo.thumbnail === undefined || topic.value.topicInfo.thumbnail == "") {
						return false
					} else if (topic.value.topicInfo.thumbnail.source === undefined || topic.value.topicInfo.thumbnail.source == "") {
						return false
					} else {
						return true
					}
				})

				
				// 5) Looping over the dictionary responses to send the right one
				for (let i=0; i<wordsInfo.length; i++) {

					// 5a) removing words that have not the same lemma from the GNLP to the dictionary
					wordsInfo[i].value.dictionary = wordsInfo[i].value.dictionary.filter((dict) => dict.word == wordsInfo[i].value.wordInfo.word)

					// 5b) removing the entry completely if the dictionary value is now empty
					if (wordsInfo[i].value.dictionary.length == 0) {
						wordsInfo.splice(i, 1);
					}

					// 5c) Setting the array for all the definitions of each word
					let word = []

					// 5d) Looping over definitions to push them into the word array
					wordsInfo[i].value.dictionary.forEach((dict) => {
						dict.meanings.forEach((meaning) => {

							// Setting pos variables from GNLP and the dictionary
							const wordPos = wordsInfo[i].value.wordInfo.pos.slice(0, 3).toLowerCase()
							const dictPos = meaning.partOfSpeech.slice(0, 3)

							// Words that have the same pos get pos:true
							if (dictPos == wordPos) {
								meaning.definitions.forEach((def) => {
									let pacakgedDefinition = {
										pos: true,
										title: dict.word,
										pronunciation: dict.phonetic,
										definition: def.definition,
									}

									// Pushing each definition object into the word array
									word.push(pacakgedDefinition)
								})
							} else {
								meaning.definitions.forEach((def) => {
									let pacakgedDefinition = {
										pos: false,
										title: dict.word,
										pronunciation: dict.phonetic,
										definition: def.definition,
									}

									// Pushing each definition object into the word array
									word.push(pacakgedDefinition)
								})
							}
						})
					})

						// Putting words with pos: true first
						const wordCopy = [...word] // <- spread operator to make a real copy

						wordCopy.forEach((definition) => {
						if (definition.pos == false) {
							var index = word.indexOf(definition)
							word.push(definition)
							word.splice(index, 1)
						}
					});
					

					// 5e) pushing all words into the words array
					words.push(word)
				}
				// 6) Kipping only 8 words
				words.splice(8)
				wikiInfo.splice(8)
				
				// 7) Packaging the info to send back to the frontend
				fullInfo = {
					dictionary: words,
					wiki: wikiInfo
				}

				// 8) Sending back the info
				res.send(JSON.stringify(fullInfo))
			})
		}) 
	})
	.catch((error) => {
		console.log(error)
	})



	function sortWords(arrayFromAPI) {

		//Sort:
		// If value less than 0 is returned then firstElement will come before the secondElement.
		// If value greater than 0 is returned then secondElement will come before the firstElement.
		// If 0 is returned then firstElement and secondElement will be unchanged. But they are sorted with other elements.
		arrayFromAPI.sort((a, b) => {
			return a.value.frequency.diversity - b.value.frequency.diversity
		})

		arrayFromAPI.splice(20, arrayFromAPI.length)

		return arrayFromAPI;
	}

})

// E) Response to POST request at /saved (when clicking the "save" button)
app.post('/saved', (req, res) => {

	// a) Creates a new entry in the database with the info that was taken from '/posted'
	async function saveInDb() {
		try {
			await Snapshot.create({
				Title: req.body.title,
				Text: fullUnitedText,
				Dictionary: JSON.stringify(fullInfo.dictionary),
				Wikipedia: JSON.stringify(fullInfo.wiki)
			});

			res.status(201).end()
		} catch (e) {
			res.status(500).send({error: e})
		}
	}
	saveInDb()
	// res.sendFile(path.join(__dirname+'/index.html'))
})

// F) Response to GET request at /list (to see a list of saved snapshots)
app.get('/list', (req, res) => {

	// a) Get the snapshot Title from the database to display in a list
	async function queryTitle() {

		// 1) Set up an array to hold the Titles
		let titles = [];

		// 2) Get info from database
		const snapshots = await Snapshot.findAll({attributes: ['Title']});
		
		// 3) Push the titles into the array
		snapshots.every((snapshot) => titles.push(snapshot.dataValues.Title))

		// 4) Render the webpage using pug and the titles array
		res.render('list', { length: snapshots.length, titles: titles })
	}
	queryTitle()
	
})

// G) Response to GET request at different snapshots/titles
app.get('/list/:title', (req, res) => {

	// a) Get entry from the database and send it back
	 async function queryEntry() {

		// 1) Get the entry from the database by title
		const entry = await Snapshot.findAll({
			where: {
			  Title: req.params.title
			}
		});

		// 2) Reconstruct objects from the database JSON
		entry[0].dataValues.Dictionary = JSON.parse(entry[0].dataValues.Dictionary)
		entry[0].dataValues.Wikipedia = JSON.parse(entry[0].dataValues.Wikipedia)

		// 3) Send the entry back to the database (in JSON)
		res.send(JSON.stringify(entry))
	}
	queryEntry()
})

// H) Response to GET request at delete a title
app.get('/delete/:title', (req, res) => {

	// a) Get entry from the database and deleted
	 async function deleteEntry() {

		// 1) Delete the entry from the database by title
		await Snapshot.destroy({
			where: {
				Title: req.params.title
			}
		});

		res.sendStatus(200).end()
	}
	deleteEntry()
})


//********** [Expressjs App] **********\\

// Setting up the port 
const port = 3000;

// Setting up the server at the port
app.listen(port, () => {
    console.log(`App listening on http://localhost:${port}`)
})

