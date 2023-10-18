
class scrollingBook {

    constructor() {

        this.bookSettings = 
        {
            "bookFinished": false,
            "currentlyRewinding": false, // To prevent spamming rewind btn making it superfast
            "viewportTopHeightPos": null,
            "viewportBottomHeightPos": null,
            "viewportMinimumScrollDistDiff": 10e6,
            "currBookPos": 0,
            "currentSpeed": 1,
            "transitionDuration": 0.12, // Should be slightly larger than interval time I think, for smooth animation
            "intervalTime": 100,
            "intervalId": null,
            "rewindLength": 750,
            "rewindSpeed": 20,
            "bookIsPlaying": false

        }

        this.chapterPositions = []
        
    }

    findPositionOfChapterBeginnings() {

        const initialScrollPos = window.scrollY;
        window.scrollTo({ // Easier to calculate the distance to the chapters from the top
            top: 0,
            behavior: 'auto'
          });

        this.chapterPositions = []
        var elem = document.getElementById("fullBookContainerPlugin")
        var allTags = document.querySelectorAll("*");

        let searchClassList = ["chap", "chapter"]

        for (var i = 0; i < allTags.length; i++) {

            let allTagClasses = Array.from(allTags[i].classList)
            allTagClasses = allTagClasses.map(it => it.toLowerCase())
            let isChapterTag = searchClassList.some(it => allTagClasses.includes(it))
            if (isChapterTag) {
                //console.log(allTags[i])
                let chapterPosTop = allTags[i].getBoundingClientRect().top
                // Aim to put the chapter in the middle of the screen
                let chapterPos = chapterPosTop - screen.height/2
                let chapterPosOfBookPercent = (chapterPos / elem.getBoundingClientRect().height)*100
                this.chapterPositions.push(chapterPosOfBookPercent)
            }

        }

        // If we could not find any pos from the classlist
        if (this.chapterPositions.length == 0) {

            var elem = document.getElementById("fullBookContainerPlugin")
            var headings = document.querySelectorAll("h1, h2");

            for (var i = 0; i < headings.length; i++) {
                var headingText = headings[i].textContent;

                if (headingText.toLowerCase().includes("chapter")) {
                    let chapterPosTop = headings[i].getBoundingClientRect().top
                    let chapterPosBottom = headings[i].getBoundingClientRect().bottom
                    // Aim to put the chapter in the middle of the screen
                    let chapterPos = (chapterPosTop + chapterPosBottom) / 2 - screen.height/2
                    let chapterPosOfBookPercent = (chapterPos / elem.getBoundingClientRect().height)*100
                    this.chapterPositions.push(chapterPosOfBookPercent)
                }
            }
        }

        // Scroll back to where the user was
        window.scrollTo({
            top: initialScrollPos,
            behavior: 'auto'
          });
    }

    getChapterPositions() {
        return this.chapterPositions.length > 0 ? this.chapterPositions : null
    }

    bookCompletionPercentage() { 
        var elem = document.getElementById("fullBookContainerPlugin")
        //console.log("Bounding box", elem.getBoundingClientRect().height)
        let completionPercentage = (this.bookSettings.currBookPos / elem.getBoundingClientRect().height) * 100
        return completionPercentage
    }

    changeSpeed(newPlayBackSpeed) {
        this.bookSettings.currentSpeed = newPlayBackSpeed
    }

    playBook() {

        this.bookSettings.bookIsPlaying = true
        this.bookSettings.intervalId = setInterval(() => { 
            var elem = document.getElementById("fullBookContainerPlugin")
            this.bookSettings.currBookPos += this.bookSettings.currentSpeed
            elem.style.transition = "transform " + this.bookSettings.transitionDuration + "s" + " linear"
            elem.style.transform = "translateY(" + (-this.bookSettings.currBookPos) + "px" + ")"
            console.log(this.bookSettings.currBookPos)
            // Need some max check here as well maybe? SO it does not go off screen sort of?

        }, this.bookSettings.intervalTime);

    }

    pauseBook() {
        this.bookSettings.bookIsPlaying = false
        clearInterval(this.bookSettings.intervalId)
        this.bookSettings.currentlyRewinding = false
    }


    bookIsDone() {

        if (this.bookCompletionPercentage() > 99.9) {
            return true
        }
        
    }

    rewind() {

        clearInterval(this.bookSettings.intervalId)
        this.bookSettings.bookPosBeforeRewind = this.bookSettings.currBookPos
        console.log(this.bookSettings.currBookPos, "bookpos")
        if (!this.bookSettings.currentlyRewinding) {
            this.bookSettings.currentlyRewinding = true
            this.bookSettings.intervalId = setInterval(() => { 
                var elem = document.getElementById("fullBookContainerPlugin")
                this.bookSettings.currBookPos -= this.bookSettings.rewindSpeed
                this.bookSettings.currBookPos = Math.max(0, this.bookSettings.currBookPos)
                elem.style.transition = "transform " + this.bookSettings.transitionDuration + "s" + " linear"
                elem.style.transform = "translateY(" + (-this.bookSettings.currBookPos) + "px" + ")"

                let rewindStopCheck1 = this.bookSettings.currBookPos < Math.max((this.bookSettings.bookPosBeforeRewind - this.bookSettings.rewindLength), 0)
                let rewindStopCheck2 = this.bookSettings.currBookPos == 0
                if (rewindStopCheck1 || rewindStopCheck2) {
                    clearInterval(this.bookSettings.intervalId)
                    this.bookSettings.currentlyRewinding = false
                    if (this.bookSettings.bookIsPlaying) { // Just so that after the rewind stops the book starts playing again
                        this.playBook()
                    }
                }

            }, this.bookSettings.intervalTime);
        }

    }

    markTagsInView() {
        // Important here that we only mark the tags that are in view
        // And some logic might be necessary if there are no tags in view
        // But maybe then we can just mark the nearest tag
        var parentElement = document.getElementById("fullBookContainerPlugin");
        var allElements = parentElement.getElementsByTagName("*");

        let maxCover = -100
        let maxCoverElement = null
        
        for (var i = 0; i < allElements.length; i++) {
          var element = allElements[i];
          var positionTop = element.getBoundingClientRect().top;
          var positionBottom = element.getBoundingClientRect().bottom;

          let topIsInViewPort = positionTop >= 0 && positionTop <= window.innerHeight
          let bottomIsInViewPort = positionBottom >= 0 && positionBottom <= window.innerHeight
          let tagCoversViewPort = positionTop <= 0 && positionBottom >= window.innerHeight
          if (topIsInViewPort || bottomIsInViewPort || tagCoversViewPort) {
            
            // Find the element that covers the largest part of the viewport
            let coverTop = Math.max(0, positionTop)
            let coverBottom = Math.min(window.innerHeight, positionBottom)
            let coverPercent = (coverBottom - coverTop) / window.innerHeight
            if (coverPercent >= maxCover) { // Only store the element that covers the largest amount of the vp
                maxCover = coverPercent
                maxCoverElement = element
                this.bookSettings.viewportTopHeightPos = positionTop
                this.bookSettings.viewportBottomHeightPos = positionBottom
            }
            
          }
          
        }
        //maxCoverElement.style.backgroundColor = "green" for testing
        maxCoverElement.classList.add("tagInViewPlugin")
    }

    moveToTagsThatWereInView() {
        
        clearInterval(this.bookSettings.intervalId)

        var orgElems = document.getElementsByClassName("tagInViewPlugin")
        var elems = [...orgElems]
  
        var element = elems[0];
        var newPositionTop = element.getBoundingClientRect().top;
        var newPositionBottom = element.getBoundingClientRect().bottom;
        var heightOfElement = newPositionBottom - newPositionTop

        element.classList.remove("tagInViewPlugin")
        
        // So move top-position of element to the median of prevTopHeight, prevBottomHeight-newHeight
        // This will minimize |x-a| + |y-b| where y=x+h and center the element in a similar way as
        // it was before the fontchange
        let optimalTopHeightPos = (this.bookSettings.viewportTopHeightPos + (this.bookSettings.viewportBottomHeightPos - heightOfElement))/2
        let shiftDistance = optimalTopHeightPos - newPositionTop
        var elem = document.getElementById("fullBookContainerPlugin")

        this.bookSettings.currBookPos -= shiftDistance

        elem.style.transition = "transform " + 0 + "s" + " linear"
        elem.style.transform = "translateY(" + (-this.bookSettings.currBookPos) + "px" + ")"
        if (this.bookSettings.bookIsPlaying) {
            this.playBook()
        }
        
    }

    goToPercentage(completionPercentage) {

        var elem = document.getElementById("fullBookContainerPlugin")        
        let newPosition = (completionPercentage / 100) * elem.getBoundingClientRect().height
        this.bookSettings.currBookPos = newPosition
        elem.style.transition = "transform " + 0 + "s" + " linear"
        elem.style.transform = "translateY(" + (-this.bookSettings.currBookPos) + "px" + ")"

    }

}
