
class pluginGui {
    
    constructor() {

        this.bottomMenuCfg = 
        {
            "menuId": "pluginBottomMenu",
            "playBtnId": "playBtn",
            "pauseBtnId": "pauseBtn",
            "rewindBtnId": "rewindBtn",
            "progressBarTextId": "progressBarText",
            "progressBarId": "svgProgressBar",
            "progressBarBackgroundId": "progressBarBackground",
            "progressBarCursorId": "progressBarCursor",
            "progressBarColorId": "progressBarColor",
            "settingsButtonId": "settingsButtonPlugin",
            "fullScreenButtonId": "fullScreenButton",
            "smallScreenButtonId": "smallScreenButton",
            "chapterMarkersPluginId": "chapterMarkersPlugin",
            "progressBarCenter": 50,
            "progressBarMaxHeight": 40,
        }

        this.settingsMenuCfg = 
        {
            "settingsMenuId": "settingsMenu",
            "playBackSpeedInputId": "playBackSpeedInput",
            "fontSizeInputId": "fontSizeInput",
            "pageMarginTextDisplayId": "pageMarginTextDisplay",
            "pageMarginInputId": "pageMarginInput",
            "fontFamiliesSettingsInputId": "font-families-settings-input",
            "fontFamiliesSettingsId": "font-families-settings",
            "colorDropDownSymbolId": "colorDropDownSymbol",
            "colorSettingsContainerId": "colorSettingsContainer",
            "toggleForPageNumDisplayId": "toggleForPageNumDisplay",
        }

        this.displayBook = new scrollingBook()
        this.bookTitle = this.getBookTitle()


        this.bottomMenuFactory = new bottomMenuGuiFactory(this.bottomMenuCfg, this.settingsMenuCfg, this.displayBook)
        this.settingsMenuFactory = new settingsMenuGuiFactory(this.bottomMenuCfg, this.settingsMenuCfg, this.displayBook, this.bookTitle)
        this.createPluginGui()
        this.shiftMenuToIgnoreBodyMargin()
        this.bottomMenuFactory.setupProgressBar()
        window.onresize = () => this.controlWindowOnResize()

        this.addImages()
        
    }

    get bottomMenuId() {
        return this.bottomMenuFactory.menuId
    }

    getBookTitle() {

        // We fetch the booktitle from the pg-machine.header at the top of the page
        let bookInfo = document.getElementById("pg-machine-header")
        for (let i = 0; i < bookInfo.children.length; i++) {
            let child = bookInfo.children[i]
            if (child.tagName.toLowerCase() == "p") 
            {
                let infoText = child.innerHTML
                if (infoText.toLowerCase().includes("title")) {
                    // Get position of last ":" character
                    let posStart = infoText.lastIndexOf("</strong>:")
                    let posEnd = infoText.lastIndexOf("<")
                    let bookTitle = infoText.slice(posStart, posEnd)
                    bookTitle = bookTitle.replace(/<\/strong>:/g, " ").trim()
                    return bookTitle
                }
            }
        }
        return null
    }

    createPluginGui() {
        const bookContent = document.body.innerHTML
        document.body.innerHTML = ""

        // Add a div inside body
        const bookContainer = document.createElement("div")
        bookContainer.id = "fullBookContainerPlugin"
        bookContainer.innerHTML = bookContent
        
        document.body.appendChild(bookContainer)

        const menuSpan = document.createElement("span")
        menuSpan.id = "pluginControlmenuSpan"
        document.body.appendChild(menuSpan)

        this.createMenuGui()
        this.settingsMenuFactory.addDynamicGuiComponents()
        this.bottomMenuFactory.addDynamicGuiComponents()

    }

    createMenuGui() {
       
            let menuContent = this.bottomMenuFactory.fullMenu()
            menuContent += this.settingsMenuFactory.settingsMenu()
            const menuContainerSpan = document.getElementById("pluginControlmenuSpan")
            menuContainerSpan.innerHTML = menuContent
       
    }

    controlWindowOnResize() {
        this.shiftMenuToIgnoreBodyMargin()
        this.bottomMenuFactory.setupProgressBar()
        this.setupProgressBarScaling()
    }

    shiftMenuToIgnoreBodyMargin() {
        // We assume they will always denote it with marginleft here
        // But maybe it will always work, if they specify margin then maybe a margin-left always exists
        var bodyMarginLeft = window.getComputedStyle(document.body).marginLeft;
        var elemMenu = document.getElementById(this.bottomMenuCfg.menuId)
        elemMenu.style.marginLeft = "-" + bodyMarginLeft
    }

    setupProgressBarScaling() { // NOTE!! This one has to be moved down into the bottommenu
        
        const containerDiv = document.getElementById(this.bottomMenuCfg.progressBarId)
        this.progressBarStartx = containerDiv.getBoundingClientRect().left
        this.progressBarWidth = containerDiv.getBoundingClientRect().width
    }

    addImages() {

        let imageIdToImageSource = {}
        imageIdToImageSource[this.bottomMenuCfg.rewindBtnId] = "images/bottomMenu/rewindwhite.png"
        imageIdToImageSource[this.bottomMenuCfg.playBtnId] = "images/bottomMenu/playwhite.png"
        imageIdToImageSource[this.bottomMenuCfg.pauseBtnId] = "images/bottomMenu/stopwhite.png"
        imageIdToImageSource[this.bottomMenuCfg.settingsButtonId] = "images/bottomMenu/settingswhite.png"
        imageIdToImageSource[this.bottomMenuCfg.fullScreenButtonId] = "images/bottomMenu/fullscreenwhite.png"
        imageIdToImageSource[this.bottomMenuCfg.smallScreenButtonId] = "images/bottomMenu/smallscreenwhite.png"

        for (let imageId in imageIdToImageSource) {
            let imageElement = document.getElementById(imageId)
            imageElement.src = chrome.runtime.getURL(imageIdToImageSource[imageId]);
        }
    }

}




class bottomMenuGuiFactory {

    // I should move up some ids into the parent class
    // So one cfg object for settingsmenu and one for bottom menu
    // And then I can have a dynamic settings here which
    // just adds all the callbacks to every method?
    // That way I can have the functions defined in here as well

    constructor(bottomMenuCfg, settingsMenuCfg, displayBook) {
        this.cfg = bottomMenuCfg
        this.settingsCfg = settingsMenuCfg
        this.displayBook = displayBook

        this.playPauseMode = "pause"
        this.progressBarCenter = 50
        this.progressBarMinHeight = 20
        this.progressBarMaxHeight = 40
        this.progressBarCurrentY = this.progressBarCenter - this.progressBarMinHeight/2
        this.progressBarBottom = 80
        this.isHoveringProgressBar=false
        this.mousePosXPercentage = 0

        setInterval(() => this.displayMenu(), 100)
        this.iterationToHideTheMenu = 20
        this.iterationsUntilMenuDisappearsCounter = this.iterationToHideTheMenu
        this.iterationsUntilMenuDisappears = {
            "decrement" : () => 
                {
                this.iterationsUntilMenuDisappearsCounter--
                this.iterationsUntilMenuDisappearsCounter = Math.max(0, this.iterationsUntilMenuDisappearsCounter)
                },
            "reset": () => this.iterationsUntilMenuDisappearsCounter = this.iterationToHideTheMenu,
            "hideMenu": () => this.iterationsUntilMenuDisappearsCounter == 0
        }

        this.callbackFunctions = 
        [
            [this.cfg.playBtnId, {"onclick": () => this.playPause()}],
            [this.cfg.pauseBtnId, {"onclick": () => this.playPause()}],
            [this.cfg.settingsButtonId, {"onclick": () => this.toggleSettingsMenu()}],
            [this.cfg.fullScreenButtonId, {"onclick": () => this.enterFullScreen()}],
            [this.cfg.smallScreenButtonId, {"onclick": () => this.exitFullScreen()}],
            [this.cfg.rewindBtnId, {"onclick": () => this.rewind()}]
        ]
    }

    subSettingsMenuIsOpen() {
        const elem = document.getElementById("settingsMenu")
        return elem.style.display == "flex"
    }

    hoveringOverMenu() {
        const elem = document.getElementById(this.cfg.menuId)
        if (elem.querySelector(":hover")) {
            return true
        } else {
            return false
        }
    }

    displayMenu() { 

        let displayCheck1 = this.playPauseMode == "pause"
        let displayCheck2 = this.subSettingsMenuIsOpen()
        let displayCheck3 = this.hoveringOverMenu()

        if (!displayCheck2 && !displayCheck3) {
            this.iterationsUntilMenuDisappears.decrement()
        } else {
            this.iterationsUntilMenuDisappears.reset()
        }

        displayCheck1 = this.iterationsUntilMenuDisappears.hideMenu() ? false : displayCheck1
        const menuElem = document.getElementById(this.cfg.menuId)
        if (displayCheck1 || displayCheck2 || displayCheck3) {

            
            menuElem.style.transition = ""
            menuElem.style.transition = "opacity 0.1s ease-in-out"
            menuElem.style.opacity = "1"

        } else {

            menuElem.style.transition = ""
            menuElem.style.transition = "opacity 0.1s ease-in-out"
            menuElem.style.opacity = "0"

        }

    }

    setupProgressBar() {

        this.setupProgressBarScaling()

        this.setupProgressBarChapterMarkings()

        

        document.addEventListener("mousemove", (e) => 
        {
            this.mousePosX = e.clientX
        });
        document.getElementById("svgProgressBar").addEventListener("mouseover", () => {this.isHoveringProgressBar=true;});
        document.getElementById("svgProgressBar").addEventListener("mouseout", () => {this.isHoveringProgressBar=false;});
        document.getElementById("svgProgressBar").addEventListener("click", () => {
            let completionPercentage = (this.mousePosX - this.progressBarStartx)/this.progressBarWidth*100;
            // Scroll to top of the page
            window.scrollTo(0, 0);

            this.displayBook.goToPercentage(completionPercentage);

        });

        this.progressBarIdAnim = window.requestAnimationFrame(() => this.drawProgressBar())
    }

    setupProgressBarScaling() {
        
        const containerDiv = document.getElementById(this.cfg.progressBarId)
        this.progressBarStartx = containerDiv.getBoundingClientRect().left
        this.progressBarWidth = containerDiv.getBoundingClientRect().width
    }

    setupProgressBarChapterMarkings() {

        this.displayBook.findPositionOfChapterBeginnings()
        let chapterPositions = this.displayBook.getChapterPositions()
        if (chapterPositions !== null) {

            const chapterMarkerGroup = document.getElementById("chapterMarkersPlugin")
            chapterMarkerGroup.innerHTML = ""
            chapterPositions.forEach( (chapterPos,i) =>
                {
                    const rect = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
                    // Set attributes for the rect element
                    rect.setAttribute('x', `${chapterPos}%`);
                    rect.setAttribute('y', `${this.progressBarCenter - this.progressBarMaxHeight/2 - 3}%`);
                    rect.setAttribute('width', '0.1%');
                    rect.setAttribute('height', `${this.progressBarMaxHeight + 8}%`);
                    rect.setAttribute('fill', '#4f5072');
                    chapterMarkerGroup.appendChild(rect)
                }
            )

        }
    }

    drawProgressBar() {
        
        const element = document.getElementById(this.cfg.progressBarColorId);
        const elementBackground = document.getElementById(this.cfg.progressBarBackgroundId);
        const elementCursorIndicator = document.getElementById(this.cfg.progressBarCursorId);

        let progressLength = this.displayBook.bookCompletionPercentage()

        element.style.width = `${progressLength}%`
        let currYDistFromBottom = Math.abs(this.progressBarCurrentY - this.progressBarCenter)
        if (this.isHoveringProgressBar) {

            if (currYDistFromBottom < this.progressBarMaxHeight/2) {
                    this.progressBarCurrentY -= 3
                }

            elementCursorIndicator.style.display = "inline"
            elementCursorIndicator.style.width = `${(this.mousePosX - this.progressBarStartx)/this.progressBarWidth*100}%`

        } else {
            
            if (currYDistFromBottom > this.progressBarMinHeight/2) {
                this.progressBarCurrentY += 3
            }

            elementCursorIndicator.style.width = `${-1}%`
            elementCursorIndicator.style.display = "none"
                        
        }

        elementBackground.style.y = `${this.progressBarCurrentY}%`
        elementBackground.style.height = `${2*currYDistFromBottom}%`

        element.style.y = `${this.progressBarCurrentY}%`
        element.style.height = `${2*currYDistFromBottom}%`

        elementCursorIndicator.style.y = `${this.progressBarCurrentY}%`
        elementCursorIndicator.style.height = `${2*currYDistFromBottom}%`

        const elem = document.getElementById("progressBarText")
        elem.innerHTML = `${this.displayBook.bookCompletionPercentage().toFixed(1)}%  `

        
        window.requestAnimationFrame(() => this.drawProgressBar())
    }

    rewind() {
        this.displayBook.rewind()
    }

    enterFullScreen() {
        var element = document.documentElement;
        if(element.requestFullscreen) {
          element.requestFullscreen();
        }else if (element.mozRequestFullScreen) {
          element.mozRequestFullScreen();     // Firefox
        }else if (element.webkitRequestFullscreen) {
          element.webkitRequestFullscreen();  // Safari
        }else if(element.msRequestFullscreen) {
          element.msRequestFullscreen();      // IE/Edge
        }
    
        var elem = document.getElementById(this.cfg.fullScreenButtonId)
        elem.style.display = "none"
        var elem = document.getElementById(this.cfg.smallScreenButtonId)
        elem.style.display = "inline"

        // Hide the body overflow so that the scroll bar does not appear
        document.body.style.overflow = "hidden"
    };
    
    exitFullScreen() {
    
        var elem = document.getElementById(this.cfg.smallScreenButtonId)
        elem.style.display = "none"
        var elem = document.getElementById(this.cfg.fullScreenButtonId)
        elem.style.display = "inline"
        
        if(document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }

        // Introduce the scrollbar again after exiting fullscreen
        document.body.style.overflowY = "scroll"
        document.body.style.overflowX = "hidden"
    
    };

    playPause() {
        this.playPauseMode = this.playPauseMode == "play" ? "pause" : "play"
    
        if (this.playPauseMode == "play") {
            const elemPlay = document.getElementById("playBtn")
            elemPlay.style.display = "none"
            const elemPause = document.getElementById("pauseBtn")
            elemPause.style.display = "flex"
            //this.runScrollBook()
            this.displayBook.playBook()
        } else {
            const elemPlay = document.getElementById("playBtn")
            elemPlay.style.display = "flex"
            const elemPause = document.getElementById("pauseBtn")
            elemPause.style.display = "none"
            this.displayBook.pauseBook()
        }
    }

    toggleSettingsMenu() {

        this.displaySettings = !this.displaySettings
        var elem = document.getElementById("settingsMenu")
        if (this.displaySettings) {
            elem.style.display = "flex"
            elem.style.flexDirection = "column"

            const settingsWheel = document.getElementById("settingsButtonPlugin")
            settingsWheel.style.transition = ""
            settingsWheel.style.transition = "transform 0.2s ease-in"
            settingsWheel.style.transform = "rotate(30deg)"
        }
        else {
            elem.style.display = "none"
            const settingsWheel = document.getElementById("settingsButtonPlugin")
            settingsWheel.style.transition = ""
            settingsWheel.style.transition = "transform 0.2s ease-in"
            settingsWheel.style.transform = "rotate(-30deg)"
        }

    }

    addDynamicGuiComponents() {
        this.addCallbackFunctions()
    }

    addCallbackFunctions() {
        this.callbackFunctions.forEach((callback) => {
            var elem = document.getElementById(callback[0])
            for (var key in callback[1]) {
                elem[key] = callback[1][key]
            }
        })
    }

    fullMenu() {

        const menu = `<div id="${this.cfg.menuId}">
                            <div style="display: flex;
                                        flex-direction: row;
                                        height: 100%; 
                                        color: black;">
                                ${this.leftPartOfMenu()}
                                ${this.progressBar()}
                                ${this.rightPartOfMenu()}
                            </div>
                        </div>`
        return menu
     }

    leftPartOfMenu() {
        const leftPart = `<div style="display: flex;
                                    justify-content:left;
                                    height: 100%;
                                    width: 10%;
                                    background-color: #4f5072;
                                    min-width: 200px">
                                ${this.rewindBtn()}
                                ${this.playPauseBtn()}
                                ${this.progressBarText()}
                        </div>`
        return leftPart
    }

    rightPartOfMenu() {

        const rightPart = `<div style="display: flex;
                                      justify-content:center;
                                      height: 100%;
                                      width: 10%; 
                                      background-color: #4f5072;
                                      min-width: 150px">

                                ${this.settingsBtn()}
                                ${this.fullScreenBtn()}
                            </div>`
        return rightPart
    }

    rewindBtn() {

        const btn = `<img 
                        id="${this.cfg.rewindBtnId}"
                        style="height: 50%;
                            margin: auto;
                            cursor: pointer;
                            border: none;
                            outline: none;"
                        src="images/rewindwhite.png">`
        return btn
        
    }

    playPauseBtn() {

        const playBtn = `<img 
                        id="${this.cfg.playBtnId}"
                        style="height: 50%;
                                margin: auto;
                                cursor: pointer;
                                border: none;
                                outline: none;"
                        src="images/playwhite.png">`

        const pauseBtn = `<img 
                            id="${this.cfg.pauseBtnId}"
                            style="display: none;
                                    height: 50%;
                                    margin: auto;
                                    cursor: pointer;
                                    border: none;
                                    outline: none;"
                            src="images/stopwhite.png"></img>`
        return `${playBtn}
                ${pauseBtn}`
    }

    progressBarText() {

        const progressBarInfo = `<div id="${this.cfg.progressBarTextId}"
                                      style="display: flex;
                                            justify-content: center;
                                            margin: auto;
                                            color: white;
                                            width: 20px;">
                                    Text
                                </div>`
        return progressBarInfo

    }

    progressBar() {

       const svgProgressBar = `<div style="display: flex;
                                            justify-content: center;
                                            height: 100%;
                                            width: 80%;
                                            background-color: #4f5072;">
                                
                                    <div id="${this.cfg.progressBarId}"
                                        style="margin: auto;
                                                margin-left: 1em;
                                                margin-right: 1em;
                                                width: 100%;
                                                height: 50%;
                                                cursor: pointer;">
                                        <svg width="100%"
                                            height="100%"
                                            xmlns="http://www.w3.org/2000/svg">
                                                <rect id="${this.cfg.progressBarBackgroundId}"
                                                    x="0%"
                                                    y="40%"
                                                    width="100%"
                                                    fill="#6d6f6e"
                                                    style="opacity: 1;"/>
                                                <rect id="${this.cfg.progressBarCursorId}" 
                                                    x="0%"
                                                    y="40%" 
                                                    width="0%" 
                                                    fill="white"/>
                                                <rect id="${this.cfg.progressBarColorId}"
                                                    x="0%" 
                                                    y="40%" 
                                                    width="0%" 
                                                    fill="#c91717"/>
                                                <g id="${this.cfg.chapterMarkersPluginId}">
                                                </g>
                                        </svg> 
                                    </div>
                                </div>`
        return svgProgressBar
    }

    settingsBtn() { 

        const btn = `<img id="${this.cfg.settingsButtonId}"
                          style="height: 70%;
                                 margin: auto 5px;
                                 cursor: pointer;
                                 border: none;
                                 outline: none;"
                          src="images/settingswhite.png">`
        return btn
    }

    fullScreenBtn() {

        const btn = `<img id="${this.cfg.fullScreenButtonId}"
                          style="height: 70%;
                                 margin: auto 5px;
                                 cursor: pointer;
                                 border: none;
                                 outline: none;"
                                 src="images/fullscreenwhite.png">
                     <img id="${this.cfg.smallScreenButtonId}"
                          style="display: none;
                          height: 70%;
                          margin: auto 5px;
                          cursor: pointer;
                          border: none;
                          outline: none;"
                      src="images/smallscreenwhite.png">`
        return btn

     }

}





class settingsMenuGuiFactory { 

    constructor(bottomMenuCfg, settingsMenuCfg, displayBook, bookTitle) {

        this.cfg = bottomMenuCfg 
        this.settingsCfg = settingsMenuCfg
        this.displayBook = displayBook
        this.bookTitle = bookTitle

        this.currentColorScheme = null
        this.colorSchemeSettings = 
        {
            "Original":
            {
                "backgroundColor": "#ffffff",
                "textColor": "#000000",
                "setColorScheme": () => this.setColorScheme("#ffffff", "#000000", "Original")
            },
            "Bright": 
            {
                "backgroundColor": "#f1f1f1",
                "textColor": "#7c7c7c",
                "setColorScheme": () => this.setColorScheme("#f1f1f1", "#7c7c7c", "Bright")
            },
            "Grey": 
            {
                "backgroundColor": "#555557",
                "textColor": "#8b8b8c",
                "setColorScheme": () => this.setColorScheme("#555557", "#8b8b8c", "Grey")
            },
            "Night": 
            {
                "backgroundColor": "#000000",
                "textColor": "#5e5e5e",
                "setColorScheme": () => this.setColorScheme("#000000", "#5e5e5e", "Night")
            },
            "Sepia":
            {
                "backgroundColor": "#FBF0D9", 
                "textColor": "#5F4B32",
                "setColorScheme": () => this.setColorScheme("#f4e8d6", "#7c7c7c", "Sepia")
            },
            "Dark":
            {
                "backgroundColor": "#1e1e1e",
                "textColor": "#d0dcdc",
                "setColorScheme": () => this.setColorScheme("#1e1e1e", "#d0dcdc", "Dark")
            },
            "Dark Grey":
            {
                "backgroundColor": "#2b2b2b",
                "textColor": "#d0dcdc",
                "setColorScheme": () => this.setColorScheme("#2b2b2b", "#d0dcdc", "Dark Grey")
            },
            "Sepia strong":
            {
                "backgroundColor": "#e6d6c9",
                "textColor": "#2c2217",
                "setColorScheme": () => this.setColorScheme("#e6d6c9", "#2c2217", "Sepia strong")
            },
        }

        this.fontFamilies = ["Arial, sans-serif", "Helvetica, sans-serif", "Gill Sans, sans-serif",
        "Lucida, sans-serif", "Helvetica Narrow, sans-serif", "sans-serif",
        "Serif", "Times, serif", "Times New Roman, serif", "Palatino, serif",
        "Bookman, serif", "New Century Schoolbook, serif", "serif",
        "Andale Mono, monospace", "Courier New, monospace", "Courier, monospace",
        "Lucidatypewriter, monospace", "Fixed, monospace", "monospace",
        "Comic Sans, Comic Sans MS, cursive", "Zapf Chancery, cursive",
        "Coronetscript, cursive", "Florence, cursive", "Parkavenue, cursive",
        "cursive", "Impact, fantasy", "Arnoldboecklin, fantasy", "Oldtown, fantasy",
        "Blippo, fantasy", "Brushstroke, fantasy", "fantasy"
      ];

      this.maxTableFontSize = this.estimateMaximalTableFontsize()

      this.callbackFunctions = 
      [
        [this.settingsCfg.playBackSpeedInputId, {"oninput": () => this.updatePlaybackSpeed()}],
        [this.settingsCfg.fontFamiliesSettingsInputId, {"onchange": () => this.updateFont()}],
        [this.settingsCfg.fontSizeInputId, {"oninput": () => this.updateFontSize()}],
        [this.settingsCfg.pageMarginInputId, {"onmouseover": () => this.controlPageMarginBorderColor('enter'),
                                            "onmouseleave": () => this.controlPageMarginBorderColor('leave'),
                                            "oninput": () => this.updatePageMargin()}],
        [this.settingsCfg.toggleForPageNumDisplayId, {"onclick": () => this.changeDisplayOfPageNumElems()}]
      ]
    }

    estimateMaximalTableFontsize() {

        // This code might be a bit wonky for certain screen sizes
        // The issue it is trying to solve is that tables can sometimes stick out
        // of the screen horisontally

        let screenWidth1 = 1920
        let maxTableFontSize1 = 40 //px

        let screenWidth2 = 1280
        let maxTableFontSize2 = 25 //px

        let slope = (maxTableFontSize1 - maxTableFontSize2)/(screenWidth1 - screenWidth2)
        let intersection = maxTableFontSize1 - slope*screenWidth1

        let maxTableFontSize = Math.floor(slope*screen.width + intersection)
        return maxTableFontSize
    }

    changeDisplayOfPageNumElems() {

        var toggleSwitchElem = document.getElementById(this.settingsCfg.toggleForPageNumDisplayId)
        var toggleSwitchState = toggleSwitchElem.checked

        var pageNumElems = document.getElementsByClassName("pagenum")
        for (var i = 0; i < pageNumElems.length; i++) {
            pageNumElems[i].style.display = toggleSwitchState ? "inline" : "none"
        }
    }

    shiftMenuToIgnoreBodyMargin() {
        // We assume they will always denote it with marginleft here
        // But maybe it will always work, if they specify margin then maybe a margin-left always exists
        var bodyMarginLeft = window.getComputedStyle(document.body).marginLeft;
        var elemMenu = document.getElementById(this.cfg.menuId)
        elemMenu.style.marginLeft = "-" + bodyMarginLeft
    }


    updatePageMargin() {

        this.displayBook.markTagsInView()

        var elem = document.getElementById("pageMarginInput")
        let newPageMargin = elem.value
        document.body.style.marginLeft = `${newPageMargin}%`
        document.body.style.marginRight = `${newPageMargin}%`
        this.shiftMenuToIgnoreBodyMargin()

        var textDisplayElem = document.getElementById("pageMarginTextDisplay")
        textDisplayElem.innerHTML = `${newPageMargin}%`

        this.displayBook.moveToTagsThatWereInView()

        this.controlPositionOfPageNumElems()
    }

    updateFontSize(firstTimeCalling = false) {

        if (!firstTimeCalling) {
            this.displayBook.markTagsInView()
        }
        
        var elem = document.getElementById(this.settingsCfg.fontSizeInputId)
        var currentFontSize = elem.value

        // Slight bug here if they manually type 1 then they cannot rewrite it to 2 etc
        if (currentFontSize > this.maxFontSize) {
            elem.value = this.maxFontSize
            currentFontSize = this.maxFontSize
        } else if (currentFontSize < this.minFontSize) {
            elem.value = this.minFontSize
            currentFontSize = this.minFontSize
        }
        
        var elem = document.getElementById("fullBookContainerPlugin")
        elem.style.fontSize = currentFontSize + "px";

        var tables = document.getElementsByTagName("table");
        for (var i = 0; i < tables.length; i++) {

            let tableFontSize = Math.min(this.maxTableFontSize, currentFontSize)
            tables[i].style.fontSize = tableFontSize + "px"; 
        }

        // We have a check here to just handle the first time differently
             // Otherwise we get some errors
        if (!firstTimeCalling) {
            this.displayBook.moveToTagsThatWereInView()
            this.controlPositionOfPageNumElems()
            this.setupProgressBarChapterMarkings()
        }
        this.changeStyleOfPageHeading()
    }

    changeStyleOfPageHeading() {

        // Need to overwrite some id-styles here which are set in the gutenberg page itself
        const containerDiv = document.getElementById("fullBookContainerPlugin")

        const elem = document.getElementById("pg-header");
        elem.style.color = document.body.style.color
        elem.style.fontSize = containerDiv.style.fontSize
        const children = elem.querySelectorAll('*');
        
        for (let j = 0; j < children.length; j++) {
            children[j].style.color = document.body.style.color;
            children[j].style.fontSize = containerDiv.style.fontSize
        }
    }

    setupProgressBarChapterMarkings() {

        this.displayBook.findPositionOfChapterBeginnings()
        let chapterPositions = this.displayBook.getChapterPositions()
        if (chapterPositions !== null) {

            const chapterMarkerGroup = document.getElementById(this.cfg.chapterMarkersPluginId)
            chapterMarkerGroup.innerHTML = ""
            chapterPositions.forEach( (chapterPos) =>
                {
                    // POTENTIAL ERROR HERE IN CHAPTERPOS WHEN ZOOMING IN

                    const rect = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
                    // Set attributes for the rect element
                    rect.setAttribute('x', `${chapterPos}%`);
                    rect.setAttribute('y', `${this.cfg.progressBarCenter - this.cfg.progressBarMaxHeight/2 - 3}%`);
                    rect.setAttribute('width', '0.1%');
                    rect.setAttribute('height', `${this.cfg.progressBarMaxHeight + 8}%`);
                    rect.setAttribute('fill', '#4f5072');
                    chapterMarkerGroup.appendChild(rect)
                }
            )

        }
    }

    controlPositionOfPageNumElems() {
        
        var pageNumElems = document.getElementsByClassName("pagenum")
        let copiedPageNumElems = [...pageNumElems]
        for (var i = 0; i < copiedPageNumElems.length; i++) {

            let bodyMargin = getComputedStyle(document.body).marginRight.replace("px", "")
            // scaling is how large part of the body's margin that we want 
                // to shift the pagenums with. 0.4 worked ok most of the time
            const scaling = 0.8
            let pagenumMargin = (Number(bodyMargin)*scaling).toFixed(2)

            copiedPageNumElems[i].style.position = "absolute"
            copiedPageNumElems[i].style.right = "0%"
            copiedPageNumElems[i].style.marginRight = `-${pagenumMargin}px`
        }
    }

    addCallbackFunctions() {
        this.callbackFunctions.forEach((callback) => {
            var elem = document.getElementById(callback[0])
            for (var key in callback[1]) {
                elem[key] = callback[1][key]
            }
        })
    }

    updatePlaybackSpeed() {
        
        var elem = document.getElementById(this.settingsCfg.playBackSpeedInputId)
        var currentSpeed = Number(elem.value)

        // Slight bug here if they manually type 1 then they cannot rewrite it to 2 etc
        if (currentSpeed  > this.maxPlaybackSpeed) {
            elem.value = this.maxPlaybackSpeed
            currentSpeed  = this.maxPlaybackSpeed
        } else if (currentSpeed  < this.minPlaybackSpeed) {
            elem.value = this.minPlaybackSpeed
            currentSpeed  = this.minPlaybackSpeed
        }
        this.displayBook.changeSpeed(currentSpeed)
    }

    updateFont() {
        var elem = document.getElementById(this.settingsCfg.fontFamiliesSettingsInputId)    
        let newFont = elem.value

        if (this.fontFamilies.includes(newFont)) {
            document.body.style.fontFamily = newFont
        } else {
            elem.value = ""
        }
        
    }

    controlPageMarginBorderColor(status) {

        // Use box shadow instead of border since border takes up space
            // and makes the booktext shift around
        if (status=="enter") {
            document.body.style.boxShadow = "-3px 0px 0px 0px #4f5072, 3px 0px 0px 0px #4f5072"
        } else {
            document.body.style.boxShadow = "none"
        }

    }

    addDynamicGuiComponents() {
        this.addSvgIconsForColorSettings()
        this.setAccordionDropdowns()
        this.closeSettingsMenuIfUserClicksOutside()
        this.setAllowedFontFamiliesInSettings()
        this.addCallbackFunctions()
        this.updateFontSize(true)
    }

    setAllowedFontFamiliesInSettings() {
        var elem = document.getElementById("font-families-settings")
        for (var i = 0; i < this.fontFamilies.length; i++) {
            var option = document.createElement("option")
            option.text = this.fontFamilies[i]
            elem.appendChild(option)
        }
    }

    closeSettingsMenuIfUserClicksOutside() {
        window.addEventListener('click', function(e){  
        
            const pressedSettingsMenu = document.getElementById(this.settingsCfg.settingsMenuId).contains(e.target)
            const pressedSettingsOpenBtn = document.getElementById(this.cfg.settingsButtonId).contains(e.target)
            
            if (pressedSettingsMenu || pressedSettingsOpenBtn){
              // Clicked in the bottom menu or settings wheel
            } else{
                if ((document.getElementById(this.settingsCfg.settingsMenuId).style.display == "flex")) {
                    document.getElementById(this.cfg.settingsButtonId).click();
                }
            }
        }.bind(this));
    }

    setAccordionDropdowns() {

        // Just sets the color accordion dropdown

        var acc = document.getElementsByClassName("accordion");
        let dropDownBtnElem = acc[0]
        dropDownBtnElem.addEventListener("click", () => {
            dropDownBtnElem.classList.toggle("active");
            var panel = dropDownBtnElem.nextElementSibling;
            if (panel.style.maxHeight) {
                panel.style.maxHeight = null;
            } else {
                panel.style.maxHeight = panel.scrollHeight + "px";
            }

            const dropDownSymbolElem = document.getElementById(this.settingsCfg.colorDropDownSymbolId)
            
            const currSymbol = dropDownSymbolElem.innerHTML
            dropDownSymbolElem.innerHTML = (currSymbol.includes("+")) ? "-" : "+"
        })

    }

    setColorScheme(backgroundColor, textColor, colorScheme) {

        const newSvgId =  `ColorSetting_${colorScheme}`

        if (this.currentColorScheme !== null) {
            const currSvgId = `ColorSetting_${this.currentColorScheme}`
            const currSvgElem = document.getElementById(currSvgId)
            currSvgElem.style.outline = ""
            const currSvgElemText = document.getElementById(currSvgId + "_text")
            currSvgElemText.setAttribute("fill", "white")
            
        }
    
        const newSvgElem = document.getElementById(newSvgId)
        newSvgElem.style.outline = "4px solid #2b955a"
        
        const newSvgElemText = document.getElementById(newSvgId + "_text")
        newSvgElemText.setAttribute("fill", "white")

        document.body.style.backgroundColor = backgroundColor
        document.body.style.color = textColor
        this.currentColorScheme = colorScheme

        this.changeStyleOfPageHeading()
    
    }

    changeStyleOfPageHeading() {

        // Need to overwrite some id-styles here
        const containerDiv = document.getElementById("fullBookContainerPlugin")

        const elem = document.getElementById("pg-header");
        elem.style.color = document.body.style.color
        elem.style.fontSize = containerDiv.style.fontSize
        const children = elem.querySelectorAll('*');
        
        for (let j = 0; j < children.length; j++) {
            children[j].style.color = document.body.style.color;
            children[j].style.fontSize = containerDiv.style.fontSize
        }
    }

    ///////////////////////////////////////

    addSvgIconsForColorSettings() {

        var colorSettingsContainer = document.getElementById("colorSettingsContainer")

        for (var colorScheme in this.colorSchemeSettings) {
                var currColorSettings = this.colorSchemeSettings[colorScheme]
                this.createSvgForColorSetting(colorSettingsContainer, currColorSettings, colorScheme)  
        }
        
    }

    createSvgColorSettingsBackground(colorSetting, colorScheme) {

        var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.id = `ColorSetting_${colorScheme}`
        svg.onclick = colorSetting["setColorScheme"]
        svg.setAttribute("width", "80%");
        svg.setAttribute("height", "90%");
        svg.setAttribute("style", "box-shadow: rgba(0, 0, 0, 0.25) 0px 54px 55px, rgba(0, 0, 0, 0.12) 0px -12px 30px, rgba(0, 0, 0, 0.12) 0px 4px 6px, rgba(0, 0, 0, 0.17) 0px 12px 13px, rgba(0, 0, 0, 0.09) 0px -3px 5px;");
        
        // Create the rectangles
        var backgroundRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        backgroundRect.setAttribute("x", "0");
        backgroundRect.setAttribute("y", "0");
        backgroundRect.setAttribute("width", "100%");
        backgroundRect.setAttribute("height", "80%");
        backgroundRect.setAttribute("fill", colorSetting["backgroundColor"]); //"#1e1e1e"
        
        svg.appendChild(backgroundRect)
        return svg
    }

    createSvgColorSettingText(svg, colorScheme) {
        var text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.id = svg.id + "_text"
        text.setAttribute("x", "50%");
        text.setAttribute("y", "93%");
        text.setAttribute("fill", "white");
        text.setAttribute("dominant-baseline", "middle");
        text.setAttribute("text-anchor", "middle");
        text.textContent = colorScheme;

        svg.appendChild(text);
    }

    

    createSvgForColorSetting(containerElem, colorSetting, colorScheme) {

        // Create a new div element with class "grid-item"
        var div = document.createElement("div");
        div.className = "grid-item";

        // Create an SVG element
        var svg = this.createSvgColorSettingsBackground(colorSetting, colorScheme)

        const numRects = 5
        const rectHeight = 7
        const rectSpacing = 10
        const rectYStart = 10
        const rectWidth = 80
        const textBarColor = colorSetting["textColor"]//"#90dcfe"

        for (var i=0; i<numRects; i++) {
            var rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", "10%");
            rect.setAttribute("y", `${rectYStart + i*(rectSpacing)}%`);
            rect.setAttribute("width", (i == (numRects - 1)) ? `${rectWidth/2}%` : `${rectWidth}%`);
            rect.setAttribute("height", `${rectHeight}%`);
            rect.setAttribute("fill", textBarColor);
            svg.appendChild(rect)

        }

        this.createSvgColorSettingText(svg, colorScheme)

        // Append the SVG element to the div
        div.appendChild(svg);

        // Append the div to the container div
        containerElem.appendChild(div);

    }


    ///////////////////////////////////////


    




    settingsMenu() {
        const menu = `
            <div id="${this.settingsCfg.settingsMenuId}" class="bottom-right">
                <span id="mainSettings">
                    ${this.playbackBtn()}
                    ${this.fontsizeBtn()}
                    ${this.pageMarginBtn()}
                    ${this.pageNumToggle()}
                    ${this.fontFamilyDropDown()}
                    ${this.colorSettingsBtn()}
                    ${this.colorSettingsDropdown()}
                </span>
            </div>`
        return menu
    }

    playbackBtn() {
        const btn = `
                <div class="settingsBtn">
                    <div class="settingsBtnDivider">
                        Playback speed
                    </div>
                    <div class="settingsBtnDivider rightAlignedInput">
                        <input id="${this.settingsCfg.playBackSpeedInputId}" 
                               style="text-align: right;
                                       height: 75%; 
                                       width: 40%; 
                                       margin-top: auto;" 
                               type="number" 
                               value="1" 
                               required
                               size="1" 
                               min="1" 
                               max="50">
                    </div>
                </div>`
        return btn
    }

    fontsizeBtn() {
        const btn = `
            <div class="settingsBtn"> 
                <div class="settingsBtnDivider">
                    Font-size
                </div>
                <div class="settingsBtnDivider rightAlignedInput">
                    <input id="${this.settingsCfg.fontSizeInputId}" 
                           style="text-align: right; 
                           height: 75%; 
                           width: 40%; 
                           margin-top: auto;" 
                           type="number" 
                           value="20" 
                           required 
                           size="1" 
                           min="1" 
                           max="500">
                </div>
            </div>`
        return btn
    
    }

    pageMarginBtn() {
        const btn = `
            <div class="settingsBtn"> 
                <div class="settingsBtnDivider">
                    Page margins
                </div>
                <div class="settingsBtnDivider rightAlignedInput">
                    <span id="${this.settingsCfg.pageMarginTextDisplayId}" 
                          style="text-align: right;
                                 height: 75%; 
                                 width: 40%; 
                                 margin-top: auto;">
                                    10% 
                    </span>
                    <input id="${this.settingsCfg.pageMarginInputId}"
                           type="range" 
                           id="volume" 
                           name="volume"
                           min="1" 
                           max="40", 
                           value="10" 
                           style="text-align: right; 
                                  height: 75%; 
                                  width: 40%; 
                                  margin-top: auto;">
                </div>
            </div>`
        return btn
    }

    pageNumToggle() {
        const btn = `<div class="settingsBtn"> 
                    <div class="settingsBtnDivider">Show page numbers</div>
                    <div class="settingsBtnDivider rightAlignedInput">
                
                    <label for="${this.settingsCfg.toggleForPageNumDisplayId}"
                           class="toggle-switchy"
                           data-size="xs"
                           data-text="false" 
                           data-style="rounded">
                        <input 
                               checked type="checkbox"
                               id="${this.settingsCfg.toggleForPageNumDisplayId}">
                        <span class="toggle">
                        <span class="switch"></span>
                        </span>
                    </label>
                
                    </div>
                </div>`
        return btn
    }

    fontFamilyDropDown() {
        const btn = `
            <div class="settingsBtn">
                <div class="settingsBtnDivider">
                    Font
                </div>
                <div class="settingsBtnDivider rightAligned">
                    <input id="${this.settingsCfg.fontFamiliesSettingsInputId}"
                           list="font-families-settings" 
                           placeholder="Select font...">
                    <datalist id="${this.settingsCfg.fontFamiliesSettingsId}">
                    </datalist>
                </div>
            </div>`
        return btn
    }

    colorSettingsBtn() {
        const btn = `
            <div class="settingsBtn accordion">
                <div class="settingsBtnDivider">
                    Color settings
                </div>
                <div id="${this.settingsCfg.colorDropDownSymbolId}"
                     class="settingsBtnDivider rightAligned">
                            +
                </div>
            </div>`
        return btn

    }

    colorSettingsDropdown() {
        const dropdownPanel = `
            <div class="panel">
                <div style="display: flex; padding: 5px;">
            
                    <div id="${this.settingsCfg.colorSettingsContainerId}" 
                         class="grid-container">
                            <!-- Content will be filled here automatically with the color settings-->        
                    </div>  
                </div>
            </div>`
        return dropdownPanel
    
    }


}

let pluginFunctionality = new pluginGui();
