// Selecting HTML parts
const listItems = document.getElementsByClassName('list-group-item')
const body = document.getElementsByTagName('body')
const closeButton = document.getElementsByClassName('btn-close');

// A) Looping over the list of items
for (i=0; i<listItems.length; i++) {

    // a) Getting the name of the entry on the list
    // var word = listItems[i].innerText

    // b) 
    // listItems[i].myTitle = listItems[i].innerText

    // a) Setting an event listener on each list item
    listItems[i].children[0].addEventListener('click', (e) => {

        // 1) Sending a request to '/list' with the title
        fetch(`/list/${e.currentTarget.innerText}`)

        // 2) Parsing the JSON response
        .then((data) => data.json())

        // 3) Showing the data
        .then((data) => {
            
            // 3a) Changing the HTML and adding the main text
            body[0].innerHTML = `
            <nav class="navbar sticky-top navbar-expand navbar-light bg-light">
                <div class="container-fluid">
                    <a class="navbar-brand" href="/">theEditor</a>
                    <div class="navbar-nav navbar-collapse">
                        <a class="nav-link d-flex" href="/list">Saved List</a>
                    </div>
                    <div class="navbar-nav">
                        <a href="#" class="navbar-brand">${data[0].Title}</a>
                    </div>
                </div>
            </nav>
            <div>
                <div class="my-4 mx-3" id="viewer">
                ${data[0].Text}
                </div>
            </div>
            <div class="resources mt-6">
                <ul class="nav nav-tabs" id="myTab" role="tablist">
                    <li class="nav-item" role="presentation">
                        <a class="nav-link active" data-bs-toggle="tab" href="#home" role="tab" aria-controls="home" aria-selected="true">Dictionary</a>
                    </li>
                    <li class="nav-item" role="presentation">
                        <a class="nav-link" data-bs-toggle="tab" href="#profile" role="tab" aria-controls="profile" aria-selected="false">Wikipedia</a>
                    </li>
                </ul>
                <div class="tab-content" id="myTabContent">
                    <div class="tab-pane fade show active cardsContainer mt-3" id="home" role="tabpanel" aria-labelledby="home-tab">
                        <div class="row justify-content-center"></div>
                    </div>
                    <div class="tab-pane fade cardsContainer mt-3" id="profile" role="tabpanel" aria-labelledby="profile-tab">
                        <div class="row justify-content-center"></div>
                    </div>
                </div>
            </div>
            `

            // 3b) Selecting the new container for the cards 
            const cardsContainer = document.getElementsByClassName('cardsContainer');
            
            // 3c) Putting the Dictionary and Wikipedia data in their own variables
            const dictionary = data[0].Dictionary
            const wikipedia = data[0].Wikipedia

            // 3d) Adding the Dictionary response
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

            // 4e) Adding the wikipedia response
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

            // 4f) Selecting new HTML parts
            const fullCard = document.getElementsByClassName('card-body');
            const nextBtn = document.getElementsByClassName('nextBtn');
            const prevBtn = document.getElementsByClassName('prevBtn');
            
            // 4g) Making the card buttons actionable
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

// B) Adding an event listener to the close buttons
for (i=0; i<closeButton.length; i++) {
    closeButton[i].addEventListener('click', (e) => {
        fetch(`/delete/${e.currentTarget.parentElement.innerText}`)
        e.currentTarget.parentElement.remove()
    })
}
