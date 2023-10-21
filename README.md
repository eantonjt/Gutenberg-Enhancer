# Gutenberg-Enhancer

![Gutenberg Enhancer icon](/readme_media/plugin-icon.png "Gutenberg Enhancer icon")

This repo contains the code for the chrome plugin "Gutenberg Enhancer".
This plugin is meant to add this functionality to HTML books on [Project Gutenberg](https://www.gutenberg.org/):
* Play button to autoplay books similarly to how you can play a video on youtube.
* Easily change display settings for the book, like font-size, background color, margins etc
* Chapter markings to easily go between chapters
* Just provide a more pleasant reading experience in general
A description of the thoughts and solutions that I had when I made this project can be found here LINK.

## Installation instructions
1. Download the project
2. Navigate to "chrome://extensions" in your browser (just copy and paste it into the address bar)
3. Activate "Developer mode" in the top right
4. Press the "Load unpacked" button
5. Select the folder where you downloaded the project files.

The plugin should now be activated, if you navigate to any HTML book on [Project Gutenberg](https://www.gutenberg.org/) (like [Meditations](https://www.gutenberg.org/cache/epub/2680/pg2680-images.html) for example) you will see that the plugin is now active.

## Code
This code is written with vanilla Javascript. The project should be refactored to use some framework that makes it easier to handle HTML tags in code, but such a refactoring has not been done at the moment.

## Contributions
Feel free to contribute to the project if you feel any feature is missing.


