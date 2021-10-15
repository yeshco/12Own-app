// Editorjs Set up
const editor = new EditorJS({
    readOnly: false,
    holder: 'editor',
    tools: {
        header: {
          class: Header,
          inlineToolbar: ['marker', 'link'],
          config: {
            placeholder: 'Header'
          },
          shortcut: 'CMD+SHIFT+H'
        },
  
        image: SimpleImage,

        list: {
          class: List,
          inlineToolbar: false,
          shortcut: 'CMD+SHIFT+L'
        },
  
        checklist: {
          class: Checklist,
          inlineToolbar: false,
        },
  
        code: {
          class:  CodeTool,
          shortcut: 'CMD+SHIFT+C'
        },
  
        delimiter: Delimiter,
  
        inlineCode: {
          class: InlineCode,
          shortcut: 'CMD+SHIFT+C'
        },
  
        linkTool: LinkTool,
      }
})

// Selecting HTML parts
const submitButton = document.getElementsByClassName('submitButton');
const cardsContainer = document.getElementsByClassName('cardsContainer'); // < change name
const saveButton = document.getElementsByClassName('save')[0];
const modalBody = document.getElementsByClassName('modal-body')[0];
const modalTitle = document.getElementsByClassName('modal-title')[0];
const modalFooter = document.getElementsByClassName('modal-footer')[0];
let modalSaveButton = document.createElement('button')



// A) Function to set Event Listeners on the buttons
function setEventListener(i) {

  	// a) 'Click' Event Listener
  	submitButton[i].addEventListener('click', () => {

    	// 1) Getting the data from the editor
    	editor.save()

		// 2) Send data to backend
    	.then((writtenData) => {
			
        	// 2a) Sending the data to the backend with fetch/POST
        	return fetch('/posted', {
            	method: 'POST',
            	headers: {
                	'Content-Type': 'application/json'
            	},
            	body: JSON.stringify(writtenData)
        	})
		})

		// 3) response:
		.then((response) => {

			// 3a) If the response is valid
			if (response.status !== 400) {

				// Change the modal so a snapshot can be made
				modalBody.children[0].innerHTML = '<label for="titleName" class="form-label">Title</label><input type="text" class="form-control" id="titleName" aria-describedby="setTitle" required>'
				modalTitle.innerHTML = "Set the Title for this Save"
				// modalSaveButton.setAttribute("type", "submit");
				modalSaveButton.classList.add("btn", "btn-primary");
				modalSaveButton.innerHTML = "Save"
				modalFooter.appendChild(modalSaveButton)
				
				// Transform the json into an object
				return response.json()

			// 3b) Add a visual response when the error can be fixed
			} else {

				submitButton[0].classList.add('bg-danger')
				setTimeout(() =>{ 
					submitButton[0].classList.remove('bg-danger')
					}, 3000);
			}
		})

		// 4) Showing the data
		.then((responseData) => {
			console.log(responseData) // <-- CAN BE REMOVED
			if (responseData == undefined) return;
			// 4a) Setting values into different variables
			const dictionary = responseData.dictionary
			const wikipedia = responseData.wiki

			// 4b) Adding a container for the data
			cardsContainer[0].innerHTML = '<div class="row justify-content-center"></div>'
			cardsContainer[1].innerHTML = '<div class="row justify-content-center"></div>'

			// 4c) Adding the dictionary response
			for (i=0; i<dictionary.length; i++) {

				// Setting variables
				const title = dictionary[i][0].title
				const pronunciation = dictionary[i][0].pronunciation
				const definition = dictionary[i][0].definition

				// Adding the HTML in cards
				cardsContainer[0].children[0].innerHTML += `
				<div class="col mb-3">
					<div class="card" style="width: 18rem;">
						<div class="card-body def-0">
							<h5 class="card-title">${title}</h5>
							<h6 class="card-subtitle mb-2 text-muted">${pronunciation}</h6>
							<p class="card-text def-0">${definition}</p>
						</div>
						<div class="card-footer">
							<ul class="nav">
								<li class="nav-item">
									<a class="nav-link prevBtn" href="#">Previous</a>
								</li>
								<li class="nav-item">
									<a class="nav-link nextBtn" href="#">Next</a>
								</li>
							</ul>
						</div>
					</div>
				</div>
				`
			}

			// 4d) Adding the wikipedia response
			for (i=0; i<wikipedia.length; i++) {

				// Setting variables
				const picture = wikipedia[i].value.topicInfo.thumbnail.source
				const pictureName = wikipedia[i].value.topicInfo.pageimage
				const description = wikipedia[i].value.extract.slice(0, 120)
				const link = wikipedia[i].value.wikiUrl
				const name = wikipedia[i].value.topicInfo.title

				// Adding the HTML
				cardsContainer[1].children[0].innerHTML += `
				<div class="col mb-3">
					<div class="card" style="width: 18rem;">
						<img src=${picture} class="card-img-top" ${pictureName}>
						<div class="card-body">
							<p class="card-text">${description}</p>
						</div>
						<div class="card-footer">
						<a href=${link} target="_blank" class="card-link">${name}</a>
						</div>
					</div>
				</div>
			`
			}

			// 4e) Selecting new HTML parts
			const fullCard = document.getElementsByClassName('card-body');
			const nextBtn = document.getElementsByClassName('nextBtn');
			const prevBtn = document.getElementsByClassName('prevBtn');
			
			// 4f) Making the card buttons actionable
			for (let i=0; i<nextBtn.length; i++) {

				// Disabling nextBtn if the card is the last definition
				if (parseInt(fullCard[i].classList[1].slice(-1))+1 == dictionary[i].length) {
					nextBtn[i].classList.add('disabled')
				} 

				// Disabling prevBtn if the card is the first one
				if (parseInt(fullCard[i].classList[1].slice(-1)) == 0) {
					prevBtn[i].classList.add('disabled')
				} 

				// Making nextBtn actionable
				nextBtn[i].addEventListener('click', () => {

					// Changing the class 'def-#' to reflect the change in card
					fullCard[i].classList.replace(`def-${fullCard[i].classList[1].slice(-1)}`, `def-${parseInt(fullCard[i].classList[1].slice(-1))+1}`)

					// Changing all the card info to reflect the 'next' value
					let title = dictionary[i][fullCard[i].classList[1].slice(-1)].title
					let pronunciation = dictionary[i][fullCard[i].classList[1].slice(-1)].pronunciation
					let definition = dictionary[i][fullCard[i].classList[1].slice(-1)].definition

					fullCard[i].innerHTML = `
						<h5 class="card-title">${title}</h5>
						<h6 class="card-subtitle mb-2 text-muted">${pronunciation}</h6>
						<p class="card-text def-1">${definition}</p>
					`

					// Checking how many cards are left and changing the buttons accordingly
					if (parseInt(fullCard[i].classList[1].slice(-1))+1 == dictionary[i].length) {
						nextBtn[i].classList.add('disabled')
						prevBtn[i].classList.remove('disabled')
					} else {
						prevBtn[i].classList.remove('disabled')
					}
				})

				// Making prevBtn actionable
				prevBtn[i].addEventListener('click', () => {

					// Changing the class 'def-#' to reflect the change in card
					fullCard[i].classList.replace(`def-${fullCard[i].classList[1].slice(-1)}`, `def-${parseInt(fullCard[i].classList[1].slice(-1))-1}`)

					// Changing all the card info to reflect the 'previous' value
					let title = dictionary[i][fullCard[i].classList[1].slice(-1)].title
					let pronunciation = dictionary[i][fullCard[i].classList[1].slice(-1)].pronunciation
					let definition = dictionary[i][fullCard[i].classList[1].slice(-1)].definition

					fullCard[i].innerHTML = `
						<h5 class="card-title">${title}</h5>
						<h6 class="card-subtitle mb-2 text-muted">${pronunciation}</h6>
						<p class="card-text def-1">${definition}</p>
					`

					// Checking how many cards are left and changing the buttons accordingly
					if (parseInt(fullCard[i].classList[1].slice(-1)) == 0) {
						prevBtn[i].classList.add('disabled')
						nextBtn[i].classList.remove('disabled')
					} else {
						nextBtn[i].classList.remove('disabled')
					}
				})
			}	
		})

		// On error:
		.catch((error) => {
			console.error('Error:', error);
		});
	})
}

// Setting Eventy listeners on both buttons
setEventListener(0)
setEventListener(1)

// B) Adding an event listener to the save button
modalSaveButton.addEventListener('click', () => {

	// a) Getting the title from the modal input
	const saveInput = document.getElementById('titleName').value
	if (saveInput !== "") {
		fetch('/saved', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({title: saveInput})
		})
		.then((response) =>{
	
			// Alert if the title already exists
			if (response.status == 500) {
				alert("Can't save the Snapshot: the title already exists")
			} else {
				window.location = "/"
			}
		})
	}
	
	
})



