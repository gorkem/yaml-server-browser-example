
# YAML Languge Server Embedded In Browser Example

This repository contains the example code for using [YAML language server](https://github.com/redhat-developer/yaml-language-server)
 embedded in a browser with [Monaco editor](https://microsoft.github.io/monaco-editor/).

## Getting Started

1. Install prerequisites 
   - node.js (tested with v12.4)
2. Clone this repository 
3. Prepare the example, this installs and build the example code
	 ```bash
   $ cd yaml-server-browser-example
	 $ npm run prepare
	 ```
4. Build the example
	 ```bash
	 $ npm run build
	 ```
5. Run the webpack dev server
	 ```bash
	 $ npm run serve
   ```
6. You can test the example at [http://localhost:8080/lib/](http://localhost:8080/lib/)
