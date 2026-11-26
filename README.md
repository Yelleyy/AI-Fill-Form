# AI Form Filler: Automated Form Testing Extension

As developers and QA engineers, we spend countless hours manually filling out web forms just to test basic application functionality. **AI Form Filler** is a Chrome and Edge extension designed to eliminate this repetitive, time-consuming task. 

By leveraging the Google Gemini API, this tool intelligently analyzes the DOM structure of your web forms and instantly populates them with contextually accurate, realistic mock data.

## Key Features

* **Context-Aware Data Generation:** Scans the active webpage for `<input>`, `<textarea>`, and `<select>` elements. It evaluates field attributes (`name`, `id`, `placeholder`) to generate logical and relevant test data.
* **Customizable AI Models:** Provides the flexibility to choose from various state-of-the-art models, including Gemini 2.5 Flash (optimized for speed), Gemini 3.1 Pro Preview, and the open-source Gemma models.
* **Advanced Element Handling:**
  * Automatically interacts with checkboxes and radio buttons.
  * Intelligently bypasses file upload fields (`<input type="file">`) to strictly comply with browser security policies.
  * Triggers native `input` and `change` events, ensuring seamless compatibility with reactive modern front-end frameworks like React, Vue, and Angular.
* **Privacy-Focused Storage:** Your API key and model preferences are securely saved within your browser's local storage. Credentials are only used for direct API calls and never sent to third-party servers.

## Tech Stack

* HTML, CSS, Vanilla JavaScript
* Manifest V3 (Chrome Extension API)
* Google Generative Language API (Gemini REST API)

## Installation Guide (Unpacked Extension)

Since this extension is intended for development environments, you can install it locally with a few simple steps:

1. Clone this repository or download the source code to your local machine.
2. Open your Chromium-based browser and navigate to the extensions management page:
   * **Chrome:** `chrome://extensions/`
   * **Edge:** `edge://extensions/`
3. Enable **Developer mode** (usually a toggle in the top right corner).
4. Click the **Load unpacked** button.
5. Select the directory containing this project's files.

## Getting Started

1. Acquire a free API Key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Navigate to any webpage containing the forms you wish to test.
3. Click the **AI Form Filler** extension icon in your browser's toolbar.
4. Input your API Key and select your preferred AI model from the dropdown.
5. Click **Save Settings** to persist your configuration.
6. Click **Scan & Auto-Fill**. The AI will process the DOM in the background and instantly populate the form fields.

## Important Disclaimer

This project is built strictly for **development, testing, and QA purposes**. Please do not use this extension to submit real personal, sensitive, or financial information. Additionally, heavily obfuscated websites or those that dynamically randomize element IDs on every render may affect the AI's ability to accurately map mock data.